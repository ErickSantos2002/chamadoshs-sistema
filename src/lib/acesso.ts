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

/** O `detail` do 404 do chamado na API (`CHAMADO_NAO_ENCONTRADO`, D6). */
export const DETALHE_CHAMADO_NAO_ENCONTRADO = 'Chamado não encontrado';

/**
 * O 404 de um chamado que estava na tela.
 *
 * Nem todo 404 é esse (FE-5, C3). A API devolve, para o chamado que não
 * existe e para o que a pessoa não lê, o MESMO corpo — `Chamado não
 * encontrado` —, e é ele a evidência. Outro `detail` diz que faltou outra
 * coisa: "Not Found" é a rota que não existe (API antiga), "Comentário não
 * encontrado" é o comentário. Esses não encerram a página. Sem corpo nenhum
 * (um proxy no meio, por exemplo) o 404 continua contando como perda: na
 * dúvida, os dados do chamado saem da tela.
 */
export function ehPerdaDeAcesso(erro: unknown): boolean {
  if (!erro || typeof erro !== 'object') return false;
  const resposta = (erro as { response?: { status?: unknown; data?: unknown } }).response;
  if (resposta?.status !== 404) return false;
  const corpo = resposta.data;
  const detalhe =
    corpo !== null && typeof corpo === 'object' && !Array.isArray(corpo)
      ? (corpo as { detail?: unknown }).detail
      : undefined;
  return detalhe === undefined || detalhe === DETALHE_CHAMADO_NAO_ENCONTRADO;
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
