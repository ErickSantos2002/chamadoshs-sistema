import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Bloqueio from '../pages/Bloqueio';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Perfis que podem abrir a rota. Omitido, qualquer pessoa autenticada entra.
   *
   * Isto NÃO é segurança: quem chama a API direto passa, e quem protege é a
   * API. Serve para a pessoa encontrar uma explicação em vez de uma tela que só
   * sabe responder 403.
   */
  perfil?: string[];
  /** Nome da área, para a tela de bloqueio dizer qual é. */
  area?: string;
  /** Quem tem acesso, em linguagem de gente. */
  quemTem?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  perfil,
  area,
  quemTem,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      // `min-h-full`, e não `min-h-screen`: isto é desenhado DENTRO do
      // `<main>`, que já desconta a faixa do topo e o próprio padding. Com
      // a altura da viewport inteira, o "Carregando" ficava fora do centro
      // e a tela ganhava uma barra de rolagem enquanto a sessão era lida.
      <div className="flex items-center justify-center min-h-full">
        <span className="text-conteudo-tenue text-lg">Carregando...</span>
      </div>
    );
  }

  // Se não está autenticado, redireciona para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Autenticado, sem o perfil que a rota pede: EXPLICA, não redireciona.
  //
  // Redirecionar para o painel era o comportamento anterior, e ele mentia por
  // omissão: a pessoa clicava em Cadastros e voltava ao Dashboard sem entender
  // se tinha clicado errado, se a tela quebrou, ou se aquilo não é para ela.
  // Sumir silenciosamente é a pior das três respostas possíveis.
  if (perfil && !perfil.includes(user.role)) {
    return <Bloqueio area={area} quemTem={quemTem} />;
  }

  // Se está autenticado, renderiza os filhos (página protegida)
  return <>{children}</>;
};

export default ProtectedRoute;
