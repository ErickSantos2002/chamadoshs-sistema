import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ChamadosProvider } from '../context/ChamadosContext';
import { chamadosService } from '../services/chamadoshsapi';
import { Chamado, SetorDestinoEnum, StatusEnum } from '../types/api';
import {
  MENSAGEM_QUALIDADE_INDISPONIVEL,
  MENSAGEM_ROTA_INDISPONIVEL,
  MENSAGEM_SEM_RESPOSTA,
} from '../lib/atendimento';
import AcoesRapidas from './AcoesRapidas';

/**
 * As ações de status, montadas sobre o contexto de verdade.
 *
 * ── A trava da equipe ─────────────────────────────────────────────────
 *
 * Os casos de "equipe" descrevem o que o componente FAZ antes do atendimento
 * da Qualidade existir: quais botões aparecem em cada status, e o corpo exato
 * do PUT. O atendimento restrito entra ao lado deste fluxo, não em cima dele —
 * se um destes casos mudar, a TI mudou.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const sessao = (id: number, role: string) =>
  ({
    user: { id, username: 'quem-atende', role },
    token: 'token-de-teste',
    loading: false,
    error: null,
    login: async () => {},
    logout: () => {},
  }) as React.ContextType<typeof AuthContext>;

const ADMIN = sessao(1, 'Administrador');
const TECNICO = sessao(3, 'Tecnico');
const USUARIO = sessao(7, 'Usuario');

const chamadoCom = (extra: Partial<Chamado> = {}): Chamado =>
  ({
    id: 50,
    protocolo: 'CHAM-2026-0050',
    titulo: 'Rede caiu no RH',
    descricao: 'x',
    status: StatusEnum.EM_ANDAMENTO,
    prioridade: 'Média',
    solicitante_id: 7,
    tecnico_responsavel_id: 3,
    cancelado: false,
    arquivado: false,
    ...extra,
  }) as Chamado;

let host: HTMLDivElement;
let root: Root;
let aoMudar: ReturnType<typeof vi.fn>;

const montar = async (quem: React.ContextType<typeof AuthContext>, chamado: Chamado) => {
  await act(async () => {
    root.render(
      <AuthContext.Provider value={quem}>
        <ChamadosProvider>
          <AcoesRapidas chamado={chamado} aoMudar={aoMudar} />
        </ChamadosProvider>
      </AuthContext.Provider>
    );
  });
};

const botoes = () =>
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

const digitarSolucao = async (valor: string) => {
  const campo = host.querySelector<HTMLTextAreaElement>('#solucao-rapida');
  expect(campo, 'campo de solução não apareceu').toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(campo, valor);
    campo!.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const SOLUCAO_OK = 'Troquei o cabo do switch do RH.';

beforeEach(() => {
  // Nenhuma requisição sai daqui sem mock: o `.env` local aponta para
  // produção, e uma chamada esquecida falha em vez de chegar lá.
  for (const verbo of ['get', 'post', 'put', 'patch', 'delete'] as const) {
    vi.spyOn(api, verbo).mockRejectedValue(new Error(`rede bloqueada no teste: ${verbo}`));
  }
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
  // Padrão: API sem o atendimento. Os casos da Qualidade trocam.
  vi.spyOn(chamadosService, 'sondarAtendimento').mockResolvedValue({
    status: 404,
    dados: { detail: 'Not Found' },
  });
  vi.spyOn(chamadosService, 'listarAtendentesQualidade').mockResolvedValue([]);
  vi.spyOn(toast, 'error').mockImplementation(() => '');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  aoMudar = vi.fn();

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe('equipe — os botões de cada status', () => {
  const casos: Array<[StatusEnum, string[]]> = [
    [StatusEnum.ABERTO, ['Iniciar atendimento']],
    [StatusEnum.EM_ANDAMENTO, ['Aguardando retorno', 'Marcar como resolvido']],
    [StatusEnum.AGUARDANDO, ['Retomar atendimento', 'Marcar como resolvido']],
    [StatusEnum.RESOLVIDO, ['Reabrir']],
    [StatusEnum.FECHADO, ['Reabrir']],
  ];

  for (const [status, esperados] of casos) {
    it(`${status}: ${esperados.join(', ')}`, async () => {
      await montar(ADMIN, chamadoCom({ status }));
      expect(botoes()).toEqual(esperados);
    });
  }

  it('o técnico vê os mesmos botões', async () => {
    await montar(TECNICO, chamadoCom({ status: StatusEnum.ABERTO }));
    expect(botoes()).toEqual(['Iniciar atendimento']);
  });

  it('cancelado e arquivado: nenhum botão', async () => {
    await montar(ADMIN, chamadoCom({ cancelado: true }));
    expect(host.innerHTML).toBe('');
    await montar(ADMIN, chamadoCom({ arquivado: true }));
    expect(host.innerHTML).toBe('');
  });

  it('quem não é da equipe não vê botão', async () => {
    await montar(USUARIO, chamadoCom());
    expect(host.innerHTML).toBe('');
  });
});

describe('equipe — o PUT', () => {
  it('mudar status manda só o status', async () => {
    const depois = chamadoCom({ status: StatusEnum.AGUARDANDO });
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(depois);
    await montar(ADMIN, chamadoCom());
    await clicar('Aguardando retorno');

    expect(atualizar).toHaveBeenCalledTimes(1);
    expect(atualizar.mock.calls[0]).toStrictEqual([50, { status: StatusEnum.AGUARDANDO }]);
    expect(aoMudar).toHaveBeenCalledWith(depois);
  });

  it('resolver é um passo: pede a solução, e manda status e solução', async () => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(chamadoCom());
    await montar(ADMIN, chamadoCom());
    await clicar('Marcar como resolvido');
    await digitarSolucao(SOLUCAO_OK);
    await clicar('Resolver');

    expect(atualizar.mock.calls[0]).toStrictEqual([
      50,
      { status: StatusEnum.RESOLVIDO, solucao: SOLUCAO_OK },
    ]);
  });

  it('solução curta não sai', async () => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar');
    await montar(ADMIN, chamadoCom());
    await clicar('Marcar como resolvido');
    await digitarSolucao('ok');
    await clicar('Resolver');

    expect(atualizar).not.toHaveBeenCalled();
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Solução precisa de mais 8 caracteres.');
  });

  it('erro com detail: o detail vai para o toast', async () => {
    vi.spyOn(chamadosService, 'atualizar').mockRejectedValue({
      response: { status: 400, data: { detail: 'Atendente não encontrado' } },
    });
    await montar(ADMIN, chamadoCom());
    await clicar('Aguardando retorno');
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Atendente não encontrado');
  });

  it('403: o componente não repete o toast do interceptor', async () => {
    vi.spyOn(chamadosService, 'atualizar').mockRejectedValue({
      response: { status: 403, data: { detail: 'x' } },
    });
    await montar(ADMIN, chamadoCom());
    await clicar('Aguardando retorno');
    expect(vi.mocked(toast.error)).not.toHaveBeenCalled();
  });
});

/**
 * O atendimento restrito da Qualidade: quem é o responsável e atende a
 * Qualidade usa os mesmos botões, pelo PATCH.
 */
