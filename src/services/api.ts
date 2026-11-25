import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { normalizarDetalhe } from '../lib/erroApi';

// URL base da API - ajuste conforme seu ambiente
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Criar instância do Axios
declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * O 403 desta requisição é resposta esperada, não erro a anunciar: o
     * interceptor não mostra o toast de "Sem permissão". Quem chama trata.
     * Usado pelo lembrete do quadro, que é pedido por quem talvez não o leia.
     */
    silenciarRecusa?: boolean;
    /**
     * A requisição É a conferência da sessão (o `/auth/me` que o `AuthContext`
     * faz quando o token do navegador deixou de ser o desta aba). Passa pela
     * guarda de sessão, que de outro modo a recusaria junto com as demais.
     */
    conferenciaDeSessao?: boolean;
  }
}

const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// RENOVAÇÃO PREVENTIVA DO TOKEN
// ============================================
//
// A renovação precisa acontecer ANTES do token vencer. O endpoint
// POST /auth/refresh depende de get_current_user, ou seja, exige um token
// ainda válido — com o token expirado ele também responde 401. Renovar
// reagindo ao 401, portanto, não funcionaria: só antecipando.

// Quanto tempo antes do vencimento a renovação dispara.
const MARGEM_RENOVACAO_MS = 30 * 60 * 1000;

type TokenRenovado = {
  access_token: string;
  user_id: number;
  nome: string;
  role: string;
};

/** Instante de expiração do JWT em milissegundos, ou null se não der para ler. */
function expiracaoDoToken(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    // O payload vem em base64url: troca os caracteres e recompõe o padding.
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const completo = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

    const { exp } = JSON.parse(atob(completo));
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    // Token malformado não deve derrubar a requisição — segue sem renovar e,
    // se de fato não servir, o interceptor de resposta trata o 401.
    return null;
  }
}

function estaPertoDeVencer(token: string): boolean {
  const expiracao = expiracaoDoToken(token);
  if (expiracao === null) return false;

  return expiracao - Date.now() < MARGEM_RENOVACAO_MS;
}

/**
 * Usa axios puro, não a instância `api`: passar pela instância faria a
 * requisição de renovação cair neste mesmo interceptor, recursivamente.
 */
async function renovarToken(): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const { data } = await axios.post<TokenRenovado>(
      `${API_BASE_URL}/api/v1/auth/refresh`,
      null,
      { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
    );

    // Escrita obsoleta (AUTH-01, D2): enquanto o pedido andava, o token do
    // navegador deixou de ser o que esta renovação partiu — outra aba entrou
    // com outra conta, saiu, ou já renovou. Gravar agora poria a sessão antiga
    // por cima da nova. O resultado é descartado; se a sessão desta aba foi
    // substituída, a guarda da próxima requisição descobre.
    //
    // Conferir e gravar são síncronos, um logo depois do outro: nesta aba não
    // há nada entre os dois. O `localStorage` não tem trava entre abas — uma
    // escrita de outra aba exatamente entre estas linhas ainda passaria.
    if (localStorage.getItem('token') !== token) return;

    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(identidadeGuardadaAposRenovar(data)));

    // A renovação desta aba troca o token da MESMA conta: a sessão da aba
    // acompanha, ou a guarda tomaria o token novo por troca de sessão. Só
    // quando a API devolve o mesmo id para o token que a aba já conhecia.
    if (sessaoDaAba && sessaoDaAba.token === token && sessaoDaAba.id === data.user_id) {
      sessaoDaAba = { token: data.access_token, id: data.user_id };
    }
  } catch {
    // Renovação falhou: segue com o token atual em vez de derrubar a
    // requisição do usuário. Se ele já não servir, o 401 é tratado adiante.
    return;
  }

  // Fora do `try`: um ouvinte com defeito não pode virar "a renovação falhou".
  for (const ouvinte of [...ouvintesDaRenovacao]) {
    try {
      ouvinte();
    } catch {
      // O token já foi trocado; o ouvinte é quem perde.
    }
  }
}

