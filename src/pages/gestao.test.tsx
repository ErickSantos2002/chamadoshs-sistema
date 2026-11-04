import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { ChamadosProvider } from '../context/ChamadosContext';
import { CadastrosProvider } from '../context/CadastrosContext';
import { ThemeProvider } from '../context/ThemeContext';
import ProtectedRoute from '../components/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import SetoresTab from '../components/cadastros/SetoresTab';
import SlaTab from '../components/cadastros/SlaTab';
import {
  categoriasService,
  chamadosService,
  setoresService,
  slaConfigsService,
  tarefasRecorrentesService,
  usuariosService,
} from '../services/chamadoshsapi';
import Chamados from './Chamados';
import TarefasRecorrentes from './TarefasRecorrentes';

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

/**
 * A Gestão na FE-5 (F5-3): quem vê, quem abre pela URL, e quem nunca chega a
 * pedir nada à API. Cada perfil é uma conta real da HS; o que a API decide
 * para cada um está em `require_equipe_ti`.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type Perfil = {
  role: string;
  role_id: number;
  integra_equipe_ti: boolean;
};

const PERFIS: Record<string, Perfil> = {
  administrador: { role: 'Administrador', role_id: 1, integra_equipe_ti: false },
  tecnicoDaTI: { role: 'Tecnico', role_id: 2, integra_equipe_ti: true },
  tecnicoDaQualidade: { role: 'Tecnico', role_id: 2, integra_equipe_ti: false },
  tecnicoSemSetor: { role: 'Tecnico', role_id: 2, integra_equipe_ti: false },
  usuario: { role: 'Usuario', role_id: 3, integra_equipe_ti: false },
};

const ADMINISTRAM = ['administrador', 'tecnicoDaTI'];

const sessao = (
  perfil: Perfil,
  estado: { confirmada?: boolean; falhou?: boolean; revalidar?: () => Promise<void> } = {}
) =>
  ({
    user: { id: 1, username: 'pessoa', ...perfil, conta_de_servico: false },
    token: 'token-de-teste',
    loading: false,
    error: null,
    login: async () => {},
    logout: () => {},
    identidadeConfirmada: estado.confirmada ?? true,
    falhaAoConfirmar: estado.falhou ?? false,
    confirmacaoRecusada: false,
    revalidando: false,
    revalidarIdentidade: estado.revalidar ?? (async () => {}),
  }) as React.ContextType<typeof AuthContext>;

let host: HTMLDivElement;
let root: Root;

const render = async (elemento: React.ReactElement) => {
  await act(async () => {
    root.render(elemento);
  });
};

const comSessao = (valor: React.ContextType<typeof AuthContext>, filhos: React.ReactNode) => (
  <AuthContext.Provider value={valor}>
    <ThemeProvider>{filhos}</ThemeProvider>
  </AuthContext.Provider>
);

/** Uma rota de gestão com a guarda de verdade, e uma tela que denuncia a montagem. */
let montou = 0;
const TelaDeGestao: React.FC = () => {
  montou += 1;
  return <p>tela de gestão</p>;
};

