import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { act, useContext } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AuthContext, AuthProvider } from '../context/AuthContext';
import { ChamadosProvider } from '../context/ChamadosContext';
import { ThemeProvider } from '../context/ThemeContext';
import {
  authService,
  categoriasService,
  chamadosService,
  slaConfigsService,
  usuariosService,
} from '../services/chamadoshsapi';
import { Chamado, PrioridadeEnum, StatusEnum, Usuario, UsuarioLogado } from '../types/api';
import NovoChamadoForm from './NovoChamadoForm';

/**
 * T-2 — quem escolhe o solicitante ao abrir chamado.
 *
 * A API só honra o `solicitante_id` do corpo quando quem abre é administrador
 * humano (`is_admin_humano` em `criar_chamado`, API-11, S3); de qualquer
 * outra conta ela grava quem abriu, em silêncio. A tela segue a mesma regra,
 * por `podeEscolherSolicitante` — o perfil, a marca de pessoa lida nesta
 * sessão e a confirmação vigente. Nada vem do `localStorage`.
 *
 * Contas e ids fictícios.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type Contexto = React.ContextType<typeof AuthContext>;

const sessao = (
  user: NonNullable<Contexto['user']>,
  extra: Partial<Contexto> = {}
): Contexto =>
  ({
    user,
    token: 'token-de-teste',
    loading: false,
    error: null,
    login: async () => {},
    logout: () => {},
    identidadeConfirmada: true,
    falhaAoConfirmar: false,
    confirmacaoRecusada: false,
    revalidando: false,
    revalidarIdentidade: async () => {},
    ...extra,
  }) as Contexto;

const ADMIN_ID = 1;
const ADMIN_HUMANO = sessao({ id: ADMIN_ID, username: 'admin.ficticio', role: 'Administrador', role_id: 1, conta_de_servico: false });
const ADMIN_SERVICO = sessao({ id: 2, username: 'painel.ficticio', role: 'Administrador', role_id: 1, conta_de_servico: true });
const ADMIN_SEM_MARCA = sessao({ id: 4, username: 'admin.sem.marca', role: 'Administrador', role_id: 1 });
const TECNICO_TI = sessao({ id: 3, username: 'tec.ti', role: 'Tecnico', role_id: 2, setor_id: 10, integra_equipe_ti: true });
const TECNICO_QUALIDADE = sessao({ id: 5, username: 'tec.qualidade', role: 'Tecnico', role_id: 2, setor_id: 20, integra_equipe_ti: false });
const TECNICO_OUTRO = sessao({ id: 6, username: 'tec.outro', role: 'Tecnico', role_id: 2, setor_id: 30, integra_equipe_ti: false });
const TECNICO_SEM_SETOR = sessao({ id: 7, username: 'tec.sem.setor', role: 'Tecnico', role_id: 2, integra_equipe_ti: false });
const USUARIO = sessao({ id: 8, username: 'usuario.comum', role: 'Usuario', role_id: 3 });
const ADMIN_CONFIRMANDO = { ...ADMIN_HUMANO, identidadeConfirmada: false } as Contexto;
const ADMIN_FALHOU = { ...ADMIN_HUMANO, falhaAoConfirmar: true } as Contexto;
const ADMIN_RECUSADO = { ...ADMIN_HUMANO, identidadeConfirmada: false, falhaAoConfirmar: true, confirmacaoRecusada: true } as Contexto;

const CRIADO = {
  id: 99,
  protocolo: 'CHAM-2026-0099',
  titulo: 'Impressora do RH sem papel',
  descricao: 'x',
  status: StatusEnum.ABERTO,
  prioridade: PrioridadeEnum.MEDIA,
  solicitante_id: 21,
  cancelado: false,
  arquivado: false,
} as unknown as Chamado;

const DESCRICAO_OK = 'A impressora do RH parou de puxar papel desde ontem.';
const AVISO_DE_CONFIRMACAO = 'A escolha do solicitante aparece quando suas permissões forem confirmadas.';

let host: HTMLDivElement;
let root: Root;
let criar: ReturnType<typeof vi.fn>;
let listarUsuarios: MockInstance<typeof usuariosService.listar>;
let aoCriar: ReturnType<typeof vi.fn>;

const arvore = (conteudo: React.ReactNode) => (
  <ThemeProvider>
    <ChamadosProvider>{conteudo}</ChamadosProvider>
  </ThemeProvider>
);

const formulario = () => <NovoChamadoForm aoCriar={aoCriar} aoCancelar={() => {}} />;

/**
 * Monta e marca a TI: o solicitante só aparece depois do setor (1.8.0).
 * `setor: null` só renderiza de novo, sem tocar na escolha — para trocar a
 * identidade com o formulário já preenchido.
 */
