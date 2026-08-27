import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Deixa o card clicável, com realce no hover. */
  onClick?: () => void;
}

/**
 * Superfície padrão: card, painel, coluna do kanban.
 *
 * Existe para as telas pararem de repetir a mesma pilha de dez classes com
 * hexadecimal cravado — que é de onde vêm as divergências de tom entre uma
 * tela e outra hoje.
 */
export const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
  const clicavel = onClick !== undefined;

  const conteudo = cn(
    'relative rounded-xl border border-borda bg-superficie transition-colors',
    clicavel &&
      'w-full cursor-pointer text-left hover:border-sinal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sinal',
    className
  );

  // Card clicável vira <button> de verdade, não <div onClick>: assim recebe
  // foco, responde a Enter e Espaço, e é anunciado como interativo.
  if (clicavel) {
    return (
      <button type="button" onClick={onClick} className={conteudo}>
        {children}
      </button>
    );
  }

  return <div className={conteudo}>{children}</div>;
};

interface CardHeaderProps {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  acao?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  titulo,
  descricao,
  acao,
  className,
}) => (
  <div
    className={cn(
      'flex items-start justify-between gap-4 border-b border-borda px-5 py-4',
      className
    )}
  >
    <div>
      <h3 className="text-base font-semibold text-conteudo">{titulo}</h3>
      {descricao && <p className="mt-0.5 text-sm text-conteudo-tenue">{descricao}</p>}
    </div>
    {acao}
  </div>
);

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <div className={cn('px-5 py-4', className)}>{children}</div>;

export default Card;
