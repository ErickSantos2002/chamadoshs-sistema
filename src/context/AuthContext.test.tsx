import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, useContext } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import axios from 'axios';
import api from '../services/api';
import { authService } from '../services/chamadoshsapi';
import { AuthContext, AuthProvider } from './AuthContext';
import { podeAdministrar } from '../lib/permissoes';
import type { UsuarioLogado } from '../types/api';

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

/**
 * A identidade da sessão (FE-5): de onde vem `integra_equipe_ti`, quando a
 * administração é liberada, e por que uma resposta velha não devolve poder.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type Contexto = React.ContextType<typeof AuthContext>;
let visto: Contexto;

const Leitor: React.FC = () => {
  visto = useContext(AuthContext);
  return null;
};

let host: HTMLDivElement;
let root: Root;

const montar = async () => {
  await act(async () => {
    root.render(
      <AuthProvider>
        <Leitor />
      </AuthProvider>
    );
  });
};

/** Promessa que o teste resolve na hora que quiser. */
const adiada = <T,>() => {
  let resolver!: (v: T) => void;
  let rejeitar!: (e: unknown) => void;
  const promessa = new Promise<T>((r, j) => {
    resolver = r;
    rejeitar = j;
  });
  return { promessa, resolver, rejeitar };
};

const me = (extra: Partial<UsuarioLogado> & Record<string, unknown> = {}): UsuarioLogado =>
  ({
    id: 10,
    nome: 'tecnico.ti',
    setor_id: 1,
    role_id: 2,
    ativo: true,
    integra_equipe_ti: true,
    ...extra,
  }) as UsuarioLogado;

const guardarSessao = (user: Record<string, unknown> = { id: 10, nome: 'tecnico.ti', role: 'Tecnico' }) => {
  localStorage.setItem('token', 'token-guardado');
  localStorage.setItem('user', JSON.stringify(user));
};

const podeAdm = () => podeAdministrar(visto.user, visto.identidadeConfirmada);

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('integra_equipe_ti vindo do /auth/me', () => {
  const casos: Array<[string, unknown, boolean]> = [
    ['true', true, true],
    ['false', false, false],
    ['ausente (API anterior)', undefined, false],
    ['null', null, false],
    ['a string "true"', 'true', false],
    ['o número 1', 1, false],
  ];

  for (const [rotulo, valor, administra] of casos) {
    it(`técnico com o campo ${rotulo} → administra: ${administra}`, async () => {
      guardarSessao();
      const resposta = me();
      if (valor === undefined) delete (resposta as Partial<UsuarioLogado>).integra_equipe_ti;
      else (resposta as unknown as Record<string, unknown>).integra_equipe_ti = valor;
      vi.spyOn(authService, 'me').mockResolvedValue(resposta);

      await montar();

      expect(visto.identidadeConfirmada).toBe(true);
      expect(visto.user?.integra_equipe_ti).toBe(valor === true);
      expect(podeAdm()).toBe(administra);
    });
  }

  it('o administrador administra pelo perfil, com o campo falso', async () => {
    guardarSessao({ id: 1, nome: 'admin', role: 'Administrador' });
    vi.spyOn(authService, 'me').mockResolvedValue(
      me({ id: 1, nome: 'admin', role_id: 1, setor_id: 9, integra_equipe_ti: false })
    );

    await montar();

    expect(visto.user?.role).toBe('Administrador');
    expect(podeAdm()).toBe(true);
  });

  it('técnico da Qualidade e técnico sem setor não administram', async () => {
    guardarSessao();
    vi.spyOn(authService, 'me').mockResolvedValue(me({ setor_id: 2, integra_equipe_ti: false }));
    await montar();
    expect(podeAdm()).toBe(false);

    act(() => root.unmount());
    root = createRoot(host);
    vi.spyOn(authService, 'me').mockResolvedValue(
      me({ setor_id: undefined, integra_equipe_ti: false })
    );
    await montar();
    expect(visto.user?.setor_id).toBeUndefined();
    expect(podeAdm()).toBe(false);
  });
});

