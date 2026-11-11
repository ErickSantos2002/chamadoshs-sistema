import type { LembreteDoDia, LembretesDoDia, SituacaoDoLembrete } from '../types/api';

/**
 * O lembrete "tarefas do dia" do quadro, lido do contrato da API-11.
 *
 * ── Por que a tela não calcula mais nada ──────────────────────────────
 *
 * Até a FE-5 o quadro pedia a listagem administrativa inteira
 * (`GET /tarefas-recorrentes/?ativo=true`) e classificava cada tarefa pelo
 * relógio do navegador: `proxima_data <= hojeYMD()` era pendente, e a
 * `ultima_execucao` do dia era realizada. Dois defeitos: a TV, conta de
 * serviço, deixou de ler a listagem (API-10/11) e o lembrete sumiu; e um
 * navegador com o relógio ou o fuso errado mostrava o dia errado.
 *
 * A rota nova devolve a lista pronta, com `data` (o dia de Brasília em que
 * foi montada) e `situacao` de cada tarefa. A tela mostra o que veio, na
 * ordem em que veio (próxima data, depois id — contrato da API), e não
 * reclassifica nada.
 *
 * ── Leitura estrita ───────────────────────────────────────────────────
 *
 * Corpo fora do contrato não vira lembrete: sem `data` no formato de dia, sem
 * `tarefas` em lista, ou com uma tarefa sem id, sem título ou com situação
 * desconhecida (inclusive "pendente", que não existe aqui), a leitura inteira
 * é recusada. Mostrar meia lista seria afirmar que o resto não existe.
 */

export const SITUACOES_DO_LEMBRETE: readonly SituacaoDoLembrete[] = ['atrasada', 'hoje', 'realizada_hoje'];

export class LembretesInvalidos extends Error {
  constructor() {
    super('A resposta do lembrete do dia não segue o contrato.');
    this.name = 'LembretesInvalidos';
  }
}

const DIA = /^\d{4}-\d{2}-\d{2}$/;

function lerTarefa(valor: unknown): LembreteDoDia | null {
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) return null;
  const { id, titulo, proxima_data, situacao } = valor as Record<string, unknown>;
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) return null;
  if (typeof titulo !== 'string' || titulo.trim() === '') return null;
  if (typeof proxima_data !== 'string' || !DIA.test(proxima_data)) return null;
  if (!SITUACOES_DO_LEMBRETE.includes(situacao as SituacaoDoLembrete)) return null;
  return { id, titulo, proxima_data, situacao: situacao as SituacaoDoLembrete };
}

/** O corpo da rota, ou `null` se ele não for o contrato. */
export function lerLembretes(dados: unknown): LembretesDoDia | null {
  if (dados === null || typeof dados !== 'object' || Array.isArray(dados)) return null;
  const { data, tarefas } = dados as Record<string, unknown>;
  if (typeof data !== 'string' || !DIA.test(data)) return null;
  if (!Array.isArray(tarefas)) return null;
  const lidas: LembreteDoDia[] = [];
  for (const tarefa of tarefas) {
    const lida = lerTarefa(tarefa);
    if (!lida) return null;
    lidas.push(lida);
  }
  return { data, tarefas: lidas };
}