/**
 * O que fica guardado depois da renovação.
 *
 * O `/auth/refresh` devolve só `user_id`, `nome` e `role`. Gravar só isso
 * apagava o `setor_id` que o login tinha guardado — e a sessão, recarregada
 * depois, perdia o setor. Agora os campos que vieram valem, e os demais da
 * MESMA conta continuam. Se o id mudou, nada do anterior é aproveitado.
 *
 * `integra_equipe_ti` nunca é guardado (FE-5): permissão da TI só vale
 * confirmada pelo `/auth/me` da sessão, e um valor velho no navegador não
 * pode voltar a valer depois de um F5.
 */
export function identidadeGuardadaAposRenovar(data: {
  user_id: number;
  nome: string;
  role: string;
}): Record<string, unknown> {
  let anterior: Record<string, unknown> = {};
  try {
    const lido = JSON.parse(localStorage.getItem('user') ?? 'null');
    if (lido && typeof lido === 'object' && lido.id === data.user_id) anterior = lido;
  } catch {
    // Guardado ilegível: fica só o que a renovação trouxe.
  }
  const { integra_equipe_ti: _descartado, ...semPermissao } = anterior;
  return { ...semPermissao, id: data.user_id, nome: data.nome, role: data.role };
}

// Quem precisa saber que o token foi renovado: o `AuthContext`, que relê o
// `/auth/me` para a permissão acompanhar o estado atual da conta.
const ouvintesDaRenovacao = new Set<() => void>();

/** Avisa a cada renovação bem-sucedida. Devolve a função que cancela o aviso. */
export function aoRenovarToken(ouvinte: () => void): () => void {
  ouvintesDaRenovacao.add(ouvinte);
  return () => {
    ouvintesDaRenovacao.delete(ouvinte);
  };
}

// Uma renovação por vez: várias telas disparando chamadas ao mesmo tempo
// devem compartilhar a mesma promessa, não abrir N renovações concorrentes.
let renovacaoEmAndamento: Promise<void> | null = null;

function renovarUmaVezSo(): Promise<void> {
  if (!renovacaoEmAndamento) {
    renovacaoEmAndamento = renovarToken().finally(() => {
      renovacaoEmAndamento = null;
    });
  }

  return renovacaoEmAndamento;
}

// ============================================
// SESSÃO DA ABA (AUTH-01)
// ============================================
//
// O `localStorage` é um só para todas as abas do navegador; a identidade que a
// tela mostra é de cada aba. Outra aba que entra com outra conta troca o token
// de todas, e esta continuaria mostrando a conta antiga enquanto requisitava
// com a nova — um chamado aberto assim saía com o solicitante da conta antiga,
// autenticado pela nova.
//
// A aba guarda aqui o token com que a API confirmou a identidade dela, e o id
// que a API devolveu. Toda requisição passa por esta conferência, num lugar
// só: se o token do navegador não é mais esse, nada sai antes de o
// `AuthContext` perguntar à API de quem é o token novo. Mesma conta (outra
// aba renovou o token): a sessão da aba acompanha e a requisição segue. Outra
// conta, ou conferência que não terminou: a requisição é recusada aqui.
//
// O token nunca é lido por dentro para saber de quem é, e o `user` guardado
// também não decide: quem diz é o `/auth/me`.

type SessaoDaAba = { token: string; id: number };

let sessaoDaAba: SessaoDaAba | null = null;
let abaParada = false;
// Esta aba não tem sessão, e o token que está no navegador é de um login
// feito em OUTRA aba, que ela não adotou (D6): não é dela para usar.
let sessaoAlheiaRecusada = false;
let conferenteDeSessao: (() => Promise<void>) | null = null;

export const MENSAGEM_SESSAO_ALTERADA =
  'A sessão deste navegador mudou em outra aba. Recarregue a página para continuar.';

/** A requisição não saiu: o token do navegador não é o da sessão desta aba. */
export class SessaoAlteradaError extends Error {
  constructor() {
    super(MENSAGEM_SESSAO_ALTERADA);
    this.name = 'SessaoAlteradaError';
  }
}

