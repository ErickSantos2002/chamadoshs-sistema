import React from 'react';
import { cn } from '../../lib/utils';

export type TamanhoSpinner = 'sm' | 'md' | 'lg';

/**
 * Os três tamanhos do pacote, com os valores de `DS/components/core/Spinner.jsx`.
 *
 * `sm` 16px/2 · `md` 24px/2 · `lg` 32px/3 — o traço engrossa junto com o
 * diâmetro, senão o anel grande fica fino e some.
 */
const TAMANHOS: Record<TamanhoSpinner, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
};

interface SpinnerProps {
  tamanho?: TamanhoSpinner;
  className?: string;
  /**
   * O que o leitor de tela anuncia. Ignorado quando `decorativo`.
   *
   * Vale trocar quando a espera tem nome: "Carregando chamados..." diz mais
   * que "Carregando...", e é a única coisa que a pessoa vai ouvir.
   */
  rotulo?: string;
  /**
   * Tira o anel da árvore de acessibilidade.
   *
   * Para quando alguma coisa ao lado JÁ anuncia a espera — o texto visível de
   * um bloco de carregamento, ou o `aria-label` do botão que o contém. Sem
   * isto, os dois falam, e a pessoa ouve "Carregando... Carregando chamados".
   */
  decorativo?: boolean;
}

/**
 * Anel de carregamento.
 *
 * É a única animação em laço permitida numa tela de trabalho, junto com o
 * pulso de cinco segundos do logo no login — o pacote é explícito nisso, e a
 * razão é que estas telas ficam abertas o dia inteiro.
 *
 * ── O que ele substitui ───────────────────────────────────────────────
 *
 * Dezoito anéis escritos à mão em treze arquivos, em três formas diferentes:
 *
 *   - `IconeCarregando` ou `IconeRecarregar` com `animate-spin` — um SVG que
 *     gira, em dez lugares;
 *   - `<div className="animate-spin rounded-full border-b-2 border-sinal">` —
 *     um anel com UM QUARTO pintado, em `ChamadoDetalhes` e no `PageLoader`
 *     do roteador;
 *   - `<span className="border-2 border-current border-t-transparent">` — o
 *     anel de três quartos, dentro do `Button`.
 *
 * As três giravam na mesma tela, em cinco cores e seis tamanhos. Ninguém
 * escolheu isso; foi o que sobrou de cada tela ter resolvido o problema
 * sozinha.
 *
 * ── A cor NÃO é fixada aqui ───────────────────────────────────────────
 *
 * O `Spinner.jsx` do pacote crava `color: var(--action)` no elemento. Aqui a
 * cor sai de `currentColor`, herdada de quem contém.
 *
 * O motivo é o `Button`: o anel dele precisa ser da cor do TEXTO do botão, que
 * muda por variante — branco no primário, `--conteudo` no secundário. Com a
 * cor cravada, o anel do botão primário sairia azul sobre azul. É o mesmo
 * raciocínio da §2.1 aplicado ao contrário do de sempre: o pacote está certo
 * para o caso dele (anel solto no meio de um vazio), e o caso do botão não
 * existe lá porque o `Button.jsx` desenha o próprio anel embutido.
 *
 * Quem quiser o azul de ação escreve `text-sinal` na classe, que é o que os
 * vazios de página fazem — e aí a cor está no sítio, visível, em vez de
 * escondida dentro do primitivo.
 *
 * ── Acessibilidade: por que `decorativo` existe ───────────────────────
 *
 * O pacote põe `role="status"` e `aria-label` em TODO spinner. Está certo para
 * o anel sozinho e erra quando há texto ao lado: `role="status"` é região
 * viva, então o rótulo do anel E o texto visível são anunciados, e a pessoa
 * ouve a mesma coisa duas vezes.
 *
 * Então o padrão é o do pacote — anuncia —, e `decorativo` desliga para os
 * dois casos em que outra coisa já fala:
 *
 *   1. dentro de um botão que tem `aria-label` ou texto próprio;
 *   2. ao lado de um texto visível que descreve a espera.
 *
 * No caso 2 quem passa a carregar o `role="status"` é o BLOCO, não o anel —
 * ver `BlocoCarregando` abaixo.
 *
 * ── O movimento já para sozinho ───────────────────────────────────────
 *
 * `animate-spin` é o do Tailwind, 1s linear. O pacote pede 0,7s; não vale um
 * keyframe próprio para 0,3s de diferença numa animação sem fim, e a §2.1 não
 * chega a este nível de detalhe. O que importa para acessibilidade já está
 * feito no CSS base: `prefers-reduced-motion: reduce` zera a duração e a
 * contagem de repetições de tudo, então este anel para para quem pediu.
 *
 * `rounded-full` fica: é círculo de verdade, a exceção que o canto reto do
 * D2-a preserva junto com o Avatar e o ponto de status.
 */
