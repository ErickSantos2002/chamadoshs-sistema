import React from 'react';
import { cn } from '../../lib/utils';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea: React.FC<TextareaProps> = ({ className, ...resto }) => (
  <textarea
    className={cn(
      // Mesma forma do `Input` — é o mesmo campo, só que alto.
      'w-full rounded-lg border border-borda bg-superficie px-3 py-2 text-sm text-conteudo',
      'placeholder:text-conteudo-tenue',
      'min-h-[80px] resize-y hover:border-conteudo-tenue',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sinal',
      className
    )}
    {...resto}
  />
);

export default Textarea;
