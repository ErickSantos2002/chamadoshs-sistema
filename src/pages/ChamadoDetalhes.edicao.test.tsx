import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ChamadosProvider } from '../context/ChamadosContext';
import { ThemeProvider } from '../context/ThemeContext';
import {
  categoriasService,
  chamadosService,
  comentariosService,
  historicoService,
  usuariosService,
} from '../services/chamadoshsapi';
import { Chamado, StatusEnum, Usuario } from '../types/api';
import ChamadoDetalhes from './ChamadoDetalhes';

/**
 * A edição e as ações da página do chamado, num chamado da TI.
 *
 * ── A trava da TI ─────────────────────────────────────────────────────
 *
 * Estes casos descrevem o corpo exato do PUT da edição, o PUT das ações
 * rápidas, e quem vê o quê.
 *
 * Até o T-1 (fechamento da FE-5) a edição mandava os quatro campos sempre,
 * e desfazia em silêncio o que outra pessoa gravasse num campo que a pessoa
 * nem tocou. Agora vai só a diferença, conferida contra uma releitura, com a
 * versão relida — ver "T-1" abaixo. Desde a API-12 as ações, as marcas e o
 * cancelamento da TI levam a versão do chamado da página.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const CHAMADO = {
  id: 1,
  titulo: 'Umbler sem funcionar',
  protocolo: 'CHAM-2026-0001',
  descricao: 'Não conecta.',
  status: StatusEnum.EM_ANDAMENTO,
  prioridade: 'Média',
  solicitante_id: 2,
  tecnico_responsavel_id: 1,
  categoria_id: null,
  solucao: null,
  cancelado: false,
  arquivado: false,
  data_abertura: '2026-09-01T10:00:00',
} as unknown as Chamado;

const sessao = (role: string) =>
  ({
    user: { id: 1, username: 'rickelme', role, conta_de_servico: false },
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
  }) as React.ContextType<typeof AuthContext>;

let host: HTMLDivElement;
let root: Root;
let noServidor: Chamado;

const montar = async (extra: Partial<Chamado> = {}, role = 'Administrador') => {
  noServidor = { ...CHAMADO, ...extra } as Chamado;
  await act(async () => {
    root.render(
      <AuthContext.Provider value={sessao(role)}>
        <ThemeProvider>
          <ChamadosProvider>
            <MemoryRouter initialEntries={['/chamados/1']}>
              <Routes>
                <Route path="/chamados/:id" element={<ChamadoDetalhes />} />
              </Routes>
            </MemoryRouter>
          </ChamadosProvider>
        </ThemeProvider>
      </AuthContext.Provider>
    );
  });
};

const botao = (texto: string) =>
  Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto);

const clicar = async (el: Element | undefined, oQue: string) => {
  expect(el, `${oQue} não apareceu`).toBeTruthy();
  await act(async () => {
    el!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const nomeAcessivel = (el: Element): string => {
  const ids = el.getAttribute('aria-labelledby');
  if (ids) {
    return ids
      .split(/\s+/)
      .map((i) => document.getElementById(i)?.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
  }
  return el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '';
};

const escolher = async (rotulo: string, opcao: string) => {
  const seletor = Array.from(host.querySelectorAll('[role="combobox"]')).find((b) =>
    nomeAcessivel(b).startsWith(rotulo)
  );
  await clicar(seletor, `seletor "${rotulo}"`);
  const alvo = Array.from(document.querySelectorAll('[role="option"]')).find(
    (o) => o.textContent?.trim() === opcao
  );
  await clicar(alvo, `opção "${opcao}" de "${rotulo}"`);
};

beforeEach(() => {
  // Nada sai sem mock: o `.env` local aponta para produção. A releitura
  // depois de salvar vai por `api.get` direto, e só ela é respondida.
  for (const verbo of ['post', 'put', 'patch', 'delete'] as const) {
    vi.spyOn(api, verbo).mockRejectedValue(new Error(`rede bloqueada no teste: ${verbo}`));
  }
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/chamados/1') return { data: noServidor };
    throw new Error(`rede bloqueada no teste: get ${url}`);
  });
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(chamadosService, 'buscar').mockImplementation(async () => noServidor);
  vi.spyOn(comentariosService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(historicoService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
  // A lista do seletor da TI vem da API-9 (FE-5), não mais de `GET /usuarios/`.
  vi.spyOn(chamadosService, 'listarResponsaveisTI').mockResolvedValue([
    { id: 1, nome: 'rickelme' },
    { id: 3, nome: 'tecnica' },
  ]);
  vi.spyOn(usuariosService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([
    { id: 1, nome: 'rickelme', role_id: 1, ativo: true } as Usuario,
    { id: 3, nome: 'tecnica', role_id: 2, ativo: true } as Usuario,
  ]);
  vi.spyOn(console, 'error').mockImplementation(() => {});

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe('TI — comentar durante a edição', () => {
  /**
   * T-1: a TI ganhou a referência da edição, e com ela a correção do M-2 —
   * a recarga do comentário não repõe mais os campos, e o PUT leva só o que
   * a pessoa mudou. Antes a recarga apagava a prioridade escolhida.
   */
  it('a recarga mantém o que foi editado, e o PUT leva só a diferença', async () => {
    const atualizar = vi
      .spyOn(chamadosService, 'atualizar')
      .mockImplementation(async (_id, dados) => ({ ...noServidor, ...dados }) as Chamado);
    vi.spyOn(comentariosService, 'criar').mockImplementation(
      async (d) => ({ id: 50, ...d }) as never
    );
    await montar();
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    await escolher('Prioridade', 'Alta');

    const campo = host.querySelector<HTMLTextAreaElement>('textarea[aria-label="Novo comentário"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    await act(async () => {
      setter.call(campo, 'Comentário no meio da edição.');
      campo!.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await clicar(botao('Enviar Comentário'), 'Enviar Comentário');
    await clicar(botao('Salvar'), 'Salvar');

    expect(atualizar.mock.calls[0]).toStrictEqual([1, { prioridade: 'Alta' }]);
  });
});

