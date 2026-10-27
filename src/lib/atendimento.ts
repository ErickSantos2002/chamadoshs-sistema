import { chamadosService } from '../services/chamadoshsapi';

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
