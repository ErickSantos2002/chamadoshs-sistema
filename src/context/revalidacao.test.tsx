import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { act, useContext } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import api from '../services/api';
import {
  authService,
  chamadosService,
  comentariosService,
  usuariosService,
} from '../services/chamadoshsapi';
import { AuthContext, AuthProvider } from './AuthContext';
import { ChamadosProvider } from './ChamadosContext';
import { ThemeProvider } from './ThemeContext';
import AppLayout from '../components/layout/AppLayout';
import ChamadoModal from '../components/ChamadoModal';
import { MENSAGEM_INTERNO_SEM_CONFIRMACAO } from '../lib/comentarios';
import { Chamado, SetorDestinoEnum, StatusEnum, Usuario, UsuarioLogado } from '../types/api';

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

/**
 * Revalidação que falha não autoriza nada novo (FE-5, `usePermissoes`).
 *
 * A casca de verdade — `AuthProvider` real, o menu, o modal — para ver o que
 * a pessoa vê: com a revalidação do `/auth/me` caída por rede ou 5xx, as
 * funções de administração (Gestão, comentário interno, troca do responsável
 * da TI) saem, a sessão continua, e voltam com a próxima confirmação, pedida
 * por um clique.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type Contexto = React.ContextType<typeof AuthContext>;
let visto: Contexto;
const Leitor: React.FC = () => {
  visto = useContext(AuthContext);
  return null;
};

const CHAMADO = {
  id: 1,
  titulo: 'Impressora do RH',
  protocolo: 'CHAM-2026-0401',
  descricao: 'Não imprime.',
  status: StatusEnum.EM_ANDAMENTO,
  prioridade: 'Média',
  solicitante_id: 2,
  tecnico_responsavel_id: 10,
  categoria_id: null,
  solucao: null,
  setor_destino: SetorDestinoEnum.TI,
  cancelado: false,
  arquivado: false,
  data_abertura: '2026-09-01T10:00:00',
} as unknown as Chamado;

const me = (extra: Partial<UsuarioLogado> = {}): UsuarioLogado =>
  ({
    id: 10,
    nome: 'tecnico.ti.ficticio',
    setor_id: 1,
    role_id: 2,
    ativo: true,
    integra_equipe_ti: true,
    ...extra,
  }) as UsuarioLogado;

const REDE = { request: {}, message: 'Network Error' };
const SERVIDOR = { response: { status: 503, data: { detail: 'Indisponível' } } };

let host: HTMLDivElement;
let root: Root;
let pedirMe: MockInstance<typeof authService.me>;
let criar: MockInstance<typeof comentariosService.criar>;

const montar = async () => {
  await act(async () => {
    root.render(
      <AuthProvider>
        <Leitor />
        <ThemeProvider>
          <ChamadosProvider>
            <MemoryRouter>
              <AppLayout aoAbrirNovidades={() => {}} temNovidade={false} versao="1.7.8">
                <ChamadoModal chamadoId={1} aoFechar={() => {}} aoAbrirEmPagina={() => {}} />
              </AppLayout>
            </MemoryRouter>
          </ChamadosProvider>
        </ThemeProvider>
      </AuthProvider>
    );
  });
};

const texto = () => document.body.textContent ?? '';
const veGestao = () =>
  Array.from(document.querySelectorAll('a')).some((a) => a.getAttribute('href') === '/cadastros');
const opcaoInterno = () =>
  Array.from(document.querySelectorAll('label'))
    .find((l) => l.textContent?.includes('Comentário interno'))
    ?.querySelector('input') as HTMLInputElement | undefined;
const botao = (t: string) =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === t) as
    | HTMLButtonElement
    | undefined;
const clicar = async (t: string) => {
  expect(botao(t), `botão "${t}" não apareceu`).toBeTruthy();
  await act(async () => {
    botao(t)!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};
const digitar = async (valor: string) => {
  const campo = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Novo comentário"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(campo, valor);
    campo!.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
const revalidar = async () => {
  await act(async () => {
    await visto.revalidarIdentidade();
  });
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'token-guardado');
  localStorage.setItem('user', JSON.stringify({ id: 10, nome: 'tecnico.ti.ficticio', role: 'Tecnico' }));

  for (const verbo of ['get', 'post', 'put', 'patch', 'delete'] as const) {
    vi.spyOn(api, verbo).mockRejectedValue(new Error(`rede bloqueada no teste: ${verbo}`));
  }
  pedirMe = vi.spyOn(authService, 'me').mockResolvedValue(me());
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([CHAMADO]);
  vi.spyOn(chamadosService, 'buscar').mockResolvedValue(CHAMADO);
  vi.spyOn(chamadosService, 'listarResponsaveisTI').mockResolvedValue([{ id: 10, nome: 'tecnico.ti.ficticio' }]);
  vi.spyOn(comentariosService, 'listarPorChamado').mockResolvedValue([]);
  criar = vi.spyOn(comentariosService, 'criar').mockImplementation(
    async (d) => ({ id: 5, ...d, usuario_id: 10, created_at: '2026-09-02T10:00:00' }) as never
  );
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([
    { id: 10, nome: 'tecnico.ti.ficticio', role_id: 2, ativo: true } as Usuario,
  ]);
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
  localStorage.clear();
});

describe('técnico da TI confirmado', () => {
  it('vê a Gestão, a opção de interno e o seletor de responsável da TI', async () => {
    await montar();
    expect(veGestao()).toBe(true);
    expect(opcaoInterno()).toBeTruthy();
    expect(chamadosService.listarResponsaveisTI).toHaveBeenCalled();
    expect(texto()).not.toContain('Não foi possível confirmar suas permissões');
  });
});

describe('revalidação que falha por rede ou servidor', () => {
  for (const [rotulo, erro] of [
    ['rede', REDE],
    ['503', SERVIDOR],
  ] as const) {
    it(`${rotulo}: as funções de administração saem; a sessão continua`, async () => {
      await montar();
      pedirMe.mockRejectedValueOnce(erro);
      await revalidar();

      expect(visto.user?.id).toBe(10);
      expect(veGestao()).toBe(false);
      expect(opcaoInterno()).toBeUndefined();
      expect(texto()).toContain('Não foi possível confirmar suas permissões');
      // O comentário público continua.
      await digitar('Público continua');
      await clicar('Comentar');
      expect(criar.mock.calls[0][0]).toMatchObject({ is_interno: false });
    });
  }

  it('interno já marcado: não sai, não vira público, e diz por quê', async () => {
    await montar();
    await digitar('Interno pela metade');
    await act(async () => {
      opcaoInterno()!.click();
    });
    pedirMe.mockRejectedValueOnce(REDE);
    await revalidar();

    expect(texto()).toContain(MENSAGEM_INTERNO_SEM_CONFIRMACAO);
    expect(botao('Comentar')!.disabled).toBe(true);
    await act(async () => {
      botao('Comentar')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(criar).not.toHaveBeenCalled();
  });

  it('nada se repete sozinho', async () => {
    await montar();
    pedirMe.mockRejectedValueOnce(REDE);
    await revalidar();
    const pedidos = pedirMe.mock.calls.length;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(pedirMe.mock.calls.length).toBe(pedidos);
  });

  it('"Confirmar de novo" que dá certo devolve as funções legítimas', async () => {
    await montar();
    pedirMe.mockRejectedValueOnce(REDE);
    await revalidar();
    expect(veGestao()).toBe(false);

    pedirMe.mockResolvedValueOnce(me());
    await clicar('Confirmar de novo');
    expect(veGestao()).toBe(true);
    expect(opcaoInterno()).toBeTruthy();
    expect(texto()).not.toContain('Não foi possível confirmar suas permissões');
  });

  it('o interno bloqueado volta a sair depois de confirmar de novo', async () => {
    await montar();
    await digitar('Interno pela metade');
    await act(async () => {
      opcaoInterno()!.click();
    });
    pedirMe.mockRejectedValueOnce(REDE);
    await revalidar();

    pedirMe.mockResolvedValueOnce(me());
    // O botão do próprio bloqueio (há outro, igual, no aviso da casca).
    const doBloqueio = Array.from(document.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === 'Confirmar de novo'
    );
    expect(doBloqueio.length).toBe(2);
    await act(async () => {
      doBloqueio[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(botao('Comentar')!.disabled).toBe(false);
    await clicar('Comentar');
    expect(criar.mock.calls[0][0]).toMatchObject({ is_interno: true, comentario: 'Interno pela metade' });
  });

  // Achado da homologação no navegador: o técnico restaurado não tem
  // `integra_equipe_ti` guardado, e o aviso sumia junto com a Gestão.
  it('F5 de técnico com o /auth/me caído: aviso e nova tentativa, que devolve a Gestão', async () => {
    pedirMe.mockRejectedValueOnce(REDE);
    await montar();
    expect(visto.user?.id).toBe(10);
    expect(veGestao()).toBe(false);
    expect(texto()).toContain('Não foi possível confirmar suas permissões');

    pedirMe.mockResolvedValueOnce(me());
    await clicar('Confirmar de novo');
    expect(veGestao()).toBe(true);
    expect(texto()).not.toContain('Não foi possível confirmar suas permissões');
  });

  it('F5 de usuário comum com o /auth/me caído: nenhum aviso', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 6, nome: 'comum.ficticio', role: 'Usuario' }));
    pedirMe.mockRejectedValueOnce(REDE);
    await montar();
    expect(visto.user?.id).toBe(6);
    expect(texto()).not.toContain('Não foi possível confirmar suas permissões');
  });

  it('técnico já confirmado fora da TI: a falha seguinte não mostra aviso', async () => {
    pedirMe.mockResolvedValueOnce(me({ integra_equipe_ti: false, setor_id: 5 }));
    await montar();
    pedirMe.mockRejectedValueOnce(REDE);
    await revalidar();
    expect(visto.falhaAoConfirmar).toBe(true);
    expect(texto()).not.toContain('Não foi possível confirmar suas permissões');
  });

  it('na restauração (F5) com o /auth/me caído, nada de administração', async () => {
    pedirMe.mockRejectedValueOnce(REDE);
    localStorage.setItem('user', JSON.stringify({ id: 1, nome: 'admin.ficticio', role: 'Administrador' }));
    await montar();
    expect(veGestao()).toBe(false);
    expect(texto()).toContain('Não foi possível confirmar suas permissões');
  });
});

describe('a revalidação que responde', () => {
  it('permissão revogada no backend: as ações privilegiadas saem, sem aviso de falha', async () => {
    await montar();
    pedirMe.mockResolvedValueOnce(me({ integra_equipe_ti: false, setor_id: 5 }));
    await revalidar();
    expect(veGestao()).toBe(false);
    expect(opcaoInterno()).toBeUndefined();
    expect(texto()).not.toContain('Não foi possível confirmar suas permissões');
  });

  it('401: a sessão acaba', async () => {
    await montar();
    pedirMe.mockRejectedValueOnce({ response: { status: 401 } });
    await revalidar();
    expect(visto.user).toBeNull();
  });

  it('403: nenhum privilégio', async () => {
    await montar();
    pedirMe.mockRejectedValueOnce({ response: { status: 403 } });
    await revalidar();
    expect(veGestao()).toBe(false);
    expect(opcaoInterno()).toBeUndefined();
  });

  it('a resposta antiga não desfaz a revalidação mais nova — também na tela', async () => {
    await montar();
    let antiga!: (m: UsuarioLogado) => void;
    let nova!: (m: UsuarioLogado) => void;
    pedirMe
      .mockReturnValueOnce(new Promise((r) => (antiga = r)))
      .mockReturnValueOnce(new Promise((r) => (nova = r)));
    await act(async () => {
      void visto.revalidarIdentidade();
      void visto.revalidarIdentidade();
    });
    await act(async () => nova(me({ integra_equipe_ti: false })));
    await act(async () => antiga(me({ integra_equipe_ti: true })));
    expect(veGestao()).toBe(false);
  });

  it('falha seguida de logout: nada da conta anterior fica', async () => {
    await montar();
    pedirMe.mockRejectedValueOnce(REDE);
    await revalidar();
    await act(async () => visto.logout());
    expect(visto.user).toBeNull();
    expect(visto.falhaAoConfirmar).toBe(false);
    expect(visto.identidadeConfirmada).toBe(false);
  });
});
