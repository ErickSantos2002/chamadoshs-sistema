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
 * O fundo é a cor de significado translúcida e o texto é o par `on-tint` dela,
 * do design system. Funciona nos dois temas sem `dark:` por dois motivos que
 * se somam: o fundo translúcido pega o tom da superfície embaixo, e
 * `--on-tint-*` já troca de degrau sozinho — 700 no claro, 400 no escuro.
 *
 * Eram quatro pares `text-X-forte dark:text-X-suave` escritos à mão, com
 * exatamente esses valores. O token faz a mesma coisa e não pode ficar para
 * trás quando alguém acrescentar uma variante.
 *
 * A opacidade do fundo ainda é 20%; o pacote pede 15% (`--tint-*`). Alinhado
 * na Fase 7, junto com o resto do componente.
 */
const VARIANTES: Record<VarianteBadge, string> = {
  neutro: 'bg-superficie-elevada text-conteudo-suave border-borda',
  info: 'bg-info/20 text-on-tint-info border-info/30',
  sucesso: 'bg-sucesso/20 text-on-tint-success border-sucesso/30',
  alerta: 'bg-alerta/20 text-on-tint-warning border-alerta/30',
  perigo: 'bg-perigo/20 text-on-tint-danger border-perigo/30',
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
