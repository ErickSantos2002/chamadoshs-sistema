import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/**
 * A linha inativa das três abas de Cadastros (FE-12).
 *
 * ── O defeito ─────────────────────────────────────────────────────────
 *
 * A linha inativa inteira levava `opacity-60`. A opacidade é herdada por tudo
 * o que está dentro dela, e derrubava o contraste de quase tudo — medido no
 * navegador, nos dois temas, nas três abas: selo "Inativo" 2,73:1 e 2,86:1,
 * descrição e data 2,88:1 e 3,14:1, ícones de ação 2,88:1 no claro. O selo
 * sozinho passa (6,92:1 e 5,29:1); era a linha que o reprovava.
 *
 * Não existe opacidade que resolva: calculado com as cores medidas, só a 90%
 * tudo passa de 4,5:1, e a 90% a linha já não parece esmaecida.
 *
 * ── A regra ───────────────────────────────────────────────────────────
 *
 * A linha inativa não tem opacidade. O que a distingue é o selo, o nome e o
 * ID em `text-conteudo-tenue` — token que já existe e mede 7,58:1 e 6,23:1 —
 * e, em Usuários, o separador "Inativos (N)". O resto da linha é igual ao da
 * ativa.
 *
 * ── O que este arquivo NÃO cobre ──────────────────────────────────────
 *
 * Contraste: o jsdom não aplica CSS. Aqui se confere que as classes são as
 * que foram medidas; a medição é da homologação no navegador.
 */

// React exige esta bandeira para `act` fora de um test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const reativarSetor = vi.fn();
const reativarUsuario = vi.fn();

const CATEGORIAS = [
  { id: 1, nome: 'Infraestrutura', descricao: 'Rede e servidores', ativo: true, created_at: '2026-08-01T10:00:00' },
  { id: 2, nome: 'Acessos', descricao: 'Contas e senhas', ativo: false, created_at: '2026-08-15T10:00:00' },
];

const SETORES = [
  { id: 1, nome: 'Expedicao', descricao: 'Saída de material', ativo: true, created_at: '2026-08-01T10:00:00' },
  { id: 2, nome: 'Almoxarifado', descricao: 'Estoque', ativo: false, created_at: '2026-08-15T10:00:00' },
];

/** 1 é quem está logado. `role_id`: 1 Administrador, 2 Tecnico, 3 Usuario. */
const USUARIOS = [
  { id: 1, nome: 'bruna', role_id: 1, setor_id: 1, ativo: true, conta_de_servico: false, created_at: '2026-01-02T08:00:00', updated_at: '2026-01-02T08:00:00' },
  { id: 2, nome: 'caio', role_id: 3, setor_id: 1, ativo: true, conta_de_servico: false, created_at: '2026-01-03T08:00:00', updated_at: '2026-01-03T08:00:00' },
  { id: 3, nome: 'davi', role_id: 2, setor_id: 1, ativo: false, conta_de_servico: false, created_at: '2026-01-04T08:00:00', updated_at: '2026-01-04T08:00:00' },
  { id: 4, nome: 'zeca', role_id: 3, setor_id: 1, ativo: false, conta_de_servico: false, created_at: '2026-01-05T08:00:00', updated_at: '2026-01-05T08:00:00' },
];

const contexto = {
  categorias: CATEGORIAS,
  setores: SETORES,
  usuarios: USUARIOS,
  usuariosIncompletos: false,
  deleteCategoria: vi.fn(),
  desativarSetor: vi.fn(),
  reativarSetor,
  desativarUsuario: vi.fn(),
  reativarUsuario,
  updateUsuarioPassword: vi.fn(),
  refreshData: vi.fn(),
  loading: false,
  error: null as string | null,
};

vi.mock('../../context/CadastrosContext', () => ({
  useCadastros: () => contexto,
}));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'bruna', role: 'Administrador', conta_de_servico: false },
    identidadeConfirmada: true,
  }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const { default: CategoriasTab } = await import('./CategoriasTab');
const { default: SetoresTab } = await import('./SetoresTab');
const { default: UsuariosTab } = await import('./UsuariosTab');

/** As classes da `TabelaLinha`, sem nada por cima: é a linha ativa de hoje. */
const LINHA = 'border-b border-borda-suave last:border-b-0';

