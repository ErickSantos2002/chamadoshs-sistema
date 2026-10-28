import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
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
import { Chamado, SetorDestinoEnum, StatusEnum, Usuario } from '../types/api';
import ChamadoDetalhes from './ChamadoDetalhes';

/**
 * A página de um chamado da Qualidade.
 *
 * Quem atende pela rota restrita vê as ações do `AcoesRapidas` NO LUGAR das
 * da página — um conjunto só de botões. Quem não atende vê a página como ela
 * era: a equipe com as ações de sempre, o usuário comum sem nenhuma.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const CHAMADO = {
  id: 1,
  titulo: 'Desvio na calibração',
  protocolo: 'CHAM-2026-0101',
  descricao: 'Paquímetro fora da tolerância.',
  status: StatusEnum.EM_ANDAMENTO,
  prioridade: 'Média',
  solicitante_id: 2,
  tecnico_responsavel_id: 7,
  categoria_id: null,
  solucao: null,
  setor_destino: SetorDestinoEnum.QUALIDADE,
  cancelado: false,
  arquivado: false,
  data_abertura: '2026-09-01T10:00:00',
} as unknown as Chamado;

const sessao = (id: number, role: string) =>
  ({
    user: { id, username: `u${id}`, role },
    token: 'token-de-teste',
    loading: false,
    error: null,
    login: async () => {},
    logout: () => {},
  }) as React.ContextType<typeof AuthContext>;

const USUARIO = sessao(7, 'Usuario');
const ADMIN = sessao(1, 'Administrador');

let host: HTMLDivElement;
let root: Root;
let noServidor: Chamado;
let atender: MockInstance<typeof chamadosService.atender>;

const montar = async (quem: React.ContextType<typeof AuthContext>, extra: Partial<Chamado> = {}) => {
  noServidor = { ...CHAMADO, ...extra } as Chamado;
  await act(async () => {
    root.render(
      <AuthContext.Provider value={quem}>
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

const textos = () =>
  Array.from(host.querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');

const clicar = async (texto: string) => {
  const alvo = Array.from(host.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === texto
  );
  expect(alvo, `botão "${texto}" não apareceu`).toBeTruthy();
  await act(async () => {
    alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

/** O `<dd>` do par cujo `<dt>` diz `rotulo`. */
const valorDe = (rotulo: string) => {
  const dt = Array.from(host.querySelectorAll('dt')).find((d) => d.textContent?.trim() === rotulo);
  return dt?.nextElementSibling?.textContent?.trim();
};

