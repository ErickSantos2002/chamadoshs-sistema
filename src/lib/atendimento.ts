import { chamadosService } from '../services/chamadoshsapi';
import {
  Chamado,
  ChamadoAtendimento,
  SetorDestinoEnum,
  StatusDoAtendimento,
  StatusEnum,
} from '../types/api';
import { setorDoChamado } from './setor';

/**
 * O atendimento restrito da Qualidade, fora dos componentes.
 *
 * ── Como o front sabe que a API atende ────────────────────────────────
 *
 * A rota nova é `PATCH /chamados/{id}/atendimento`, e o front não pode
 * perguntar por ela com um PATCH: seria uma escrita. Pergunta com um GET no
 * mesmo caminho, que nenhuma versão da API atende, e lê COMO ela recusa:
 *
 * | API                    | GET /chamados/0/atendimento                 |
 * |------------------------|---------------------------------------------|
 * | com o atendimento      | 405 `{"detail":"Method Not Allowed"}`       |
 * | sem o atendimento      | 404 `{"detail":"Not Found"}`                |
 *
 * O roteador responde os dois antes de qualquer autenticação ou banco — o
 * caminho existe só para outro método, ou não existe —, então a sonda não
 * precisa de token e não toca em chamado nenhum. O 0 é só um número que
 * casa com `{chamado_id}`.
 *
 * O cabeçalho `Allow` diria o mesmo, mas a API não o expõe pelo CORS, e no
 * navegador ele chega vazio. Por isso a leitura é do corpo.
 *
 * ── Tudo o que não é exatamente isso é "falhou" ───────────────────────
 *
 * Um 404 com outro texto pode ser "Chamado não encontrado" de uma rota que
 * casou por acaso; um 405 com outro texto, um proxy. 401, 403, 422, 429, 5xx,
 * redirecionamento, HTML, timeout e rede não dizem nada sobre a versão. Em
 * `falhou` as ações restritas não aparecem — o mesmo que `nao-suportado` para
 * quem usa — mas a diferença fica para o console e para a próxima tentativa.
 */

export type EstadoDoSuporte = 'verificando' | 'suportado' | 'nao-suportado' | 'falhou';

export interface RespostaDaSonda {
  status: number;
  dados: unknown;
}

const detailDoCorpo = (dados: unknown): unknown =>
  dados !== null && typeof dados === 'object' && !Array.isArray(dados)
    ? (dados as { detail?: unknown }).detail
    : undefined;

/** Traduz a resposta da sonda. `null` é "nem resposta houve". */
export function classificarSonda(
  resposta: RespostaDaSonda | null
): Exclude<EstadoDoSuporte, 'verificando'> {
  if (!resposta) return 'falhou';
  const detail = detailDoCorpo(resposta.dados);
  if (resposta.status === 405 && detail === 'Method Not Allowed') return 'suportado';
  if (resposta.status === 404 && detail === 'Not Found') return 'nao-suportado';
  return 'falhou';
}

/**
 * Uma sondagem. Nunca lança, e nunca repete: a próxima tentativa é a próxima
 * vez que alguém abrir um chamado da Qualidade.
 *
 * O aviso no console leva só o status — nada do corpo.
 */
export async function sondarSuporte(): Promise<Exclude<EstadoDoSuporte, 'verificando'>> {
  let resposta: RespostaDaSonda | null = null;
  try {
    resposta = await chamadosService.sondarAtendimento();
  } catch {
    resposta = null;
  }
  const estado = classificarSonda(resposta);
  if (estado === 'falhou') {
    console.warn(
      `[atendimento] não deu para saber se a API atende a Qualidade (${resposta?.status ?? 'sem resposta'}); ações restritas ocultas.`
    );
  }
  return estado;
}

// ── Os chamados atribuídos ──────────────────────────────────────────────
//
// Quem não é da equipe vê os chamados que abriu. Com a Qualidade, passa a ver
// também os que atende: os da Qualidade com ele de responsável — e só esses.
// Um chamado da TI atribuído a ele (de antes, ou de uma API que ignora o
// filtro de setor) não entra: o quadro dele não vira o da TI.

/** Chamado da Qualidade em que `usuarioId` é o responsável atual. */
export function ehAtribuidoNaQualidade(
  chamado: Pick<Chamado, 'setor_destino' | 'tecnico_responsavel_id'>,
  usuarioId: number | undefined
): boolean {
  return (
    usuarioId !== undefined &&
    chamado.tecnico_responsavel_id === usuarioId &&
    setorDoChamado(chamado).setor === SetorDestinoEnum.QUALIDADE
  );
}

/**
 * Os próprios, mais os atribuídos que ainda não estão neles. Sem atribuído,
 * devolve a lista de antes como veio; com eles, ordena por id decrescente,
 * a mesma ordem do quadro.
 */
export function unirChamados(proprios: Chamado[], atribuidos: Chamado[]): Chamado[] {
  const ids = new Set(proprios.map((c) => c.id));
  const novos: Chamado[] = [];
  for (const chamado of atribuidos) {
    if (ids.has(chamado.id)) continue;
    ids.add(chamado.id);
    novos.push(chamado);
  }
  if (novos.length === 0) return proprios;
  return [...proprios, ...novos].sort((a, b) => b.id - a.id);
}

