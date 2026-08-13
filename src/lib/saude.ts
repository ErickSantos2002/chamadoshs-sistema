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

/**
 * Há quanto tempo foi a última verificação, em texto.
 *
 * ── Por que idade, e não hora ─────────────────────────────────────────
 *
 * A primeira versão mostrava a hora da consulta — "08:22:17". Correto e
 * imóvel: a sonda roda a cada 60s, então o número ficava parado 59 segundos
 * de cada 60 e a tela parecia congelada. A maquete tinha um cronômetro
 * andando, e a diferença saltava aos olhos.
 *
 * A saída não é inventar um relógio, que não diria nada sobre o sistema. É
 * mostrar a IDADE da informação: ela muda a cada segundo, e o que ela informa
 * é justamente o que interessa ao lado de um ponto verde — de quando é essa
 * leitura. Um indicador de saúde sem idade é o que continua verde vinte
 * minutos depois da queda.
 *
 * Abaixo de cinco segundos escreve "agora": ver "há 1s" piscando para "há 2s"
 * chama atenção para o relógio em vez de para o estado.
 */
export function descreverIdade(msDecorridos: number): string {
  const s = Math.floor(msDecorridos / 1000);

  // Cobre também a diferença negativa, que aparece quando o relógio do cliente
  // está atrasado em relação ao carimbo: qualquer negativo é menor que 5 e sai
  // como "agora", em vez de "há -3s". Havia um `Math.max(0, …)` aqui para isso
  // e ele nunca chegava a fazer efeito — a comparação abaixo já resolvia.
  if (s < 5) return 'agora';
  if (s < 60) return `há ${s}s`;

  const min = Math.floor(s / 60);
  if (min < 60) return `há ${min}min`;

  const h = Math.floor(min / 60);
  return `há ${h}h`;
}

/** O que a faixa escreve em cada estado. */
export const TEXTO_DO_ESTADO: Record<EstadoDoSistema, string> = {
  verificando: 'verificando',
  ok: 'sistema ativo',
  degradado: 'banco fora',
  'sem-resposta': 'sem conexão',
};