const montar = async (quem: Contexto, { setor = 'TI' }: { setor?: 'TI' | null } = {}) => {
  await act(async () => {
    root.render(<AuthContext.Provider value={quem}>{arvore(formulario())}</AuthContext.Provider>);
  });
  if (setor) await escolherSetor(setor);
};

/**
 * Marca o setor de atendimento pelo rótulo, como a pessoa (1.8.0: a escolha é
 * obrigatória e nasce vazia, e os campos só aparecem depois dela).
 */
const escolherSetor = async (rotulo: 'TI' | 'Qualidade') => {
  const alvo = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]')).find(
    (r) => r.closest('label')?.textContent?.trim().startsWith(rotulo)
  );
  expect(alvo, `rádio "${rotulo}" não apareceu`).toBeTruthy();
  await act(async () => {
    alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};


/** Desmonta e monta de novo: `root.render` repetido só reconcilia. */
const remontar = async (quem: Contexto) => {
  act(() => root.unmount());
  root = createRoot(host);
  await montar(quem);
};

const digitar = async (id: string, valor: string) => {
  const campo = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
  expect(campo, `campo #${id} não apareceu`).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(campo), 'value')!.set!;
  await act(async () => {
    setter.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const escolher = async (id: string, opcao: string) => {
  const gatilho = document.getElementById(id);
  expect(gatilho, `seletor #${id} não apareceu`).toBeTruthy();
  await act(async () => {
    gatilho!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  const alvo = Array.from(document.querySelectorAll('[role="option"]')).find(
    (o) => o.textContent?.trim() === opcao
  );
  expect(alvo, `opção "${opcao}" não apareceu`).toBeTruthy();
  await act(async () => {
    alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const enviar = async () => {
  const botao = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === 'Abrir chamado'
  );
  await act(async () => {
    botao!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const preencher = async () => {
  await digitar('titulo', 'Impressora do RH sem papel');
  await digitar('descricao', DESCRICAO_OK);
};

const temSeletor = () => document.getElementById('solicitante') !== null;
const corpo = () => criar.mock.calls[criar.mock.calls.length - 1][0];
const texto = () => document.body.textContent ?? '';

beforeEach(() => {
  criar = vi.fn().mockResolvedValue(CRIADO);
  vi.spyOn(chamadosService, 'criar').mockImplementation(criar);
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(chamadosService, 'listarAtendentesQualidade').mockRejectedValue({
    response: { status: 503, data: {} },
  });
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
  listarUsuarios = vi.spyOn(usuariosService, 'listar').mockResolvedValue([
    { id: 21, nome: 'Gabriel Ficticio', role_id: 3, ativo: true },
    { id: 22, nome: 'Lidia Ficticia', role_id: 3, ativo: true },
  ] as Usuario[]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(slaConfigsService, 'listar').mockResolvedValue([]);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  aoCriar = vi.fn();

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('T-2 — quem vê o seletor de solicitante', () => {
  it('1. administrador humano confirmado vê o seletor, e a lista de pessoas é pedida', async () => {
    await montar(ADMIN_HUMANO);
    expect(temSeletor()).toBe(true);
    expect(listarUsuarios).toHaveBeenCalled();
    expect(texto()).not.toContain(AVISO_DE_CONFIRMACAO);
  });

  it.each([
    ['3. administrador de serviço', ADMIN_SERVICO],
    ['   administrador sem a marca de pessoa lida', ADMIN_SEM_MARCA],
    ['4. técnico da TI', TECNICO_TI],
    ['5. técnico da Qualidade', TECNICO_QUALIDADE],
    ['6. técnico de outro setor', TECNICO_OUTRO],
    ['7. técnico sem setor', TECNICO_SEM_SETOR],
    ['8. usuário comum', USUARIO],
  ])('%s não vê o seletor, e a lista de pessoas não é pedida', async (_nome, quem) => {
    await remontar(quem);
    expect(temSeletor()).toBe(false);
    expect(listarUsuarios).not.toHaveBeenCalled();
  });

  it('a conta de serviço administradora não recebe o aviso de confirmação: a resposta já é não', async () => {
    await montar(ADMIN_SERVICO);
    expect(texto()).not.toContain(AVISO_DE_CONFIRMACAO);
  });

  it('9. permissão desconhecida (confirmando) não vê, e a tela diz por quê', async () => {
    await montar(ADMIN_CONFIRMANDO);
    expect(temSeletor()).toBe(false);
    expect(texto()).toContain(AVISO_DE_CONFIRMACAO);
  });

  it('10. falha de revalidação não mostra — nem a de rede, nem o 403', async () => {
    for (const quem of [ADMIN_FALHOU, ADMIN_RECUSADO]) {
      await remontar(quem);
      expect(temSeletor()).toBe(false);
      expect(texto()).toContain(AVISO_DE_CONFIRMACAO);
    }
  });

  it('o técnico não recebe o aviso: para ele a escolha nunca existe', async () => {
    await montar({ ...TECNICO_TI, falhaAoConfirmar: true } as Contexto);
    expect(texto()).not.toContain(AVISO_DE_CONFIRMACAO);
  });
});

describe('T-2 — o corpo enviado', () => {
  it('2/16. o administrador humano escolhe o solicitante, e é ele que vai', async () => {
    await montar(ADMIN_HUMANO);
    await preencher();
    await escolher('solicitante', 'Lidia Ficticia');
    await enviar();
    expect(criar).toHaveBeenCalledTimes(1);
    expect(corpo().solicitante_id).toBe(22);
    expect(aoCriar).toHaveBeenCalledWith(CRIADO);
  });

  it('o administrador humano sem escolher: "Selecione o solicitante.", nada enviado', async () => {
    await montar(ADMIN_HUMANO);
    await preencher();
    await enviar();
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('Selecione o solicitante.');
    expect(criar).not.toHaveBeenCalled();
  });

  it.each([
    ['administrador de serviço', ADMIN_SERVICO, 2],
    ['técnico da TI', TECNICO_TI, 3],
    ['técnico da Qualidade', TECNICO_QUALIDADE, 5],
    ['usuário comum', USUARIO, 8],
    ['administrador confirmando', ADMIN_CONFIRMANDO, ADMIN_ID],
  ])('14. %s abre para si: o próprio id, e a criação segue', async (_nome, quem, id) => {
    await remontar(quem);
    await preencher();
    await enviar();
    expect(criar).toHaveBeenCalledTimes(1);
    expect(corpo().solicitante_id).toBe(id);
    expect(aoCriar).toHaveBeenCalledWith(CRIADO);
  });

  it('11/13. permissão revogada depois de escolher: o seletor sai, e o id escolhido não vai', async () => {
    await montar(ADMIN_HUMANO);
    await preencher();
    await escolher('solicitante', 'Gabriel Ficticio');

    // A revalidação seguinte diz que a conta é de serviço.
    await montar(ADMIN_SERVICO);
    expect(temSeletor()).toBe(false);
    await enviar();
    expect(corpo().solicitante_id).toBe(2);

    // E a que falha também tira a escolha.
    await montar(ADMIN_HUMANO);
    expect(temSeletor()).toBe(true);
    await montar(ADMIN_FALHOU);
    expect(temSeletor()).toBe(false);
    await enviar();
    expect(corpo().solicitante_id).toBe(ADMIN_ID);
  });

  it('11/13 na Qualidade: a permissão revogada também tira o id escolhido do corpo', async () => {
    vi.mocked(chamadosService.listarAtendentesQualidade).mockResolvedValue([
      { id: 31, nome: 'Ana Qualidade Ficticia' },
    ]);
    await montar(ADMIN_HUMANO);
    const qualidade = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]')).find(
      (r) => r.closest('label')?.textContent?.trim().startsWith('Qualidade')
    );
    await act(async () => {
      qualidade!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await digitar('descricao', DESCRICAO_OK);
    await escolher('solicitante', 'Gabriel Ficticio');
    await escolher('responsavel', 'Ana Qualidade Ficticia');

    await montar(ADMIN_SERVICO, { setor: null });
    expect(temSeletor()).toBe(false);
    await enviar();
    expect(corpo()).toMatchObject({ setor_destino: 'QUALIDADE', solicitante_id: 2 });
  });

  it('15. erro recuperável: o que foi digitado e o solicitante escolhido ficam', async () => {
    criar.mockRejectedValue({ response: { status: 503, data: { detail: 'Indisponível' } } });
    await montar(ADMIN_HUMANO);
    await preencher();
    await escolher('solicitante', 'Lidia Ficticia');
    await enviar();

    expect(aoCriar).not.toHaveBeenCalled();
    expect((document.getElementById('titulo') as HTMLInputElement).value).toBe(
      'Impressora do RH sem papel'
    );
    expect((document.getElementById('descricao') as HTMLTextAreaElement).value).toBe(DESCRICAO_OK);
    expect(document.getElementById('solicitante')?.textContent).toContain('Lidia Ficticia');

    // A nova tentativa é da pessoa, com a mesma escolha.
    criar.mockResolvedValue(CRIADO);
    await enviar();
    expect(corpo().solicitante_id).toBe(22);
    expect(aoCriar).toHaveBeenCalledWith(CRIADO);
  });
});

describe('T-2 — com o AuthProvider de verdade', () => {
  let revalidar: () => Promise<void>;
  const Leitor: React.FC = () => {
    revalidar = useContext(AuthContext).revalidarIdentidade;
    return null;
  };

  const meDoAdmin = (): UsuarioLogado =>
    ({
      id: ADMIN_ID,
      nome: 'admin.ficticio',
      setor_id: null,
      role_id: 1,
      ativo: true,
      integra_equipe_ti: false,
    }) as unknown as UsuarioLogado;

  const montarComProvider = async () => {
    // O `localStorage` diz administrador — e não decide nada.
    localStorage.setItem('token', 'token-de-teste');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: ADMIN_ID, nome: 'admin.ficticio', role: 'Administrador', role_id: 1 })
    );
    await act(async () => {
      root.render(
        <AuthProvider>
          <Leitor />
          {arvore(formulario())}
        </AuthProvider>
      );
    });
    await escolherSetor('TI');
  };

  const adiado = <T,>() => {
    let resolver!: (valor: T) => void;
    const promessa = new Promise<T>((r) => (resolver = r));
    return { promessa, resolver };
  };

  it('o perfil do localStorage não mostra o seletor antes da confirmação', async () => {
    const primeiro = adiado<UsuarioLogado>();
    vi.spyOn(authService, 'me').mockReturnValue(primeiro.promessa);
    const buscar = vi
      .spyOn(usuariosService, 'buscar')
      .mockResolvedValue({ id: ADMIN_ID, conta_de_servico: false } as Usuario);

    await montarComProvider();
    expect(temSeletor()).toBe(false);
    expect(texto()).toContain(AVISO_DE_CONFIRMACAO);

    await act(async () => {
      primeiro.resolver(meDoAdmin());
    });
    expect(buscar).toHaveBeenCalledWith(ADMIN_ID);
    expect(temSeletor()).toBe(true);
    expect(texto()).not.toContain(AVISO_DE_CONFIRMACAO);
  });

  it('12. resposta antiga não restaura o seletor', async () => {
    const antigo = adiado<UsuarioLogado>();
    const novo = adiado<UsuarioLogado>();
    vi.spyOn(authService, 'me')
      .mockReturnValueOnce(antigo.promessa)
      .mockReturnValueOnce(novo.promessa);
    // A leitura nova diz conta de serviço; se a antiga fosse aplicada, ela
    // pediria a marca de novo e receberia "pessoa".
    vi.spyOn(usuariosService, 'buscar')
      .mockResolvedValueOnce({ id: ADMIN_ID, conta_de_servico: true } as Usuario)
      .mockResolvedValue({ id: ADMIN_ID, conta_de_servico: false } as Usuario);

    await montarComProvider();
    await act(async () => {
      void revalidar();
    });
    await act(async () => {
      novo.resolver(meDoAdmin());
    });
    expect(temSeletor()).toBe(false);

    await act(async () => {
      antigo.resolver(meDoAdmin());
    });
    expect(temSeletor()).toBe(false);

    await preencher();
    await enviar();
    expect(corpo().solicitante_id).toBe(ADMIN_ID);
  });

  it('a marca de pessoa que não pôde ser lida não mostra o seletor', async () => {
    vi.spyOn(authService, 'me').mockResolvedValue(meDoAdmin());
    vi.spyOn(usuariosService, 'buscar').mockRejectedValue({ request: {}, message: 'Network Error' });

    await montarComProvider();
    expect(temSeletor()).toBe(false);
    expect(texto()).toContain(AVISO_DE_CONFIRMACAO);
  });
});
