import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { act, useContext } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useNavigate, type NavigateFunction } from 'react-router-dom';
import api from '../services/api';
import { authService, usuariosService } from '../services/chamadoshsapi';
import { AuthContext, AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import { podeAdministrar } from '../lib/permissoes';
import type { Usuario, UsuarioLogado } from '../types/api';

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

/**
 * Toda confirmação do `/auth/me` termina num estado definido (FE-5, C4).
 *
 * O defeito: um 403 do `/auth/me` derrubava a confirmação sem marcar falha,
 * e a página administrativa ficava em "Confirmando suas permissões..." para
 * sempre. Aqui o `AuthProvider` de verdade, a guarda de verdade e a casca de
 * verdade, com o `/auth/me` (e a leitura da marca de serviço) simulados.
 * Contas fictícias.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type Contexto = React.ContextType<typeof AuthContext>;
let visto: Contexto;
let navegar: NavigateFunction;
const Leitor: React.FC = () => {
  visto = useContext(AuthContext);
  navegar = useNavigate();
  return null;
};

let montou = 0;
const Tela: React.FC = () => {
  montou += 1;
  return <p>tela de gestão</p>;
};

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

const ADMIN_HUMANO = me({ id: 1, nome: 'admin.ficticio', role_id: 1, integra_equipe_ti: false });
const ADMIN_DE_SERVICO = me({ id: 2, nome: 'servico.admin.ficticio', role_id: 1, integra_equipe_ti: false });
const TECNICO_DE_SERVICO = me({ id: 3, nome: 'servico.tecnico.ficticio', integra_equipe_ti: false });
const TECNICO_QUALIDADE = me({ id: 21, nome: 'qualidade.ficticio', setor_id: 5, integra_equipe_ti: false });
const SEM_PERMISSAO = me({ integra_equipe_ti: false, setor_id: 7 });

const REDE = { request: {}, message: 'Network Error' };
const TIMEOUT = { request: {}, code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' };
const SERVIDOR = { response: { status: 500, data: { detail: 'Erro interno' } } };
const RECUSA = { response: { status: 403, data: { detail: 'Usuário inativo' } } };

let host: HTMLDivElement;
let root: Root;
let pedirMe: MockInstance<typeof authService.me>;
let buscarConta: MockInstance<typeof usuariosService.buscar>;

const contaDe = (id: number, servico: boolean) => ({ id, conta_de_servico: servico }) as Usuario;

const montar = async (caminho = '/cadastros') => {
  await act(async () => {
    root.render(
      <AuthProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={[caminho]}>
            <Leitor />
            <AppLayout aoAbrirNovidades={() => {}} temNovidade={false} versao="1.7.8">
              <Routes>
                {['/cadastros', '/auditoria', '/tarefas-recorrentes'].map((p) => (
                  <Route
                    key={p}
                    path={p}
                    element={
                      <ProtectedRoute administrativa area="Gestão" quemTem="x">
                        <Tela />
                      </ProtectedRoute>
                    }
                  />
                ))}
                <Route path="/chamados" element={<p>quadro</p>} />
                <Route path="/login" element={<p>tela de login</p>} />
              </Routes>
            </AppLayout>
          </MemoryRouter>
        </ThemeProvider>
      </AuthProvider>
    );
  });
};

const texto = () => document.body.textContent ?? '';
const presoConfirmando = () => texto().includes('Confirmando suas permissões');
const veGestao = () =>
  Array.from(document.querySelectorAll('nav a')).some((a) => a.getAttribute('href') === '/cadastros');
const administra = () => podeAdministrar(visto.user, visto.identidadeConfirmada && !visto.falhaAoConfirmar);
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
const revalidar = async () => {
  await act(async () => {
    await visto.revalidarIdentidade();
  });
};
const adiado = <T,>() => {
  let resolver!: (v: T) => void;
  let rejeitar!: (e: unknown) => void;
  const promessa = new Promise<T>((r, j) => {
    resolver = r;
    rejeitar = j;
  });
  return { promessa, resolver, rejeitar };
};

/** O estado é definido: não está preso, e diz o que houve. */
const terminouDefinido = () => {
  expect(presoConfirmando()).toBe(false);
  expect(visto.revalidando).toBe(false);
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'token-guardado');
  localStorage.setItem('user', JSON.stringify({ id: 10, nome: 'tecnico.ti.ficticio', role: 'Tecnico' }));
  for (const verbo of ['get', 'post', 'put', 'patch', 'delete'] as const) {
    vi.spyOn(api, verbo).mockRejectedValue(new Error(`rede bloqueada no teste: ${verbo}`));
  }
  pedirMe = vi.spyOn(authService, 'me').mockResolvedValue(me());
  buscarConta = vi.spyOn(usuariosService, 'buscar').mockImplementation(async (id) =>
    contaDe(id, id === ADMIN_DE_SERVICO.id)
  );
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  montou = 0;
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

describe('cada resposta do /auth/me termina num estado definido', () => {
  it('1. 200 autorizado: a página administrativa abre', async () => {
    await montar();
    terminouDefinido();
    expect(montou).toBeGreaterThan(0);
    expect(veGestao()).toBe(true);
  });

  it('2. 200 sem permissão: bloqueio explicado, sem "Confirmando"', async () => {
    pedirMe.mockResolvedValueOnce(SEM_PERMISSAO);
    await montar();
    terminouDefinido();
    expect(montou).toBe(0);
    expect(texto()).toContain('não faz parte do seu acesso');
    expect(visto.falhaAoConfirmar).toBe(false);
  });

  it('3. 401: a sessão acaba, como sempre', async () => {
    pedirMe.mockRejectedValueOnce({ response: { status: 401 } });
    await montar();
    terminouDefinido();
    expect(visto.user).toBeNull();
    expect(montou).toBe(0);
  });

  it('4. 403: não fica em "Confirmando", não administra, diz que foi recusado e mantém a sessão', async () => {
    pedirMe.mockRejectedValueOnce(RECUSA);
    await montar();
    terminouDefinido();
    expect(montou).toBe(0);
    expect(administra()).toBe(false);
    expect(veGestao()).toBe(false);
    expect(visto.confirmacaoRecusada).toBe(true);
    expect(texto()).toContain('A API recusou a confirmação da sua conta');
    expect(botao('Tentar de novo')).toBeTruthy();
    // 403 não é logout.
    expect(visto.user).not.toBeNull();
    expect(localStorage.getItem('token')).toBe('token-guardado');
  });

  for (const [rotulo, erro] of [
    ['5. 500', SERVIDOR],
    ['6. timeout', TIMEOUT],
    ['7. rede desligada', REDE],
  ] as const) {
    it(`${rotulo}: termina, suspende a administração, oferece nova verificação, sessão mantida`, async () => {
      pedirMe.mockRejectedValueOnce(erro);
      await montar();
      terminouDefinido();
      expect(montou).toBe(0);
      expect(administra()).toBe(false);
      expect(visto.confirmacaoRecusada).toBe(false);
      expect(texto()).toContain('Não foi possível confirmar suas permissões');
      expect(botao('Tentar de novo')).toBeTruthy();
      expect(visto.user).not.toBeNull();
    });
  }

  it('8. recuperação: depois do 403, um 200 devolve o acesso e apaga o aviso', async () => {
    pedirMe.mockRejectedValueOnce(RECUSA);
    await montar();
    pedirMe.mockResolvedValueOnce(me());
    await revalidar();
    terminouDefinido();
    expect(montou).toBeGreaterThan(0);
    expect(visto.confirmacaoRecusada).toBe(false);
    expect(texto()).not.toContain('A API recusou');
  });

  it('9. "Tentar de novo": um pedido por clique, botão travado enquanto verifica, nada sozinho', async () => {
    pedirMe.mockRejectedValueOnce(SERVIDOR);
    await montar();
    expect(pedirMe).toHaveBeenCalledTimes(1);
    const pendente = adiado<UsuarioLogado>();
    pedirMe.mockReturnValueOnce(pendente.promessa);
    await clicar('Tentar de novo');
    expect(pedirMe).toHaveBeenCalledTimes(2);
    expect(visto.revalidando).toBe(true);
    expect(botao('Tentar de novo')?.disabled).toBe(true);
    await act(async () => pendente.resolver(me()));
    terminouDefinido();
    expect(montou).toBeGreaterThan(0);
    expect(pedirMe).toHaveBeenCalledTimes(2);
  });
});

describe('concorrência: nenhuma resposta velha devolve privilégio', () => {
  it('10. troca de usuário: o /auth/me da conta anterior, chegando depois, não entra', async () => {
    await montar();
    const velho = adiado<UsuarioLogado>();
    pedirMe.mockReturnValueOnce(velho.promessa);
    act(() => {
      void visto.revalidarIdentidade();
    });

    vi.spyOn(authService, 'login').mockImplementation(async () => {
      localStorage.setItem('token', 'token-da-outra');
      return { access_token: 'token-da-outra', token_type: 'bearer' } as never;
    });
    pedirMe.mockResolvedValueOnce(SEM_PERMISSAO);
    await act(async () => {
      await visto.login('outra.ficticia', 'senha-ficticia');
    });
    await act(async () => velho.resolver(me()));

    terminouDefinido();
    expect(visto.user?.integra_equipe_ti).toBe(false);
    expect(administra()).toBe(false);
  });

  it('11. logout durante a verificação: a resposta que chega depois não ressuscita nada', async () => {
    await montar();
    const pendente = adiado<UsuarioLogado>();
    pedirMe.mockReturnValueOnce(pendente.promessa);
    act(() => {
      void visto.revalidarIdentidade();
    });
    act(() => visto.logout());
    await act(async () => pendente.resolver(ADMIN_HUMANO));
    expect(visto.user).toBeNull();
    expect(visto.identidadeConfirmada).toBe(false);
    expect(visto.revalidando).toBe(false);
  });

  it('11b. logout durante a leitura da marca de serviço: nada volta', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, nome: 'admin.ficticio', role: 'Administrador' }));
    const marca = adiado<Usuario>();
    pedirMe.mockResolvedValue(ADMIN_HUMANO);
    buscarConta.mockReturnValueOnce(marca.promessa);
    await montar();
    act(() => visto.logout());
    await act(async () => marca.resolver(contaDe(1, false)));
    expect(visto.user).toBeNull();
    expect(veGestao()).toBe(false);
  });

  it('12. resposta atrasada: a mais velha (com permissão) não desfaz a mais nova (sem)', async () => {
    await montar();
    const velha = adiado<UsuarioLogado>();
    pedirMe.mockReturnValueOnce(velha.promessa);
    act(() => {
      void visto.revalidarIdentidade();
    });
    pedirMe.mockResolvedValueOnce(SEM_PERMISSAO);
    await revalidar();
    await act(async () => velha.resolver(me()));
    terminouDefinido();
    expect(administra()).toBe(false);
    expect(montou).toBeGreaterThan(0); // montou antes, na primeira confirmação
    expect(texto()).toContain('não faz parte do seu acesso');
  });

  it('12b. vários pedidos ao mesmo tempo: vale o último; o indicador só cai com ele', async () => {
    await montar();
    const a = adiado<UsuarioLogado>();
    const b = adiado<UsuarioLogado>();
    pedirMe.mockReturnValueOnce(a.promessa).mockReturnValueOnce(b.promessa);
    act(() => {
      void visto.revalidarIdentidade();
    });
    act(() => {
      void visto.revalidarIdentidade();
    });
    await act(async () => a.resolver(SEM_PERMISSAO));
    expect(visto.revalidando).toBe(true);
    await act(async () => b.resolver(me()));
    terminouDefinido();
    expect(administra()).toBe(true);
  });

  it('13. página administrativa aberta direto pela URL, com 403: termina na recusa', async () => {
    pedirMe.mockRejectedValueOnce(RECUSA);
    await montar('/auditoria');
    terminouDefinido();
    expect(texto()).toContain('A API recusou a confirmação da sua conta');
    expect(montou).toBe(0);
  });

  it('14. navegação durante a verificação: a página para onde se foi recebe o estado final', async () => {
    const pendente = adiado<UsuarioLogado>();
    pedirMe.mockReturnValueOnce(pendente.promessa);
    await montar('/cadastros');
    expect(presoConfirmando()).toBe(true);
    await act(async () => navegar('/chamados'));
    await act(async () => navegar('/tarefas-recorrentes'));
    await act(async () => pendente.rejeitar(RECUSA));
    terminouDefinido();
    expect(texto()).toContain('A API recusou a confirmação da sua conta');
    expect(montou).toBe(0);
  });
});

