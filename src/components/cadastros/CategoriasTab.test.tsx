import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/**
 * O checklist da §29 para `CategoriasTab`, executado.
 *
 * ── Por que teste e não navegador ────────────────────────────────────
 *
 * A §29 manda conferir cada funcionalidade "manualmente no navegador ou por
 * teste". Aqui só resta a segunda: esta aba vive atrás do login, o login
 * depende da API, e o front rodando sozinho não passa da tela de entrada — a
 * mesma limitação que obrigou a galeria da casca a existir no Checkpoint 1.
 *
 * E, para o que a §29 quer, o teste é melhor: ele fica. Uma conferência manual
 * prova o dia em que foi feita; esta roda em toda migração seguinte das outras
 * duas abas, que são cópias desta.
 *
 * ── O que este arquivo NÃO cobre, e por quê ──────────────────────────
 *
 * `funciona no mobile` e `funciona no tema escuro` não são verificáveis aqui:
 * o jsdom não faz layout nem resolve media query, e não aplica CSS. Os dois
 * itens do checklist são conferidos por outro caminho — os breakpoints por
 * leitura do código, e o tema pela galeria de componentes, que mede os tokens
 * de verdade no navegador nos dois temas.
 */

// React exige esta bandeira para `act` fora de um test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const apagar = vi.fn();
const recarregar = vi.fn();

const CATEGORIAS = [
  {
    id: 1,
    nome: 'Infraestrutura',
    descricao: 'Rede, servidores e energia',
    ativo: true,
    created_at: '2026-08-01T10:00:00',
  },
  {
    id: 2,
    nome: 'Acessos',
    descricao: null,
    ativo: false,
    created_at: '2026-08-15T10:00:00',
  },
];

let contexto = {
  categorias: CATEGORIAS,
  deleteCategoria: apagar,
  refreshData: recarregar,
  loading: false,
  error: null as string | null,
};

let papel = 'Administrador';

vi.mock('../../context/CadastrosContext', () => ({
  useCadastros: () => contexto,
}));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, username: 'admin', role: papel } }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const { default: CategoriasTab } = await import('./CategoriasTab');

let host: HTMLDivElement;
let root: Root;

const montar = () => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<CategoriasTab />));
};

