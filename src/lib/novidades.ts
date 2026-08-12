/**
 * Regras do aviso de novidades.
 *
 * O que o sistema precisa decidir é uma coisa só: abrir ou não o modal sozinho
 * quando a pessoa entra. A resposta depende de comparar a versão que está
 * rodando com a última que ela viu, guardada no navegador.
 */

export const CHAVE_VERSAO_VISTA = 'chamadoshs:versao-vista';

/**
 * Se o aviso deve abrir sozinho.
 *
 * Quem entra pela primeira vez não vê nada: mostrar "o que há de novo" para
 * quem nunca usou o sistema é apresentar mudanças em relação a um passado que
 * a pessoa não viveu. Nesse caso a versão atual é registrada em silêncio, e o
 * próximo lançamento é que aparece.
 *
 * A comparação é por diferença, não por "maior que". Voltar a uma versão
 * anterior — um deploy revertido, por exemplo — também é mudança que vale
 * mostrar, e tentar ordenar versões aqui daria peso a um caso raro.
 */
export function deveAbrirNovidades(
  versaoAtual: string,
  versaoVista: string | null
): boolean {
  if (!versaoAtual) return false;
  if (versaoVista === null) return false;
  return versaoVista !== versaoAtual;
}

/**
 * Se o item de menu deve exibir o ponto de novidade.
 *
 * Mesma regra do modal: o ponto existe para quem fechou o aviso sem ler e
 * quer voltar. Ele some assim que a versão é marcada como vista.
 */
export function temNovidadeNaoVista(
  versaoAtual: string,
  versaoVista: string | null
): boolean {
  return deveAbrirNovidades(versaoAtual, versaoVista);
}
