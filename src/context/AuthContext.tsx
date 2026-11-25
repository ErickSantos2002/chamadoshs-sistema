import { createContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { authService, usuariosService } from '../services/chamadoshsapi';
import {
  aoRenovarToken,
  definirConferenteDeSessao,
  fixarSessaoDaAba,
  pararAba,
  recusarSessaoAlheia,
  sessaoFixadaDaAba,
  SessaoAlteradaError,
} from '../services/api';
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
   * A última confirmação não terminou bem — rede, 5xx, 403 do `/auth/me`, ou
   * a marca de conta de serviço que não pôde ser lida. Enquanto valer, nada
   * de administração (`usePermissoes`). Não se repete sozinho.
   */
  falhaAoConfirmar: boolean;
  /**
   * Dentro de `falhaAoConfirmar`: a API RESPONDEU 403 ao `/auth/me` — conta
   * desativada ou sem acesso agora. A sessão fica (403 não é logout), e a
   * tela diz isso em vez de "verifique a conexão".
   */
  confirmacaoRecusada: boolean;
  /** Há um `/auth/me` desta tela em andamento. Para o botão não empilhar outro. */
  revalidando: boolean;
  /**
   * Outra aba do navegador entrou com OUTRA conta (AUTH-01), e a API
   * confirmou: `conta` é o nome dela. Esta aba fica parada — nada sai dela,
   * e o que foi digitado continua na tela — até recarregar. `null` no caso
   * normal. Opcional no tipo só para os valores de contexto montados à mão
   * (testes, galeria): o provedor sempre o preenche.
   */
  sessaoAlterada?: { conta: string } | null;
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
  const [confirmacaoRecusada, setConfirmacaoRecusada] = useState(false);
  const [revalidando, setRevalidando] = useState(false);
  const [sessaoAlterada, setSessaoAlterada] = useState<{ conta: string } | null>(null);

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

  // ── A sessão desta aba (AUTH-01) ─────────────────────────────────────
  //
  // `idExibido` é a conta que a tela mostra; `idConfirmado`, a que o
  // `/auth/me` já confirmou nesta aba. O `localStorage` é de todas as abas:
  // outra pode trocar o token, e a pergunta "ainda é a mesma conta?" é
  // respondida comparando estes ids com o que a API disser do token novo —
  // nunca com o `user` guardado, nem com o que há dentro do token.
  const idExibido = useRef<number | null>(null);
  const idConfirmado = useRef<number | null>(null);
  const entrando = useRef(false);
  const conferencia = useRef<Promise<void> | null>(null);
  // O token que a API já disse ser de outra conta: não se pergunta de novo
  // por ele a cada aviso de `storage` (a troca de conta dispara dois).
  const tokenDeOutraConta = useRef<string | null>(null);

  const aplicarIdentidade = useCallback((identidade: UsuarioAutenticado) => {
    idExibido.current = identidade.id;
    idConfirmado.current = identidade.id;
    setUser(identidade);
    guardarIdentidade(identidade);
    setIdentidadeConfirmada(true);
    setFalhaAoConfirmar(false);
    setConfirmacaoRecusada(false);
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

  /** A API disse que o token do navegador é de outra conta: a aba para. */
  const pararPorOutraConta = useCallback((conta: string) => {
    pedido.current += 1;
    pararAba();
    setRevalidando(false);
    setSessaoAlterada({ conta });
  }, []);

  const revalidarIdentidade = useCallback(async () => {
    const tokenUsado = localStorage.getItem('token');
    if (!tokenUsado) return;

    const minhaSessao = sessao.current;
    const meuPedido = ++pedido.current;
    const valeAinda = () =>
      minhaSessao === sessao.current &&
      meuPedido === pedido.current &&
      localStorage.getItem('token') !== null;

    setRevalidando(true);
    try {
      const me = await authService.me();
      if (!valeAinda()) return;
      // Conta diferente da que esta aba já tinha confirmado: o token do
      // navegador foi trocado por outra aba, e o aviso de `storage` não
      // chegou antes. Não se aplica por cima — a aba para.
      if (idConfirmado.current !== null && me.id !== idConfirmado.current) {
        pararPorOutraConta(me.nome);
        return;
      }
      // A resposta é do token que estava guardado quando o pedido saiu. Se
      // ele mudou no caminho (renovação), quem fixa é a revalidação seguinte.
      if (localStorage.getItem('token') === tokenUsado) {
        fixarSessaoDaAba({ token: tokenUsado, id: me.id });
      }
      await aplicarMe(me, valeAinda);
    } catch (err: any) {
      if (!valeAinda()) return;
      // A guarda recusou o pedido: a sessão mudou, e quem trata é a
      // conferência. Não é falha de rede nem recusa da API.
      if (err instanceof SessaoAlteradaError) return;
      const status = err?.response?.status;
      // 401 atrasado: o token do navegador não é mais o deste pedido — outra
      // aba entrou, ou renovou, enquanto ele andava. A recusa é da sessão
      // anterior e não diz nada sobre a atual: tirar a identidade da tela
      // aqui mandava a aba ao login por uma resposta velha. O interceptor já
      // chamou a conferência, e é ela que decide (para a aba, ou segue).
      if (status === 401 && localStorage.getItem('token') !== tokenUsado) return;
      setIdentidadeConfirmada(false);
      if (status === 401) {
        // Sessão que não vale mais: a permissão cai aqui mesmo, e o
        // interceptor leva ao login.
        setUser(null);
        return;
      }
      // 403: a API respondeu, e disse não — conta desativada ou sem acesso
      // agora. Até aqui só caía a confirmação, sem marcar falha, e a tela
      // ficava em "Confirmando suas permissões..." para sempre: `confirmando`
      // é "tem usuário, não confirmou, não falhou". Agora termina: falha
      // marcada, recusa dita, sessão mantida (403 não é logout) e uma nova
      // tentativa por clique.
      //
      // Rede ou servidor: a sessão continua (5xx não é logout), mas a
      // falha fica marcada, e enquanto ela vale `usePermissoes` suspende as
      // funções de administração — a permissão pode ter sido revogada
      // justamente agora. Não se repete sozinho: a próxima tentativa é um
      // clique, ou a próxima renovação do token.
      setFalhaAoConfirmar(true);
      setConfirmacaoRecusada(status === 403);
    } finally {
      // Só o pedido mais novo desliga o indicador: um velho que termina
      // depois não apaga o "verificando" de quem ainda está em andamento.
      if (meuPedido === pedido.current) setRevalidando(false);
    }
  }, [aplicarMe, pararPorOutraConta]);

  // Restaura a sessão do `localStorage` e a confirma pelo `/auth/me`.
  const restaurarSessao = useCallback(() => {
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
        // A guarda passa a valer já: token e identidade foram lidos juntos,
        // agora. O id é provisório até o `/auth/me`, que o fixa de novo.
        idExibido.current = typeof userData.id === 'number' ? userData.id : null;
        if (typeof userData.id === 'number') {
          fixarSessaoDaAba({ token: savedToken, id: userData.id });
        }
        void revalidarIdentidade();
      } catch (err) {
        console.error('Erro ao carregar dados do usuário:', err);
        authService.logout();
      }
    }
    setLoading(false);
  }, [revalidarIdentidade]);

  useEffect(() => {
    restaurarSessao();
  }, [restaurarSessao]);

  /** A sessão acabou em outra aba: esta deixa de exibi-la, sem pedir nada. */
  const encerrarNestaAba = useCallback(() => {
    sessao.current += 1;
    pedido.current += 1;
    idExibido.current = null;
    idConfirmado.current = null;
    tokenDeOutraConta.current = null;
    fixarSessaoDaAba(null);
    setUser(null);
    setToken(null);
    setError(null);
    setIdentidadeConfirmada(false);
    setFalhaAoConfirmar(false);
    setConfirmacaoRecusada(false);
    setRevalidando(false);
    setSessaoAlterada(null);
  }, []);

  /**
   * O token do navegador não é mais o desta aba: o que aconteceu?
   *
   * - sumiu → outra aba saiu, e esta sai junto;
   * - esta aba não tinha sessão → outra aba entrou, e esta NÃO a adota (D6):
   *   continua na tela de login, e o token alheio não sai em requisição
   *   nenhuma dela. Entrar aqui, ou recarregar, é decisão de quem está na aba;
   * - há um token novo → pergunta à API de quem é. Da mesma conta (outra aba
   *   renovou), a sessão da aba acompanha e nada muda na tela. De outra
   *   conta, a aba para e avisa.
   *
   * Uma conferência por vez: a guarda de `api.ts` espera por esta mesma
   * promessa antes de deixar qualquer requisição sair. Se a API não
   * responder, nada é liberado — a próxima requisição pergunta de novo.
   */
  const conferirSessao = useCallback((): Promise<void> => {
    if (conferencia.current) return conferencia.current;

    const execucao = (async () => {
      // Duas voltas no máximo. A conferência não renova o token; a segunda
      // volta existe para o caso de o token do navegador mudar de novo (outra
      // aba) enquanto o `/auth/me` desta conferência andava.
      for (let volta = 0; volta < 2; volta++) {
        if (entrando.current) return;

        const tokenAgora = localStorage.getItem('token');
        if (tokenAgora === null) {
          if (idExibido.current !== null) encerrarNestaAba();
          return;
        }
        if (sessaoFixadaDaAba()?.token === tokenAgora) return;
        if (tokenDeOutraConta.current === tokenAgora) return;
        if (idExibido.current === null) {
          // Homologado em navegador: adotar levava a aba, sozinha, do login
          // para o painel de quem entrou em outra aba.
          recusarSessaoAlheia();
          return;
        }

        const minhaSessao = sessao.current;
        let me: UsuarioLogado;
        try {
          me = await authService.me({ conferenciaDeSessao: true });
        } catch {
          return;
        }
        if (minhaSessao !== sessao.current) return;
        if (localStorage.getItem('token') !== tokenAgora) continue;

        if (me.id !== idExibido.current) {
          tokenDeOutraConta.current = tokenAgora;
          pararPorOutraConta(me.nome);
          return;
        }

        // A mesma conta, com token novo.
        tokenDeOutraConta.current = null;
        fixarSessaoDaAba({ token: tokenAgora, id: me.id });
        setToken(tokenAgora);
        setSessaoAlterada(null);
        const meuPedido = ++pedido.current;
        await aplicarMe(
          me,
          () =>
            minhaSessao === sessao.current &&
            meuPedido === pedido.current &&
            localStorage.getItem('token') !== null
        );
        return;
      }
    })().finally(() => {
      conferencia.current = null;
    });

    conferencia.current = execucao;
    return execucao;
  }, [aplicarMe, encerrarNestaAba, pararPorOutraConta]);

  // O navegador avisa esta aba quando OUTRA escreve no `localStorage`. A
  // guarda de `api.ts` usa a mesma conferência, para o caso de uma requisição
  // sair antes de o aviso chegar. Ao desmontar, a guarda é desligada.
  useEffect(() => {
    const aoMudarArmazenamento = (evento: StorageEvent) => {
      // `key` nula é o `clear()`.
      if (evento.key !== null && evento.key !== 'token' && evento.key !== 'user') return;
      void conferirSessao();
    };
    definirConferenteDeSessao(conferirSessao);
    window.addEventListener('storage', aoMudarArmazenamento);
    return () => {
      window.removeEventListener('storage', aoMudarArmazenamento);
      definirConferenteDeSessao(null);
      fixarSessaoDaAba(null);
    };
  }, [conferirSessao]);

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

    // Entrar começa uma sessão nova nesta aba: a guarda sai do caminho até a
    // API dizer quem entrou.
    entrando.current = true;
    idExibido.current = null;
    idConfirmado.current = null;
    tokenDeOutraConta.current = null;
    fixarSessaoDaAba(null);
    setSessaoAlterada(null);

    setLoading(true);
    setError(null);
    setIdentidadeConfirmada(false);
    setFalhaAoConfirmar(false);
    setConfirmacaoRecusada(false);
    setRevalidando(false);

    try {
      // Faz login usando o authService (já salva token automaticamente)
      const loginData = await authService.login({
        nome: username,
        senha: password
      });
      if (!valeAinda()) return;

      // A tentativa fica presa ao token que ESTE login recebeu (R1). A guarda
      // passa a valer já, para a própria confirmação: se outra aba trocar o
      // token do navegador daqui em diante, o `/auth/me` desta aba não sai
      // com ele. Fixar não é confirmar — a identidade só vale depois do
      // `/auth/me`, e só se ele disser a mesma conta que o login devolveu.
      //
      // Antes a guarda ficava desligada até a confirmação responder, e só
      // era ligada se o token do navegador ainda fosse o do login. Outra
      // conta que entrasse nesse intervalo deixava a aba com a identidade
      // deste login, o token da outra, e a guarda desligada para sempre.
      fixarSessaoDaAba({ token: loginData.access_token, id: loginData.user_id });
      setToken(loginData.access_token);

      // Busca dados completos do usuário logado — é daqui que sai a
      // identidade e a permissão.
      const userData = await authService.me();
      if (!valeAinda()) return;
      // A sessão do navegador foi trocada por outra aba enquanto a
      // confirmação andava, ou a API confirmou outra conta: a sessão deste
      // login não é ativada. (Token que sumiu — a outra aba saiu — é tratado
      // pela conferência, no fim.)
      const noNavegador = localStorage.getItem('token');
      const fixada = sessaoFixadaDaAba();
      if (
        (typeof loginData.user_id === 'number' && userData.id !== loginData.user_id) ||
        (noNavegador !== null && noNavegador !== fixada?.token)
      ) {
        throw new SessaoAlteradaError();
      }
      // O id que vale para a guarda é o que o `/auth/me` confirmou.
      if (fixada) fixarSessaoDaAba({ token: fixada.token, id: userData.id });

      await aplicarMe(userData, valeAinda);
    } catch (err: any) {
      if (!valeAinda()) return;
      if (err instanceof SessaoAlteradaError) {
        // Outra aba ficou com a sessão do navegador durante este login. A aba
        // fica sem sessão, na tela de login; a da outra aba fica onde está, e
        // o `finally` desfaz a sessão provisória e marca que o token do
        // navegador não é desta aba (D6).
        setToken(null);
        setError(
          'A sessão deste navegador mudou em outra aba durante o seu login. Entre de novo para usar esta conta.'
        );
      } else if (err.response) {
        // Tratamento de erros HTTP
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
      if (valeAinda()) {
        entrando.current = false;
        setLoading(false);
        if (idExibido.current === null) {
          // A entrada não deu em sessão (senha errada, rede, sessão trocada
          // por outra aba): a sessão provisória do login é desfeita, e o
          // token que o navegador guardar continua não sendo desta aba (D6).
          fixarSessaoDaAba(null);
          if (localStorage.getItem('token') !== null) recusarSessaoAlheia();
        } else {
          // Entrou. O aviso de `storage` é ignorado enquanto o login anda;
          // se a sessão do navegador mudou nesse meio-tempo (na última etapa,
          // depois da confirmação), a conferência decide agora, sem esperar a
          // próxima requisição. Sem mudança, ela não pede nada.
          void conferirSessao();
        }
      }
    }
  };

  // Função de logout
  const logout = () => {
    sessao.current += 1;
    pedido.current += 1;
    authService.logout();
    entrando.current = false;
    idExibido.current = null;
    idConfirmado.current = null;
    tokenDeOutraConta.current = null;
    fixarSessaoDaAba(null);
    setUser(null);
    setToken(null);
    setError(null);
    setIdentidadeConfirmada(false);
    setFalhaAoConfirmar(false);
    setConfirmacaoRecusada(false);
    setRevalidando(false);
    setSessaoAlterada(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        identidadeConfirmada,
        falhaAoConfirmar,
        confirmacaoRecusada,
        revalidando,
        sessaoAlterada,
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
