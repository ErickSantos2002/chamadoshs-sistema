import React from 'react';
import { Helmet } from 'react-helmet';
import { Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Colchetes, Rotulo } from '../components/ui';

interface BloqueioProps {
  /** Nome da área, como aparece no menu. */
  area?: string;
  /** Quem tem acesso, em linguagem de gente. */
  quemTem?: string;
}

/**
 * O que a pessoa vê quando abre uma área que o perfil dela não alcança.
 *
 * ── Por que ela chega aqui, em vez de o menu esconder ─────────────────
 *
 * Decisão do Rickelme, e ela tem lógica: escondendo, a pessoa não sabe que a
 * área existe, e não tem como pedir acesso ao que não sabe que há. Mostrando,
 * o sistema revela a própria forma — e quem precisa de Cadastros descobre que
 * Cadastros existe e a quem pedir.
 *
 * ── Por que o tom mudou ───────────────────────────────────────────────
 *
 * A versão anterior era um "ACESSO NEGADO" piscando entre preto e vermelho. Faz
 * sentido para quem invadiu; não faz para a Letícia clicando em Cadastros para
 * ver o que tem lá. Ela não errou — só abriu uma porta que não é dela.
 *
 * Alarme para quem não fez nada errado ensina a ignorar alarme.
 *
 * A tela diz três coisas, e a terceira é a que resolve: qual área, quem tem
 * acesso, e que o caminho é pedir a alguém desse perfil.
 */
const Bloqueio: React.FC<BloqueioProps> = ({
  area,
  quemTem = 'administradores',
}) => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-full items-center justify-center bg-superficie-base p-6">
      <Helmet>
        <title>{area ? `${area} | ChamadosHS` : 'Sem acesso | ChamadosHS'}</title>
      </Helmet>

      <div className="relative max-w-md border border-borda bg-superficie px-8 py-10 text-center">
        <Colchetes />

        <Lock className="mx-auto h-8 w-8 text-conteudo-tenue" aria-hidden="true" />

        <Rotulo como="p" className="mt-4 block">
          {area ?? 'Área restrita'}
        </Rotulo>

        <h1 className="mt-1 text-xl font-bold text-conteudo">
          Esta área não faz parte do seu acesso
        </h1>

        <p className="mt-3 text-sm text-conteudo-suave">
          {area ? <>{area} é</> : 'Esta área é'} para {quemTem}. Seu perfil é{' '}
          <strong className="text-conteudo">{user?.role ?? 'Usuário'}</strong>.
        </p>

        <p className="mt-3 text-sm text-conteudo-tenue">
          Se você precisa entrar aqui, peça a um administrador — é ele quem muda
          perfil de acesso, em Cadastros.
        </p>
      </div>
    </div>
  );
};

export default Bloqueio;