beforeEach(() => {
  for (const verbo of ['post', 'put', 'patch', 'delete'] as const) {
    vi.spyOn(api, verbo).mockRejectedValue(new Error(`rede bloqueada no teste: ${verbo}`));
  }
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/chamados/1') return { data: noServidor };
    throw new Error(`rede bloqueada no teste: get ${url}`);
  });
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(chamadosService, 'buscar').mockImplementation(async () => noServidor);
  vi.spyOn(chamadosService, 'sondarAtendimento').mockResolvedValue({
    status: 405,
    dados: { detail: 'Method Not Allowed' },
  });
  vi.spyOn(chamadosService, 'listarAtendentesQualidade').mockResolvedValue([
    { id: 7, nome: 'Ana da Qualidade' },
    { id: 1, nome: 'rickelme' },
  ]);
  atender = vi
    .spyOn(chamadosService, 'atender')
    .mockImplementation(async (_id, corpo) => ({ ...noServidor, status: corpo.status }) as Chamado);
  vi.spyOn(comentariosService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(historicoService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([
    { id: 1, nome: 'rickelme', role_id: 1, ativo: true } as Usuario,
    { id: 7, nome: 'Ana da Qualidade', role_id: 3, ativo: true } as Usuario,
  ]);
  vi.spyOn(toast, 'error').mockImplementation(() => '');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe('Qualidade — o atendimento na página', () => {
  it('usuário comum responsável: as ações restritas, sem edição', async () => {
    await montar(USUARIO);
    expect(host.textContent).toContain('Ações Rápidas');
    expect(textos()).toContain('Aguardando retorno');
    expect(textos()).toContain('Marcar como resolvido');
    expect(textos()).not.toContain('Editar Detalhes');
  });

  it('o nome do responsável aparece para quem não é da equipe', async () => {
    await montar(USUARIO);
    expect(valorDe('Técnico Responsável')).toContain('Ana da Qualidade');
  });

  it('atender: PATCH, e a página, o status e o histórico se atualizam sem recarga', async () => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar');
    await montar(USUARIO);
    const historicos = vi.mocked(historicoService.listarPorChamado).mock.calls.length;
    vi.mocked(api.get).mockClear();
    await clicar('Aguardando retorno');

    expect(atender.mock.calls).toStrictEqual([[1, { status: StatusEnum.AGUARDANDO }]]);
    expect(atualizar).not.toHaveBeenCalled();
    expect(vi.mocked(historicoService.listarPorChamado).mock.calls.length).toBe(historicos + 1);
    expect(vi.mocked(api.get)).not.toHaveBeenCalled();
    expect(textos()).toContain('Retomar atendimento');
    expect(host.textContent).toContain('Aguardando');
  });

  it('administrador responsável e elegível: as restritas no lugar das da página', async () => {
    await montar(ADMIN, { tecnico_responsavel_id: 1 });
    expect(textos()).toContain('Aguardando retorno');
    expect(textos()).not.toContain('Aguardando Retorno');
    expect(textos()).toContain('Editar Detalhes');
  });

  it('administrador que não é o responsável: as da página, como sempre', async () => {
    await montar(ADMIN);
    expect(textos()).toContain('Aguardando Retorno');
    expect(textos()).not.toContain('Aguardando retorno');
  });

  it('API sem a rota: usuário comum sem painel de ações', async () => {
    vi.mocked(chamadosService.sondarAtendimento).mockResolvedValue({
      status: 404,
      dados: { detail: 'Not Found' },
    });
    await montar(USUARIO);
    expect(host.textContent).toContain('Desvio na calibração');
    expect(host.textContent).not.toContain('Ações Rápidas');
  });

  it('cancelado: usuário comum sem painel; a equipe segue com as da página (D-12)', async () => {
    await montar(USUARIO, { cancelado: true });
    expect(host.textContent).toContain('Desvio na calibração');
    expect(host.textContent).not.toContain('Ações Rápidas');

    act(() => root.unmount());
    root = createRoot(host);
    await montar(ADMIN, { cancelado: true, tecnico_responsavel_id: 1 });
    expect(textos()).toContain('Aguardando Retorno');
    expect(textos()).not.toContain('Aguardando retorno');
  });

  it('erro de conflito: a página relê o chamado da API', async () => {
    atender.mockRejectedValue({
      response: { status: 409, data: { detail: 'Chamado arquivado não pode ser atendido' } },
    });
    await montar(USUARIO);
    vi.mocked(api.get).mockClear();
    noServidor = { ...noServidor, arquivado: true } as Chamado;
    await clicar('Aguardando retorno');
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Chamado arquivado não pode ser atendido');
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/chamados/1');
    expect(host.textContent).not.toContain('Ações Rápidas');
  });

  it('chamado da TI atribuído ao usuário: nada é sondado, e sem painel', async () => {
    await montar(USUARIO, { setor_destino: SetorDestinoEnum.TI } as Partial<Chamado>);
    expect(chamadosService.sondarAtendimento).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain('Ações Rápidas');
  });
});

describe('Qualidade — o responsável na edição', () => {
  const seletorTecnico = () =>
    Array.from(host.querySelectorAll('[role="combobox"]')).find((b) =>
      (b.getAttribute('aria-labelledby') ?? '')
        .split(/\s+/)
        .some((i) => document.getElementById(i)?.textContent?.includes('Técnico responsável'))
    ) as HTMLElement | undefined;

  const opcoesDoTecnico = async () => {
    const s = seletorTecnico();
    expect(s, 'seletor do técnico não apareceu').toBeTruthy();
    await act(async () => {
      s!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    return Array.from(document.querySelectorAll('[role="option"]'));
  };

  const editar = async (extra: Partial<Chamado> = {}) => {
    await montar(ADMIN, extra);
    await clicar('Editar Detalhes');
  };

  it('as opções são os atendentes, sem "Sem atribuição"', async () => {
    await editar();
    const opcoes = (await opcoesDoTecnico()).map((o) => o.textContent?.trim());
    expect(opcoes).toEqual(['Ana da Qualidade', 'rickelme']);
  });

  it('o atual fora dos atendentes continua como escolha', async () => {
    await editar({ tecnico_responsavel_id: 12 });
    expect(seletorTecnico()?.textContent).toContain('Usuário #12 (fora dos atendentes)');
  });

  it('trocar e salvar leva o novo responsável', async () => {
    const atualizar = vi
      .spyOn(chamadosService, 'atualizar')
      .mockImplementation(async (_id, d) => ({ ...noServidor, ...d }) as Chamado);
    await editar();
    const alvo = (await opcoesDoTecnico()).find((o) => o.textContent?.trim() === 'rickelme');
    await act(async () => {
      alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await clicar('Salvar');
    expect(atualizar).toHaveBeenCalledTimes(1);
    expect(atualizar.mock.calls[0][1]).toHaveProperty('tecnico_responsavel_id', 1);
  });

  it('API sem a rota: o responsável fica só leitura na edição', async () => {
    vi.mocked(chamadosService.sondarAtendimento).mockResolvedValue({
      status: 404,
      dados: { detail: 'Not Found' },
    });
    await editar();
    expect(textos()).toContain('Salvar');
    expect(seletorTecnico()).toBeUndefined();
    expect(host.textContent).toContain('A troca de responsável da Qualidade não está disponível agora.');
  });

  it('chamado da TI: o seletor de sempre', async () => {
    vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([
      { id: 1, nome: 'rickelme', role_id: 1, ativo: true } as Usuario,
    ]);
    await editar({ setor_destino: SetorDestinoEnum.TI } as Partial<Chamado>);
    const opcoes = (await opcoesDoTecnico()).map((o) => o.textContent?.trim());
    expect(opcoes).toEqual(['Sem atribuição', 'rickelme']);
  });
});

/**
 * D-9: a edição da Qualidade relê o chamado ao entrar e antes de salvar, e
 * manda só o que mudou. A da TI segue como estava (`ChamadoDetalhes.edicao`).
 */
describe('Qualidade — edição segura', () => {
  const nomeDe = (el: Element) =>
    (el.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/)
      .map((i) => document.getElementById(i)?.textContent?.trim() ?? '')
      .join(' ');

  const seletor = (rotulo: string) =>
    Array.from(host.querySelectorAll('[role="combobox"]')).find((b) =>
      nomeDe(b).startsWith(rotulo)
    ) as HTMLElement | undefined;

  const escolher = async (rotulo: string, opcao: string) => {
    const s = seletor(rotulo);
    expect(s, `seletor "${rotulo}" não apareceu`).toBeTruthy();
    await act(async () => {
      s!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const alvo = Array.from(document.querySelectorAll('[role="option"]')).find(
      (o) => o.textContent?.trim() === opcao
    );
    expect(alvo, `opção "${opcao}" não apareceu`).toBeTruthy();
    await act(async () => {
      alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  let atualizar: MockInstance<typeof chamadosService.atualizar>;

  beforeEach(() => {
    atualizar = vi
      .spyOn(chamadosService, 'atualizar')
      .mockImplementation(async (_id, d) => ({ ...noServidor, ...d }) as Chamado);
  });

  /** Outra pessoa salvou entre a abertura e o salvamento. */
  const mudarNoServidor = (extra: Partial<Chamado>) => {
    noServidor = { ...noServidor, ...extra } as Chamado;
  };

  it('entrar relê o chamado, e os campos partem do que está no servidor agora', async () => {
    await montar(ADMIN);
    mudarNoServidor({ prioridade: 'Alta' as Chamado['prioridade'] });
    const leituras = vi.mocked(chamadosService.buscar).mock.calls.length;
    await clicar('Editar Detalhes');
    expect(vi.mocked(chamadosService.buscar).mock.calls.length).toBe(leituras + 1);
    expect(seletor('Prioridade')?.textContent).toContain('Alta');
  });

  /**
   * A referência é a releitura, e não o que a página tinha: se o servidor já
   * mudou antes de a pessoa abrir a edição, isso não é conflito dela.
   */
  it('servidor mudou antes de abrir a edição: sem conflito falso, e só o campo editado', async () => {
    await montar(ADMIN);
    mudarNoServidor({ prioridade: 'Alta' as Chamado['prioridade'] });
    await clicar('Editar Detalhes');
    await escolher('Status', 'Aguardando');
    await clicar('Salvar');
    expect(host.textContent).not.toContain('Este chamado mudou enquanto você editava');
    expect(atualizar.mock.calls).toStrictEqual([[1, { status: StatusEnum.AGUARDANDO }]]);
  });

  it('salvar manda só o que mudou', async () => {
    await montar(ADMIN);
    await clicar('Editar Detalhes');
    await escolher('Prioridade', 'Alta');
    await clicar('Salvar');
    expect(atualizar.mock.calls).toStrictEqual([[1, { prioridade: 'Alta' }]]);
    expect(textos()).toContain('Editar Detalhes');
  });

  it('sem mudança: nenhuma requisição de escrita, e a edição fecha', async () => {
    await montar(ADMIN);
    await clicar('Editar Detalhes');
    await clicar('Salvar');
    expect(atualizar).not.toHaveBeenCalled();
    expect(textos()).toContain('Editar Detalhes');
  });

  it('relê antes do PUT', async () => {
    await montar(ADMIN);
    await clicar('Editar Detalhes');
    await escolher('Prioridade', 'Alta');
    const leituras = vi.mocked(chamadosService.buscar).mock.calls.length;
    await clicar('Salvar');
    expect(vi.mocked(chamadosService.buscar).mock.calls.length).toBe(leituras + 1);
  });

  it('mudança remota num campo que a pessoa não editou: salva só o dela', async () => {
    await montar(ADMIN);
    await clicar('Editar Detalhes');
    await escolher('Prioridade', 'Alta');
    mudarNoServidor({ status: StatusEnum.AGUARDANDO });
    await clicar('Salvar');
    expect(atualizar.mock.calls).toStrictEqual([[1, { prioridade: 'Alta' }]]);
    expect(host.textContent).not.toContain('Este chamado mudou enquanto você editava');
  });

  it('conflito: não salva, avisa, mantém o que foi digitado e atualiza o resto', async () => {
    await montar(ADMIN);
    await clicar('Editar Detalhes');
    await escolher('Status', 'Resolvido');
    await escolher('Prioridade', 'Baixa');
    // Outra pessoa mexeu nos dois campos que esta pessoa também editou.
    mudarNoServidor({ status: StatusEnum.AGUARDANDO, prioridade: 'Alta' as Chamado['prioridade'] });
    await clicar('Salvar');

    expect(atualizar).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Este chamado mudou enquanto você editava');
    expect(host.textContent).toContain('Status (agora: Aguardando)');
    expect(host.textContent).toContain('Prioridade (agora: Alta)');
    // O que a pessoa escolheu continua nos campos, e a edição continua aberta.
    expect(seletor('Status')?.textContent).toContain('Resolvido');
    expect(seletor('Prioridade')?.textContent).toContain('Baixa');
    expect(textos()).toContain('Salvar');
  });

  it('depois do conflito, salvar de novo leva a escolha contra o valor de agora', async () => {
    await montar(ADMIN);
    await clicar('Editar Detalhes');
    await escolher('Prioridade', 'Baixa');
    mudarNoServidor({ prioridade: 'Alta' as Chamado['prioridade'] });
    await clicar('Salvar');
    expect(atualizar).not.toHaveBeenCalled();

    await clicar('Salvar');
    expect(atualizar.mock.calls).toStrictEqual([[1, { prioridade: 'Baixa' }]]);
  });

  it('o campo não editado passa a mostrar o valor de agora depois do conflito', async () => {
    await montar(ADMIN);
    await clicar('Editar Detalhes');
    await escolher('Prioridade', 'Baixa');
    mudarNoServidor({ prioridade: 'Alta' as Chamado['prioridade'], status: StatusEnum.AGUARDANDO });
    await clicar('Salvar');
    expect(seletor('Status')?.textContent).toContain('Aguardando');
  });

  it('a releitura antes do PUT falha: não salva, avisa e mantém a edição', async () => {
    await montar(ADMIN);
    await clicar('Editar Detalhes');
    await escolher('Prioridade', 'Alta');
    vi.mocked(chamadosService.buscar).mockRejectedValue(new Error('rede'));
    await clicar('Salvar');
    expect(atualizar).not.toHaveBeenCalled();
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
      'Não foi possível conferir o chamado antes de salvar. O que você editou foi mantido.'
    );
    expect(seletor('Prioridade')?.textContent).toContain('Alta');
  });

  it('erro no PUT: avisa sem trocar a página, e a edição fica aberta', async () => {
    atualizar.mockRejectedValue({
      response: { status: 400, data: { detail: 'Atendente não é elegível para a Qualidade' } },
    });
    await montar(ADMIN);
    await clicar('Editar Detalhes');
    await escolher('Prioridade', 'Alta');
    await clicar('Salvar');
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Atendente não é elegível para a Qualidade');
    expect(host.textContent).toContain('Desvio na calibração');
    expect(textos()).toContain('Salvar');
  });

  it('cancelar e reabrir parte de uma nova releitura, sem aviso antigo', async () => {
    await montar(ADMIN);
    await clicar('Editar Detalhes');
    await escolher('Prioridade', 'Baixa');
    mudarNoServidor({ prioridade: 'Alta' as Chamado['prioridade'] });
    await clicar('Salvar');
    await clicar('Cancelar');
    await clicar('Editar Detalhes');
    expect(host.textContent).not.toContain('Este chamado mudou enquanto você editava');
    expect(seletor('Prioridade')?.textContent).toContain('Alta');
  });
});

/**
 * M-2: comentar durante a edição recarrega a página (`carregarDados`), e a
 * recarga repunha os valores do servidor em todos os campos — o que a pessoa
 * tinha escolhido sumia, e uma mudança de outra pessoa entrava no formulário
 * como se fosse dela. Agora a recarga atualiza o chamado, os comentários e o
 * histórico, e a edição aberta fica como estava, contra a mesma referência.
 */
describe('Qualidade — comentar durante a edição', () => {
  const nomeDe = (el: Element) =>
    (el.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/)
      .map((i) => document.getElementById(i)?.textContent?.trim() ?? '')
      .join(' ');

  const seletor = (rotulo: string) =>
    Array.from(host.querySelectorAll('[role="combobox"]')).find((b) =>
      nomeDe(b).startsWith(rotulo)
    ) as HTMLElement | undefined;

  const escolher = async (rotulo: string, opcao: string) => {
    const s = seletor(rotulo);
    expect(s, `seletor "${rotulo}" não apareceu`).toBeTruthy();
    await act(async () => {
      s!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const alvo = Array.from(document.querySelectorAll('[role="option"]')).find(
      (o) => o.textContent?.trim() === opcao
    );
    expect(alvo, `opção "${opcao}" não apareceu`).toBeTruthy();
    await act(async () => {
      alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  const digitar = async (rotulo: string, valor: string) => {
    const campo = host.querySelector<HTMLTextAreaElement>(`textarea[aria-label="${rotulo}"]`);
    expect(campo, `campo "${rotulo}" não apareceu`).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    await act(async () => {
      setter.call(campo, valor);
      campo!.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  const comentar = async (texto: string) => {
    await digitar('Novo comentário', texto);
    await clicar('Enviar Comentário');
  };

  const solucaoNaTela = () =>
    host.querySelector<HTMLTextAreaElement>('textarea[aria-label="Solução"]')?.value;

  const mudarNoServidor = (extra: Partial<Chamado>) => {
    noServidor = { ...noServidor, ...extra } as Chamado;
  };

  let atualizar: MockInstance<typeof chamadosService.atualizar>;
  let criarComentario: MockInstance<typeof comentariosService.criar>;

  beforeEach(() => {
    atualizar = vi
      .spyOn(chamadosService, 'atualizar')
      .mockImplementation(async (_id, d) => ({ ...noServidor, ...d }) as Chamado);
    criarComentario = vi
      .spyOn(comentariosService, 'criar')
      .mockImplementation(async (d) => ({ id: 50, ...d }) as never);
  });

  it('o que foi escolhido e digitado fica; histórico e comentários são relidos', async () => {
    await montar(ADMIN);
    await clicar('Editar Detalhes');
    await escolher('Prioridade', 'Alta');
    await digitar('Solução', 'Recalibrei o paquímetro com o padrão.');

    vi.mocked(historicoService.listarPorChamado).mockResolvedValue([
      {
        id: 9,
        chamado_id: 1,
        usuario_id: 1,
        acao: 'Comentário adicionado',
        created_at: '2026-09-02T10:00:00',
      },
    ]);
    const historicos = vi.mocked(historicoService.listarPorChamado).mock.calls.length;
    const comentarios = vi.mocked(comentariosService.listarPorChamado).mock.calls.length;
    await comentar('Aguardando o padrão voltar do laboratório.');

    expect(criarComentario).toHaveBeenCalledTimes(1);
    expect(vi.mocked(historicoService.listarPorChamado).mock.calls.length).toBe(historicos + 1);
    expect(vi.mocked(comentariosService.listarPorChamado).mock.calls.length).toBe(comentarios + 1);
    expect(host.textContent).toContain('Comentário adicionado');

    expect(textos()).toContain('Salvar');
    expect(seletor('Prioridade')?.textContent).toContain('Alta');
    expect(solucaoNaTela()).toBe('Recalibrei o paquímetro com o padrão.');

    await clicar('Salvar');
    expect(atualizar.mock.calls).toStrictEqual([
      [1, { prioridade: 'Alta', solucao: 'Recalibrei o paquímetro com o padrão.' }],
    ]);
  });

  it('sem nada editado: comentar não abre escrita, e salvar fecha sem PUT', async () => {
    await montar(ADMIN);
    await clicar('Editar Detalhes');
    await comentar('Só um registro.');
    expect(textos()).toContain('Salvar');
    await clicar('Salvar');
    expect(atualizar).not.toHaveBeenCalled();
    expect(textos()).toContain('Editar Detalhes');
  });

  /**
   * A mudança de outra pessoa que a recarga trouxe não entra no campo que a
   * pessoa editou: ela continua vendo a escolha dela, e o salvamento acusa o
   * conflito contra a referência de quando abriu a edição.
   */
  it('mudança remota conflitante: a escolha fica, e salvar acusa o conflito', async () => {
    await montar(ADMIN);
    await clicar('Editar Detalhes');
    await escolher('Prioridade', 'Baixa');
    mudarNoServidor({ prioridade: 'Alta' as Chamado['prioridade'] });
    await comentar('Mudei a prioridade, confere?');

    expect(seletor('Prioridade')?.textContent).toContain('Baixa');
    await clicar('Salvar');
    expect(atualizar).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Este chamado mudou enquanto você editava');
    expect(host.textContent).toContain('Prioridade (agora: Alta)');
    expect(seletor('Prioridade')?.textContent).toContain('Baixa');
  });

  /**
   * Num campo que a pessoa não editou, a mudança remota também não entra no
   * formulário — senão viraria "diferença" e iria no PUT como se fosse dela.
   * Como o campo não vai, o servidor guarda o valor da outra pessoa.
   */
  it('mudança remota num campo não editado: não entra no formulário, e não vai no PUT', async () => {
    await montar(ADMIN);
    await clicar('Editar Detalhes');
    await escolher('Prioridade', 'Alta');
    mudarNoServidor({ status: StatusEnum.AGUARDANDO });
    await comentar('Registro do dia.');

    expect(seletor('Status')?.textContent).toContain('Em Andamento');
    await clicar('Salvar');
    expect(host.textContent).not.toContain('Este chamado mudou enquanto você editava');
    expect(atualizar.mock.calls).toStrictEqual([[1, { prioridade: 'Alta' }]]);
  });

  it('cancelar depois do comentário, e entrar de novo: parte do servidor de agora', async () => {
    await montar(ADMIN);
    await clicar('Editar Detalhes');
    await escolher('Prioridade', 'Baixa');
    await comentar('Antes de cancelar.');
    await clicar('Cancelar');

    mudarNoServidor({ prioridade: 'Alta' as Chamado['prioridade'] });
    await clicar('Editar Detalhes');
    expect(seletor('Prioridade')?.textContent).toContain('Alta');
    await clicar('Salvar');
    expect(atualizar).not.toHaveBeenCalled();
  });

  /** Fora da edição a recarga volta a preencher os campos, como sempre. */
  it('depois de salvar, a próxima edição não herda a referência antiga', async () => {
    await montar(ADMIN);
    await clicar('Editar Detalhes');
    await escolher('Prioridade', 'Alta');
    await clicar('Salvar');
    expect(atualizar).toHaveBeenCalledTimes(1);

    mudarNoServidor({ prioridade: 'Baixa' as Chamado['prioridade'], status: StatusEnum.AGUARDANDO });
    await comentar('Depois de salvar.');
    await clicar('Editar Detalhes');
    expect(seletor('Prioridade')?.textContent).toContain('Baixa');
    expect(seletor('Status')?.textContent).toContain('Aguardando');
  });
});
