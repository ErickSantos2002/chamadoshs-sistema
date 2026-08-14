import React from 'react';
import { cn } from '../../lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

/**
 * `<select>` nativo, estilizado. Para FORMULÁRIO.
 *
 * Nativo de propósito, e o de propósito mudou de razão. O argumento antigo era
 * que um dropdown caseiro custaria teclado e busca por digitação para não
 * ganhar nada — mas ele ganhava algo: a lista ABERTA de um `<select>` é
 * desenhada pelo sistema operacional, e aparecia branca com destaque azul do
 * Windows no meio de uma interface escura.
 *
 * Nos filtros isso pesou, e lá entrou o `SeletorDeFiltro`. Aqui não: em
 * formulário o seletor nativo do celular e a digitação para achar a opção valem
 * mais que a aparência da lista, e as listas são maiores.
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