describe('TI — o PUT da edição', () => {
  // T-1: antes iam os quatro campos, mesmo os que não mudaram.
  it('manda só o campo que mudou, relê antes e relê da API depois', async () => {
    const atualizar = vi
      .spyOn(chamadosService, 'atualizar')
      .mockImplementation(async (_id, dados) => ({ ...noServidor, ...dados }) as Chamado);
    await montar();
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    const leiturasAntes = vi.mocked(chamadosService.buscar).mock.calls.length;
    await escolher('Prioridade', 'Alta');
    await clicar(botao('Salvar'), 'Salvar');

    expect(vi.mocked(chamadosService.buscar).mock.calls.length).toBe(leiturasAntes + 1);
    expect(atualizar).toHaveBeenCalledTimes(1);
    // API anterior à 4 (o chamado não traz versão): a diferença vai sem ela.
    expect(atualizar.mock.calls[0]).toStrictEqual([1, { prioridade: 'Alta' }]);
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/chamados/1');
  });

  // T-1: antes um PUT completo saía mesmo sem mudança nenhuma.
  it('salvar sem mexer em nada não manda nada e fecha a edição', async () => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar();
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    await clicar(botao('Salvar'), 'Salvar');

    expect(atualizar).not.toHaveBeenCalled();
    expect(botao('Salvar')).toBeUndefined();
    expect(botao('Editar Detalhes')).toBeTruthy();
  });

  // T-1: com a API-4 o chamado da TI traz versão, e a edição a manda — a da
  // releitura antes do PUT. As ações rápidas da TI seguem sem (abaixo).
  it('API-4: o PUT leva a versão relida antes de salvar', async () => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar({ versao: 6, setor_destino: 'TI' } as Partial<Chamado>);
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    await escolher('Prioridade', 'Alta');
    noServidor = { ...noServidor, versao: 7 } as Chamado;
    await clicar(botao('Salvar'), 'Salvar');

    expect(atualizar.mock.calls[0]).toStrictEqual([1, { prioridade: 'Alta', versao_esperada: 7 }]);
  });

  it('"Sem atribuição" manda null, não some do corpo', async () => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar();
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    await escolher('Técnico responsável', 'Sem atribuição');
    await clicar(botao('Salvar'), 'Salvar');

    expect(atualizar.mock.calls[0][1]).toHaveProperty('tecnico_responsavel_id', null);
  });

  it('as opções de responsável são "Sem atribuição" e a equipe', async () => {
    await montar();
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    const seletor = Array.from(host.querySelectorAll('[role="combobox"]')).find((b) =>
      nomeAcessivel(b).startsWith('Técnico responsável')
    );
    await clicar(seletor, 'seletor de responsável');
    const opcoes = Array.from(document.querySelectorAll('[role="option"]')).map((o) =>
      o.textContent?.trim()
    );
    expect(opcoes).toEqual(['Sem atribuição', 'rickelme', 'tecnica']);
  });
});

