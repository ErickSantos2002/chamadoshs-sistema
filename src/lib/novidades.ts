/**
 * Regras do aviso de novidades.
 *
 * O que o sistema precisa decidir é uma coisa só: acender ou não o ponto ao
 * lado da versão, no rodapé do menu. A resposta depende de comparar a versão
 * que está rodando com a última que a pessoa viu, guardada no navegador.
 *
 * Já houve aqui um `deveAbrirNovidades`, que abria o modal sozinho a cada
 * versão nova. Saiu: aviso que interrompe quem entrou para atender um chamado
 * é aviso que se aprende a fechar sem ler. O ponto convida e espera.
 */

export const CHAVE_VERSAO_VISTA = 'chamadoshs:versao-vista';

/**
 * Se o número da versão deve exibir o ponto de novidade.
 *
 * Quem entra pela primeira vez não vê nada: apontar "o que há de novo" para
 * quem nunca usou o sistema é apresentar mudanças em relação a um passado que
 * a pessoa não viveu. Nesse caso a versão atual é registrada em silêncio, e o
 * próximo lançamento é que aparece.
 *
 * A comparação é por diferença, não por "maior que". Voltar a uma versão
 * anterior — um deploy revertido, por exemplo — também é mudança que vale
 * mostrar, e tentar ordenar versões aqui daria peso a um caso raro.
 */
export function temNovidadeNaoVista(
  versaoAtual: string,
  versaoVista: string | null
): boolean {
  if (!versaoAtual) return false;
  if (versaoVista === null) return false;
  return versaoVista !== versaoAtual;
}
