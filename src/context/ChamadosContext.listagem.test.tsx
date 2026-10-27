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
  it('usuário comum: uma listagem, dos que solicitou', async () => {
    await montar(sessao(7, 'Usuario'));
    const chamadas = vi.mocked(chamadosService.listarTodos).mock.calls;
    expect(chamadas).toHaveLength(1);
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
