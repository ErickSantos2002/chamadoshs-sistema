import { Chamado } from '../types/api';

/**
 * Quem pode apagar um chamado de vez, e qual.
 *
 * ── Por que a exclusão é mais restrita que tudo o mais ────────────────
 *
 * É a única ação do sistema sem volta. Cancelar tem `desarquivar` como
 * espelho? Não — nem isso: cancelar não tem inverso nenhum na API. Mas ao
 * menos preserva o chamado, e é isso que o modal de cancelamento promete a
 * quem clica: "o chamado não será excluído". Arquivar tem `desarquivar`.
 * Mudar status se desfaz mudando de novo.
 *
 * Excluir apaga o chamado e leva junto tudo que pendurava nele — comentários,
 * histórico, anexos. Não há tela por onde chegar no que sobrar.
 *
 * ── As duas condições, e o motivo de cada uma ─────────────────────────
 *
 * ADMINISTRADOR. Técnico cancela e arquiva, que são as ações reversíveis. A
 * que não é fica com quem responde pelo sistema. E há um motivo prático além
 * do princípio: não dá para verificar daqui se a API restringe o DELETE a
 * administrador. Sendo o front mais estrito que o back, ninguém encontra um
 * botão que responde 403 — o contrário é que machucaria.
 *
 * FORA DO FLUXO. O chamado ativo é trabalho de alguém e não deve sumir com
 * dois cliques. Quem quer apagar um chamado vivo cancela primeiro, e esse
 * cancelamento fica registrado com motivo e autor. A exclusão vira o passo
 * seguinte de uma decisão já tomada, nunca o primeiro impulso.
 *
 * ── Por que isto é uma função, e não um `&&` no meio do JSX ───────────
 *
 * Porque o sistema já mostra o que acontece com a alternativa: a regra de "não
 * agir em chamado fora do fluxo" existe duas vezes — em `AcoesRapidas` e no
 * `getBotoesAcao` da página de detalhes — e só uma das cópias foi mantida. A
 * página continua oferecendo transições em chamado cancelado. Uma regra que
 * apaga dados não pode entrar nessa armadilha.
 */
export function podeExcluir(
  chamado: Pick<Chamado, 'cancelado' | 'arquivado'>,
  role: string | undefined
): boolean {
  if (role !== 'Administrador') return false;

  return chamado.cancelado || chamado.arquivado;
}

/**
 * O protocolo digitado no modal bate com o do chamado?
 *
 * É a trava que libera o botão de excluir. Mora aqui, e não num `===` no meio
 * do JSX, por um motivo concreto: escrita inline, a comparação era
 * `digitado.trim().toUpperCase() === (chamado?.protocolo ?? '').trim().toUpperCase()`,
 * e com `chamado` nulo virava `'' === ''` — verdadeiro. O botão só não abria
 * porque o modal não chega a renderizar sem chamado. Uma trava de exclusão que
 * depende de outra condição para não falhar não é uma trava.
 *
 * `trim` e caixa alta dos dois lados: o protocolo aparece na tela em
 * maiúsculas, e reprovar quem digitou minúsculo não protege dado nenhum — só
 * ensina a pessoa a copiar e colar, que é o gesto automático que esta trava
 * existe para impedir.
 */
export function confirmacaoConfere(
  digitado: string,
  protocolo: string | undefined
): boolean {
  const alvo = (protocolo ?? '').trim();
  const resposta = digitado.trim();

  // Vazio nunca confere, dos dois lados. Sem isto, chamado sem protocolo mais
  // campo em branco liberaria a exclusão.
  if (!alvo || !resposta) return false;

  return resposta.toUpperCase() === alvo.toUpperCase();
}
