import axios from 'axios';

/**
 * Sonda de saúde do sistema, para a faixa de status.
 *
 * ── Por que NÃO usa a instância `api` ─────────────────────────────────
 *
 * Três motivos, e o primeiro é o que importa:
 *
 * O interceptor de requisição da instância chama `await renovarUmaVezSo()`
 * quando o token está perto de vencer — e isso é uma ida à rede. Numa
 * instabilidade, a sonda que existe para DETECTAR a instabilidade ficaria
 * enfileirada atrás de uma tentativa de renovar token.
 *
 * Além disso: o timeout da instância é de 30s, e uma faixa que leva meio
 * minuto para dizer "fora do ar" não serve para nada; e mandar `Authorization`
 * para um endpoint público entrega o token a uma rota que não pede.
 *
 * ── Por que três estados, e não dois ──────────────────────────────────
 *
 * A API responde 200 quando ela e o banco estão de pé, e 503 quando ela está
 * de pé e o banco não. Colapsar os dois em "fora do ar" jogaria fora
 * exatamente a distinção que o endpoint foi feito para dar — e é a distinção
 * útil, porque "o banco caiu" e "a API caiu" levam a ações diferentes.
 */
export type EstadoDoSistema = 'verificando' | 'ok' | 'degradado' | 'sem-resposta';

/** De quanto em quanto tempo a sonda repete, com a aba visível. */
export const INTERVALO_MS = 60_000;

/**
 * Quanto ela espera antes de desistir.
 *
 * Curto de propósito. O valor não é "quanto a API costuma demorar", é "quanto
 * tempo a tela pode ficar mentindo que está tudo bem antes de admitir que não
 * sabe".
 */
export const TIMEOUT_MS = 5_000;

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Traduz o código de status no estado exibido.
 *
 * Só o 503 documentado vira "degradado". Qualquer outro erro — 500, 502, 504,
 * conexão recusada, timeout — vira "sem-resposta", porque nesses casos o que
 * respondeu pode nem ter sido a API: um 502 costuma vir do proxy na frente
 * dela, e afirmar "o banco está fora" a partir disso seria inventar.
 */
export function classificarResposta(status?: number): EstadoDoSistema {
  if (status === 200) return 'ok';
  if (status === 503) return 'degradado';
  return 'sem-resposta';
}

/** Uma consulta. Nunca lança: erro de rede também é uma resposta. */
export async function consultarSaude(): Promise<EstadoDoSistema> {
  try {
    const { status } = await axios.get(`${BASE}/api/v1/health`, {
      timeout: TIMEOUT_MS,
      // Sem `Authorization`: a rota é pública e o token não tem o que fazer
      // ali. `validateStatus` aceita tudo para o 503 chegar como resposta, e
      // não como exceção.
      validateStatus: () => true,
    });

    return classificarResposta(status);
  } catch {
    return 'sem-resposta';
  }
}

/** O que a faixa escreve em cada estado. */
export const TEXTO_DO_ESTADO: Record<EstadoDoSistema, string> = {
  verificando: 'verificando',
  ok: 'sistema ativo',
  degradado: 'banco fora',
  'sem-resposta': 'sem conexão',
};
