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

// Interceptor de requisição - adiciona token JWT
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');

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
