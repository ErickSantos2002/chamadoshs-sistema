import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ChamadosProvider, type EstadoDaQualidade } from '../context/ChamadosContext';
import { chamadosService, usuariosService } from '../services/chamadoshsapi';
import { useChamados } from './useChamados';
import { useQualidade } from './useQualidade';

/**
 * O estado da Qualidade, compartilhado pelo contexto.
 *
 * O que se trava: uma sonda para muitos componentes; nenhuma para quem só vê
 * a TI; resposta da sessão anterior descartada; e nenhuma repetição sozinha.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const sessao = (id: number | null) =>
  ({
    user: id === null ? null : { id, username: `u${id}`, role: 'Usuario' },
    token: id === null ? null : 'token-de-teste',
    loading: false,
    error: null,
    login: async () => {},
    logout: () => {},
  }) as unknown as React.ContextType<typeof AuthContext>;

const SUPORTADO = { status: 405, dados: { detail: 'Method Not Allowed' } };
const NAO_SUPORTADO = { status: 404, dados: { detail: 'Not Found' } };
const ATENDENTES = [{ id: 7, nome: 'Ana' }];

/** Promessa que o teste resolve na hora que quiser. */
const adiada = <T,>() => {
  let resolver!: (v: T) => void;
  const promessa = new Promise<T>((r) => (resolver = r));
  return { promessa, resolver };
};

let vistos: Record<string, EstadoDaQualidade> = {};
let acoes: ReturnType<typeof useChamados>;

const Leitor: React.FC<{ nome: string; ativo: boolean }> = ({ nome, ativo }) => {
  vistos[nome] = useQualidade(ativo);
  acoes = useChamados();
  return null;
};

let host: HTMLDivElement;
let root: Root;

const montar = async (id: number | null, leitores: Array<[string, boolean]>, estrito = false) => {
  const arvore = (
    <AuthContext.Provider value={sessao(id)}>
      <ChamadosProvider>
        {leitores.map(([nome, ativo]) => (
          <Leitor key={nome} nome={nome} ativo={ativo} />
        ))}
      </ChamadosProvider>
    </AuthContext.Provider>
  );
  await act(async () => {
    root.render(estrito ? <StrictMode>{arvore}</StrictMode> : arvore);
  });
};

let sonda: ReturnType<typeof vi.spyOn>;
let atendentes: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  for (const verbo of ['get', 'post', 'put', 'patch', 'delete'] as const) {
    vi.spyOn(api, verbo).mockRejectedValue(new Error(`rede bloqueada no teste: ${verbo}`));
  }
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([]);
  sonda = vi.spyOn(chamadosService, 'sondarAtendimento').mockResolvedValue(SUPORTADO);
  atendentes = vi
    .spyOn(chamadosService, 'listarAtendentesQualidade')
    .mockResolvedValue(ATENDENTES);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vistos = {};

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe('useQualidade', () => {
  it('chamado da TI: nada é consultado', async () => {
    await montar(1, [['ti', false]]);
    expect(sonda).not.toHaveBeenCalled();
    expect(atendentes).not.toHaveBeenCalled();
    expect(vistos.ti.suporte).toBe('verificando');
  });

  it('chamado da Qualidade: sonda e atendentes', async () => {
    await montar(1, [['q', true]]);
    expect(vistos.q).toStrictEqual({
      suporte: 'suportado',
      disponibilidade: 'disponivel',
      atendentes: ATENDENTES,
    });
  });

  it('API sem a rota: não suportado', async () => {
    sonda.mockResolvedValue(NAO_SUPORTADO);
    await montar(1, [['q', true]]);
    expect(vistos.q.suporte).toBe('nao-suportado');
  });

  it('várias montagens ao mesmo tempo dividem uma sonda e uma consulta', async () => {
    await montar(1, [['modal', true], ['pagina', true], ['acoes', true]], true);
    expect(sonda).toHaveBeenCalledTimes(1);
    expect(atendentes).toHaveBeenCalledTimes(1);
    expect(vistos.modal.suporte).toBe('suportado');
    expect(vistos.acoes.atendentes).toEqual(ATENDENTES);
  });

  it('falhou: não repete sozinho; tenta de novo só no próximo pedido', async () => {
    sonda.mockRejectedValue(new Error('rede'));
    await montar(1, [['q', true]]);
    expect(vistos.q.suporte).toBe('falhou');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(sonda).toHaveBeenCalledTimes(1);

    sonda.mockResolvedValue(SUPORTADO);
    await act(async () => {
      await acoes.verificarQualidade();
    });
    expect(sonda).toHaveBeenCalledTimes(2);
    expect(vistos.q.suporte).toBe('suportado');
  });

  it('versão decidida não é sondada de novo; os atendentes, sim', async () => {
    await montar(1, [['q', true]]);
    await act(async () => {
      await acoes.verificarQualidade();
    });
    expect(sonda).toHaveBeenCalledTimes(1);
    expect(atendentes).toHaveBeenCalledTimes(2);
  });

  it('troca de usuário zera e sonda de novo', async () => {
    await montar(1, [['q', true]]);
    sonda.mockResolvedValue(NAO_SUPORTADO);
    await montar(2, [['q', true]]);
    expect(sonda).toHaveBeenCalledTimes(2);
    expect(vistos.q.suporte).toBe('nao-suportado');
  });

  it('resposta atrasada da sessão anterior é descartada', async () => {
    const primeira = adiada<typeof SUPORTADO>();
    const segunda = adiada<typeof SUPORTADO>();
    sonda.mockReturnValueOnce(primeira.promessa).mockReturnValueOnce(segunda.promessa);

    await montar(1, [['q', true]]);
    await montar(2, [['q', true]]);
    await act(async () => {
      segunda.resolver(NAO_SUPORTADO);
    });
    expect(vistos.q.suporte).toBe('nao-suportado');

    await act(async () => {
      primeira.resolver(SUPORTADO);
    });
    expect(vistos.q.suporte).toBe('nao-suportado');
  });

  it('logout zera o estado, e a resposta pendente não volta', async () => {
    const pendente = adiada<typeof SUPORTADO>();
    sonda.mockReturnValueOnce(pendente.promessa);
    await montar(1, [['q', true]]);
    await montar(null, [['q', true]]);
    await act(async () => {
      pendente.resolver(SUPORTADO);
    });
    expect(vistos.q.suporte).toBe('verificando');
    expect(vistos.q.atendentes).toEqual([]);
  });

  it('503 nos atendentes: Qualidade indisponível', async () => {
    atendentes.mockRejectedValue({ response: { status: 503 } });
    await montar(1, [['q', true]]);
    expect(vistos.q.disponibilidade).toBe('indisponivel');
  });

  it('marcarAtendimentoIndisponivel esconde para todos e vale para o próximo pedido', async () => {
    await montar(1, [['a', true], ['b', true]]);
    act(() => acoes.marcarAtendimentoIndisponivel());
    expect(vistos.a.suporte).toBe('nao-suportado');
    expect(vistos.b.suporte).toBe('nao-suportado');

    await act(async () => {
      await acoes.verificarQualidade();
    });
    expect(sonda).toHaveBeenCalledTimes(1);
    expect(vistos.a.suporte).toBe('nao-suportado');
  });

  it('marcarQualidadeIndisponivel tira os atendentes', async () => {
    await montar(1, [['q', true]]);
    act(() => acoes.marcarQualidadeIndisponivel());
    expect(vistos.q.disponibilidade).toBe('indisponivel');
    expect(vistos.q.atendentes).toEqual([]);
  });
});