const ABAS = [
  { aba: 'Categorias', Componente: CategoriasTab, ativa: 'Infraestrutura', inativa: 'Acessos', selo: 'Inativa' },
  { aba: 'Setores', Componente: SetoresTab, ativa: 'Expedicao', inativa: 'Almoxarifado', selo: 'Inativo' },
  { aba: 'Usuários', Componente: UsuariosTab, ativa: 'caio', inativa: 'zeca', selo: 'Inativo' },
];

let host: HTMLDivElement;
let root: Root;

const montar = (Componente: React.ComponentType) => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<Componente />));
};

beforeEach(() => {
  reativarSetor.mockReset();
  reativarSetor.mockResolvedValue(undefined);
  reativarUsuario.mockReset();
  reativarUsuario.mockResolvedValue(undefined);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const clicar = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const classes = (el: Element | null | undefined) => (el?.getAttribute('class') ?? '').split(/\s+/);

/** A linha de dados cujo nome é `nome`. O nome é o primeiro `<span>` da 2ª célula. */
const linhaDe = (nome: string) =>
  Array.from(host.querySelectorAll('tbody tr')).find(
    (tr) => tr.querySelectorAll('td')[1]?.querySelector('span')?.textContent?.trim() === nome
  )!;

const celulas = (tr: Element) => Array.from(tr.querySelectorAll('td'));
const nomeDe = (tr: Element) => celulas(tr)[1].querySelector('span')!;
const seloDe = (tr: Element) =>
  Array.from(celulas(tr)[1].querySelectorAll('span')).find((s) => s !== nomeDe(tr));
/** A célula de ações é a última da linha. */
const botoesDe = (tr: Element): HTMLButtonElement[] => {
  const tds = celulas(tr);
  return Array.from(tds[tds.length - 1].querySelectorAll<HTMLButtonElement>('button'));
};

/** Nenhuma classe de opacidade no elemento nem em nada acima dele, até a tabela. */
const semOpacidadeAte = (el: Element) => {
  for (let e: Element | null = el; e && e.tagName !== 'TABLE'; e = e.parentElement) {
    expect(classes(e).filter((c) => c.includes('opacity'))).toEqual([]);
  }
};

describe.each(ABAS)('linha inativa — $aba', ({ Componente, ativa, inativa, selo }) => {
  it('a linha ativa fica como era', () => {
    montar(Componente);
    const tr = linhaDe(ativa);

    expect(tr.getAttribute('class')).toBe(LINHA);
    expect(classes(celulas(tr)[0])).toContain('text-conteudo');
    expect(classes(celulas(tr)[0])).not.toContain('text-conteudo-tenue');
    expect(nomeDe(tr).getAttribute('class')).toBe('text-sm font-medium text-conteudo');
    expect(seloDe(tr)).toBeUndefined();
  });

  it('a linha inativa não tem opacidade: é a mesma linha da ativa', () => {
    montar(Componente);
    const tr = linhaDe(inativa);

    expect(tr.getAttribute('class')).toBe(LINHA);
    expect(tr.getAttribute('class')).toBe(linhaDe(ativa).getAttribute('class'));
    expect(host.innerHTML).not.toContain('opacity-60');
  });

  it('a linha inativa mantém o selo, na variante de sempre', () => {
    montar(Componente);
    const s = seloDe(linhaDe(inativa))!;

    expect(s.textContent).toBe(selo);
    expect(classes(s)).toEqual(expect.arrayContaining(['bg-tint-neutral', 'text-on-tint-neutral', 'border-borda']));
  });

  it('nome e ID do inativo usam o tom tênue, e só eles mudam', () => {
    montar(Componente);
    const tr = linhaDe(inativa);

    expect(nomeDe(tr).getAttribute('class')).toBe('text-sm font-medium text-conteudo-tenue');
    expect(classes(celulas(tr)[0])).toContain('text-conteudo-tenue');
    expect(classes(celulas(tr)[0])).not.toContain('text-conteudo');

    // As outras células têm as mesmas classes nas duas linhas: nada além do
    // nome e do ID foi repintado.
    const outras = (linha: Element) =>
      celulas(linha).slice(2).map((td) => td.getAttribute('class'));
    expect(outras(tr)).toEqual(outras(linhaDe(ativa)));
  });

  it('os botões de ação do inativo não herdam opacidade e têm a cor dos da ativa', () => {
    montar(Componente);
    const daInativa = botoesDe(linhaDe(inativa));
    const daAtiva = botoesDe(linhaDe(ativa));

    expect(daInativa.length).toBeGreaterThan(0);
    for (const b of daInativa) {
      semOpacidadeAte(b);
      expect(classes(b)).toContain('text-conteudo-tenue');
    }
    // Visualizar é o primeiro nas duas, com as mesmas classes.
    expect(daInativa[0].getAttribute('class')).toBe(daAtiva[0].getAttribute('class'));
  });

  it('o ícone ao lado do nome é o mesmo nas duas linhas', () => {
    montar(Componente);
    const icone = (tr: Element) => celulas(tr)[1].querySelector('svg')!.getAttribute('class');

    expect(icone(linhaDe(inativa))).toBe(icone(linhaDe(ativa)));
    semOpacidadeAte(celulas(linhaDe(inativa))[1].querySelector('svg')!);
  });

  it('a linha inativa continua interativa: Visualizar abre o modal', async () => {
    montar(Componente);
    expect(host.querySelector('[role="dialog"]')).toBeNull();

    await clicar(host.querySelector(`[aria-label="Visualizar ${inativa}"]`)!);
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
  });
});

describe('linha inativa — o que é de cada aba', () => {
  it('Setores: Reativar no inativo chama o contexto com o id', async () => {
    montar(SetoresTab);

    await clicar(host.querySelector('[aria-label="Reativar Almoxarifado"]')!);
    expect(reativarSetor).toHaveBeenCalledTimes(1);
    expect(reativarSetor).toHaveBeenCalledWith(2);
  });

  it('Setores: o ativo oferece Desativar, e o inativo não', () => {
    montar(SetoresTab);

    expect(host.querySelector('[aria-label="Desativar Expedicao"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="Desativar Almoxarifado"]')).toBeNull();
    expect(host.querySelector('[aria-label="Reativar Expedicao"]')).toBeNull();
  });

  it('Categorias: o inativo continua com Editar e Excluir', () => {
    montar(CategoriasTab);

    expect(host.querySelector('[aria-label="Editar Acessos"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="Excluir Acessos"]')).not.toBeNull();
  });

  it('Usuários: os selos de perfil mantêm a variante de cada perfil', () => {
    montar(UsuariosTab);
    const perfil = (nome: string) => celulas(linhaDe(nome))[2].querySelector('span')!;

    // Inativos: Tecnico é `info`, Usuario é `discreto`.
    expect(perfil('davi').textContent).toBe('Tecnico');
    expect(classes(perfil('davi'))).toEqual(expect.arrayContaining(['bg-tint-info', 'text-on-tint-info']));
    expect(perfil('zeca').textContent).toBe('Usuario');
    expect(classes(perfil('zeca'))).toEqual(expect.arrayContaining(['bg-tint-neutral', 'text-on-tint-neutral']));

    // E são os mesmos da linha ativa de mesmo perfil.
    expect(perfil('zeca').getAttribute('class')).toBe(perfil('caio').getAttribute('class'));
    expect(perfil('bruna').textContent).toBe('Administrador');
    expect(classes(perfil('bruna'))).toEqual(expect.arrayContaining(['bg-tint-warning', 'text-on-tint-warning']));
  });

  it('Usuários: o setor do inativo fica no tom do setor do ativo', () => {
    montar(UsuariosTab);
    const setor = (nome: string) => celulas(linhaDe(nome))[3].querySelector('span')!;

    expect(setor('zeca').getAttribute('class')).toBe('text-conteudo-suave');
    expect(setor('zeca').getAttribute('class')).toBe(setor('caio').getAttribute('class'));
  });

  it('Usuários: o separador "Inativos (N)" continua antes do primeiro inativo', () => {
    montar(UsuariosTab);
    const linhas = Array.from(host.querySelectorAll('tbody tr'));
    const separador = linhas.find((tr) => tr.querySelector('td[colspan]'))!;

    expect(separador.textContent?.trim()).toBe('Inativos (2)');
    expect(separador.getAttribute('class')).toBe('border-b border-borda-suave bg-superficie-elevada');
    expect(linhas.indexOf(separador)).toBe(linhas.indexOf(linhaDe('davi')) - 1);
  });

  it('Usuários: o inativo oferece Reativar, e o ativo não', () => {
    montar(UsuariosTab);

    expect(host.querySelector('[aria-label="Reativar zeca"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="Reativar caio"]')).toBeNull();
    expect(host.querySelector('[aria-label="Editar zeca"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="Resetar a senha de zeca"]')).not.toBeNull();
  });
});
