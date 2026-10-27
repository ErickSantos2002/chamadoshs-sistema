import { chamadosService } from '../services/chamadoshsapi';
import {
  AtendenteQualidade,
  ChamadoCreate,
  ChamadoCreateQualidade,
  PrioridadeEnum,
  SetorDestinoEnum,
} from '../types/api';
import { MINIMO_DESCRICAO, validarMinimo } from './validacao';

/**
 * A abertura de chamado para a Qualidade, fora do formulário.
 *
 * ── A API é quem diz se a Qualidade existe ───────────────────────────
 *
 * Não há flag no front. A consulta de atendentes — que o formulário faz de
 * qualquer jeito, para preencher o seletor de responsável — é também a
 * pergunta "a Qualidade existe aqui?", e cada resposta tem um sentido:
 *
 * | Resposta              | API                              | Estado          |
 * |-----------------------|----------------------------------|-----------------|
 * | 200 com gente         | API-2 configurada                | `disponivel`    |
 * | 200 vazio             | configurada, ninguém elegível    | `sem-atendentes`|
 * | 503                   | API-2, `SETOR_QUALIDADE_ID` vazio| `indisponivel`  |
 * | 404, 405, 422         | sem a rota (a do ar hoje: 422)   | `nao-suportado` |
 * | rede, timeout, 5xx    | —                                | `falhou`        |
 *
 * O 422 da API de hoje não é acidente de leitura: sem a rota, a palavra
 * "atendentes-qualidade" cai em `/chamados/{chamado_id}` e não vira número.
 *
 * Ligar a Qualidade passa a ser configuração da API e restart, sem rebuild do
 * front. E só `disponivel` oferece o setor: em qualquer outro estado o
 * formulário é o de antes, e um corpo da Qualidade nunca chega a um backend
 * que não sabe criá-lo.
 *
 * ── 503 não é "sem atendentes" ───────────────────────────────────────
 *
 * Os dois deixam a Qualidade sem uso, e por isso é tentador juntá-los. Mas um
 * é configuração que ninguém fez e o outro é setor sem pessoas elegíveis — e
 * quem lê "nenhum atendente cadastrado" vai cadastrar gente num setor que a
 * API nem está olhando.
 */

export type DisponibilidadeQualidade =
  | 'verificando'
  | 'disponivel'
  | 'sem-atendentes'
  | 'indisponivel'
  | 'nao-suportado'
  | 'falhou';

export interface ConsultaDaQualidade {
  estado: Exclude<DisponibilidadeQualidade, 'verificando'>;
  atendentes: AtendenteQualidade[];
}

export const MENSAGEM_RESPONSAVEL = 'Selecione o responsável.';
export const MENSAGEM_SEM_ATENDENTES = 'Nenhum atendente da Qualidade cadastrado';
export const MENSAGEM_INDISPONIVEL_NO_ENVIO =
  'A abertura para a Qualidade ficou indisponível. Abra para a TI ou tente mais tarde.';

/** A mesma do formulário da TI, para os dois setores falarem igual. */
const MENSAGEM_GENERICA = 'Erro ao criar chamado. Tente novamente.';

const statusDe = (erro: unknown): number | undefined => {
  if (!erro || typeof erro !== 'object') return undefined;
  const status = (erro as { response?: { status?: unknown } }).response?.status;
  return typeof status === 'number' ? status : undefined;
};

const detailDe = (erro: unknown): string | undefined => {
  if (!erro || typeof erro !== 'object') return undefined;
  const detail = (erro as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
  return typeof detail === 'string' && detail.trim() ? detail : undefined;
};

/** Traduz a falha da consulta de atendentes num estado. */
export function classificarFalha(
  erro: unknown
): Extract<DisponibilidadeQualidade, 'indisponivel' | 'nao-suportado' | 'falhou'> {
  const status = statusDe(erro);
  if (status === 503) return 'indisponivel';
  if (status === 404 || status === 405 || status === 422) return 'nao-suportado';
  return 'falhou';
}

/**
 * A lista como ela veio, conferida. `null` quando nem lista é — contrato
 * quebrado, que vira `falhou`. Item fora do formato fica de fora: não há
 * opção de seletor que se construa com um nome vazio ou um id que é texto.
 */
export function lerAtendentes(dados: unknown): AtendenteQualidade[] | null {
  if (!Array.isArray(dados)) return null;

  return dados
    .filter(
      (item): item is AtendenteQualidade =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as AtendenteQualidade).id === 'number' &&
        typeof (item as AtendenteQualidade).nome === 'string' &&
        (item as AtendenteQualidade).nome.trim() !== ''
    )
    .map(({ id, nome }) => ({ id, nome }));
}

/**
 * Consulta a Qualidade. Nunca lança: erro de rede também é uma resposta,
 * como na sonda de `lib/saude`.
 *
 * Avisa no console no 503 e na falha, que são coisa para quem administra.
 * O backend sem a rota não avisa: é o estado normal enquanto a API-2 não
 * sobe, e avisaria a cada chamado aberto. O aviso leva só o estado e o
 * status — nada da resposta, que pode trazer nome de gente.
 */
