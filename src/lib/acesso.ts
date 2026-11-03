/**
 * Perda de acesso a um chamado que a tela já mostrava (FE-5).
 *
 * Desde a API-5 a leitura é por chamado: quem não pode ver recebe 404, e não
 * 403 — a API não confirma que o chamado existe. Então um 404 numa releitura
 * (ou numa escrita) de um chamado que ESTAVA na tela não é "chamado
 * inexistente": é a pessoa que deixou de poder vê-lo — saiu do setor, foi
 * tirada da atribuição, perdeu o perfil, ou ela mesma passou o chamado a
 * outra pessoa.
 *
 * A resposta é a mesma no modal e na página: as ações param, os dados do
 * chamado saem da memória da tela, o card sai do quadro, e só o que a pessoa
 * digitou fica, para ler e copiar. Nada é repetido, nem a escrita nem a
 * leitura.
 *
 * O 404 da rota que não existe (API antiga, "Not Found") é outro caso e é
 * tratado antes, onde ele pode acontecer (`interpretarErroDoAtendimento`).
 */

export const MENSAGEM_SEM_ACESSO = 'Este chamado não está mais disponível para você.';

export const MENSAGEM_ATRIBUICAO_SALVA_SEM_ACESSO =
  'A atribuição foi salva, mas este chamado não está mais disponível para você.';

/** O 404 de um chamado que estava na tela. */
export function ehPerdaDeAcesso(erro: unknown): boolean {
  if (!erro || typeof erro !== 'object') return false;
  const resposta = (erro as { response?: { status?: unknown } }).response;
  return resposta?.status === 404;
}

/** Um texto que a pessoa digitou e que fica à vista depois da perda de acesso. */
export interface RascunhoPreservado {
  rotulo: string;
  texto: string;
}

/** Só os rascunhos com conteúdo, sem repetir o mesmo texto. */
export function rascunhosComConteudo(
  candidatos: Array<{ rotulo: string; texto: string | null | undefined }>
): RascunhoPreservado[] {
  const vistos = new Set<string>();
  const saida: RascunhoPreservado[] = [];
  for (const { rotulo, texto } of candidatos) {
    const limpo = (texto ?? '').trim();
    if (!limpo || vistos.has(limpo)) continue;
    vistos.add(limpo);
    saida.push({ rotulo, texto: texto as string });
  }
  return saida;
}