export const Spinner: React.FC<SpinnerProps> = ({
  tamanho = 'md',
  className,
  rotulo = 'Carregando...',
  decorativo = false,
}) => (
  <span
    // `role` e `aria-label` juntos, ou nenhum dos dois: um `role="status"` sem
    // nome anuncia uma região vazia, que é pior que silêncio porque a pessoa
    // percebe que perdeu alguma coisa.
    role={decorativo ? undefined : 'status'}
    aria-label={decorativo ? undefined : rotulo}
    aria-hidden={decorativo || undefined}
    className={cn(
      'inline-block shrink-0 animate-spin rounded-full',
      // Três quartos do anel na cor herdada e um quarto transparente: é o que
      // faz a rotação ser visível. Um anel inteiro girando parece parado.
      'border-current border-t-transparent',
      TAMANHOS[tamanho],
      className
    )}
  />
);

interface BlocoCarregandoProps {
  /** O texto visível. É ele que o leitor de tela lê. */
  children?: React.ReactNode;
  tamanho?: TamanhoSpinner;
  /** Classe do contêiner — altura, borda, fundo. */
  className?: string;
}

/**
 * O vazio de carregamento de uma região: anel centralizado, com ou sem texto.
 *
 * ── Por que é um componente, e não uma classe copiada ─────────────────
 *
 * Dez dos dezoito anéis eram exatamente isto: uma `<div>` centralizadora, um
 * anel dentro, às vezes um texto. Escrito dez vezes, com dez alturas e cinco
 * cores. Este bloco não inventa nada — só é o lugar onde a decisão mora uma
 * vez.
 *
 * ── O `role="status"` fica AQUI, e é o conserto de um defeito real ────
 *
 * Três destes blocos tinham `aria-hidden="true"` no anel e NENHUM texto:
 * `SlaTab`, `ChamadoModal` e `TarefasRecorrentes`. Quem usa leitor de tela
 * ficava em silêncio total enquanto a região carregava — não "ouvia pouco":
 * não ouvia nada, e não tinha como saber se o sistema estava trabalhando ou
 * travado.
 *
 * A região viva fica no bloco porque é o bloco que APARECE e DESAPARECE. É a
 * troca que o leitor anuncia, e o anel sozinho não tem o que dizer além de
 * "carregando"; o bloco pode dizer o que está carregando.
 *
 * O anel dentro vai `decorativo`, senão os dois falam.
 */
export const BlocoCarregando: React.FC<BlocoCarregandoProps> = ({
  children,
  tamanho = 'md',
  className,
}) => (
  <div
    role="status"
    className={cn(
      'flex flex-col items-center justify-center gap-3 text-sm text-conteudo-tenue',
      className
    )}
  >
    {/* O anel em `--action`, e o texto em `--conteudo-tenue`.
     *
     * É aqui que a cor do pacote entra: o `Spinner.jsx` crava
     * `color: var(--action)`, e o primitivo daqui não crava porque o `Button`
     * precisa herdar. O bloco é o lugar certo para a decisão — ele é o caso
     * que o pacote tinha em mente, o anel solto no meio de um vazio.
     *
     * Eram CINCO cores fazendo este mesmo trabalho: `text-info` em `Chamados`,
     * `text-sinal` em `Dashboard`, `border-sinal` em `ChamadoDetalhes` e no
     * `PageLoader`, e a cor herdada nas três abas de cadastro. Nenhuma estava
     * errada; nenhuma tinha sido escolhida.
     *
     * Piso de 3:1 por ser elemento não textual (WCAG 1.4.11), e não os 4,5:1
     * de texto. `--action` dá 5,29:1 no claro e 5,95:1 no escuro contra
     * `--surface` — passa nos dois com folga. */}
    <Spinner tamanho={tamanho} decorativo className="text-sinal" />
    {/* Sem texto visível, a região viva precisa de alguma coisa para anunciar.
        `sr-only` dá o anúncio sem mudar um pixel — e é melhor que um texto
        visível imposto, porque estas telas foram desenhadas sem ele e a §30
        não deixa acrescentar peso visual por motivo de acessibilidade quando
        existe caminho que não muda o desenho. */}
    {children ?? <span className="sr-only">Carregando...</span>}
  </div>
);

export default Spinner;