describe('Qualidade — atendimento pela rota restrita', () => {
  const daQualidade = (extra: Partial<Chamado> = {}) =>
    chamadoCom({
      setor_destino: SetorDestinoEnum.QUALIDADE,
      tecnico_responsavel_id: 7,
      solicitante_id: 9,
      ...extra,
    } as Partial<Chamado>);

  let atender: MockInstance<typeof chamadosService.atender>;
  let atualizar: MockInstance<typeof chamadosService.atualizar>;
  let recarregar: ReturnType<typeof vi.fn>;

  const montarQ = async (quem: React.ContextType<typeof AuthContext>, chamado: Chamado) => {
    await act(async () => {
      root.render(
        <AuthContext.Provider value={quem}>
          <ChamadosProvider>
            <AcoesRapidas chamado={chamado} aoMudar={aoMudar} aoPrecisarRecarregar={recarregar} />
          </ChamadosProvider>
        </AuthContext.Provider>
      );
    });
  };

  beforeEach(() => {
    vi.mocked(chamadosService.sondarAtendimento).mockResolvedValue({
      status: 405,
      dados: { detail: 'Method Not Allowed' },
    });
    vi.mocked(chamadosService.listarAtendentesQualidade).mockResolvedValue([
      { id: 7, nome: 'Usuária da Qualidade' },
      { id: 3, nome: 'Técnica da Qualidade' },
    ]);
    atender = vi
      .spyOn(chamadosService, 'atender')
      .mockImplementation(async (_id, corpo) => daQualidade({ status: corpo.status }));
    atualizar = vi.spyOn(chamadosService, 'atualizar');
    recarregar = vi.fn();
  });

  describe('quem vê', () => {
    it('usuário comum responsável e elegível: os botões do status', async () => {
      await montarQ(USUARIO, daQualidade());
      expect(botoes()).toEqual(['Aguardando retorno', 'Marcar como resolvido']);
    });

    const status: Array<[StatusEnum, string[]]> = [
      [StatusEnum.ABERTO, ['Iniciar atendimento']],
      [StatusEnum.AGUARDANDO, ['Retomar atendimento', 'Marcar como resolvido']],
      [StatusEnum.RESOLVIDO, ['Reabrir']],
      [StatusEnum.FECHADO, ['Reabrir']],
    ];
    for (const [s, esperados] of status) {
      it(`${s}: ${esperados.join(', ')}`, async () => {
        await montarQ(USUARIO, daQualidade({ status: s }));
        expect(botoes()).toEqual(esperados);
      });
    }

    const nada: Array<[string, () => void, Partial<Chamado>?]> = [
      [
        'API sem a rota',
        () =>
          vi
            .mocked(chamadosService.sondarAtendimento)
            .mockResolvedValue({ status: 404, dados: { detail: 'Not Found' } }),
      ],
      [
        'sonda falhou',
        () => vi.mocked(chamadosService.sondarAtendimento).mockRejectedValue(new Error('timeout')),
      ],
      [
        'atendentes 503',
        () =>
          vi
            .mocked(chamadosService.listarAtendentesQualidade)
            .mockRejectedValue({ response: { status: 503 } }),
      ],
      [
        'atendentes falharam',
        () =>
          vi.mocked(chamadosService.listarAtendentesQualidade).mockRejectedValue(new Error('rede')),
      ],
      [
        'fora da lista',
        () =>
          vi
            .mocked(chamadosService.listarAtendentesQualidade)
            .mockResolvedValue([{ id: 3, nome: 'Outra' }]),
      ],
      ['outro responsável', () => {}, { tecnico_responsavel_id: 3 }],
      ['cancelado', () => {}, { cancelado: true }],
      ['arquivado', () => {}, { arquivado: true }],
    ];
    for (const [nome, preparar, extra] of nada) {
      it(`usuário comum, ${nome}: nenhum botão`, async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        preparar();
        await montarQ(USUARIO, daQualidade(extra));
        expect(host.innerHTML).toBe('');
      });
    }

    it('chamado da TI atribuído ao usuário: nenhum botão, e nada é sondado', async () => {
      await montarQ(
        USUARIO,
        chamadoCom({ tecnico_responsavel_id: 7, setor_destino: SetorDestinoEnum.TI } as Partial<Chamado>)
      );
      expect(host.innerHTML).toBe('');
      expect(chamadosService.sondarAtendimento).not.toHaveBeenCalled();
      expect(chamadosService.listarAtendentesQualidade).not.toHaveBeenCalled();
    });
  });

  describe('o PATCH', () => {
    it('mudar status: só o status, pela rota, e nunca pelo PUT', async () => {
      await montarQ(USUARIO, daQualidade());
      await clicar('Aguardando retorno');
      expect(atender.mock.calls).toStrictEqual([[50, { status: StatusEnum.AGUARDANDO }]]);
      expect(atualizar).not.toHaveBeenCalled();
      expect(aoMudar).toHaveBeenCalledWith(
        expect.objectContaining({ status: StatusEnum.AGUARDANDO })
      );
    });

    it('reabrir não leva solução, nem a que o chamado já tinha', async () => {
      await montarQ(
        USUARIO,
        daQualidade({ status: StatusEnum.RESOLVIDO, solucao: 'Solução antiga do chamado.' })
      );
      await clicar('Reabrir');
      expect(atender.mock.calls).toStrictEqual([[50, { status: StatusEnum.EM_ANDAMENTO }]]);
    });

    it('resolver: status e solução, sem espaço nas pontas', async () => {
      await montarQ(USUARIO, daQualidade());
      await clicar('Marcar como resolvido');
      await digitarSolucao('  ' + SOLUCAO_OK + '  ');
      await clicar('Resolver');
      expect(atender.mock.calls).toStrictEqual([
        [50, { status: StatusEnum.RESOLVIDO, solucao: SOLUCAO_OK }],
      ]);
    });

    it('solução curta não sai', async () => {
      await montarQ(USUARIO, daQualidade());
      await clicar('Marcar como resolvido');
      await digitarSolucao('curta');
      await clicar('Resolver');
      expect(atender).not.toHaveBeenCalled();
    });

    it('dois cliques no mesmo instante: uma requisição', async () => {
      let soltar!: () => void;
      atender.mockImplementation(
        () =>
          new Promise<Chamado>(
            (r) => (soltar = () => r(daQualidade({ status: StatusEnum.AGUARDANDO })))
          )
      );
      await montarQ(USUARIO, daQualidade());
      const alvo = Array.from(host.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Aguardando retorno'
      )!;
      await act(async () => {
        alvo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        alvo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(atender).toHaveBeenCalledTimes(1);
      await act(async () => soltar());
    });

    it('técnico responsável e elegível: a mesma rota, e os botões uma vez só', async () => {
      await montarQ(TECNICO, daQualidade({ tecnico_responsavel_id: 3 }));
      expect(botoes()).toEqual(['Aguardando retorno', 'Marcar como resolvido']);
      await clicar('Aguardando retorno');
      expect(atender).toHaveBeenCalledTimes(1);
      expect(atualizar).not.toHaveBeenCalled();
    });

    it('administrador que não é o responsável: o PUT de sempre', async () => {
      atualizar.mockResolvedValue(daQualidade());
      await montarQ(ADMIN, daQualidade());
      await clicar('Aguardando retorno');
      expect(atualizar.mock.calls).toStrictEqual([[50, { status: StatusEnum.AGUARDANDO }]]);
      expect(atender).not.toHaveBeenCalled();
    });
  });

  describe('os erros do PATCH', () => {
    const falhar = (erro: unknown) => atender.mockRejectedValue(erro);
    const resp = (status: number, detail?: string) => ({ response: { status, data: { detail } } });

    it('404 "Not Found": a rota não existe; avisa, esconde e não tenta o PUT', async () => {
      falhar(resp(404, 'Not Found'));
      await montarQ(USUARIO, daQualidade());
      await clicar('Aguardando retorno');
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(MENSAGEM_ROTA_INDISPONIVEL);
      expect(host.innerHTML).toBe('');
      expect(atualizar).not.toHaveBeenCalled();
      expect(recarregar).not.toHaveBeenCalled();
    });

    /**
     * Para a equipe o componente não some — ela tem o PUT. Mas o passo de
     * resolução aberto pela rota não pode virar, no próximo clique, um PUT
     * sem a pessoa ver que o caminho mudou: ele fecha.
     */
    it('rota indisponível ao resolver, para a equipe: o passo fecha, sem PUT', async () => {
      falhar(resp(404, 'Not Found'));
      await montarQ(TECNICO, daQualidade({ tecnico_responsavel_id: 3 }));
      await clicar('Marcar como resolvido');
      await digitarSolucao(SOLUCAO_OK);
      await clicar('Resolver');
      expect(host.querySelector('#solucao-rapida')).toBeNull();
      expect(atualizar).not.toHaveBeenCalled();
      expect(botoes()).toEqual(['Aguardando retorno', 'Marcar como resolvido']);
    });

    it('405: o mesmo', async () => {
      falhar(resp(405, 'Method Not Allowed'));
      await montarQ(USUARIO, daQualidade());
      await clicar('Aguardando retorno');
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(MENSAGEM_ROTA_INDISPONIVEL);
      expect(host.innerHTML).toBe('');
    });

    it('404 "Chamado não encontrado": é o chamado, não a rota; recarrega', async () => {
      falhar(resp(404, 'Chamado não encontrado'));
      await montarQ(USUARIO, daQualidade());
      await clicar('Aguardando retorno');
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Chamado não encontrado');
      expect(recarregar).toHaveBeenCalledTimes(1);
      expect(botoes()).toEqual(['Aguardando retorno', 'Marcar como resolvido']);
    });

    it('403: o interceptor avisa; relê os atendentes e o chamado', async () => {
      falhar(resp(403, 'Você não atende a Qualidade'));
      await montarQ(USUARIO, daQualidade());
      const consultas = vi.mocked(chamadosService.listarAtendentesQualidade);
      const antes = consultas.mock.calls.length;
      consultas.mockResolvedValue([{ id: 3, nome: 'Outra' }]);
      await clicar('Aguardando retorno');
      expect(vi.mocked(toast.error)).not.toHaveBeenCalled();
      expect(recarregar).toHaveBeenCalledTimes(1);
      expect(consultas.mock.calls.length).toBe(antes + 1);
      expect(host.innerHTML).toBe('');
    });

    it('409: mostra o motivo e recarrega', async () => {
      falhar(resp(409, 'Transição de Aguardando para Aguardando não permitida'));
      await montarQ(USUARIO, daQualidade());
      await clicar('Aguardando retorno');
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        'Transição de Aguardando para Aguardando não permitida'
      );
      expect(recarregar).toHaveBeenCalledTimes(1);
    });

    it('422 ao resolver: mostra a validação e mantém o texto, sem repetir', async () => {
      falhar(resp(422, 'solucao: precisa de pelo menos 10 caracteres'));
      await montarQ(USUARIO, daQualidade());
      await clicar('Marcar como resolvido');
      await digitarSolucao(SOLUCAO_OK);
      await clicar('Resolver');
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        'solucao: precisa de pelo menos 10 caracteres'
      );
      expect(host.querySelector<HTMLTextAreaElement>('#solucao-rapida')?.value).toBe(SOLUCAO_OK);
      expect(atender).toHaveBeenCalledTimes(1);
      expect(recarregar).not.toHaveBeenCalled();
    });

    it('503: Qualidade indisponível; esconde, e nunca vira PUT', async () => {
      falhar(resp(503, 'Abertura de chamados para a Qualidade não está disponível neste ambiente'));
      await montarQ(USUARIO, daQualidade());
      await clicar('Aguardando retorno');
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(MENSAGEM_QUALIDADE_INDISPONIVEL);
      expect(host.innerHTML).toBe('');
      expect(atualizar).not.toHaveBeenCalled();
    });

    it('503 para a equipe responsável: também não vira PUT sozinho', async () => {
      falhar(resp(503));
      await montarQ(TECNICO, daQualidade({ tecnico_responsavel_id: 3 }));
      await clicar('Aguardando retorno');
      expect(atender).toHaveBeenCalledTimes(1);
      expect(atualizar).not.toHaveBeenCalled();
    });

    it('rede ao resolver: avisa, mantém o texto e não tenta de novo', async () => {
      falhar(new Error('Network Error'));
      await montarQ(USUARIO, daQualidade());
      await clicar('Marcar como resolvido');
      await digitarSolucao(SOLUCAO_OK);
      await clicar('Resolver');
      await act(async () => {
        await new Promise((r) => setTimeout(r, 30));
      });
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(MENSAGEM_SEM_RESPOSTA);
      expect(host.querySelector<HTMLTextAreaElement>('#solucao-rapida')?.value).toBe(SOLUCAO_OK);
      expect(atender).toHaveBeenCalledTimes(1);
    });

    it('401: quem avisa é o interceptor', async () => {
      falhar(resp(401, 'Token expirado'));
      await montarQ(USUARIO, daQualidade());
      await clicar('Aguardando retorno');
      expect(vi.mocked(toast.error)).not.toHaveBeenCalled();
      expect(recarregar).not.toHaveBeenCalled();
    });
  });
});
