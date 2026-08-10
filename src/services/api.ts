import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

// URL base da API - ajuste conforme seu ambiente
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Criar instância do Axios
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
    localStorage.setItem(
      'user',
      JSON.stringify({ id: data.user_id, nome: data.nome, role: data.role })
    );
  } catch {
    // Renovação falhou: segue com o token atual em vez de derrubar a
    // requisição do usuário. Se ele já não servir, o 401 é tratado adiante.
  }
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
    if (error.response?.status === 403) {
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
