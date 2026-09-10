import React from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '../hooks/useAuth';
import { Card, Rotulo } from '../components/ui';
import { IconeCadeado } from '../components/ui/icones';

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
 *
 * ── O cartão passou a ser o primitivo, e o `relative` saiu ─────────
 *
 * Era `<div>` com as mesmas classes que o `Card` produz e `px-8 py-10` de
 * respiro — 32 e 40px, assimétrico e **fora da escala do primitivo**
 * (`p-0 / p-3 / p-4 / p-6`). Vai a `lg`, e o enquadramento da página vem do
 * contêiner de fora, que já tem `px-4 py-10`.
 *
 * O `relative` foi **removido do `className`**, e não esquecido: o `Card` já o
 * traz na base. Mantê-lo seria começar a coleção de classes que repetem o que o
 * primitivo faz — que é exatamente como um cartão montado à mão nasce.
 *
 * ── Esta tela tem DUAS vizinhas ─────────────────────────────
 *
 * `Bloqueio` **não é página de rota**: é componente de recusa, usado pelo
 * `ProtectedRoute:65` e também pelo `CadastrosBasicos:72` — este último uma tela
 * da Fase 15. Mexer no enquadramento daqui muda lá, e a conferência da §29 tem
 * de olhar as duas.
 */
const Bloqueio: React.FC<BloqueioProps> = ({
  area,
  quemTem = 'administradores',
}) => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <Helmet>
        <title>{area ? `${area} | ChamadosHS` : 'Sem acesso | ChamadosHS'}</title>
      </Helmet>

      <Card padding="lg" className="w-full max-w-md text-center">
        <IconeCadeado className="mx-auto h-8 w-8 text-conteudo-tenue" aria-hidden="true" />

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
      </Card>
    </div>
  );
};

export default Bloqueio;
