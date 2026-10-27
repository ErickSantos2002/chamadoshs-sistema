import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import api from '../services/api';
import { AuthContext } from './AuthContext';
import { ChamadosProvider } from './ChamadosContext';
import { useChamados } from '../hooks/useChamados';
import { chamadosService, usuariosService } from '../services/chamadoshsapi';
import { Chamado, StatusEnum } from '../types/api';

/**
 * O que cada perfil pede à API para montar o quadro.
 *
 * A equipe pede tudo, sem filtro de pessoa. O usuário comum pede os que
 * solicitou. São os dois recortes que a Qualidade não pode mexer: o da equipe
 * fica idêntico, e o do usuário só pode GANHAR chamados, nunca perder.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const sessao = (id: number, role: string) =>
  ({
    user: { id, username: 'quem-lista', role },
    token: 'token-de-teste',
    loading: false,
    error: null,
    login: async () => {},
    logout: () => {},
  }) as React.ContextType<typeof AuthContext>;

let visto: number[] = [];

const Sonda: React.FC = () => {
  visto = useChamados().chamados.map((c) => c.id);
  return null;
};

let host: HTMLDivElement;
let root: Root;

const montar = async (quem: React.ContextType<typeof AuthContext>) => {
  await act(async () => {
    root.render(
      <AuthContext.Provider value={quem}>
        <ChamadosProvider>
          <Sonda />
        </ChamadosProvider>
      </AuthContext.Provider>
    );
  });
};

beforeEach(() => {
  for (const verbo of ['get', 'post', 'put', 'patch', 'delete'] as const) {
    vi.spyOn(api, verbo).mockRejectedValue(new Error(`rede bloqueada no teste: ${verbo}`));
  }
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([
    { id: 5, status: StatusEnum.ABERTO } as Chamado,
  ]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([]);
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

describe('carregarChamados por perfil', () => {
  it('usuário comum: a listagem dos que solicitou continua a mesma', async () => {
    await montar(sessao(7, 'Usuario'));
    const chamadas = vi.mocked(chamadosService.listarTodos).mock.calls;
    expect(chamadas[0][0]).toStrictEqual({
      incluir_arquivados: true,
      incluir_cancelados: true,
      solicitante_id: 7,
    });
    expect(visto).toEqual([5]);
  });

  for (const role of ['Administrador', 'Tecnico']) {
    it(`${role}: uma listagem, sem filtro de pessoa`, async () => {
      await montar(sessao(1, role));
      const chamadas = vi.mocked(chamadosService.listarTodos).mock.calls;
      expect(chamadas).toHaveLength(1);
      expect(chamadas[0][0]).toStrictEqual({
        incluir_arquivados: true,
        incluir_cancelados: true,
      });
    });
  }
});

/**
 * D-7: o usuário comum vê também os chamados da Qualidade que atende. A
 * segunda listagem pede `tecnico_id` e `setor_destino`, e o front confere
 * cada chamado — a API anterior à API-1 ignora o setor.
 */
describe('carregarChamados — atribuídos na Qualidade', () => {
  const c = (id: number, extra: Partial<Chamado>) =>
    ({ id, status: StatusEnum.ABERTO, solicitante_id: 9, ...extra }) as Chamado;

  const meu = c(5, { solicitante_id: 7, tecnico_responsavel_id: 7, setor_destino: 'QUALIDADE' } as Partial<Chamado>);
  const atribuido = c(8, { tecnico_responsavel_id: 7, setor_destino: 'QUALIDADE' } as Partial<Chamado>);
  const atribuidoArquivado = c(9, { tecnico_responsavel_id: 7, setor_destino: 'QUALIDADE', arquivado: true } as Partial<Chamado>);
  const daTi = c(10, { tecnico_responsavel_id: 7, setor_destino: 'TI' } as Partial<Chamado>);
  const antigoSemSetor = c(11, { tecnico_responsavel_id: 7 });
  const deOutro = c(12, { tecnico_responsavel_id: 3, setor_destino: 'QUALIDADE' } as Partial<Chamado>);

  const responder = (proprios: Chamado[], atribuidos: Chamado[] | Error) =>
    vi.mocked(chamadosService.listarTodos).mockImplementation(async (p) => {
      if (p?.tecnico_id !== undefined) {
        if (atribuidos instanceof Error) throw atribuidos;
        return atribuidos;
      }
      return proprios;
    });

  it('a segunda listagem pede os atribuídos da Qualidade, com arquivados e cancelados', async () => {
    responder([], []);
    await montar(sessao(7, 'Usuario'));
    const chamadas = vi.mocked(chamadosService.listarTodos).mock.calls;
    expect(chamadas).toHaveLength(2);
    expect(chamadas[1][0]).toStrictEqual({
      incluir_arquivados: true,
      incluir_cancelados: true,
      tecnico_id: 7,
      setor_destino: 'QUALIDADE',
    });
  });

  it('junta os atribuídos aos próprios, sem repetir, em ordem de id decrescente', async () => {
    responder([meu], [meu, atribuido, atribuidoArquivado]);
    await montar(sessao(7, 'Usuario'));
    expect(visto).toEqual([9, 8, 5]);
  });

  it('o que a API devolver fora da regra não entra: TI, sem setor, de outro responsável', async () => {
    responder([meu], [daTi, antigoSemSetor, deOutro, atribuido]);
    await montar(sessao(7, 'Usuario'));
    expect(visto).toEqual([8, 5]);
  });

  it('se a listagem dos atribuídos falha, ficam os próprios, e avisa', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    responder([meu], new Error('fora do ar'));
    await montar(sessao(7, 'Usuario'));
    expect(visto).toEqual([5]);
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it('se a dos próprios falha, o erro é o de sempre', async () => {
    vi.mocked(chamadosService.listarTodos).mockImplementation(async (p) => {
      if (p?.solicitante_id !== undefined) throw new Error('fora do ar');
      return [atribuido];
    });
    let erro: string | null = null;
    const Erro: React.FC = () => {
      erro = useChamados().error;
      return null;
    };
    await act(async () => {
      root.render(
        <AuthContext.Provider value={sessao(7, 'Usuario')}>
          <ChamadosProvider>
            <Sonda />
            <Erro />
          </ChamadosProvider>
        </AuthContext.Provider>
      );
    });
    expect(erro).toBe('Erro ao carregar chamados. Tente novamente.');
    expect(visto).toEqual([]);
  });

  for (const role of ['Administrador', 'Tecnico']) {
    it(`${role}: nenhuma listagem a mais`, async () => {
      responder([atribuido, meu], [daTi]);
      await montar(sessao(7, role));
      expect(vi.mocked(chamadosService.listarTodos)).toHaveBeenCalledTimes(1);
      expect(visto).toEqual([8, 5]);
    });
  }
});
