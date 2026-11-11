import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ChamadosProvider } from '../context/ChamadosContext';
import { ThemeProvider } from '../context/ThemeContext';
import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import {
  categoriasService,
  chamadosService,
  tarefasRecorrentesService,
  usuariosService,
} from '../services/chamadoshsapi';
import { Chamado, LembretesDoDia, StatusEnum } from '../types/api';
import Chamados from './Chamados';

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

/**
 * O lembrete do dia no quadro, pela rota da API-11 (FE-5, §8).
 *
 * Quem lê é quem a API deixa: a tela pede e mostra o que a resposta disser.
 * Cada conta abaixo leva a resposta que a API-11 daria a ela (200 ou 403) —
 * a regra de quem lê é da API e está provada lá; aqui se prova que a tela
 * não presume nada pelo perfil, não administra por ter lido, e não estraga o
 * quadro quando o lembrete falha. Todos os dados são fictícios.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type Conta = {
  id: number;
  role: string;
  role_id: number;
  integra_equipe_ti?: boolean;
  conta_de_servico?: boolean;
};

const CONTAS: Record<string, { conta: Conta; api: 200 | 403; administra: boolean }> = {
  'administrador humano': {
    conta: { id: 1, role: 'Administrador', role_id: 1, integra_equipe_ti: false, conta_de_servico: false },
    api: 200,
    administra: true,
  },
  'técnico humano da TI': {
    conta: { id: 2, role: 'Tecnico', role_id: 2, integra_equipe_ti: true },
    api: 200,
    administra: true,
  },
  'técnico da Qualidade': {
    conta: { id: 3, role: 'Tecnico', role_id: 2, integra_equipe_ti: false },
    api: 403,
    administra: false,
  },
  'técnico de outro setor': {
    conta: { id: 4, role: 'Tecnico', role_id: 2, integra_equipe_ti: false },
    api: 403,
    administra: false,
  },
  'usuário comum': {
    conta: { id: 5, role: 'Usuario', role_id: 3, integra_equipe_ti: false },
    api: 403,
    administra: false,
  },
  'conta de serviço Técnica autorizada no painel': {
    conta: { id: 6, role: 'Tecnico', role_id: 2, integra_equipe_ti: false },
    api: 200,
    administra: false,
  },
  'conta de serviço Administradora autorizada no painel': {
    conta: { id: 7, role: 'Administrador', role_id: 1, integra_equipe_ti: false, conta_de_servico: true },
    api: 200,
    administra: false,
  },
  'conta de serviço não autorizada': {
    conta: { id: 8, role: 'Usuario', role_id: 3, integra_equipe_ti: false },
    api: 403,
    administra: false,
  },
  'conta de serviço inativa': {
    conta: { id: 9, role: 'Tecnico', role_id: 2, integra_equipe_ti: false },
    api: 403,
    administra: false,
  },
  'conta humana indevidamente listada': {
    conta: { id: 10, role: 'Usuario', role_id: 3, integra_equipe_ti: false, conta_de_servico: false },
    api: 403,
    administra: false,
  },
};

const LEMBRETES: LembretesDoDia = {
  data: '2026-11-04',
  tarefas: [
    { id: 11, titulo: 'Backup fictício', proxima_data: '2026-11-03', situacao: 'atrasada' },
    { id: 12, titulo: 'Checklist fictício', proxima_data: '2026-11-04', situacao: 'hoje' },
    { id: 13, titulo: 'Ronda fictícia', proxima_data: '2026-11-11', situacao: 'realizada_hoje' },
  ],
};

const CHAMADO = {
  id: 50,
  protocolo: 'CHAM-2026-9050',
  titulo: 'Cartão fictício do quadro',
  descricao: 'x',
  status: StatusEnum.ABERTO,
  prioridade: 'Média',
  solicitante_id: 99,
  tecnico_responsavel_id: null,
  categoria_id: null,
  setor_destino: 'TI',
  cancelado: false,
  arquivado: false,
  data_abertura: '2026-11-01T10:00:00',
} as unknown as Chamado;

const RECUSA = { response: { status: 403, data: { detail: 'Sem acesso ao lembrete' } } };
const SERVIDOR = { response: { status: 503, data: { detail: 'Indisponível' } } };

const sessao = (conta: Conta, extra: Partial<React.ContextType<typeof AuthContext>> = {}) =>
  ({
    user: { username: `conta${conta.id}`, ...conta },
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
  }) as React.ContextType<typeof AuthContext>;

let host: HTMLDivElement;
let root: Root;
let lembretes: MockInstance<typeof tarefasRecorrentesService.lembretesDoDia>;
let listarTarefas: MockInstance<typeof tarefasRecorrentesService.listar>;

const quadro = (valor: React.ContextType<typeof AuthContext>) => (
  <AuthContext.Provider value={valor}>
    <ThemeProvider>
      <ChamadosProvider>
        <MemoryRouter>
          <Chamados />
        </MemoryRouter>
      </ChamadosProvider>
    </ThemeProvider>
  </AuthContext.Provider>
);

const montar = async (valor: React.ContextType<typeof AuthContext>) => {
  await act(async () => {
    root.render(quadro(valor));
  });
};

const texto = () => host.textContent ?? '';
const temLembrete = () => texto().includes('Tarefas recorrentes do dia');
const linksDeTarefas = () =>
  Array.from(host.querySelectorAll('a')).filter((a) => a.getAttribute('href') === '/tarefas-recorrentes');

const avancar = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([CHAMADO]);
  vi.spyOn(chamadosService, 'sondarAtendimento').mockResolvedValue({
    status: 404,
    dados: { detail: 'Not Found' },
  });
  vi.spyOn(chamadosService, 'listarAtendentesQualidade').mockResolvedValue([]);
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listar').mockResolvedValue([]);
  listarTarefas = vi.spyOn(tarefasRecorrentesService, 'listar').mockResolvedValue([]);
  lembretes = vi.spyOn(tarefasRecorrentesService, 'lembretesDoDia');
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe('a matriz de contas: a resposta da API decide, o perfil não', () => {
  for (const [nome, { conta, api: resposta, administra }] of Object.entries(CONTAS)) {
    it(`${nome}: API ${resposta} → lembrete ${resposta === 200 ? 'aparece' : 'some'}; administra: ${administra}`, async () => {
      if (resposta === 200) lembretes.mockResolvedValue(LEMBRETES);
      else lembretes.mockRejectedValue(RECUSA);

      await montar(sessao(conta));

      expect(lembretes).toHaveBeenCalledTimes(1);
      expect(temLembrete()).toBe(resposta === 200);
      if (resposta === 200) expect(texto()).toContain('Backup fictício');
      // O link para a gestão de tarefas só para quem administra; ler o
      // lembrete não dá administração.
      expect(linksDeTarefas().length > 0).toBe(resposta === 200 && administra);
      // O quadro continua lá, e a listagem administrativa nunca é pedida.
      expect(texto()).toContain('Cartão fictício do quadro');
      expect(listarTarefas).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });
  }
});

describe('a gestão não vem com o lembrete (§8.8)', () => {
  const menu = async (valor: React.ContextType<typeof AuthContext>) => {
    await act(async () => {
      root.render(
        <AuthContext.Provider value={valor}>
          <ThemeProvider>
            <MemoryRouter>
              <AppLayout aoAbrirNovidades={() => {}} temNovidade={false} versao="9.9.9">
                <p>conteúdo</p>
              </AppLayout>
            </MemoryRouter>
          </ThemeProvider>
        </AuthContext.Provider>
      );
    });
    return Array.from(host.querySelectorAll('nav a')).map((a) => a.getAttribute('href'));
  };

  for (const nome of [
    'conta de serviço Administradora autorizada no painel',
    'conta de serviço Técnica autorizada no painel',
  ]) {
    it(`${nome}: nenhum menu de gestão, e a URL digitada bloqueia`, async () => {
      const links = await menu(sessao(CONTAS[nome].conta));
      expect(links).toContain('/chamados');
      for (const restrita of ['/cadastros', '/tarefas-recorrentes', '/auditoria']) {
        expect(links).not.toContain(restrita);
      }

      act(() => root.unmount());
      root = createRoot(host);
      let montou = 0;
      const Tela = () => {
        montou += 1;
        return <p>tela de gestão</p>;
      };
      for (const caminho of ['/cadastros', '/tarefas-recorrentes', '/auditoria']) {
        await act(async () => {
          root.render(
            <AuthContext.Provider value={sessao(CONTAS[nome].conta)}>
              <ThemeProvider>
                <MemoryRouter initialEntries={[caminho]}>
                  <Routes>
                    <Route
                      path={caminho}
                      element={
                        <ProtectedRoute administrativa area="Gestão" quemTem="x">
                          <Tela />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </MemoryRouter>
              </ThemeProvider>
            </AuthContext.Provider>
          );
        });
      }
      expect(montou).toBe(0);
    });
  }

  it('a administradora humana vê a gestão; a de serviço, com o mesmo perfil, não', async () => {
    const humana = await menu(sessao(CONTAS['administrador humano'].conta));
    expect(humana).toContain('/cadastros');
    act(() => root.unmount());
    root = createRoot(host);
    const servico = await menu(
      sessao(CONTAS['conta de serviço Administradora autorizada no painel'].conta)
    );
    expect(servico).not.toContain('/cadastros');
  });
});

describe('a classificação é a da API, não a do relógio do navegador', () => {
  it('com o navegador num outro dia, os selos seguem a situacao recebida', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2031-07-15T12:00:00'));
    lembretes.mockResolvedValue(LEMBRETES);
    await montar(sessao(CONTAS['conta de serviço Técnica autorizada no painel'].conta));

    const itens = Array.from(host.querySelectorAll('li')).map((li) => li.textContent ?? '');
    expect(itens.find((t) => t.includes('Backup fictício'))).toContain('Atrasada desde 03/11/2026');
    expect(itens.find((t) => t.includes('Checklist fictício'))).toContain('Hoje');
    const ronda = itens.find((t) => t.includes('Ronda fictícia'));
    expect(ronda).toContain('Realizada');
    expect(ronda).toContain('Próxima: 11/11/2026');
  });

  it('na ordem em que a API mandou', async () => {
    lembretes.mockResolvedValue({
      data: '2026-11-04',
      tarefas: [LEMBRETES.tarefas[2], LEMBRETES.tarefas[0], LEMBRETES.tarefas[1]],
    });
    await montar(sessao(CONTAS['técnico humano da TI'].conta));
    const titulos = Array.from(host.querySelectorAll('li')).map((li) => li.textContent ?? '');
    expect(titulos.findIndex((t) => t.includes('Ronda'))).toBeLessThan(
      titulos.findIndex((t) => t.includes('Backup'))
    );
  });

  it('lista vazia: "Nenhuma tarefa recorrente para hoje"', async () => {
    lembretes.mockResolvedValue({ data: '2026-11-04', tarefas: [] });
    await montar(sessao(CONTAS['técnico humano da TI'].conta));
    expect(texto()).toContain('Nenhuma tarefa recorrente para hoje');
  });
});

describe('falhas do lembrete não quebram o quadro', () => {
  it('5xx na primeira: aviso discreto no bloco, quadro intacto, sem erro global', async () => {
    lembretes.mockRejectedValue(SERVIDOR);
    await montar(sessao(CONTAS['técnico humano da TI'].conta));
    expect(texto()).toContain('Não foi possível carregar as tarefas do dia agora');
    expect(texto()).toContain('Cartão fictício do quadro');
    expect(listarTarefas).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('rede caída depois de um sucesso: mantém a lista anterior e diz que a atualização falhou', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    lembretes.mockResolvedValueOnce(LEMBRETES).mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await montar(sessao(CONTAS['técnico humano da TI'].conta));
    await avancar(600_000);
    expect(lembretes).toHaveBeenCalledTimes(2);
    expect(texto()).toContain('Backup fictício');
    expect(texto()).toContain('A última atualização falhou');
    expect(texto()).toContain('Lista de 04/11/2026');
  });

  it('5xx, depois sucesso no auto-refresh: volta sozinho, sem nova tentativa fora do relógio', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    lembretes.mockRejectedValueOnce(SERVIDOR).mockResolvedValueOnce(LEMBRETES);
    await montar(sessao(CONTAS['técnico humano da TI'].conta));
    expect(lembretes).toHaveBeenCalledTimes(1);
    await avancar(599_000);
    expect(lembretes).toHaveBeenCalledTimes(1);
    await avancar(1_000);
    expect(lembretes).toHaveBeenCalledTimes(2);
    expect(texto()).toContain('Backup fictício');
    expect(texto()).not.toContain('Não foi possível carregar');
  });

  it('corpo fora do contrato ("pendente"): não vira lembrete', async () => {
    // Pela leitura de verdade do serviço, com o axios devolvendo o corpo.
    lembretes.mockRestore();
    const get = vi.spyOn(api, 'get').mockResolvedValue({
      data: { data: '2026-11-04', tarefas: [{ id: 1, titulo: 'x', proxima_data: '2026-11-04', situacao: 'pendente' }] },
    });
    await montar(sessao(CONTAS['técnico humano da TI'].conta));
    expect(get).toHaveBeenCalledWith('/tarefas-recorrentes/lembretes-do-dia', { silenciarRecusa: true });
    expect(texto()).toContain('Não foi possível carregar as tarefas do dia agora');
    expect(texto()).not.toContain('Pendente');
    expect(listarTarefas).not.toHaveBeenCalled();
  });

  it('401: não mostra nada no bloco (a política global cuida da sessão)', async () => {
    lembretes.mockRejectedValue({ response: { status: 401 } });
    await montar(sessao(CONTAS['técnico humano da TI'].conta));
    expect(temLembrete()).toBe(false);
  });
});

describe('o polling: um relógio, um pedido por vez, nada depois de sair', () => {
  it('403: não pede de novo no auto-refresh, e o quadro continua atualizando', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    lembretes.mockRejectedValue(RECUSA);
    await montar(sessao(CONTAS['usuário comum'].conta));
    const quadroAntes = vi.mocked(chamadosService.listarTodos).mock.calls.length;
    await avancar(600_000 * 3);
    expect(lembretes).toHaveBeenCalledTimes(1);
    expect(vi.mocked(chamadosService.listarTodos).mock.calls.length).toBeGreaterThan(quadroAntes);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('200: um pedido a cada dez minutos', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    lembretes.mockResolvedValue(LEMBRETES);
    await montar(sessao(CONTAS['conta de serviço Técnica autorizada no painel'].conta));
    // Uma volta por vez: cada resposta chega antes do próximo disparo.
    for (let i = 0; i < 3; i++) await avancar(600_000);
    expect(lembretes).toHaveBeenCalledTimes(4);
  });

  it('pedido ainda pendente: a volta do relógio não empilha outro', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    lembretes.mockImplementation(() => new Promise(() => {}));
    await montar(sessao(CONTAS['técnico humano da TI'].conta));
    await avancar(600_000 * 4);
    expect(lembretes).toHaveBeenCalledTimes(1);
  });

  it('a tela saiu: nenhum pedido depois, e a resposta atrasada não grava', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    let responder!: (v: LembretesDoDia) => void;
    lembretes.mockImplementationOnce(() => new Promise((r) => (responder = r)));
    await montar(sessao(CONTAS['técnico humano da TI'].conta));
    act(() => root.unmount());
    await act(async () => responder(LEMBRETES));
    await avancar(600_000 * 2);
    expect(lembretes).toHaveBeenCalledTimes(1);
    root = createRoot(host);
  });

  it('remontar o quadro não duplica o relógio', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    lembretes.mockResolvedValue(LEMBRETES);
    const valor = sessao(CONTAS['técnico humano da TI'].conta);
    await montar(valor);
    act(() => root.unmount());
    root = createRoot(host);
    await montar(valor);
    lembretes.mockClear();
    await avancar(600_000);
    expect(lembretes).toHaveBeenCalledTimes(1);
  });

  it('troca de conta: o 403 da anterior não vale para a nova, e a resposta da anterior não entra', async () => {
    let responderVelha!: (v: LembretesDoDia) => void;
    lembretes
      .mockImplementationOnce(() => new Promise((r) => (responderVelha = r)))
      .mockResolvedValueOnce({ data: '2026-11-04', tarefas: [] });
    await montar(sessao(CONTAS['técnico humano da TI'].conta));
    await montar(sessao(CONTAS['conta de serviço Técnica autorizada no painel'].conta));
    await act(async () => responderVelha(LEMBRETES));
    expect(lembretes).toHaveBeenCalledTimes(2);
    expect(texto()).toContain('Nenhuma tarefa recorrente para hoje');
    expect(texto()).not.toContain('Backup fictício');
  });

  it('troca de conta depois de um 403: a nova é perguntada', async () => {
    lembretes.mockRejectedValueOnce(RECUSA).mockResolvedValueOnce(LEMBRETES);
    await montar(sessao(CONTAS['usuário comum'].conta));
    expect(temLembrete()).toBe(false);
    await montar(sessao(CONTAS['conta de serviço Técnica autorizada no painel'].conta));
    expect(lembretes).toHaveBeenCalledTimes(2);
    expect(temLembrete()).toBe(true);
  });
});

describe('o 403 do lembrete não vira toast — pelo interceptor de verdade', () => {
  let adaptadorOriginal: typeof api.defaults.adapter;

  const recusar: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    throw new AxiosError('Forbidden', 'ERR_BAD_REQUEST', config, null, {
      status: 403,
      statusText: 'Forbidden',
      headers: {},
      config,
      data: { detail: 'Sem acesso' },
    });
  };

  beforeEach(() => {
    adaptadorOriginal = api.defaults.adapter;
    api.defaults.adapter = recusar;
  });

  afterEach(() => {
    api.defaults.adapter = adaptadorOriginal;
  });

  it('lembretesDoDia recusado: sem toast, e o erro chega a quem chamou com o 403', async () => {
    lembretes.mockRestore();
    await expect(tarefasRecorrentesService.lembretesDoDia()).rejects.toMatchObject({
      response: { status: 403 },
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('as outras rotas seguem com o toast de sempre no 403', async () => {
    await expect(tarefasRecorrentesService.buscar(1)).rejects.toBeTruthy();
    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});
