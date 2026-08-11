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
        'w-full rounded-lg border border-borda bg-superficie py-2 text-sm text-conteudo',
        'placeholder:text-conteudo-tenue',
        'transition-colors focus:border-info focus:outline-none focus:ring-1 focus:ring-info',
        icone ? 'pl-9 pr-3' : 'px-3',
        className
      )}
      {...resto}
    />
  </div>
);

export default Input;
