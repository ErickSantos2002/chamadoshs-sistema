import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/chamadoshsapi';

type AuthContextType = {
  user: { id: number; username: string; role: string; setor_id?: number } | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
};

export const AuthContext = createContext<AuthContextType>(
  {} as AuthContextType,
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{
    id: number;
    username: string;
    role: string;
    setor_id?: number;
  } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega dados do localStorage na primeira renderização
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser({
          id: userData.id,
          username: userData.nome,
          role: userData.role,
          setor_id: userData.setor_id,
        });
        setToken(savedToken);
      } catch (err) {
        console.error('Erro ao carregar dados do usuário:', err);
        authService.logout();
      }
    }
    setLoading(false);
  }, []);

  // Função de login
  const login = async (username: string, password: string) => {
    console.log('🔵 [AuthContext] Iniciando login...');
    console.log('🔵 [AuthContext] Username:', username);
    console.log('🔵 [AuthContext] Senha:', password ? '***' : 'VAZIO');

    setLoading(true);
    setError(null);

    try {
      console.log('🔵 [AuthContext] Chamando authService.login...');

      // Faz login usando o authService (já salva token automaticamente)
      const loginData = await authService.login({
        nome: username,
        senha: password
      });

      console.log('✅ [AuthContext] Login bem-sucedido:', loginData);

      const { access_token, user_id, nome, role } = loginData;
      setToken(access_token);

      console.log('🔵 [AuthContext] Buscando dados do usuário...');

      // Busca dados completos do usuário logado
      const userData = await authService.me();

      console.log('✅ [AuthContext] Dados do usuário:', userData);

      // Atualiza state com dados do usuário
      setUser({
        id: user_id,
        username: nome,
        role: role,
        setor_id: userData.setor_id,
      });

      console.log('✅ [AuthContext] Login completo!');
    } catch (err: any) {
      console.error('❌ [AuthContext] Erro no login:', err);
      console.error('❌ [AuthContext] Status:', err.response?.status);
      console.error('❌ [AuthContext] Dados:', err.response?.data);
      console.error('❌ [AuthContext] Mensagem:', err.message);
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
      setLoading(false);
    }
  };

  // Função de logout
  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, error }}
    >
      {children}
    </AuthContext.Provider>
  );
};
