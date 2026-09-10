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

/**
 * Tudo que recebe foco por Tab dentro de `raiz`, em ordem de documento.
 *
 * Serve à armadilha de foco do modal, e por isso é mais larga que `CAMPOS`:
 * ali interessava onde o cursor deve POUSAR ao abrir; aqui interessa por onde
 * o Tab pode ANDAR, e isso inclui botão, link e qualquer coisa com `tabindex`.
 *
 * `[tabindex]:not([tabindex="-1"])` pega os focáveis feitos à mão — o painel
 * do modal tem `tabIndex={-1}` de propósito e fica de fora, que é o certo: ele
 * recebe foco programático quando não há campo, mas não deve entrar no ciclo
 * do Tab.
 */
const FOCAVEIS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Mantém o Tab dentro de `raiz`, dando a volta nas pontas.
 *
 * ── O defeito que isto conserta ──────────────────────────────────────
 *
 * O `Modal` PROMETIA armadilha de foco no próprio docblock — "o foco vai para
 * dentro ao abrir e volta para quem abriu ao fechar; **sem isso o Tab continua
 * andando pela página atrás do modal**" — e entregava só as duas pontas. Não
 * havia ciclo nenhum: bastavam alguns Tabs para o foco sair do modal e passear
 * pela barra lateral, pelos filtros e pelos cards atrás do véu, invisível,
 * enquanto o modal continuava aberto e `aria-modal="true"` dizia ao leitor de
 * tela que nada mais existia.
 *
 * É o pior tipo de defeito de acessibilidade: o comentário afirma que está
 * resolvido, então ninguém vai conferir.
 *
 * ── Por que não faz nada quando o foco está fora ─────────────────────
 *
 * A lista do `Seletor` vive num portal em `document.body`, FORA do painel. Com
 * ela aberta, o foco está legitimamente fora da raiz — e puxá-lo de volta
 * fecharia a lista no primeiro Tab de quem está escolhendo. O `Seletor` já
 * trata o Tab dele fechando a lista.
 *
 * Devolve `true` quando tratou a tecla, para quem chama saber se deve parar.
 */
export function prenderTab(e: KeyboardEvent, raiz: HTMLElement | null): boolean {
  if (e.key !== 'Tab' || !raiz) return false;
  if (!raiz.contains(document.activeElement)) return false;

  // SEM filtro de visibilidade, e isso foi uma correção.
  //
  // A primeira versão filtrava por `getClientRects().length > 0`, para pular
  // o que não está renderizado. Parece prudente e é uma armadilha: **o jsdom
  // não faz layout**, então lá toda caixa é vazia, a lista ficava com zero
  // elementos e a armadilha se desligava inteira — em teste, silenciosamente.
  //
  // O teste pegou (dois casos falharam na hora), e é por isso que ele existe.
  // Se a armadilha tivesse sido escrita sem teste, o filtro teria passado: no
  // navegador funcionava.
  //
  // Filtrar também não era necessário. `disabled` e `tabindex="-1"` já saem
  // pelo seletor, e o que está em `display: none` não pode ser `activeElement`
  // — logo nunca é a ponta de onde o ciclo parte. O `sr-only` do `Checkbox` é
  // `absolute` com 1px e É focável de propósito: um filtro por caixa o
  // excluiria do ciclo e deixaria a caixa de seleção inalcançável por Tab.
  const focaveis = Array.from(raiz.querySelectorAll<HTMLElement>(FOCAVEIS));

  if (focaveis.length === 0) return false;

  const primeiro = focaveis[0];
  const ultimo = focaveis[focaveis.length - 1];
  const atual = document.activeElement;

  if (e.shiftKey && atual === primeiro) {
    e.preventDefault();
    ultimo.focus();
    return true;
  }
  if (!e.shiftKey && atual === ultimo) {
    e.preventDefault();
    primeiro.focus();
    return true;
  }
  return false;
}
