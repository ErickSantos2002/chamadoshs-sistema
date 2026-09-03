import React from 'react';
import { cn } from '../../lib/utils';
import { FORMA_DE_CAMPO } from './Campo';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea: React.FC<TextareaProps> = ({ className, ...resto }) => (
  <textarea
    className={cn(
      // Mesma forma do `Input` — é o mesmo campo, só que alto. E agora é
      // literalmente a mesma constante, não uma cópia que combina hoje.
      FORMA_DE_CAMPO,
      'px-3 py-2',
      'min-h-[80px] resize-y',
      className
    )}
    {...resto}
  />
);

export default Textarea;
