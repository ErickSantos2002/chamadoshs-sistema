import React from 'react';
import { cn } from '../../lib/utils';

interface RotuloProps {
  children: React.ReactNode;
  className?: string;
  /** Elemento renderizado. `label` quando o rótulo pertence a um campo. */
  como?: 'span' | 'p' | 'label' | 'dt' | 'h2' | 'h3';
  /** Para quando `como="label"`. */
  htmlFor?: string;
  /**
   * Para um `aria-labelledby` de fora apontar para este texto.
   *
   * Existe porque marco nomeado não pode ter o nome escrito duas vezes: o
   * `<aside>` do histórico da conta referencia este `<h3>` em vez de repetir
   * a string num `aria-label`.
   */
  id?: string;
}

/**
 * Rótulo de SEÇÃO: caixa alta, pequeno, entrelinha larga.
 *
 * ── A forma foi e VOLTOU, e a segunda volta é a que vale ──────────────
 *
 * Este rótulo já esteve monoespaçado em 11px, saiu da monoespaçada em
 * 27/08/2026 (`993ebc5`) e volta a ela agora, na Fase 7. Não é indecisão: são
 * duas decisões diferentes, e a segunda conhece a primeira.
 *
 * O `993ebc5` argumentava que este era o elemento que mais carregava a
 * identidade de console — mais que a cor, porque aparece em toda tela — e que
 * enquanto ele fosse monoespaçado o ChamadosHS não pareceria do mesmo sistema
 * que o HelpHS. O raciocínio está certo sobre o FATO e errado sobre a
 * conclusão, e o motivo é que ele foi escrito no mesmo dia do merge `241db32`,
 * a versão 1.7.0, que portou a pele do HelpHS para cá inteira.
 *
 * A decisão D2-a, de 02/09/2026, é cinco dias posterior e diz o contrário com
 * conhecimento de causa: a pele de console **é a exceção oficial da §8.1**
 * deste repositório, não um desvio a corrigir, e a 1.7.0 a desfez quatro dias
 * DEPOIS de o pacote fotografar o código — ou seja, o pacote nunca pediu isso.
 * A D2-a lista cinco itens a restaurar e este é um deles, marcado para a
 * Fase 7.
 *
 * ── Mas não é o retorno ao que era ────────────────────────────────────
 *
 * A D2-a pede "mono, caixa alta, 12px, 0.1em". Os números NÃO são os antigos
 * (11px e 0.14em): são `--text-xs` e `--tracking-label` do pacote. É a forma
 * daqui com a escala de lá — que é exatamente o que uma exceção de identidade
 * deveria ser, e não uma ilha com medidas próprias.
 *
 * ── O que ele NÃO é ───────────────────────────────────────────────────
 *
 * Não é rótulo de campo. Campo que alguém preenche usa `RotuloDeCampo`
 * (`ui/Campo`), que é `text-sm font-medium` — a mesma forma que o HelpHS usa
 * nos rótulos de `Input`, `Select` e `Textarea`. Caixa alta monoespaçada acima
 * de "Confirmar senha" é a forma de dado de máquina posta num campo que uma
 * pessoa preenche, e era assim que sete campos deste sistema estavam
 * rotulados. Aquela correção veio junto do `993ebc5` e **fica**: a D2-a
 * restaura a forma do rótulo de SEÇÃO, e não devolve o rótulo de seção aos
 * campos.
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
  id,
}) => (
  <Tag
    id={id}
    htmlFor={htmlFor}
    className={cn(
      // `tracking-widest` do Tailwind É 0.1em, e `text-xs` É 12px — os dois
      // números que a D2-a pede, sem valor arbitrário e sem token próprio.
      'font-mono text-xs uppercase tracking-widest text-conteudo-tenue',
      className
    )}
  >
    {children}
  </Tag>
);

export default Rotulo;
