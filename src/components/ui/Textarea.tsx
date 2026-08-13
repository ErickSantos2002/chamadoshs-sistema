import React from 'react';
import { cn } from '../../lib/utils';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea: React.FC<TextareaProps> = ({ className, ...resto }) => (
  <textarea
    className={cn(
      'w-full border border-borda bg-superficie-base px-3 py-2 text-sm text-conteudo',
      'placeholder:text-conteudo-tenue',
      'transition-colors focus:border-sinal focus:outline-none focus:ring-1 focus:ring-sinal',
      className
    )}
    {...resto}
  />
);

export default Textarea;
