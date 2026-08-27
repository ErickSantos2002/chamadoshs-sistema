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
 * Rótulo de SEÇÃO: caixa alta, pequeno, entrelinha larga.
 *
 * ── O que mudou, e por quê ────────────────────────────────────────────
 *
 * Era monoespaçado, em 11px. Era o elemento que mais carregava a identidade
 * de console — mais que a cor, porque aparecia em toda tela e a cor só
 * aparece no que está ativo. Foi exatamente por isso que ele precisou mudar:
 * enquanto ele fosse monoespaçado, o ChamadosHS não pareceria do mesmo
 * sistema que o HelpHS por mais que a paleta batesse.
 *
 * A forma agora é a que o HelpHS usa para o mesmo papel — os títulos de grupo
 * da barra lateral: `10px`, `font-semibold`, caixa alta, `tracking-widest`.
 * O papel não mudou: dizer o que a seção abaixo é.
 *
 * ── O que ele NÃO é ───────────────────────────────────────────────────
 *
 * Não é rótulo de campo. Campo que alguém preenche usa `RotuloDeCampo`
 * (`ui/Campo`), que é `text-sm font-medium` — a mesma forma que o HelpHS usa
 * nos rótulos de `Input`, `Select` e `Textarea`. Caixa alta em 10px acima de
 * "Confirmar senha" atrapalha quem está preenchendo, e era assim que sete
 * campos deste sistema estavam rotulados.
 *
 * Nem é para dado de máquina. Protocolo, data e contador continuam em
 * monoespaçada, que é o papel que a família ainda tem no sistema — só que
 * escrita onde o dado está, não aqui.
 *
 * A cor vem de `--conteudo-tenue`, validada em 5,2:1 no claro e 4,9:1 no
 * escuro por `npm run validar:paleta`.
 */
export const Rotulo: React.FC<RotuloProps> = ({
  children,
  className,
  como: Tag = 'span',
  htmlFor,
}) => (
  <Tag
    htmlFor={htmlFor}
    className={cn(
      'text-[10px] font-semibold uppercase tracking-widest text-conteudo-tenue',
      className
    )}
  >
    {children}
  </Tag>
);

export default Rotulo;