export async function consultarQualidade(): Promise<ConsultaDaQualidade> {
  try {
    const atendentes = lerAtendentes(await chamadosService.listarAtendentesQualidade());
    if (atendentes === null) {
      console.warn('[qualidade] lista de atendentes fora do contrato; só TI disponível.');
      return { estado: 'falhou', atendentes: [] };
    }
    return { estado: atendentes.length > 0 ? 'disponivel' : 'sem-atendentes', atendentes };
  } catch (erro) {
    const estado = classificarFalha(erro);
    if (estado === 'indisponivel') {
      console.warn('[qualidade] abertura desligada na API (503); só TI disponível.');
    } else if (estado === 'falhou') {
      console.warn(
        `[qualidade] consulta de atendentes falhou (${statusDe(erro) ?? 'sem resposta'}); só TI disponível.`
      );
    }
    return { estado, atendentes: [] };
  }
}

/**
 * O corpo da TI, exatamente o de antes do setor existir — o
 * `NovoChamadoForm.test` trava as seis chaves e os valores.
 *
 * `tecnico_responsavel_id` continua indo para a equipe, e a API continua o
 * descartando na abertura TI. É dívida registrada, não regra: mexer nele é
 * mudar a TI, e esta etapa não muda a TI. `setor_destino` não vai — omitido
 * é TI, e mandá-lo seria outra mudança no corpo.
 */
export function montarCorpoTI(campos: {
  ehEquipe: boolean;
  usuarioId: number;
  solicitanteId: number | undefined;
  titulo: string;
  descricao: string;
  prioridade: PrioridadeEnum;
  categoriaId: number | undefined;
}): ChamadoCreate {
  return {
    solicitante_id: campos.ehEquipe ? campos.solicitanteId! : campos.usuarioId,
    titulo: campos.titulo.trim(),
    descricao: campos.descricao.trim(),
    prioridade: campos.prioridade,
    categoria_id: campos.categoriaId,
    tecnico_responsavel_id: campos.ehEquipe ? campos.usuarioId : undefined,
  };
}

/**
 * O corpo da Qualidade, montado do zero — e não um corpo da TI com campos
 * apagados. A API recusa a PRESENÇA de `titulo` e `categoria_id`, até com
 * null; aqui eles não existem para serem esquecidos.
 */
export function montarCorpoQualidade(campos: {
  descricao: string;
  prioridade: PrioridadeEnum;
  solicitante_id: number;
  tecnico_responsavel_id: number;
}): ChamadoCreateQualidade {
  return {
    setor_destino: SetorDestinoEnum.QUALIDADE,
    descricao: campos.descricao.trim(),
    prioridade: campos.prioridade,
    solicitante_id: campos.solicitante_id,
    tecnico_responsavel_id: campos.tecnico_responsavel_id,
  };
}

/**
 * O problema do formulário da Qualidade, na ordem da tela: descrição,
 * solicitante, responsável. As duas primeiras mensagens são as da TI, saídas
 * da mesma função.
 *
 * O responsável precisa estar na lista CARREGADA. A lista é a fonte: um id
 * que sobrou de uma lista anterior, ou que nunca esteve nela, não é escolha.
 */
export function validarQualidade(campos: {
  descricao: string;
  ehEquipe: boolean;
  solicitanteId: number | undefined;
  responsavelId: number | undefined;
  atendentes: AtendenteQualidade[];
}): string | null {
  const descricao = validarMinimo(campos.descricao, MINIMO_DESCRICAO, 'Descrição');
  if (descricao) return descricao;

  if (campos.ehEquipe && !campos.solicitanteId) return 'Selecione o solicitante.';

  const naLista = campos.atendentes.some((a) => a.id === campos.responsavelId);
  if (!naLista) return MENSAGEM_RESPONSAVEL;

  return null;
}

/**
 * O que fazer com o erro do envio da Qualidade.
 *
 * 503: a Qualidade foi desligada entre a consulta e o envio. Mensagem
 * própria, e o setor sai do formulário — o que estava digitado fica, e nada é
 * reenviado para a TI.
 *
 * 400: responsável inexistente ou que deixou de ser elegível. A lista na tela
 * pode estar velha, então ela recarrega.
 *
 * O resto é o detail que o interceptor já deixou em texto, ou a mensagem
 * genérica de sempre.
 */
export function interpretarErroDaQualidade(erro: unknown): {
  mensagem: string;
  recarregarAtendentes: boolean;
  indisponivel: boolean;
} {
  const status = statusDe(erro);

  if (status === 503) {
    return { mensagem: MENSAGEM_INDISPONIVEL_NO_ENVIO, recarregarAtendentes: false, indisponivel: true };
  }

  return {
    mensagem: detailDe(erro) ?? MENSAGEM_GENERICA,
    recarregarAtendentes: status === 400,
    indisponivel: false,
  };
}
