/**
 * As duas contas do seletor de filtro que dá para errar sem ninguém ver.
 *
 * Ficam aqui, e não dentro do componente, porque sem biblioteca de renderização
 * o que estiver lá dentro não tem como ser verificado. São as duas partes que
 * quebram em silêncio: uma lista que abre fora da tela e uma busca que não acha
 * o que a pessoa digitou.
 */

/** Largura mínima da lista, para opção curta não virar uma tira fina. */
export const LARGURA_MINIMA = 176;

/** Folga até a borda da janela. Lista encostada no vidro parece cortada. */
const FOLGA = 8;

/** Distância entre o campo e a lista. */
const RESPIRO = 6;

export interface AreaDoGatilho {
  left: number;
  right: number;
  bottom: number;
  width: number;
}

export interface PosicaoDaLista {
  top: number;
  left?: number;
  right?: number;
  minWidth: number;
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
 */
export function posicionarLista(
  area: AreaDoGatilho,
  larguraDaJanela: number
): PosicaoDaLista {
  const minWidth = Math.max(LARGURA_MINIMA, area.width);
  const top = area.bottom + RESPIRO;

  if (area.left + minWidth > larguraDaJanela - FOLGA) {
    return { top, right: larguraDaJanela - area.right, minWidth };
  }

  return { top, left: area.left, minWidth };
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

/** Primeiro código de acento combinante; o último é `FIM_DOS_ACENTOS`. */
const INICIO_DOS_ACENTOS = 0x0300;
const FIM_DOS_ACENTOS = 0x036f;

function simplificar(texto: string): string {
  // `NFD` separa a letra do acento — "é" vira "e" mais o acento — e aí basta
  // jogar fora os acentos. Comparados por código, e não por um regex com os
  // caracteres soltos no arquivo: ali eles são invisíveis, e qualquer acerto
  // de formatação apagaria a regra sem ninguém notar.
  return [...texto.normalize('NFD')]
    .filter((caractere) => {
      const codigo = caractere.codePointAt(0) ?? 0;
      return codigo < INICIO_DOS_ACENTOS || codigo > FIM_DOS_ACENTOS;
    })
    .join('')
    .toLowerCase();
}

