import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Perfis que podem abrir a rota. Omitido, qualquer pessoa autenticada entra —
   * que é como todas as rotas existentes funcionam, e nenhuma muda por causa
   * disto.
   *
   * Isto NÃO é segurança: quem digitar a URL não passa daqui, mas quem chamar a
   * API direto passa. Quem protege é a API, e ela protege. Serve para a pessoa
   * não abrir uma tela que só sabe responder 403 — erro na cara de quem não fez
   * nada errado, apenas não tem aquele perfil.
   */
  perfil?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, perfil }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-conteudo-tenue text-lg">Carregando...</span>
      </div>
    );
  }

  // Se não está autenticado, redireciona para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Autenticado, mas sem o perfil que a rota pede: volta para o painel, que
  // todo mundo pode ver. Redirecionar para o login seria pior — sugeriria que
  // a sessão caiu, e a pessoa tentaria entrar de novo com a mesma conta.
  if (perfil && !perfil.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Se está autenticado, renderiza os filhos (página protegida)
  return <>{children}</>;
};

export default ProtectedRoute;
