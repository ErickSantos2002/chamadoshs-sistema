import { createContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { authService, usuariosService } from '../services/chamadoshsapi';
import { aoRenovarToken } from '../services/api';
import { getRoleName, nomeCanonicoDaRole } from '../utils/roleMapper';
import { ehAdministrador } from '../lib/permissoes';
import type { UsuarioAutenticado, UsuarioLogado } from '../types/api';

type AuthContextType = {
  user: UsuarioAutenticado | null;
  token: string | null;
  loading: boolean;
  /**
   * O `/auth/me` desta sessão já respondeu, e `user` é o que ele disse.
   *
   * Até lá, `user` pode ser só o que estava no `localStorage` — bom para o
   * nome no topo, não para permissão. Nenhum controle de administração
   * aparece, e nenhuma tela de gestão pede nada à API, antes disto ser
   * `true` (ver `lib/permissoes`).
   */
  identidadeConfirmada: boolean;
  /**
   * A última confirmação não terminou bem — rede, 5xx, ou a marca de conta de
   * serviço que não pôde ser lida. Enquanto valer, nada de administração
   * (`usePermissoes`). Não se repete sozinho.
   */
  falhaAoConfirmar: boolean;
  /** Pede o `/auth/me` de novo. Uma resposta velha nunca sobrescreve uma nova. */
  revalidarIdentidade: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
};

export const AuthContext = createContext<AuthContextType>(
  {} as AuthContextType,
);

/** A identidade da tela a partir do `/auth/me`. Só o booleano `true` é TI. */
export function identidadeDoMe(me: UsuarioLogado): UsuarioAutenticado {
  return {
    id: me.id,
    username: me.nome,
    role: getRoleName(me.role_id),
    role_id: me.role_id,
    setor_id: me.setor_id ?? undefined,
    integra_equipe_ti: me.integra_equipe_ti === true,
  };
}

/**
 * A identidade do `/auth/me` com a marca de conta de serviço, quando ela
 * importa.
 *
 * O `/auth/me` não traz `conta_de_servico`, e a API-11 tira administração de
 * toda conta de serviço — a administradora compartilhada inclusive. O perfil
 * sozinho não basta, então o administrador é relido em `GET /usuarios/{id}`
 * (rota de qualquer autenticado). O técnico não precisa: o que ele pode vem
 * de `integra_equipe_ti` e da lista de atendentes da Qualidade, e a API já
 * tira a conta de serviço dos dois.
 *
 * Lança se a leitura falhar: quem chama decide o que a falha suspende.
 */
async function comMarcaDeServico(me: UsuarioLogado): Promise<UsuarioAutenticado> {
  const identidade = identidadeDoMe(me);
  if (!ehAdministrador(identidade)) return identidade;
  const conta = await usuariosService.buscar(me.id);
  // Só `false` é pessoa, como na API: qualquer outra coisa é serviço.
  return { ...identidade, conta_de_servico: conta?.conta_de_servico === false ? false : true };
}

/**
 * O que vai para o `localStorage`: o que serve para desenhar a tela depois de
 * um F5, e NÃO a permissão da TI — essa só vale confirmada de novo.
 */
function guardarIdentidade(identidade: UsuarioAutenticado) {
  localStorage.setItem(
    'user',
    JSON.stringify({
      id: identidade.id,
      nome: identidade.username,
      role: identidade.role,
      role_id: identidade.role_id,
      setor_id: identidade.setor_id,
    })
  );
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UsuarioAutenticado | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [identidadeConfirmada, setIdentidadeConfirmada] = useState(false);
  const [falhaAoConfirmar, setFalhaAoConfirmar] = useState(false);

  // ── Respostas atrasadas ──────────────────────────────────────────────
  //
  // `sessao` muda a cada login e logout; `pedido`, a cada `/auth/me`. Uma
  // resposta só vale se as duas ainda forem as de quando ela saiu. Sem isto,
  // o `/auth/me` de antes do logout chegaria depois e devolveria a
  // administração a uma tela já sem sessão — ou poria a identidade da conta
  // anterior por cima do login de outra pessoa. E, de dois `/auth/me` da
  // mesma sessão, o mais antigo não desfaz o que o mais novo disse.
  const sessao = useRef(0);
  const pedido = useRef(0);

  const aplicarIdentidade = useCallback((identidade: UsuarioAutenticado) => {
    setUser(identidade);
    guardarIdentidade(identidade);
    setIdentidadeConfirmada(true);
    setFalhaAoConfirmar(false);
  }, []);

  /**
   * O `/auth/me` respondeu: aplica, com a marca de serviço se for o caso.
   *
   * Se a marca não puder ser lida, a identidade vale (nome, setor, perfil)
   * mas a confirmação fica como falha: o administrador não administra até
   * a próxima tentativa dar certo. Sem saber se é pessoa, não é.
   */
  const aplicarMe = useCallback(
    async (me: UsuarioLogado, valeAinda: () => boolean) => {
      let identidade: UsuarioAutenticado;
      try {
        identidade = await comMarcaDeServico(me);
      } catch {
        if (!valeAinda()) return;
        aplicarIdentidade(identidadeDoMe(me));
        setFalhaAoConfirmar(true);
        return;
      }
      if (!valeAinda()) return;
      aplicarIdentidade(identidade);
    },
    [aplicarIdentidade]
  );

  const revalidarIdentidade = useCallback(async () => {
    if (!localStorage.getItem('token')) return;

    const minhaSessao = sessao.current;
    const meuPedido = ++pedido.current;
    const valeAinda = () =>
      minhaSessao === sessao.current &&
      meuPedido === pedido.current &&
      localStorage.getItem('token') !== null;

    try {
      const me = await authService.me();
      if (!valeAinda()) return;
      await aplicarMe(me, valeAinda);
    } catch (err: any) {
      if (!valeAinda()) return;
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // Sessão que não vale mais, ou conta desativada: a permissão cai
        // aqui mesmo. O 401 o interceptor já leva ao login.
        setIdentidadeConfirmada(false);
        if (status === 401) setUser(null);
        return;
      }
      // Rede ou servidor: a sessão continua (5xx não é logout), mas a
      // falha fica marcada, e enquanto ela vale `usePermissoes` suspende as
      // funções de administração — a permissão pode ter sido revogada
      // justamente agora. Não se repete sozinho: a próxima tentativa é um
      // clique, ou a próxima renovação do token.
      setFalhaAoConfirmar(true);
    }
  }, [aplicarMe]);

  // Restaura a sessão do `localStorage` e a confirma pelo `/auth/me`.
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);

        // O perfil do localStorage é a string CRUA que a API mandou no login —
        // `roles.nome` do banco, numa coluna em que a própria API não confia
        // ao pé da letra. Canonizada aqui, "TECNICO" e "Técnico" viram
        // 'Tecnico' antes de qualquer `===` do front. Sem isto, um acento na
        // tabela faria o sistema funcionar ao entrar (o login deriva do
        // role_id) e perder as áreas restritas depois do F5.
        const role =
          nomeCanonicoDaRole(userData.role) ?? getRoleName(userData.role_id || 3);

        // Sem `integra_equipe_ti`, de propósito: até o `/auth/me` responder,
        // ninguém é da TI — nem quem era na última vez.
        setUser({
          id: userData.id,
          username: userData.nome,
          role: role,
          role_id: typeof userData.role_id === 'number' ? userData.role_id : undefined,
          setor_id: userData.setor_id,
        });
        setToken(savedToken);
        void revalidarIdentidade();
      } catch (err) {
        console.error('Erro ao carregar dados do usuário:', err);
        authService.logout();
      }
    }
    setLoading(false);
  }, [revalidarIdentidade]);

  // Token renovado: a conta pode ter mudado de setor, de perfil ou de
  // equipe desde o login. Relê, sem tirar nada da tela enquanto isso — o
  // que estava confirmado nesta sessão continua até a resposta nova chegar,
  // e o que ela disser vale, para mais ou para menos.
  //
  // Uma renovação por vez (`api.ts`), e o token novo está longe de vencer:
  // o `/auth/me` daqui não dispara outra renovação, e não há laço.
  useEffect(
    () =>
      aoRenovarToken(() => {
        void revalidarIdentidade();
      }),
    [revalidarIdentidade]
  );

  // Função de login
  const login = async (username: string, password: string) => {
    const minhaSessao = ++sessao.current;
    pedido.current += 1;
    const valeAinda = () => minhaSessao === sessao.current;

    setLoading(true);
    setError(null);
    setIdentidadeConfirmada(false);
    setFalhaAoConfirmar(false);

    try {
      // Faz login usando o authService (já salva token automaticamente)
      const loginData = await authService.login({
        nome: username,
        senha: password
      });
      if (!valeAinda()) return;

      setToken(loginData.access_token);

      // Busca dados completos do usuário logado — é daqui que sai a
      // identidade e a permissão.
      const userData = await authService.me();
      if (!valeAinda()) return;

      await aplicarMe(userData, valeAinda);
    } catch (err: any) {
      if (!valeAinda()) return;
      // Tratamento de erros HTTP
      if (err.response) {
        if (err.response.status === 401) {
          setError('Usuário ou senha incorretos.');
        } else if (err.response.status === 403) {
          setError('Usuário inativo. Entre em contato com o administrador.');
        } else if (err.response.status >= 500) {
          setError('Erro no servidor. Tente novamente mais tarde.');
        } else {
          setError(
            err.response.data?.detail ||
            'Erro ao realizar login. Verifique os dados e tente novamente.'
          );
        }
      } else if (err.request) {
        setError('Erro de conexão com o servidor. Verifique sua internet.');
      } else {
        setError('Erro ao realizar login. Tente novamente.');
      }
    } finally {
      if (valeAinda()) setLoading(false);
    }
  };

  // Função de logout
  const logout = () => {
    sessao.current += 1;
    pedido.current += 1;
    authService.logout();
    setUser(null);
    setToken(null);
    setError(null);
    setIdentidadeConfirmada(false);
    setFalhaAoConfirmar(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        identidadeConfirmada,
        falhaAoConfirmar,
        revalidarIdentidade,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