const rotaAdministrativa = (valor: React.ContextType<typeof AuthContext>, caminho = '/cadastros') =>
  comSessao(
    valor,
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        {['/cadastros', '/tarefas-recorrentes', '/auditoria'].map((p) => (
          <Route
            key={p}
            path={p}
            element={
              <ProtectedRoute administrativa area="Gestão" quemTem="administradores e a equipe da TI">
                <TelaDeGestao />
              </ProtectedRoute>
            }
          />
        ))}
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  montou = 0;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('rotas de gestão pela URL digitada', () => {
  for (const caminho of ['/cadastros', '/tarefas-recorrentes', '/auditoria']) {
    for (const [nome, perfil] of Object.entries(PERFIS)) {
      const entra = ADMINISTRAM.includes(nome);
      it(`${caminho} — ${nome}: ${entra ? 'abre' : 'bloqueia, sem montar a tela'}`, async () => {
        await render(rotaAdministrativa(sessao(perfil), caminho));
        expect(montou > 0).toBe(entra);
        expect(host.textContent).toContain(entra ? 'tela de gestão' : 'não faz parte do seu acesso');
      });
    }
  }

  it('identidade pendente: nem a tela, nem a recusa — espera', async () => {
    await render(rotaAdministrativa(sessao(PERFIS.administrador, { confirmada: false })));
    expect(montou).toBe(0);
    expect(host.textContent).toContain('Confirmando suas permissões');
    expect(host.textContent).not.toContain('não faz parte do seu acesso');
  });

  it('o /auth/me falhou: não libera, oferece tentar de novo, e não repete sozinho', async () => {
    const revalidar = vi.fn(async () => {});
    await render(
      rotaAdministrativa(sessao(PERFIS.tecnicoDaTI, { confirmada: false, falhou: true, revalidar }))
    );
    expect(montou).toBe(0);
    expect(host.textContent).toContain('Não foi possível confirmar suas permissões');
    expect(revalidar).not.toHaveBeenCalled();

    const botao = Array.from(host.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Tentar de novo')
    )!;
    await act(async () => botao.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(revalidar).toHaveBeenCalledTimes(1);
  });

  it('ser técnico não basta: o campo ausente não abre', async () => {
    await render(
      rotaAdministrativa(
        sessao({ role: 'Tecnico', role_id: 2 } as unknown as Perfil)
      )
    );
    expect(montou).toBe(0);
  });
});

describe('menu de Gestão (F5-3)', () => {
  const menu = async (valor: React.ContextType<typeof AuthContext>) => {
    await render(
      comSessao(
        valor,
        <MemoryRouter>
          <AppLayout aoAbrirNovidades={() => {}} temNovidade={false} versao="9.9.9">
            <p>conteúdo</p>
          </AppLayout>
        </MemoryRouter>
      )
    );
    return Array.from(host.querySelectorAll('nav a')).map((a) => a.getAttribute('href'));
  };

  for (const [nome, perfil] of Object.entries(PERFIS)) {
    const ve = ADMINISTRAM.includes(nome);
    it(`${nome}: ${ve ? 'vê' : 'não vê'} Cadastros, Tarefas e Auditoria`, async () => {
      const links = await menu(sessao(perfil));
      expect(links).toContain('/dashboard');
      expect(links).toContain('/chamados');
      for (const restrita of ['/cadastros', '/tarefas-recorrentes', '/auditoria']) {
        expect(links.includes(restrita), restrita).toBe(ve);
      }
    });
  }

  it('enquanto a identidade não é confirmada, nem o administrador vê a Gestão', async () => {
    const links = await menu(sessao(PERFIS.administrador, { confirmada: false }));
    expect(links).not.toContain('/cadastros');
    expect(links).toContain('/chamados');
  });
});

// O lembrete do quadro deixou de ser "só de quem administra" (API-11, S1):
// quem lê é quem a API deixa, pela rota própria. A matriz por conta está em
// `lembretesDaTV.test.tsx`; aqui fica só a garantia de gestão — o quadro não
// pede a listagem administrativa de tarefas, para perfil nenhum.
describe('Chamados: o quadro não pede a listagem administrativa de tarefas', () => {
  for (const [nome, perfil] of Object.entries(PERFIS)) {
    it(`${nome}: nem na abertura, nem no auto-refresh`, async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
      vi.spyOn(chamadosService, 'listarAtendentesQualidade').mockResolvedValue([]);
      vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
      vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([]);
      vi.spyOn(usuariosService, 'listar').mockResolvedValue([]);
      vi.spyOn(tarefasRecorrentesService, 'lembretesDoDia').mockRejectedValue({
        response: { status: 403 },
      });
      const listar = vi.spyOn(tarefasRecorrentesService, 'listar').mockResolvedValue([]);
      await render(
        comSessao(
          sessao(perfil),
          <ChamadosProvider>
            <MemoryRouter>
              <Chamados />
            </MemoryRouter>
          </ChamadosProvider>
        )
      );
      await act(async () => {
        vi.advanceTimersByTime(600_000 * 2);
      });
      expect(listar).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });
  }
});

describe('Tarefas Recorrentes montada sem permissão', () => {
  it('não pede nada a nenhuma das rotas de tarefas', async () => {
    const chamadas = [
      vi.spyOn(tarefasRecorrentesService, 'listar'),
      vi.spyOn(tarefasRecorrentesService, 'listarExecucoes'),
      vi.spyOn(tarefasRecorrentesService, 'criar'),
      vi.spyOn(tarefasRecorrentesService, 'atualizar'),
      vi.spyOn(tarefasRecorrentesService, 'excluir'),
      vi.spyOn(tarefasRecorrentesService, 'realizar'),
    ];
    const usuarios = vi.spyOn(usuariosService, 'listar').mockResolvedValue([]);
    vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
    vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
    vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([]);

    await render(
      comSessao(
        sessao(PERFIS.tecnicoDaQualidade),
        <ChamadosProvider>
          <MemoryRouter>
            <TarefasRecorrentes />
          </MemoryRouter>
        </ChamadosProvider>
      )
    );

    for (const c of chamadas) expect(c).not.toHaveBeenCalled();
    expect(usuarios).not.toHaveBeenCalled();
    expect(host.textContent).toContain('não tem permissão');
  });

  it('técnico da TI carrega a lista', async () => {
    const listar = vi.spyOn(tarefasRecorrentesService, 'listar').mockResolvedValue([]);
    vi.spyOn(usuariosService, 'listar').mockResolvedValue([]);
    vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
    vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
    vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([]);
    await render(
      comSessao(
        sessao(PERFIS.tecnicoDaTI),
        <ChamadosProvider>
          <MemoryRouter>
            <TarefasRecorrentes />
          </MemoryRouter>
        </ChamadosProvider>
      )
    );
    expect(listar).toHaveBeenCalledTimes(1);
  });
});

describe('Cadastros: SLA e Setores pela regra central', () => {
  const SLA = [
    { prioridade: 'Alta', minutos_resposta: 60, minutos_resolucao: 240 },
  ];

  const montarSla = async (perfil: Perfil, confirmada = true) => {
    vi.spyOn(slaConfigsService, 'listar').mockResolvedValue(SLA as never);
    await render(comSessao(sessao(perfil, { confirmada }), <SlaTab ativo />));
  };

  for (const [nome, perfil] of Object.entries(PERFIS)) {
    const edita = ADMINISTRAM.includes(nome);
    it(`SLA — ${nome}: ${edita ? 'pode' : 'não pode'} iniciar a edição`, async () => {
      await montarSla(perfil);
      expect(host.textContent).toContain('Alta');
      const editar = host.querySelector('[aria-label="Editar prazos de Alta"]');
      expect(Boolean(editar)).toBe(edita);
    });
  }

  it('SLA — a leitura dos prazos continua para todos', async () => {
    await montarSla(PERFIS.usuario);
    expect(slaConfigsService.listar).toHaveBeenCalledTimes(1);
  });

  const montarSetores = async (perfil: Perfil) => {
    vi.spyOn(setoresService, 'listar').mockResolvedValue([
      { id: 1, nome: 'TI', ativo: true, created_at: '2026-01-01' },
      { id: 2, nome: 'Qualidade', ativo: false, created_at: '2026-01-01' },
    ] as never);
    vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
    vi.spyOn(usuariosService, 'listar').mockResolvedValue([]);
    vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([]);
    await render(
      comSessao(
        sessao(perfil),
        <CadastrosProvider>
          <SetoresTab />
        </CadastrosProvider>
      )
    );
  };

  for (const [nome, perfil] of Object.entries(PERFIS)) {
    const administra = ADMINISTRAM.includes(nome);
    it(`Setores — ${nome}: ${administra ? 'cria, edita, desativa e reativa' : 'só lê'}`, async () => {
      await montarSetores(perfil);
      const titulos = Array.from(host.querySelectorAll('button')).map(
        (b) => `${b.getAttribute('aria-label') ?? ''} ${b.textContent ?? ''} ${b.getAttribute('title') ?? ''}`
      );
      const tem = (t: string) => titulos.some((x) => x.includes(t));
      expect(tem('Editar TI'), 'editar').toBe(administra);
      expect(tem('Reativar Qualidade'), 'reativar').toBe(administra);
      // Nenhum perfil ganha excluir: a FE-5 não cria a exclusão de setor.
      expect(titulos.some((x) => /excluir/i.test(x))).toBe(false);
    });
  }
});