describe('TI — as ações rápidas da página', () => {
  it('mudar status manda só o status, pelo PUT', async () => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar();
    await clicar(botao('Aguardando Retorno'), 'Aguardando Retorno');

    expect(atualizar.mock.calls[0]).toStrictEqual([1, { status: StatusEnum.AGUARDANDO }]);
  });

  /**
   * D-12: a página não esconde as ações da equipe num chamado cancelado ou
   * arquivado. Fica como está — mexer nisso é outra decisão.
   */
  it('a equipe ainda vê as ações num chamado cancelado', async () => {
    await montar({ status: StatusEnum.ABERTO, cancelado: true });
    expect(botao('Iniciar Atendimento')).toBeTruthy();
  });

  it('e num arquivado', async () => {
    await montar({ status: StatusEnum.ABERTO, arquivado: true });
    expect(botao('Iniciar Atendimento')).toBeTruthy();
  });
});

describe('TI — cancelar, arquivar e status com versão (API-12)', () => {
  /** O último botão com este texto: o do modal, quando a página tem um igual. */
  const ultimo = (texto: string) =>
    Array.from(host.querySelectorAll('button'))
      .filter((b) => b.textContent?.trim() === texto)
      .pop();

  // Com a API-12 a TI com versão trava a linha: a escrita leva a do chamado
  // que a página mostra — nunca uma relida só para mandar.
  const COM_VERSAO = { versao: 6, setor_destino: 'TI' } as Partial<Chamado>;
  const CONFLITO = {
    response: { status: 409, data: { detail: 'versão', codigo: 'versao_desatualizada', versao_atual: 7 } },
  };
  const SEM_RESPOSTA = { code: 'ECONNABORTED', request: {}, message: 'timeout of 30000ms exceeded' };

  const digitarMotivo = async (texto: string) => {
    const campo = host.querySelector<HTMLTextAreaElement>('#motivo-cancelamento');
    expect(campo, 'campo do motivo').toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    await act(async () => {
      setter.call(campo, texto);
      campo!.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };
  const motivoNoCampo = () => host.querySelector<HTMLTextAreaElement>('#motivo-cancelamento')?.value;
  const avisos = () => vi.mocked(toast.error).mock.calls.map((c) => String(c[0]));

  beforeEach(() => {
    vi.spyOn(toast, 'error').mockImplementation(() => '');
  });

  it('cancelar: o PATCH leva a versão da página e o motivo, a que o cancelamento devolveu', async () => {
    const cancelar = vi
      .spyOn(chamadosService, 'cancelar')
      .mockResolvedValue({ ...CHAMADO, ...COM_VERSAO, versao: 7, cancelado: true } as Chamado);
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar(COM_VERSAO);
    await clicar(botao('Cancelar Chamado'), 'Cancelar Chamado');
    await digitarMotivo('Duplicado do CHAM-2026-0002.');
    await clicar(ultimo('Sim, cancelar'), 'Sim, cancelar');

    expect(cancelar.mock.calls).toStrictEqual([[1, 6]]);
    expect(atualizar.mock.calls).toStrictEqual([
      [1, { solucao: 'Duplicado do CHAM-2026-0002.', versao_esperada: 7 }],
    ]);
  });

  it('cancelar com 409: nada se repete, o motivo fica, e o novo clique leva a versão relida', async () => {
    const cancelar = vi.spyOn(chamadosService, 'cancelar').mockRejectedValueOnce(CONFLITO);
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar(COM_VERSAO);
    await clicar(botao('Cancelar Chamado'), 'Cancelar Chamado');
    await digitarMotivo('Duplicado do CHAM-2026-0002.');
    // Outra pessoa mudou outra coisa: o servidor está na 7, ainda aberto.
    noServidor = { ...noServidor, versao: 7, prioridade: 'Alta' } as Chamado;
    await clicar(ultimo('Sim, cancelar'), 'Sim, cancelar');

    expect(cancelar.mock.calls).toStrictEqual([[1, 6]]);
    expect(atualizar).not.toHaveBeenCalled();
    expect(avisos().some((a) => a.includes('alterado por outra pessoa'))).toBe(true);
    if (!motivoNoCampo()) await clicar(botao('Cancelar Chamado'), 'Cancelar Chamado');
    expect(motivoNoCampo()).toBe('Duplicado do CHAM-2026-0002.');

    // A nova tentativa é um clique da pessoa, já sobre o chamado relido.
    cancelar.mockResolvedValueOnce({ ...noServidor, versao: 8, cancelado: true } as Chamado);
    await clicar(ultimo('Sim, cancelar'), 'Sim, cancelar');
    expect(cancelar.mock.calls).toStrictEqual([[1, 6], [1, 7]]);
    expect(atualizar.mock.calls).toStrictEqual([
      [1, { solucao: 'Duplicado do CHAM-2026-0002.', versao_esperada: 8 }],
    ]);
  });

  it('cancelado por outra pessoa enquanto o motivo era digitado: o motivo não vai por cima', async () => {
    const cancelar = vi.spyOn(chamadosService, 'cancelar').mockRejectedValueOnce(CONFLITO);
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar(COM_VERSAO);
    await clicar(botao('Cancelar Chamado'), 'Cancelar Chamado');
    await digitarMotivo('Duplicado do CHAM-2026-0002.');
    noServidor = { ...noServidor, versao: 7, cancelado: true, solucao: 'Cancelado pela outra pessoa.' } as Chamado;
    await clicar(ultimo('Sim, cancelar'), 'Sim, cancelar');
    const sim = ultimo('Sim, cancelar');
    if (sim) await clicar(sim, 'Sim, cancelar');

    expect(cancelar.mock.calls).toStrictEqual([[1, 6]]);
    expect(atualizar).not.toHaveBeenCalled();
  });

  it('cancelar sem resposta (timeout): "não confirmado", sem reenviar nem gravar o motivo', async () => {
    const cancelar = vi.spyOn(chamadosService, 'cancelar').mockRejectedValue(SEM_RESPOSTA);
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar(COM_VERSAO);
    await clicar(botao('Cancelar Chamado'), 'Cancelar Chamado');
    await digitarMotivo('Duplicado do CHAM-2026-0002.');
    await clicar(ultimo('Sim, cancelar'), 'Sim, cancelar');

    expect(cancelar).toHaveBeenCalledTimes(1);
    expect(atualizar).not.toHaveBeenCalled();
    expect(avisos().some((a) => a.includes('Não foi possível confirmar'))).toBe(true);
    expect(motivoNoCampo()).toBe('Duplicado do CHAM-2026-0002.');
  });

  it('arquivar: o PATCH leva a versão da página', async () => {
    const arquivar = vi.spyOn(chamadosService, 'arquivar').mockResolvedValue(CHAMADO);
    await montar(COM_VERSAO);
    await clicar(botao('Arquivar'), 'Arquivar');
    await clicar(ultimo('Sim, arquivar'), 'Sim, arquivar');

    expect(arquivar.mock.calls).toStrictEqual([[1, 6]]);
  });

  it('arquivar com dois cliques no mesmo quadro: uma marca só', async () => {
    let soltar: (c: Chamado) => void = () => {};
    const arquivar = vi
      .spyOn(chamadosService, 'arquivar')
      .mockImplementation(() => new Promise<Chamado>((r) => (soltar = r)));
    await montar(COM_VERSAO);
    await clicar(botao('Arquivar'), 'Arquivar');
    const sim = ultimo('Sim, arquivar');
    await act(async () => {
      sim!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      sim!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => soltar(CHAMADO));

    expect(arquivar).toHaveBeenCalledTimes(1);
  });

  it('arquivar com 409: nada se repete, e a página relê', async () => {
    const arquivar = vi.spyOn(chamadosService, 'arquivar').mockRejectedValue(CONFLITO);
    await montar(COM_VERSAO);
    // A releitura forçada da página vai por `api.get` (ver o `beforeEach`).
    const leituras = () => vi.mocked(api.get).mock.calls.filter((c) => c[0] === '/chamados/1').length;
    const leiturasAntes = leituras();
    await clicar(botao('Arquivar'), 'Arquivar');
    await clicar(ultimo('Sim, arquivar'), 'Sim, arquivar');

    expect(arquivar).toHaveBeenCalledTimes(1);
    expect(avisos().some((a) => a.includes('alterado por outra pessoa'))).toBe(true);
    expect(leituras()).toBeGreaterThan(leiturasAntes);
  });

  it('desarquivar: o PATCH leva a versão da página', async () => {
    const desarquivar = vi.spyOn(chamadosService, 'desarquivar').mockResolvedValue(CHAMADO);
    await montar({ ...COM_VERSAO, arquivado: true });
    await clicar(botao('Desarquivar'), 'Desarquivar');
    await clicar(ultimo('Sim, desarquivar'), 'Sim, desarquivar');

    expect(desarquivar.mock.calls).toStrictEqual([[1, 6]]);
  });

  it('a mudança de status também leva a versão da página', async () => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar(COM_VERSAO);
    await clicar(botao('Aguardando Retorno'), 'Aguardando Retorno');

    expect(atualizar.mock.calls[0]).toStrictEqual([
      1,
      { status: StatusEnum.AGUARDANDO, versao_esperada: 6 },
    ]);
  });

  it('API anterior à 4 (sem versão): as escritas da TI saem como antes', async () => {
    const cancelar = vi.spyOn(chamadosService, 'cancelar').mockResolvedValue(CHAMADO);
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar({ setor_destino: 'TI' } as Partial<Chamado>);
    await clicar(botao('Cancelar Chamado'), 'Cancelar Chamado');
    await digitarMotivo('Duplicado do CHAM-2026-0002.');
    await clicar(ultimo('Sim, cancelar'), 'Sim, cancelar');

    expect(cancelar.mock.calls).toStrictEqual([[1, undefined]]);
    expect(atualizar.mock.calls).toStrictEqual([[1, { solucao: 'Duplicado do CHAM-2026-0002.' }]]);
  });
});

describe('quem não é da equipe', () => {
  it('não vê edição nem ações rápidas', async () => {
    await montar({}, 'Usuario');
    // Confere que a página carregou, senão o caso passaria à toa.
    expect(host.textContent).toContain('Umbler sem funcionar');
    expect(botao('Editar Detalhes')).toBeUndefined();
    expect(host.textContent).not.toContain('Ações Rápidas');
  });
});

describe('TI — a permissão cai no meio da edição', () => {
  // Escolheu outro responsável, e a revalidação falhou antes do "Salvar": a
  // troca é de quem administra, e sem a permissão vigente o responsável não
  // vai — os outros campos seguem como editados. (Antes do T-1 ia o de
  // antes, que podia desfazer uma troca feita por outra pessoa.)
  it('revalidação falhou: o PUT não leva o responsável', async () => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar();
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    await escolher('Técnico responsável', 'tecnica');
    await escolher('Prioridade', 'Alta');

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ ...sessao('Administrador'), falhaAoConfirmar: true }}>
          <ThemeProvider>
            <ChamadosProvider>
              <MemoryRouter initialEntries={['/chamados/1']}>
                <Routes>
                  <Route path="/chamados/:id" element={<ChamadoDetalhes />} />
                </Routes>
              </MemoryRouter>
            </ChamadosProvider>
          </ThemeProvider>
        </AuthContext.Provider>
      );
    });
    await clicar(botao('Salvar'), 'Salvar');

    expect(atualizar.mock.calls[0]).toStrictEqual([1, { prioridade: 'Alta' }]);
  });
});