/**
 * Diz à guarda qual é a sessão desta aba: o token com que o `/auth/me`
 * respondeu e o id que ele devolveu. `null` desliga a guarda (aba sem sessão).
 *
 * No login a sessão é fixada ANTES do `/auth/me`, com o token e o id que o
 * `/auth/login` desta aba devolveu (R1): a guarda já vale para a própria
 * confirmação. Fixar não é confirmar — quem confirma a identidade continua
 * sendo o `/auth/me`, no `AuthContext`.
 */
export function fixarSessaoDaAba(sessao: SessaoDaAba | null): void {
  sessaoDaAba = sessao;
  abaParada = false;
  sessaoAlheiaRecusada = false;
}

/**
 * A aba está sem sessão e outra aba entrou (D6): o token do navegador não é
 * desta aba, e nenhuma requisição dela o leva. Vale até a aba ganhar ou
 * encerrar uma sessão própria (`fixarSessaoDaAba`): login aqui, ou recarga.
 */
export function recusarSessaoAlheia(): void {
  if (!sessaoDaAba) sessaoAlheiaRecusada = true;
}

/** A sessão que a guarda está usando. */
export function sessaoFixadaDaAba(): SessaoDaAba | null {
  return sessaoDaAba;
}

/**
 * A API confirmou que o token do navegador é de OUTRA conta: a aba para.
 * Nada mais sai dela, nem leitura, até recarregar — e sem perguntar de novo
 * a cada tentativa.
 */
export function pararAba(): void {
  abaParada = true;
}

/** Quem confere a sessão quando o token do navegador mudou (o `AuthContext`). */
export function definirConferenteDeSessao(conferente: (() => Promise<void>) | null): void {
  conferenteDeSessao = conferente;
}

async function conferirSessaoDaAba(): Promise<void> {
  // Aba parada recusa tudo, com ou sem sessão fixada (R1): "parada" é uma
  // decisão já tomada, e não pode depender de a guarda estar armada.
  if (abaParada) {
    toast.error(MENSAGEM_SESSAO_ALTERADA, { id: 'sessao-alterada' });
    throw new SessaoAlteradaError();
  }
  if (!sessaoDaAba) return;
  if (localStorage.getItem('token') === sessaoDaAba.token) return;

  if (conferenteDeSessao) {
    try {
      await conferenteDeSessao();
    } catch {
      // Conferência que falha não libera nada: cai na recusa abaixo.
    }
    if (!abaParada && !sessaoDaAba) return;
    if (!abaParada && localStorage.getItem('token') === sessaoDaAba?.token) return;
  }

  toast.error(MENSAGEM_SESSAO_ALTERADA, { id: 'sessao-alterada' });
  throw new SessaoAlteradaError();
}

/**
 * O token que a requisição leva, já conferido contra a sessão da aba (D1).
 *
 * Conferir e escolher eram dois passos: a guarda aprovava, e o token era lido
 * de novo do navegador para o cabeçalho — com a renovação (que espera a rede)
 * no meio. Um login de outra conta nesse intervalo saía no cabeçalho de uma
 * requisição montada pela conta antiga.
 *
 * Agora o valor que vai no cabeçalho é o MESMO valor que foi comparado com o
 * token da sessão da aba, lido uma vez só, sem nenhuma espera entre a leitura
 * e a comparação. Se não bater (algo mudou durante a conferência ou a
 * renovação), confere de novo; depois de três voltas, recusa.
 *
 * O limite: isto garante que a requisição sai com o token que a API confirmou
 * para esta aba, não que o navegador ainda o guarde no instante do envio —
 * não existe operação atômica entre abas no `localStorage`. Se outra aba
 * trocar a sessão logo depois, a requisição sai inteira como a conta desta
 * aba (corpo e credencial coerentes), e a troca é tratada na seguinte.
 */