describe('as contas', () => {
  it('15. conta de serviço Administradora: confirmada, sem administração, sem "Confirmando"', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 2, nome: 'servico.admin.ficticio', role: 'Administrador' }));
    pedirMe.mockResolvedValue(ADMIN_DE_SERVICO);
    await montar();
    terminouDefinido();
    expect(buscarConta).toHaveBeenCalledWith(2);
    expect(visto.user?.conta_de_servico).toBe(true);
    expect(visto.falhaAoConfirmar).toBe(false);
    expect(administra()).toBe(false);
    expect(veGestao()).toBe(false);
    expect(montou).toBe(0);
    expect(texto()).toContain('não faz parte do seu acesso');
  });

  it('15b. administradora cuja marca não pôde ser lida: suspensa, com nova tentativa, até saber', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, nome: 'admin.ficticio', role: 'Administrador' }));
    pedirMe.mockResolvedValue(ADMIN_HUMANO);
    buscarConta.mockRejectedValueOnce(REDE);
    await montar();
    terminouDefinido();
    expect(administra()).toBe(false);
    expect(texto()).toContain('Não foi possível confirmar suas permissões');
    await revalidar();
    expect(administra()).toBe(true);
    expect(montou).toBeGreaterThan(0);
  });

  it('15c. a marca de serviço nunca vai para o localStorage', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, nome: 'admin.ficticio', role: 'Administrador' }));
    pedirMe.mockResolvedValue(ADMIN_HUMANO);
    await montar();
    expect(visto.user?.conta_de_servico).toBe(false);
    expect(localStorage.getItem('user')).not.toContain('conta_de_servico');
    expect(localStorage.getItem('user')).not.toContain('integra_equipe_ti');
  });

  it('16. conta de serviço Técnica (a API não a põe na equipe): sem administração', async () => {
    pedirMe.mockResolvedValue(TECNICO_DE_SERVICO);
    await montar();
    terminouDefinido();
    expect(administra()).toBe(false);
    expect(montou).toBe(0);
    // Técnico não precisa da marca: o que ele pode já vem sem a conta de serviço.
    expect(buscarConta).not.toHaveBeenCalled();
  });

  it('17. técnico humano da TI: administra', async () => {
    await montar();
    terminouDefinido();
    expect(administra()).toBe(true);
    expect(montou).toBeGreaterThan(0);
  });

  it('18. técnico da Qualidade: não administra, e o estado termina', async () => {
    pedirMe.mockResolvedValue(TECNICO_QUALIDADE);
    await montar();
    terminouDefinido();
    expect(administra()).toBe(false);
    expect(montou).toBe(0);
  });
});