// ── Quem atende pela rota restrita ──────────────────────────────────────
//
// As seis condições, todas juntas. Nenhuma delas é "não ser da equipe": um
// técnico que atende a Qualidade e é o responsável usa a mesma rota que um
// usuário comum — a API decide pela elegibilidade, não pelo perfil. E é uma
// rota OU outra: quando esta vale, os mesmos botões mudam de caminho, e não
// aparecem duas vezes.

/** O que a tela sabe da Qualidade — o estado do contexto. */
export interface QualidadeParaAtender {
  suporte: EstadoDoSuporte;
  disponibilidade: string;
  atendentes: ReadonlyArray<{ id: number }>;
}

export function podeAtenderPelaRota(
  chamado: Pick<
    Chamado,
    'setor_destino' | 'tecnico_responsavel_id' | 'cancelado' | 'arquivado'
  >,
  usuarioId: number | undefined,
  qualidade: QualidadeParaAtender
): boolean {
  return (
    qualidade.suporte === 'suportado' &&
    qualidade.disponibilidade === 'disponivel' &&
    qualidade.atendentes.some((a) => a.id === usuarioId) &&
    ehAtribuidoNaQualidade(chamado, usuarioId) &&
    !chamado.cancelado &&
    !chamado.arquivado
  );
}

/**
 * O corpo do PATCH. A solução vai só ao resolver: a API recusa a PRESENÇA
 * dela nas outras transições, até como `null`.
 */
export function montarCorpoAtendimento(
  status: StatusDoAtendimento,
  solucao?: string
): ChamadoAtendimento {
  if (status === StatusEnum.RESOLVIDO) return { status, solucao: (solucao ?? '').trim() };
  return { status };
}

export const MENSAGEM_ROTA_INDISPONIVEL =
  'O atendimento da Qualidade não está disponível nesta versão do sistema.';
export const MENSAGEM_QUALIDADE_INDISPONIVEL =
  'O atendimento da Qualidade está indisponível neste ambiente. Tente mais tarde.';
export const MENSAGEM_SEM_RESPOSTA =
  'Não foi possível falar com o servidor. O que você digitou foi mantido.';
const MENSAGEM_GENERICA = 'Não foi possível atualizar o atendimento.';

export type ErroDoAtendimento =
  /** A API não tem a rota (404 "Not Found" exato, ou 405). */
  | 'rota-indisponivel'
  /** 401: o interceptor já leva ao login. */
  | 'sessao'
  /** 403: o interceptor já avisou. A tela relê quem pode atender. */
  | 'sem-permissao'
  /** 404 com outro texto: o chamado não existe mais. */
  | 'chamado-inexistente'
  /** 409: cancelado, arquivado ou transição que já não vale. */
  | 'conflito'
  /** 422: a API recusou o corpo. */
  | 'invalido'
  /** 503: a Qualidade foi desligada. */
  | 'qualidade-indisponivel'
  | 'rede'
  | 'outro';

/**
 * O que fazer com o erro do PATCH. `mensagem` é `null` quando quem avisa é
 * o interceptor; `recarregar` é "o chamado na tela pode estar velho".
 *
 * O 404 da rota e o do chamado só se separam pelo texto: o roteador diz
 * "Not Found", a rota diz "Chamado não encontrado". Na dúvida, é chamado —
 * esconder o atendimento por um 404 qualquer seria pior que uma recarga.
 */
export function interpretarErroDoAtendimento(erro: unknown): {
  tipo: ErroDoAtendimento;
  mensagem: string | null;
  recarregar: boolean;
} {
  const resposta =
    erro && typeof erro === 'object'
      ? (erro as { response?: { status?: unknown; data?: { detail?: unknown } } }).response
      : undefined;
  if (!resposta || typeof resposta.status !== 'number') {
    return { tipo: 'rede', mensagem: MENSAGEM_SEM_RESPOSTA, recarregar: false };
  }

  const { status } = resposta;
  const detail =
    typeof resposta.data?.detail === 'string' && resposta.data.detail.trim()
      ? resposta.data.detail
      : undefined;

  if (status === 405 || (status === 404 && detail === 'Not Found')) {
    return { tipo: 'rota-indisponivel', mensagem: MENSAGEM_ROTA_INDISPONIVEL, recarregar: false };
  }
  if (status === 401) return { tipo: 'sessao', mensagem: null, recarregar: false };
  if (status === 403) return { tipo: 'sem-permissao', mensagem: null, recarregar: true };
  if (status === 404) {
    return {
      tipo: 'chamado-inexistente',
      mensagem: detail ?? 'Chamado não encontrado.',
      recarregar: true,
    };
  }
  if (status === 409) return { tipo: 'conflito', mensagem: detail ?? MENSAGEM_GENERICA, recarregar: true };
  if (status === 422) return { tipo: 'invalido', mensagem: detail ?? MENSAGEM_GENERICA, recarregar: false };
  if (status === 503) {
    return { tipo: 'qualidade-indisponivel', mensagem: MENSAGEM_QUALIDADE_INDISPONIVEL, recarregar: false };
  }
  return { tipo: 'outro', mensagem: detail ?? MENSAGEM_GENERICA, recarregar: false };
}
