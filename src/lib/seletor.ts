/**
 * As duas contas do seletor de filtro que dá para errar sem ninguém ver.
 *
 * Ficam aqui, e não dentro do componente, porque sem biblioteca de renderização
 * o que estiver lá dentro não tem como ser verificado. São as duas partes que
 * quebram em silêncio: uma lista que abre fora da tela e uma busca que não acha
 * o que a pessoa digitou.
 */

import { simplificar } from './texto';

/** Largura mínima da lista, para opção curta não virar uma tira fina. */
export const LARGURA_MINIMA = 176;

/** Folga até a borda da janela. Lista encostada no vidro parece cortada. */
const FOLGA = 8;

/** Distância entre o campo e a lista. */
const RESPIRO = 6;

/** Altura máxima da lista, quando há tela sobrando para ela. */
export const ALTURA_MAXIMA = 288;

export interface AreaDoGatilho {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
}

export interface PosicaoDaLista {
  /** Ancorada pelo topo quando abre para baixo. */
  top?: number;
  /** Ancorada pela base quando abre para cima. */
  bottom?: number;
  left?: number;
  right?: number;
  minWidth: number;
  /** Nunca deixa a lista passar da borda da janela. */
  maxHeight: number;
}

/**
 * Onde a lista abre.
 *
 * Ancorada à esquerda do campo, como se espera. Quando o campo está perto da
 * borda direita, a lista ancorada à esquerda sairia da tela — aí ela passa a
 * ser ancorada pela DIREITA, alinhando o fim da lista com o fim do campo. É o
 * caso dos filtros de Chamados, que ficam colados no botão "Novo Chamado".
 *
 * A largura nunca é menor que a do campo: uma lista mais estreita que o botão
 * que a abriu parece defeito.
 *
 * ── E a altura ────────────────────────────────────────────────────────
 *
 * A conta acima existia só para a largura, e isso bastava enquanto o sistema
 * era usado em tela grande. No celular não basta: um seletor na metade de
 * baixo da tela abria uma lista de até 288px que passava da borda inferior, e
 * o que ficava para fora era inalcançável — rolar a página FECHA a lista (é o
 * comportamento escolhido, para ela não descolar do campo), e no toque não há
 * teclado para descer até a opção.
 *
 * Agora a lista faz o mesmo que faz na horizontal: se não cabe para baixo e
 * há mais espaço para cima, ela abre para cima. E em qualquer um dos dois
 * lados ela ganha um teto igual ao espaço que existe de verdade, então nunca
 * atravessa a borda — no pior caso ela fica baixa e rola por dentro, que é o
 * que já sabe fazer.
 */
export function posicionarLista(
  area: AreaDoGatilho,
  larguraDaJanela: number,
  alturaDaJanela: number
): PosicaoDaLista {
  const minWidth = Math.max(LARGURA_MINIMA, area.width);

  const lado =
    area.left + minWidth > larguraDaJanela - FOLGA
      ? { right: larguraDaJanela - area.right }
      : { left: area.left };

  const abaixo = alturaDaJanela - area.bottom - RESPIRO - FOLGA;
  const acima = area.top - RESPIRO - FOLGA;

  // Só vira para cima quando há motivo E ganho: não cabe embaixo, e em cima
  // sobra mais. Virar por qualquer aperto faria a lista pular de lado entre
  // duas aberturas seguidas no mesmo campo.
  if (abaixo < ALTURA_MAXIMA && acima > abaixo) {
    return {
      ...lado,
      bottom: alturaDaJanela - area.top + RESPIRO,
      minWidth,
      maxHeight: Math.min(ALTURA_MAXIMA, acima),
    };
  }

  return {
    ...lado,
    top: area.bottom + RESPIRO,
    minWidth,
    maxHeight: Math.min(ALTURA_MAXIMA, abaixo),
  };
}

/** Quanto tempo as letras digitadas contam como uma busca só. */
export const JANELA_DA_BUSCA_MS = 700;

/**
 * Acumula as letras digitadas, como faz o `<select>` nativo.
 *
 * Letras seguidas somam: "cr" acha "Crítica" sem parar antes em "Categoria".
 * Depois de um tempo parado o acumulado zera, senão a busca seguinte começaria
 * grudada na anterior e não acharia mais nada.
 */
export function acumularBusca(
  anterior: string,
  letra: string,
  desdeMs: number
): string {
  return desdeMs > JANELA_DA_BUSCA_MS ? letra : anterior + letra;
}

/**
 * Qual opção a digitação alcança.
 *
 * Devolve `-1` quando nada começa com o texto — e aí o destaque fica onde está,
 * em vez de pular para a primeira opção. Pular seria mentir sobre ter achado.
 *
 * Compara sem caixa e sem acento: quem digita "cr" espera chegar em "Crítica",
 * e quem digita "me" espera "Média". Exigir o acento certo num campo de busca
 * por tecla é exigir o que o teclado não facilita.
 */
export function acharPorDigitacao(rotulos: string[], texto: string): number {
  if (!texto) return -1;

  const alvo = simplificar(texto);
  return rotulos.findIndex((rotulo) => simplificar(rotulo).startsWith(alvo));
}

