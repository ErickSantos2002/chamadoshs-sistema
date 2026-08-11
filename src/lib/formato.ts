/**
 * Formatações de apresentação compartilhadas pelas telas.
 */

/**
 * Duração legível a partir de minutos.
 *
 * Mostra no máximo duas unidades: "13d 20h" e não "13d 20h 45m". Num card de
 * kanban a terceira unidade rouba espaço e não muda decisão nenhuma.
 *
 * A unidade menor some quando é zero — "33d", não "33d 0h".
 */
export function formatarDuracao(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined) return '—';

  const total = Math.max(0, Math.round(minutos));

  if (total < 60) return `${total}m`;

  const horas = Math.floor(total / 60);
  if (horas < 24) {
    const resto = total % 60;
    return resto === 0 ? `${horas}h` : `${horas}h ${resto}m`;
  }

  const dias = Math.floor(horas / 24);
  const restoHoras = horas % 24;
  return restoHoras === 0 ? `${dias}d` : `${dias}d ${restoHoras}h`;
}

/**
 * Iniciais para o avatar de quem é responsável.
 *
 * Primeiro e último nome — "Rickelme David" vira "RD". Nome único usa as duas
 * primeiras letras, para não sair um avatar com uma letra só e um traço, que
 * é o que acontece quando se assume que todo mundo tem sobrenome.
 *
 * Partículas ("de", "da", "dos") são ignoradas: "Erick dos Santos" é "ES", não
 * "ED".
 */
const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

export function iniciais(nome: string | null | undefined): string {
  if (!nome) return '?';

  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0 && !PARTICULAS.has(p.toLowerCase()));

  if (partes.length === 0) return '?';

  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }

  const primeira = partes[0][0];
  const ultima = partes[partes.length - 1][0];
  return (primeira + ultima).toUpperCase();
}
