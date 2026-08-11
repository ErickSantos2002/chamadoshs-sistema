import React from 'react';
import { cn } from '../../lib/utils';

export type VarianteBadge =
  | 'neutro'
  | 'info'
  | 'sucesso'
  | 'alerta'
  | 'perigo';

interface BadgeProps {
  variante?: VarianteBadge;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

/**
 * Selo de estado.
 *
 * A cor de fundo é a cor de significado com 20% de opacidade, e o texto é a
 * mesma cor cheia. Funciona nos dois temas sem `dark:` porque o fundo
 * translúcido pega o tom da superfície embaixo.
 */
const VARIANTES: Record<VarianteBadge, string> = {
  neutro: 'bg-superficie-elevada text-conteudo-suave border-borda',
  info: 'bg-info/15 text-info-forte dark:text-info-suave border-info/30',
  sucesso: 'bg-sucesso/15 text-sucesso-forte dark:text-sucesso-suave border-sucesso/30',
  alerta: 'bg-alerta/15 text-alerta-forte dark:text-alerta-suave border-alerta/30',
  perigo: 'bg-perigo/15 text-perigo-forte dark:text-perigo-suave border-perigo/30',
};

export const Badge: React.FC<BadgeProps> = ({
  variante = 'neutro',
  children,
  className,
  title,
}) => (
  <span
    title={title}
    className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
      VARIANTES[variante],
      className
    )}
  >
    {children}
  </span>
);

export default Badge;