async function tokenConferido(): Promise<string | null> {
  for (let volta = 0; volta < 3; volta++) {
    await conferirSessaoDaAba();

    let token = localStorage.getItem('token');
    if (token && estaPertoDeVencer(token)) {
      await renovarUmaVezSo();
      token = localStorage.getItem('token');
    }

    // Daqui até o `return` nada espera: o que foi lido é o que é comparado
    // e é o que sai. A aba pode ter sido parada durante a renovação: aí nada
    // sai, tenha ela sessão fixada ou não.
    if (abaParada) break;
    if (!sessaoDaAba) return sessaoAlheiaRecusada ? null : token;
    if (token === sessaoDaAba.token) return token;
  }

  toast.error(MENSAGEM_SESSAO_ALTERADA, { id: 'sessao-alterada' });
  throw new SessaoAlteradaError();
}

// Interceptor de requisição - renova se necessário e adiciona o token JWT
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // /auth/login ainda não tem token, e /auth/refresh é a própria renovação.
    const ehRotaDeAutenticacao =
      config.url?.includes('/auth/login') || config.url?.includes('/auth/refresh');

    // Rota de autenticação, ou a própria pergunta "de quem é o token do
    // navegador?": leva o token que está lá, sem conferir e sem renovar — a
    // conferência não renova um token que pode ser de outra conta.
    const token =
      ehRotaDeAutenticacao || config.conferenciaDeSessao === true
        ? localStorage.getItem('token')
        : await tokenConferido();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * O token que a requisição levou: `null` se saiu sem credencial, `undefined`
 * se não há como saber (erro sem `config` ou sem cabeçalhos).
 */
function tokenEnviado(config: AxiosError['config']): string | null | undefined {
  const cabecalhos = config?.headers as
    | { get?: (nome: string) => unknown; Authorization?: unknown }
    | undefined;
  if (!cabecalhos) return undefined;
  const valor =
    typeof cabecalhos.get === 'function' ? cabecalhos.get('Authorization') : cabecalhos.Authorization;
  if (typeof valor !== 'string' || !valor.startsWith('Bearer ')) return null;
  return valor.slice('Bearer '.length);
}

// Interceptor de resposta - trata erros globalmente
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    // O `detail` do FastAPI é texto no HTTPException e LISTA DE OBJETOS no erro
    // de validação (422). Mais de vinte telas fazem `setError(data.detail)` e
    // renderizam direto — com a lista, o React quebra e a tela fica branca em
    // vez de mostrar qual campo está inválido.
    //
    // Normalizar aqui resolve todas de uma vez: é o único ponto por onde todas
    // as respostas passam.
    if (error.response?.data && typeof error.response.data === 'object') {
      const corpo = error.response.data as { detail?: unknown };
      if ('detail' in corpo) {
        corpo.detail = normalizarDetalhe(corpo.detail);
      }
    }

    // Token expirado ou inválido (mas não em tentativa de login)
    if (error.response?.status === 401 && !isLoginRequest) {
      // 401 atrasado (AUTH-01, D3): a requisição saiu com um token que não é
      // mais o do navegador — outra aba entrou depois. A recusa é da sessão
      // ANTIGA; apagar o armazenamento agora derrubaria quem acabou de
      // entrar. A sessão nova fica, e esta aba reage pela conferência.
      //
      // Só o cabeçalho da própria requisição é comparado. Sem ele (erro sem
      // `config`), vale o comportamento de sempre.
      const enviado = tokenEnviado(error.config);
      const atual = localStorage.getItem('token');
      const ehDaSessaoAtual = enviado === undefined || atual === null || enviado === atual;

      if (ehDaSessaoAtual) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Só redireciona se não estiver já na página de login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      } else if (conferenteDeSessao) {
        void conferenteDeSessao().catch(() => {});
      }
    }

    // Usuário sem permissão. A API restringe várias operações por perfil, e sem
    // aviso na tela a ação simplesmente não acontece — o usuário clica e nada
    // muda. O id fixo evita empilhar um toast por requisição quando uma tela
    // dispara várias chamadas negadas de uma vez.
    if (error.response?.status === 403 && error.config?.silenciarRecusa !== true) {
      const detalhe = (error.response.data as { detail?: string } | undefined)?.detail;

      toast.error(
        detalhe ? `Sem permissão. ${detalhe}` : 'Você não tem permissão para essa ação.',
        { id: 'acesso-negado' }
      );
    }

    return Promise.reject(error);
  }
);

export default api;
