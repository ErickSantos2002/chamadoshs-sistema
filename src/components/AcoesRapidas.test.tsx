import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ChamadosProvider } from '../context/ChamadosContext';
import { chamadosService } from '../services/chamadoshsapi';
import { Chamado, StatusEnum } from '../types/api';
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