describe('restauração da sessão (F5)', () => {
  it('antes do /auth/me responder, ninguém administra — nem o administrador', async () => {
    guardarSessao({ id: 1, nome: 'admin', role: 'Administrador', integra_equipe_ti: true });
    const pendente = adiada<UsuarioLogado>();
    vi.spyOn(authService, 'me').mockReturnValue(pendente.promessa);

    await montar();

    expect(visto.loading).toBe(false);
    expect(visto.user?.username).toBe('admin');
    expect(visto.identidadeConfirmada).toBe(false);
    // A permissão guardada no navegador é ignorada.
    expect(visto.user?.integra_equipe_ti).toBeUndefined();
    expect(podeAdm()).toBe(false);

    await act(async () => pendente.resolver(me({ id: 1, nome: 'admin', role_id: 1 })));

    expect(visto.identidadeConfirmada).toBe(true);
    expect(podeAdm()).toBe(true);
  });

  it('a identidade do /auth/me substitui a guardada e mantém o setor depois do F5', async () => {
    guardarSessao({ id: 10, nome: 'nome.velho', role: 'Tecnico' });
    vi.spyOn(authService, 'me').mockResolvedValue(me({ nome: 'tecnico.ti', setor_id: 1 }));

    await montar();

    expect(visto.user).toEqual({
      id: 10,
      username: 'tecnico.ti',
      role: 'Tecnico',
      role_id: 2,
      setor_id: 1,
      integra_equipe_ti: true,
    });
    const guardado = JSON.parse(localStorage.getItem('user')!);
    expect(guardado.setor_id).toBe(1);
    expect(guardado.role_id).toBe(2);
    // A permissão da TI nunca vai para o localStorage.
    expect(guardado).not.toHaveProperty('integra_equipe_ti');
  });

  it('consulta o /auth/me uma vez só na restauração', async () => {
    guardarSessao();
    const pedir = vi.spyOn(authService, 'me').mockResolvedValue(me());
    await montar();
    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it('sem sessão guardada, não consulta nada', async () => {
    const pedir = vi.spyOn(authService, 'me');
    await montar();
    expect(pedir).not.toHaveBeenCalled();
    expect(visto.user).toBeNull();
  });

  it('falha de rede no /auth/me: não libera, avisa, e não repete sozinho', async () => {
    guardarSessao({ id: 1, nome: 'admin', role: 'Administrador' });
    const pedir = vi
      .spyOn(authService, 'me')
      .mockRejectedValue({ request: {}, message: 'Network Error' });

    await montar();

    expect(visto.identidadeConfirmada).toBe(false);
    expect(visto.falhaAoConfirmar).toBe(true);
    expect(podeAdm()).toBe(false);
    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it('403 no /auth/me (conta desativada): não libera', async () => {
    guardarSessao({ id: 1, nome: 'admin', role: 'Administrador' });
    vi.spyOn(authService, 'me').mockRejectedValue({ response: { status: 403 } });
    await montar();
    expect(podeAdm()).toBe(false);
  });
});

describe('renovação do token', () => {
  /** Dispara a renovação de verdade, pelo interceptor do `api.ts`. */
  const renovar = async (dados = { user_id: 10, nome: 'tecnico.ti', role: 'Tecnico' }) => {
    const exp = Math.floor((Date.now() + 5 * 60_000) / 1000);
    const payload = btoa(JSON.stringify({ sub: '10', exp })).replace(/=+$/, '');
    localStorage.setItem('token', `c.${payload}.a`);
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { access_token: 'token-renovado', ...dados },
    } as never);
    const aoEnviar = (api.interceptors.request as any).handlers[0].fulfilled;
    await act(async () => {
      await aoEnviar({ headers: {}, url: '/chamados/' });
    });
  };

  it('revalida o /auth/me e passa a valer o estado atual — inclusive para menos', async () => {
    guardarSessao();
    const pedir = vi.spyOn(authService, 'me').mockResolvedValueOnce(me());
    await montar();
    expect(podeAdm()).toBe(true);

    // A pessoa saiu da TI entre o login e a renovação.
    pedir.mockResolvedValueOnce(me({ setor_id: 5, integra_equipe_ti: false }));
    await renovar();

    expect(pedir).toHaveBeenCalledTimes(2);
    expect(visto.user?.setor_id).toBe(5);
    expect(podeAdm()).toBe(false);
  });

  it('não apaga campos: o setor guardado continua depois da renovação', async () => {
    guardarSessao();
    vi.spyOn(authService, 'me').mockResolvedValue(me({ setor_id: 1 }));
    await montar();

    await renovar();

    const guardado = JSON.parse(localStorage.getItem('user')!);
    expect(guardado).toMatchObject({ id: 10, nome: 'tecnico.ti', role: 'Tecnico', setor_id: 1 });
    expect(guardado).not.toHaveProperty('integra_equipe_ti');
    expect(localStorage.getItem('token')).toBe('token-renovado');
  });

  it('enquanto a revalidação anda, não eleva nada: quem não administrava continua sem', async () => {
    guardarSessao();
    const pedir = vi
      .spyOn(authService, 'me')
      .mockResolvedValueOnce(me({ integra_equipe_ti: false }));
    await montar();
    expect(podeAdm()).toBe(false);

    const pendente = adiada<UsuarioLogado>();
    pedir.mockReturnValueOnce(pendente.promessa);
    await renovar();
    expect(podeAdm()).toBe(false);

    await act(async () => pendente.resolver(me({ integra_equipe_ti: false })));
    expect(podeAdm()).toBe(false);
  });

  it('de duas revalidações, a resposta mais antiga não desfaz a mais nova', async () => {
    guardarSessao();
    const pedir = vi.spyOn(authService, 'me').mockResolvedValueOnce(me());
    await montar();

    const antiga = adiada<UsuarioLogado>();
    const nova = adiada<UsuarioLogado>();
    pedir.mockReturnValueOnce(antiga.promessa).mockReturnValueOnce(nova.promessa);
    await act(async () => {
      void visto.revalidarIdentidade();
      void visto.revalidarIdentidade();
    });

    // A nova diz que a pessoa saiu da TI; a antiga, atrasada, diria que não.
    await act(async () => nova.resolver(me({ integra_equipe_ti: false })));
    await act(async () => antiga.resolver(me({ integra_equipe_ti: true })));

    expect(podeAdm()).toBe(false);
  });
});

describe('respostas atrasadas entre sessões', () => {
  it('logout durante a revalidação: a resposta que chega depois não devolve nada', async () => {
    guardarSessao({ id: 1, nome: 'admin', role: 'Administrador' });
    const pendente = adiada<UsuarioLogado>();
    vi.spyOn(authService, 'me').mockReturnValue(pendente.promessa);
    await montar();

    act(() => visto.logout());
    await act(async () => pendente.resolver(me({ id: 1, nome: 'admin', role_id: 1 })));

    expect(visto.user).toBeNull();
    expect(visto.identidadeConfirmada).toBe(false);
    expect(podeAdm()).toBe(false);
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('login de outra conta com a resposta antiga pendente: vale a conta nova', async () => {
    guardarSessao({ id: 1, nome: 'admin', role: 'Administrador' });
    const antiga = adiada<UsuarioLogado>();
    const pedir = vi.spyOn(authService, 'me').mockReturnValueOnce(antiga.promessa);
    await montar();

    vi.spyOn(authService, 'login').mockImplementation(async () => {
      localStorage.setItem('token', 'token-da-usuaria');
      return { access_token: 'token-da-usuaria', token_type: 'bearer', user_id: 30, nome: 'usuaria', role: 'Usuario' };
    });
    pedir.mockResolvedValueOnce(
      me({ id: 30, nome: 'usuaria', role_id: 3, setor_id: 7, integra_equipe_ti: false })
    );

    await act(async () => {
      await visto.login('usuaria', 'x');
    });
    expect(visto.user?.id).toBe(30);

    // A resposta da sessão do administrador chega agora, atrasada.
    await act(async () => antiga.resolver(me({ id: 1, nome: 'admin', role_id: 1 })));

    expect(visto.user?.id).toBe(30);
    expect(visto.user?.role).toBe('Usuario');
    expect(podeAdm()).toBe(false);
    expect(JSON.parse(localStorage.getItem('user')!).id).toBe(30);
  });
});

describe('login e logout continuam como antes', () => {
  it('login confirma a identidade pelo /auth/me', async () => {
    vi.spyOn(authService, 'login').mockImplementation(async () => {
      localStorage.setItem('token', 't');
      return { access_token: 't', token_type: 'bearer', user_id: 1, nome: 'admin', role: 'Administrador' };
    });
    vi.spyOn(authService, 'me').mockResolvedValue(me({ id: 1, nome: 'admin', role_id: 1 }));
    await montar();

    await act(async () => {
      await visto.login('admin', 'x');
    });

    expect(visto.token).toBe('t');
    expect(visto.identidadeConfirmada).toBe(true);
    expect(visto.loading).toBe(false);
    expect(podeAdm()).toBe(true);
  });

  it('senha errada: a mensagem de sempre, e nada confirmado', async () => {
    vi.spyOn(authService, 'login').mockRejectedValue({ response: { status: 401 } });
    await montar();

    await act(async () => {
      await visto.login('x', 'y');
    });

    expect(visto.error).toBe('Usuário ou senha incorretos.');
    expect(visto.user).toBeNull();
    expect(visto.identidadeConfirmada).toBe(false);
  });

  it('logout limpa sessão, identidade e confirmação', async () => {
    guardarSessao();
    vi.spyOn(authService, 'me').mockResolvedValue(me());
    await montar();
    expect(visto.identidadeConfirmada).toBe(true);

    act(() => visto.logout());

    expect(visto.user).toBeNull();
    expect(visto.token).toBeNull();
    expect(visto.identidadeConfirmada).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
  });
});
