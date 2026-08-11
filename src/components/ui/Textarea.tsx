import React from 'react';
import { cn } from '../../lib/utils';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea: React.FC<TextareaProps> = ({ className, ...resto }) => (
  <textarea
    className={cn(
      'w-full rounded-lg border border-borda bg-superficie px-3 py-2 text-sm text-conteudo',
      'placeholder:text-conteudo-tenue',
      'transition-colors focus:border-info focus:outline-none focus:ring-1 focus:ring-info',
      className
    )}
    {...resto}
  />
);

export default Textarea;
