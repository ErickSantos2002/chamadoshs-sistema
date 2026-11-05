import { Chamado, SetorDestinoEnum } from '../types/api';
import { setorDoChamado } from './setor';

/**
 * A versão do chamado e o controle otimista da Qualidade (FE-4, sobre a
 * API-4).
 *
 * ── O contrato ────────────────────────────────────────────────────────
 *
 * A API-4a devolve `versao` em todo chamado: um inteiro ≥ 1 que o banco sobe
 * a cada mudança gravada. A API-4b exige, nas escritas de um chamado da
 * Qualidade — PUT, atendimento, cancelar, arquivar, desarquivar —, a versão
 * em que a pessoa se baseou, em `versao_esperada`:
 *
 * | Resposta | Quando                         | Corpo                                          |
 * |----------|--------------------------------|------------------------------------------------|
 * | 428      | a versão não veio              | `{detail}`                                     |
 * | 409      | a versão não é mais a gravada  | `{detail, codigo: "versao_desatualizada", versao_atual}` |
 *
 * Outros 409 existem (transição que não vale, chamado cancelado): só o
 * `codigo` separa o de versão deles.
 *
 * ── Quem manda a versão ───────────────────────────────────────────────
 *
 * Só o chamado que não é da TI. A TI segue com o corpo de antes, sem versão:
 * na API ela é opcional ali, e mandar mudaria um fluxo que não pediu nada.
 * Setor inesperado conta como protegido — na dúvida, a escrita leva a
 * pré-condição; uma API-4 aceita a versão em qualquer setor.
 *
 * ── Sem versão válida, a Qualidade não escreve ───────────────────────
 *
 * Uma API anterior à 4 não devolve `versao`. Aí não há o que mandar, e
 * inventar um número (0, 1, o de outro chamado) seria pior que não mandar:
 * a pré-condição passaria a dizer algo falso. A escrita da Qualidade para
 * antes de sair, com aviso, e o que a pessoa digitou fica. Também evita o
 * 422 do atendimento de uma API-3, que recusa campo a mais.
 */

/** Versão aceitável: inteiro seguro ≥ 1. `true`, "3", 1.5, 0, NaN não são. */
export function versaoValida(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 1;
}

/** A versão deste chamado, ou `null` se ela não veio ou não é uma versão. */
export function lerVersao(chamado: Pick<Chamado, 'versao'> | null | undefined): number | null {
  const valor = (chamado as { versao?: unknown } | null | undefined)?.versao;
  return versaoValida(valor) ? valor : null;
}

/** O que acompanha uma escrita: nada (TI) ou a versão esperada. */
export type Precondicao = { versao_esperada?: number };

/** O chamado é da TI, onde a escrita segue sem versão. */
export const escreveSemVersao = (chamado: Pick<Chamado, 'setor_destino'>): boolean =>
  setorDoChamado(chamado).setor === SetorDestinoEnum.TI;

/**
 * A pré-condição da EDIÇÃO de um chamado da TI (T-1): a versão, se o chamado
 * a tiver; nada, se não.
 *
 * Na TI a API trata `versao_esperada` como opcional e, quando vem, a confere
 * e recusa com 409 a que não bate (API-4b; `test_ti_com_versao_velha_ainda_e_409`).
 * A edição passou a mandá-la para que uma escrita alheia entre a releitura e
 * o PUT não seja sobrescrita. Sem versão válida — API anterior à 4 — a edição
 * segue sem ela, como sempre seguiu: na TI a falta da versão não trava nada.
 *
 * Não é o controle da Qualidade: no PUT da TI a API confere sem `FOR UPDATE`,
 * e duas escritas no mesmo instante ainda passam as duas. Só a edição da
 * página usa isto; as ações rápidas da TI seguem sem versão.
 */
export function precondicaoDaEdicaoDaTI(chamado: Pick<Chamado, 'versao'>): Precondicao {
  const versao = lerVersao(chamado);
  return versao === null ? {} : { versao_esperada: versao };
}

/**
 * A pré-condição de uma escrita neste chamado, tirada DELE — nunca de outro
 * objeto, para a versão não ser a de outro chamado. `null` é "não escreva":
 * chamado protegido sem versão válida.
 */
export function precondicaoDaEscrita(
  chamado: Pick<Chamado, 'setor_destino' | 'versao'>
): Precondicao | null {
  if (escreveSemVersao(chamado)) return {};
  const versao = lerVersao(chamado);
  return versao === null ? null : { versao_esperada: versao };
}

const respostaDo = (erro: unknown): { status?: unknown; data?: unknown } | undefined =>
  erro && typeof erro === 'object'
    ? (erro as { response?: { status?: unknown; data?: unknown } }).response
    : undefined;

const corpoDo = (erro: unknown): Record<string, unknown> | undefined => {
  const dados = respostaDo(erro)?.data;
  return dados !== null && typeof dados === 'object' && !Array.isArray(dados)
    ? (dados as Record<string, unknown>)
    : undefined;
};

export const CODIGO_VERSAO_DESATUALIZADA = 'versao_desatualizada';

/** 409 de versão — e só ele. Os outros 409 não têm este `codigo`. */
export function ehConflitoDeVersao(erro: unknown): boolean {
  return respostaDo(erro)?.status === 409 && corpoDo(erro)?.codigo === CODIGO_VERSAO_DESATUALIZADA;
}

/** A versão que o 409 diz estar gravada, se for uma versão. */
export function versaoAtualDoConflito(erro: unknown): number | null {
  if (!ehConflitoDeVersao(erro)) return null;
  const valor = corpoDo(erro)?.versao_atual;
  return versaoValida(valor) ? valor : null;
}

/** 428: a API pediu a versão e ela não foi. */
export const ehVersaoAusente = (erro: unknown): boolean => respostaDo(erro)?.status === 428;

export const MENSAGEM_CONFLITO_DE_VERSAO =
  'Este chamado foi alterado por outra pessoa. Os dados foram atualizados: confira antes de tentar de novo.';
export const MENSAGEM_VERSAO_AUSENTE =
  'O servidor pediu a versão do chamado e ela não foi enviada. Nada foi salvo; atualize a página e tente de novo.';
export const MENSAGEM_SEM_VERSAO =
  'O servidor não informou a versão deste chamado, e sem ela a alteração não é enviada. Nada foi salvo; o sistema pode estar desatualizado.';

/**
 * Entre duas leituras do mesmo chamado, a mais nova. Uma resposta que chega
 * atrasada, com versão menor, não desfaz a que já está na tela. Sem versão
 * dos dois lados (API anterior), vale a que chegou, como antes.
 */
export function maisRecente<T extends Pick<Chamado, 'id' | 'versao'>>(atual: T, chegou: T): T {
  if (atual.id !== chegou.id) return chegou;
  const a = lerVersao(atual);
  const b = lerVersao(chegou);
  return a !== null && b !== null && b < a ? atual : chegou;
}