beforeEach(() => {
  apagar.mockReset();
  apagar.mockResolvedValue(undefined);
  recarregar.mockReset();
  papel = 'Administrador';
  contexto = {
    categorias: CATEGORIAS,
    deleteCategoria: apagar,
    refreshData: recarregar,
    loading: false,
    error: null,
  };
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const clicar = (el: Element) => {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const digitar = (campo: HTMLInputElement, valor: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )!.set!;
  act(() => {
    setter.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const linhas = () => host.querySelectorAll('tbody tr');
/**
 * Só o NOME da linha, e não o texto todo da célula.
 *
 * A célula de nome carrega também o selo "Inativa", então `textContent`
 * devolvia "AcessosInativa" e o teste de ordem reprovava por culpa do
 * auxiliar, não da página. O nome é o primeiro `<span>`; o ícone ao lado é um
 * `<svg>`.
 */
const nomes = () =>
  Array.from(host.querySelectorAll('tbody tr')).map(
    (l) => l.querySelectorAll('td')[1]?.querySelector('span')?.textContent?.trim() ?? ''
  );
const porRotulo = (r: string) =>
  host.querySelector<HTMLButtonElement>(`[aria-label="${r}"]`);

describe('CategoriasTab — checklist da §29', () => {
  it('carrega e lista o que o contexto devolve', () => {
    montar();
    expect(linhas()).toHaveLength(2);
    expect(host.textContent).toContain('Infraestrutura');
    expect(host.textContent).toContain('Acessos');
  });

  it('busca por nome e por descrição', () => {
    montar();
    const campo = host.querySelector<HTMLInputElement>('input[type="search"]')!;

    digitar(campo, 'infra');
    expect(linhas()).toHaveLength(1);

    // A descrição também entra na busca, e é fácil quebrar isso ao mexer no
    // filtro: "servidores" só existe na descrição de Infraestrutura.
    digitar(campo, 'servidores');
    expect(linhas()).toHaveLength(1);
    expect(host.textContent).toContain('Infraestrutura');
  });

  it('o campo de busca tem nome acessível, e não só placeholder', () => {
    montar();
    const campo = host.querySelector<HTMLInputElement>('input[type="search"]')!;
    // O item da §29: nenhum campo depende do placeholder para ser entendido.
    // O placeholder some no primeiro caractere digitado.
    expect(campo.getAttribute('aria-label')).toBe('Buscar categorias');
  });

  it('ordena, e anuncia a ordem por aria-sort', () => {
    montar();
    expect(nomes()).toEqual(['Infraestrutura', 'Acessos']);

    const cabecalhoNome = Array.from(host.querySelectorAll('th')).find((t) =>
      t.textContent?.includes('Nome')
    )!;
    clicar(cabecalhoNome.querySelector('button')!);

    expect(nomes()).toEqual(['Acessos', 'Infraestrutura']);
    expect(cabecalhoNome.getAttribute('aria-sort')).toBe('ascending');

    clicar(cabecalhoNome.querySelector('button')!);
    expect(nomes()).toEqual(['Infraestrutura', 'Acessos']);
    expect(cabecalhoNome.getAttribute('aria-sort')).toBe('descending');
  });

  it('toda coluna tem scope, e a não ordenável não mente sobre a ordem', () => {
    montar();
    const ths = Array.from(host.querySelectorAll('th'));
    expect(ths.length).toBeGreaterThan(0);
    for (const th of ths) expect(th.getAttribute('scope')).toBe('col');

    // `Descrição` e `Ações` não ordenam: não podem declarar `aria-sort`, senão
    // o leitor anuncia uma ordem que não existe.
    const descricao = ths.find((t) => t.textContent?.includes('Descrição'))!;
    expect(descricao.hasAttribute('aria-sort')).toBe(false);
  });

  it('abre criar, editar e visualizar', () => {
    montar();

    clicar(porRotulo('Visualizar Infraestrutura')!);
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('excluir pede confirmação antes de chamar a API', () => {
    montar();

    clicar(porRotulo('Excluir Infraestrutura')!);
    // Primeiro clique arma; nada foi apagado.
    expect(apagar).not.toHaveBeenCalled();

    const confirmar = Array.from(host.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Confirmar'
    );
    expect(confirmar).toBeTruthy();

    clicar(confirmar!);
    expect(apagar).toHaveBeenCalledTimes(1);
    expect(apagar).toHaveBeenCalledWith(1);
  });

  it('cancelar desarma a confirmação sem chamar a API', () => {
    montar();
    clicar(porRotulo('Excluir Infraestrutura')!);

    const cancelar = Array.from(host.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancelar'
    );
    clicar(cancelar!);

    expect(apagar).not.toHaveBeenCalled();
    expect(
      Array.from(host.querySelectorAll('button')).some(
        (b) => b.textContent?.trim() === 'Confirmar'
      )
    ).toBe(false);
  });

  it('respeita permissões: Usuario não cria, não edita, não exclui', () => {
    papel = 'Usuario';
    montar();

    expect(porRotulo('Editar Infraestrutura')).toBeNull();
    expect(porRotulo('Excluir Infraestrutura')).toBeNull();
    expect(host.textContent).not.toContain('Nova Categoria');

    // Visualizar continua: ler não altera nada.
    expect(porRotulo('Visualizar Infraestrutura')).not.toBeNull();
  });

  it('mostra erro, e num papel de alerta', () => {
    contexto.error = 'Erro ao carregar categorias';
    montar();

    const aviso = host.querySelector('[role="alert"]');
    expect(aviso).not.toBeNull();
    expect(aviso!.textContent).toContain('Erro ao carregar categorias');
  });

  it('mostra estado vazio, e distingue lista vazia de busca sem resultado', () => {
    contexto.categorias = [];
    montar();
    expect(host.textContent).toContain('Nenhuma categoria cadastrada ainda');

    act(() => root.unmount());
    host.remove();

    contexto.categorias = CATEGORIAS;
    montar();
    const campo = host.querySelector<HTMLInputElement>('input[type="search"]')!;
    digitar(campo, 'zzzz');
    expect(host.textContent).toContain('Nenhuma categoria encontrada');
  });

  it('mostra carregando, e a região é anunciada', () => {
    contexto.categorias = [];
    contexto.loading = true;
    montar();

    const regiao = host.querySelector('[role="status"]');
    expect(regiao).not.toBeNull();
    expect(regiao!.textContent).toContain('Carregando categorias');
  });

  it('atualizar chama o contexto', () => {
    montar();
    clicar(porRotulo('Atualizar dados')!);
    expect(recarregar).toHaveBeenCalledTimes(1);
  });
});
