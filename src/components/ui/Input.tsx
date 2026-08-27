import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Ícone à esquerda, dentro do campo. */
  icone?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ icone, className, ...resto }) => (
  <div className="relative">
    {icone && (
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-conteudo-tenue"
        aria-hidden="true"
      >
        {icone}
      </span>
    )}
    <input
      className={cn(
        // A forma do campo no HelpHS: canto de 8px, fundo da própria
        // superfície e um anel de 2px no foco.
        //
        // O fundo era recuado (`superficie-base`), para o campo se distinguir
        // do painel sem depender da borda. Com a paleta nova esse recuo deixou
        // de comprar quase nada — #F8FAFC contra #FFFFFF é 1,05:1 — e quem
        // passou a carregar a distinção é o anel de foco, que dobrou de
        // espessura e é o que de fato importa para quem navega por teclado.
        'w-full rounded-lg border border-borda bg-superficie py-2 text-sm text-conteudo',
        'placeholder:text-conteudo-tenue',
        'hover:border-conteudo-tenue',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sinal',
        icone ? 'pl-9 pr-3' : 'px-3',
        className
      )}
      {...resto}
    />
  </div>
);

export default Input;
