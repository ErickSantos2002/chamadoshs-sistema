/**
 * Quem recebe o foco quando um modal abre.
 *
 * ── Por que não serve pegar o primeiro focável ────────────────────────
 *
 * Era o que o Modal fazia: `querySelector('input, select, textarea, button,
 * ...')`. O `querySelector` devolve o primeiro em ORDEM DE DOCUMENTO, e no
 * modal o cabeçalho vem antes do corpo — então o primeiro focável é sempre o
 * botão de fechar.
 *
 * O efeito prático é uma armadilha: o modal abre com o foco no X, e quem
 * confia no teclado e aperta Enter fecha a janela que acabou de abrir, em vez
 * de preencher o formulário.
 *
 * ── Por que o painel, e não o botão de ação, quando não há campo ──────
 *
 * Um modal de confirmação — "excluir este usuário?" — não tem campo. Focar o
 * botão de confirmar ali transforma um Enter distraído numa exclusão. O
 * painel recebe o foco, o leitor de tela anuncia o título, e a pessoa escolhe.
 */

/** Campos que aceitam digitação ou escolha, e estão realmente disponíveis. */
const CAMPOS = [
  'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
].join(', ');

/**
 * Primeiro campo preenchível dentro de `raiz`, ou `null` se não houver.
 *
 * Campos ocultos por `type="hidden"` e desabilitados ficam de fora: focar um
 * campo que a pessoa não consegue ver ou usar é o mesmo que não focar nada,
 * com a diferença de que o cursor some.
 */
export function primeiroCampoFocavel(raiz: HTMLElement | null): HTMLElement | null {
  if (!raiz) return null;

  const campo = raiz.querySelector<HTMLElement>(CAMPOS);
  if (!campo) return null;

  // `type="radio"` e `checkbox` são campos, mas focar o primeiro rádio de um
  // grupo move a seleção com as setas antes de a pessoa entender onde está.
  // Deixa passar mesmo assim: é melhor que focar o botão de fechar, e nenhum
  // formulário do sistema começa por um grupo de rádio hoje.
  return campo;
}
