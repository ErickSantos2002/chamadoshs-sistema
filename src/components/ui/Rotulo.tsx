import React from 'react';
import { cn } from '../../lib/utils';

interface RotuloProps {
  children: React.ReactNode;
  className?: string;
  /** Elemento renderizado. `label` quando o rótulo pertence a um campo. */
  como?: 'span' | 'p' | 'label' | 'dt' | 'h2' | 'h3';
  /** Para quando `como="label"`. */
  htmlFor?: string;
}

/**
 * Rótulo estrutural: monoespaçado, caixa alta, entrelinha larga.
 *
 * É o elemento que mais carrega a identidade de console — mais que a cor,
 * porque aparece em toda tela e a cor só aparece no que está ativo.
 *
 * ── Duas decisões que valem a pena estar escritas ─────────────────────
 *
 * **11px, não os 9,6px da maquete.** Lá o rótulo era textura de fundo. Aqui
 * ele diz "PROTOCOLO" acima de um número que alguém precisa ler, e texto que
 * carrega informação não desce abaixo de 11px.
 *
 * **Monoespaçada só aqui e em dado de máquina** — protocolo, data, contador.
 * Título, descrição e comentário continuam em sans: são texto que uma pessoa
 * escreveu para outra ler, e monoespaçada pequena atrapalha exatamente esse
 * tipo de leitura.
 *
 * A cor vem de `--conteudo-tenue`, que dá 5,0:1 no tema claro e 5,2:1 no
 * escuro. O tom equivalente da maquete dava 2,54:1 — o elemento mais
 * característico da interface era o ilegível.
 */
export const Rotulo: React.FC<RotuloProps> = ({
  children,
  className,
  como: Tag = 'span',
  htmlFor,
}) => (
  <Tag
    htmlFor={htmlFor}
    className={cn('font-mono text-rotulo uppercase text-conteudo-tenue', className)}
  >
    {children}
  </Tag>
);

export default Rotulo;
