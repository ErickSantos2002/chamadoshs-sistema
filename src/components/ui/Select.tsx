import React from 'react';
import { cn } from '../../lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

/**
 * `<select>` nativo, estilizado.
 *
 * Nativo de propósito: um dropdown feito à mão precisaria reimplementar
 * navegação por teclado, busca por digitação e o comportamento de rolagem em
 * tela pequena — e a lista de prioridades não ganha nada com isso.
 */
export const Select: React.FC<SelectProps> = ({ className, children, ...resto }) => (
  <select
    className={cn(
      'border border-borda bg-superficie-base px-3 py-2 text-sm text-conteudo',
      'transition-colors focus:border-sinal focus:outline-none focus:ring-1 focus:ring-sinal',
      className
    )}
    {...resto}
  >
    {children}
  </select>
);

export default Select;
