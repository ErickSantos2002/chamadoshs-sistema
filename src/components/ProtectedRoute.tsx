import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePermissoes } from '../hooks/usePermissoes';
import { Aviso, BlocoCarregando, Button } from './ui';
import Bloqueio from '../pages/Bloqueio';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Área de administração (F5-3): só quem `podeAdministrar` (ver
   * `lib/permissoes`) — administrador, ou técnico da equipe da TI — e só
   * depois de o `/auth/me` desta sessão confirmar a identidade. Omitido,
   * qualquer pessoa autenticada entra.
   *
   * Isto NÃO é segurança: quem chama a API direto passa, e quem protege é a
   * API. Serve para a URL digitada à mão não montar uma tela que só sabe
   * responder 403 — e que dispararia, ao montar, as requisições que a
   * recebem.
   */
  administrativa?: boolean;
  /** Nome da área, para a tela de bloqueio dizer qual é. */
  area?: string;
  /** Quem tem acesso, em linguagem de gente. */
  quemTem?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  administrativa,
  area,
  quemTem,
}) => {
  const { user, loading, revalidarIdentidade } = useAuth();
  const { podeAdministrar, confirmando, semConfirmacao } = usePermissoes();

  if (loading) {
    return (
      // `min-h-full`, e não `min-h-screen`: isto é desenhado DENTRO do
      // `<main>`, que já desconta a faixa do topo e o próprio padding. Com
      // a altura da viewport inteira, o "Carregando" ficava fora do centro
      // e a tela ganhava uma barra de rolagem enquanto a sessão era lida.
      // Era a ÚNICA espera do sistema sem indicador de movimento: só a
      // palavra "Carregando..." parada no meio da tela. E é a primeira que
      // qualquer pessoa vê, porque acontece enquanto a sessão é lida, antes
      // de qualquer rota. Texto parado não distingue "estou trabalhando" de
      // "travei" — o anel distingue, e é o único jeito de dizer isso sem
      // palavra nenhuma.
      //
      // Achada pelo crítico de completude da varredura, e não por mim: a
      // minha busca foi por `animate-spin`, e o defeito aqui era justamente
      // a AUSÊNCIA de animação. Procurar pelo sintoma não acha quem não o tem.
      <BlocoCarregando className="min-h-full">
        <span className="text-lg text-conteudo-tenue">Carregando...</span>
      </BlocoCarregando>
    );
  }

  // Se não está autenticado, redireciona para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (administrativa) {
    // A identidade ainda não foi confirmada: nem a tela, nem a recusa. A
    // tela pediria à API o que talvez não possa; a recusa diria "sem acesso"
    // a quem talvez tenha. Espera — o `/auth/me` já foi pedido, uma vez.
    if (confirmando) {
      return (
        <BlocoCarregando className="min-h-full">
          <span className="text-sm text-conteudo-tenue">Confirmando suas permissões...</span>
        </BlocoCarregando>
      );
    }

    // O `/auth/me` falhou (rede, servidor). Não libera, e não repete
    // sozinho: a nova tentativa é um clique.
    if (semConfirmacao) {
      return (
        <div className="flex min-h-full flex-col items-center justify-center gap-3 px-4 py-10">
          <Aviso variante="alerta">
            Não foi possível confirmar suas permissões agora. Verifique a conexão e tente de novo.
          </Aviso>
          <Button variante="secundario" onClick={() => void revalidarIdentidade()}>
            Tentar de novo
          </Button>
        </div>
      );
    }

    // Autenticado e confirmado, sem permissão: EXPLICA, não redireciona.
    //
    // Redirecionar para o painel era o comportamento anterior, e ele mentia
    // por omissão: a pessoa voltava ao Dashboard sem entender se tinha
    // clicado errado, se a tela quebrou, ou se aquilo não é para ela. Desde
    // a F5-3 o menu nem mostra o link — quem chega aqui digitou a URL.
    if (!podeAdministrar) {
      return <Bloqueio area={area} quemTem={quemTem} />;
    }
  }

  // Se está autenticado, renderiza os filhos (página protegida)
  return <>{children}</>;
};

export default ProtectedRoute;
