import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/chamadoshsapi';
import { getRoleName } from '../utils/roleMapper';

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
        // Se tiver role_id, converte para nome da role
        const role = userData.role || getRoleName(userData.role_id || 3);

        setUser({
          id: userData.id,
          username: userData.nome,
          role: role,
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
    setLoading(true);
    setError(null);

    try {
      // Faz login usando o authService (já salva token automaticamente)
      const loginData = await authService.login({
        nome: username,
        senha: password
      });

      const { access_token, user_id, nome, role } = loginData;
      setToken(access_token);

      // Busca dados completos do usuário logado
      const userData = await authService.me();

      // Converte role_id para nome da role
      const roleName = getRoleName(userData.role_id);

      // Atualiza state com dados do usuário
      setUser({
        id: user_id,
        username: nome,
        role: roleName,
        setor_id: userData.setor_id,
      });
    } catch (err: any) {
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
