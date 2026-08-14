/** Primeiro código de acento combinante; o último é `FIM_DOS_ACENTOS`. */
const INICIO_DOS_ACENTOS = 0x0300;
const FIM_DOS_ACENTOS = 0x036f;

/**
 * Texto sem acento e sem caixa, para comparação.
 *
 * `NFD` separa a letra do acento — "é" vira "e" mais o acento — e aí basta
 * jogar fora os acentos. Comparados por código, e não por um regex com os
 * caracteres soltos no arquivo: ali eles são invisíveis, e qualquer acerto de
 * formatação apagaria a regra sem ninguém notar.
 *
 * Nasceu dentro da busca por digitação do seletor e saiu de lá quando o
 * perfil precisou da mesma tolerância: a API compara nomes de role sem acento
 * e sem caixa de propósito — "se a tabela um dia gravar 'Técnico', a
 * comparação literal rejeitaria todos os técnicos com um 403 que parece bug" —
 * e o front comparava ao pé da letra o mesmo dado.
 */
export function simplificar(texto: string): string {
  return Array.from(texto.normalize('NFD'))
    .filter((caractere) => {
      const codigo = caractere.codePointAt(0) ?? 0;
      return codigo < INICIO_DOS_ACENTOS || codigo > FIM_DOS_ACENTOS;
    })
    .join('')
    .toLowerCase();
}
