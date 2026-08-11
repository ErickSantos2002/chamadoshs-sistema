/**
 * Mínimos de texto dos campos livres.
 *
 * O problema que isto resolve não é formulário mal preenchido — é chamado que
 * chega como "não funciona" e custa duas idas e vindas até alguém descobrir o
 * que não funciona. O mínimo não garante um bom relato, mas torna o relato
 * vazio impossível.
 *
 * A contagem é feita sobre o texto sem espaços nas pontas: dez espaços não são
 * dez caracteres.
 */
export const MINIMO_TITULO = 10;
export const MINIMO_DESCRICAO = 20;
export const MINIMO_SOLUCAO = 10;

/** Quantos caracteres ainda faltam. Zero quando já atingiu o mínimo. */
export function faltamCaracteres(valor: string, minimo: number): number {
  return Math.max(0, minimo - valor.trim().length);
}

/**
 * Mensagem de erro do campo, ou `null` se está válido.
 *
 * Campo vazio devolve a mensagem de obrigatório, não a de mínimo: dizer
 * "faltam 20 caracteres" para quem não escreveu nada é confuso.
 */
export function validarMinimo(
  valor: string,
  minimo: number,
  rotulo: string
): string | null {
  const limpo = valor.trim();

  if (limpo.length === 0) return `${rotulo} é obrigatório.`;

  const faltam = faltamCaracteres(valor, minimo);
  if (faltam > 0) {
    return faltam === 1
      ? `${rotulo} precisa de mais 1 caractere.`
      : `${rotulo} precisa de mais ${faltam} caracteres.`;
  }

  return null;
}
