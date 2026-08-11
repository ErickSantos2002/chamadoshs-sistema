/**
 * Conversão dos prazos de SLA, que a API guarda em minutos úteis.
 *
 * "Útil" aqui é o expediente que o motor de SLA do backend realmente usa:
 * segunda a sexta, 08h–12h e 13h–17h. São 480 minutos por dia, e o intervalo
 * do almoço não conta — um chamado aberto às 11h30 com prazo de 1h vence às
 * 13h30, não às 12h30.
 *
 * Manter esse número em um lugar só importa: se o expediente mudar no backend,
 * o texto da tela precisa mudar junto, senão a interface passa a prometer um
 * prazo diferente do que o sistema cobra — que é exatamente o defeito que
 * encontramos no HelpHS.
 */
export const MINUTOS_POR_DIA_UTIL = 480;

export const EXPEDIENTE = 'seg a sex, 08h–12h e 13h–17h';

/**
 * Prazo legível a partir de minutos úteis.
 *
 * Usa dia útil como unidade a partir de um dia inteiro, porque é assim que a
 * equipe fala: "dois dias" comunica melhor que "960 minutos" ou "16 horas".
 */
export function formatarPrazo(minutos: number): string {
  if (!Number.isFinite(minutos) || minutos <= 0) return '—';

  const arredondado = Math.round(minutos);

  if (arredondado < 60) {
    return `${arredondado} min`;
  }

  if (arredondado < MINUTOS_POR_DIA_UTIL) {
    const horas = Math.floor(arredondado / 60);
    const resto = arredondado % 60;
    return resto === 0 ? `${horas}h` : `${horas}h ${resto}min`;
  }

  const dias = Math.floor(arredondado / MINUTOS_POR_DIA_UTIL);
  const resto = arredondado % MINUTOS_POR_DIA_UTIL;
  const rotuloDias = `${dias} ${dias === 1 ? 'dia útil' : 'dias úteis'}`;

  if (resto === 0) return rotuloDias;

  const horas = Math.floor(resto / 60);
  const minutosRestantes = resto % 60;

  if (horas === 0) return `${rotuloDias} e ${minutosRestantes}min`;
  if (minutosRestantes === 0) return `${rotuloDias} e ${horas}h`;
  return `${rotuloDias} e ${horas}h ${minutosRestantes}min`;
}
