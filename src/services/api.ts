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

    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(identidadeGuardadaAposRenovar(data)));
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

// Interceptor de requisição - renova se necessário e adiciona o token JWT
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    let token = localStorage.getItem('token');

    // /auth/login ainda não tem token, e /auth/refresh é a própria renovação.
    const ehRotaDeAutenticacao =
      config.url?.includes('/auth/login') || config.url?.includes('/auth/refresh');

    if (token && !ehRotaDeAutenticacao && estaPertoDeVencer(token)) {
      await renovarUmaVezSo();
      token = localStorage.getItem('token');
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Só redireciona se não estiver já na página de login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
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
