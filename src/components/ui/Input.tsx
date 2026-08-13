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
        // Fundo RECUADO, diferente do painel de trás. As bordas do sistema
        // ficam abaixo de 3:1 de propósito — são divisor, não contorno — então
        // um campo com o mesmo fundo do painel seria identificável só pela
        // borda, que é justamente o que não dá para exigir dela.
        'w-full border border-borda bg-superficie-base py-2 text-sm text-conteudo',
        'placeholder:text-conteudo-tenue',
        'transition-colors focus:border-sinal focus:outline-none focus:ring-1 focus:ring-sinal',
        icone ? 'pl-9 pr-3' : 'px-3',
        className
      )}
      {...resto}
    />
  </div>
);

export default Input;