/**
 * T-1 — a edição da TI contra a edição de outra pessoa (§6 da especificação).
 *
 * A abre a edição na versão 6; B grava antes de A salvar (aqui, o chamado do
 * servidor muda entre a abertura e o "Salvar"). Classe A: B mudou outro campo
 * — o PUT de A não leva esse campo, e a mudança de B fica. Classe B: B mudou o
 * mesmo campo — nada é salvo, e a tela mostra. A janela entre a releitura e o
 * PUT é da API (409). O que sobra — as duas escritas já dentro da API no mesmo
 * instante, porque o PUT da TI não trava a linha — não se testa aqui.
 */
describe('T-1 — a edição da TI contra a edição de outra pessoa', () => {
  const EM_TI = { versao: 6, setor_destino: 'TI' } as Partial<Chamado>;
  const gravarDeB = (mudanca: Partial<Chamado>) => {
    noServidor = { ...noServidor, ...mudanca, versao: 7 } as Chamado;
  };

  it.each([
    ['prioridade', { prioridade: 'Alta' }],
    ['categoria', { categoria_id: 4 }],
    ['responsável', { tecnico_responsavel_id: 3 }],
    ['solução', { solucao: 'Reinstalado o conector pela equipe.' }],
  ] as const)('classe A: B mudou %s, A muda só o status — o PUT não leva o campo de B', async (_c, mudanca) => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar(EM_TI);
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    await escolher('Status', StatusEnum.AGUARDANDO);
    gravarDeB(mudanca as Partial<Chamado>);
    await clicar(botao('Salvar'), 'Salvar');

    expect(atualizar).toHaveBeenCalledTimes(1);
    expect(atualizar.mock.calls[0]).toStrictEqual([
      1,
      { status: StatusEnum.AGUARDANDO, versao_esperada: 7 },
    ]);
  });

  it('classe A: B mudou o status, A muda só a prioridade — o status de B fica', async () => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar(EM_TI);
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    await escolher('Prioridade', 'Baixa');
    gravarDeB({ status: StatusEnum.AGUARDANDO });
    await clicar(botao('Salvar'), 'Salvar');

    expect(atualizar.mock.calls[0]).toStrictEqual([1, { prioridade: 'Baixa', versao_esperada: 7 }]);
  });

  it.each([
    ['Prioridade', 'Alta', { prioridade: 'Baixa' }, 'Prioridade (agora: Baixa)'],
    ['Status', StatusEnum.AGUARDANDO, { status: StatusEnum.RESOLVIDO }, 'Status (agora: Resolvido)'],
    ['Técnico responsável', 'tecnica', { tecnico_responsavel_id: null }, 'Técnico responsável (agora:'],
  ] as const)(
    'classe B: B mudou %s, e A também — nada é salvo, a tela mostra, e o de A fica',
    async (rotulo, escolhaDeA, mudancaDeB, aviso) => {
      const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
      await montar(EM_TI);
      await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
      await escolher(rotulo, escolhaDeA);
      gravarDeB(mudancaDeB as Partial<Chamado>);
      await clicar(botao('Salvar'), 'Salvar');

      expect(atualizar).not.toHaveBeenCalled();
      expect(host.textContent).toContain('Este chamado mudou enquanto você editava');
      expect(host.textContent).toContain(aviso);
      const seletor = Array.from(host.querySelectorAll('[role="combobox"]')).find((b) =>
        nomeAcessivel(b).startsWith(rotulo)
      );
      expect(seletor?.textContent).toContain(escolhaDeA);

      // Salvar de novo é decisão de A, contra a referência nova.
      await clicar(botao('Salvar'), 'Salvar');
      expect(atualizar).toHaveBeenCalledTimes(1);
      expect(atualizar.mock.calls[0][1]).toHaveProperty('versao_esperada', 7);
    }
  );

  it('409: outra escrita entrou entre a releitura e o PUT — nada repete, e a tela mostra', async () => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockImplementation(async () => {
      noServidor = { ...noServidor, prioridade: 'Urgente', versao: 8 } as unknown as Chamado;
      throw {
        response: {
          status: 409,
          data: { detail: 'Chamado alterado', codigo: 'versao_desatualizada', versao_atual: 8 },
        },
      };
    });
    await montar(EM_TI);
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    await escolher('Status', StatusEnum.AGUARDANDO);
    await clicar(botao('Salvar'), 'Salvar');

    expect(atualizar).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain('Outra pessoa salvou este chamado enquanto você salvava');
    expect(botao('Salvar')).toBeTruthy();

    atualizar.mockResolvedValue(CHAMADO);
    await clicar(botao('Salvar'), 'Salvar');
    expect(atualizar.mock.calls[1]).toStrictEqual([
      1,
      { status: StatusEnum.AGUARDANDO, versao_esperada: 8 },
    ]);
  });

  it('a releitura antes de salvar falha: nada é enviado, e o editado fica', async () => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar(EM_TI);
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    await escolher('Prioridade', 'Alta');
    vi.mocked(chamadosService.buscar).mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await clicar(botao('Salvar'), 'Salvar');

    expect(atualizar).not.toHaveBeenCalled();
    const seletor = Array.from(host.querySelectorAll('[role="combobox"]')).find((b) =>
      nomeAcessivel(b).startsWith('Prioridade')
    );
    expect(seletor?.textContent).toContain('Alta');
  });

  it('cancelar e abrir de novo: a edição parte do chamado, não do que foi cancelado', async () => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar(EM_TI);
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    await escolher('Prioridade', 'Alta');
    await clicar(botao('Cancelar'), 'Cancelar');
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    await clicar(botao('Salvar'), 'Salvar');

    expect(atualizar).not.toHaveBeenCalled();
  });
});
