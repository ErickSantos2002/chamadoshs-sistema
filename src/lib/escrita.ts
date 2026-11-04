/**
 * O que uma escrita recusada (ou sem resposta) quer dizer para a tela (FE-5, C3).
 *
 * ── O defeito ─────────────────────────────────────────────────────────
 *
 * Na página do chamado, salvar a edição da TI, mudar o status pelas ações
 * rápidas e confirmar a resolução terminavam, em qualquer erro que não fosse
 * de versão nem de acesso, em `setError(...)` — e a página inteira dava lugar
 * a um aviso. O chamado sumia da tela, junto com o que a pessoa tinha
 * digitado: um 422 por um campo, um 403 por permissão, um 503 de passagem.
 *
 * ── A classificação ──────────────────────────────────────────────────
 *
 * Nenhum destes casos encerra a página. O que muda é a mensagem, e o que a
 * tela deixa fazer depois:
 *
 * - `validacao` (400, 422): a API leu e recusou os dados. Nada foi gravado.
 *   O formulário fica, a mensagem vem junto dele, e salvar de novo é um
 *   clique da pessoa.
 * - `recusa` (403): a API recusou a OPERAÇÃO para esta conta agora. Não é
 *   perda de acesso ao chamado (essa é 404, `lib/acesso`): ele continua na
 *   tela, o texto fica para copiar, a operação recusada trava, e a identidade
 *   é relida — sem repetir a escrita.
 * - `incerta` (5xx, timeout, rede): não há como saber se a escrita entrou. O
 *   servidor pode ter gravado e a resposta se perdido. Nada é reenviado
 *   sozinho; a tela diz para conferir antes de tentar de novo, e oferece a
 *   conferência quando ela não apaga o que está sendo editado.
 * - `outra`: o resto (um 404 que não é do chamado, um status inesperado). A
 *   página fica, com o `detail` da API quando houver.
 *
 * 409 e 428 (versão) e o 404 do chamado têm fluxo próprio, tratado antes.
 */

export type TipoDeFalhaDeEscrita = 'validacao' | 'recusa' | 'incerta' | 'outra';

/** As escritas da página do chamado que passam por aqui. */
export type OperacaoDeEscrita = 'edicao' | 'status' | 'resolucao';

export interface FalhaDeEscrita {
  tipo: TipoDeFalhaDeEscrita;
  mensagem: string;
}

export const MENSAGEM_VALIDACAO =
  'A API recusou os dados enviados. Nada foi salvo: confira os campos e salve de novo.';
export const MENSAGEM_RECUSA =
  'A API recusou esta operação para a sua conta agora. Nada foi salvo, e o que você digitou continua aqui para copiar. Suas permissões estão sendo conferidas de novo.';
export const MENSAGEM_INCERTA =
  'Não foi possível confirmar se a alteração foi salva (servidor ou conexão). Nada foi reenviado. Confira o chamado antes de tentar de novo.';
export const MENSAGEM_OUTRA = 'Não foi possível concluir a operação. Nada foi reenviado.';

function detalheDe(erro: unknown): string | null {
  const detalhe = (erro as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  // O interceptor já normaliza `detail` para texto (`lib/erroApi`).
  return typeof detalhe === 'string' && detalhe.trim() ? detalhe.trim() : null;
}

export function classificarFalhaDeEscrita(erro: unknown): FalhaDeEscrita {
  const resposta = (erro as { response?: { status?: unknown } } | null)?.response;
  const status = typeof resposta?.status === 'number' ? resposta.status : null;
  const detalhe = detalheDe(erro);

  if (status === 400 || status === 422) {
    return { tipo: 'validacao', mensagem: detalhe ? `${detalhe} Nada foi salvo.` : MENSAGEM_VALIDACAO };
  }
  if (status === 403) return { tipo: 'recusa', mensagem: MENSAGEM_RECUSA };
  // Sem resposta (rede, timeout) ou erro do servidor: resultado desconhecido.
  if (status === null || status >= 500) return { tipo: 'incerta', mensagem: MENSAGEM_INCERTA };
  return { tipo: 'outra', mensagem: detalhe ? `${detalhe}` : MENSAGEM_OUTRA };
}
