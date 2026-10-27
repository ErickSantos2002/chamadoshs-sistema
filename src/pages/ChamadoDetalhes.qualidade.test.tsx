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
