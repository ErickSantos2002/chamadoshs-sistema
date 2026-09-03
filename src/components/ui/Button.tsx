import React from 'react';
import { cn } from '../../lib/utils';

export type VarianteBotao =
  | 'primario'
  | 'secundario'
  | 'sucesso'
  | 'perigo'
  | 'fantasma';
export type TamanhoBotao = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  carregando?: boolean;
}

const VARIANTES: Record<VarianteBotao, string> = {
  // A cor de ação do design system (`--action` = `--sinal`).
  //
  // A cor do texto sai do token `--text-on-primary`, e não de um par
  // `text-white dark:…` escrito aqui. Foi o desvio D5-a, e ele ENCERROU em
  // 02/09/2026: o token era declarado só em `:root`, como branco, e não era
  // redefinido no `.dark` — no escuro `--action` é `#47A6E1` e branco sobre
  // ele dá 2,69:1, que reprova AA. A emenda E1 do pacote corrigiu na raiz.
  //
  // Medido nos quatro estados, depois da emenda:
  //
  //   claro  repouso 5,29:1   hover 4,53:1
  //   escuro repouso 5,11:1   hover 6,19:1
  //
  // O desvio local dava mais no escuro (6,47 e 7,83), mas a seção 2.1 é clara:
  // token vence componente. Os dois passam, e o do pacote mantém a família
  // azul do botão em vez de pintar o texto com a cor de fundo da página.
  //
  // ATENÇÃO ao 4,53:1 do hover no tema claro: é 0,03 acima do piso. Não é
  // novo — já era assim antes desta troca —, mas é o número que quebra
  // primeiro se alguém mexer no `brightness-110` ou no degrau de `--sinal`.
  //
  // Em valor arbitrário, e não por classe utilitária, pelo mesmo motivo da
  // regra (d) do D8-a: a classe passaria pelo `color-mix`, e abaixo do piso
  // de navegador `color` cai para `inherit` — texto escuro sobre botão azul.
  primario:
    'bg-sinal text-[var(--text-on-primary)] hover:brightness-110',
  secundario:
    'bg-superficie-elevada text-conteudo border border-borda hover:bg-borda',
  // Para concluir algo — registrar execução, marcar como feito. É o mesmo verde
  // de "no prazo" e "resolvido": a cor já carrega esse significado no sistema.
  //
  // ── Por que o degrau NÃO é o 500 ──────────────────────────────────────
  //
  // Era `bg-sucesso` e `bg-perigo`, que são o degrau 500 da rampa, com texto
  // branco. Medido: **2,54:1** no verde e **3,76:1** no vermelho — os dois
  // reprovam a §21, nos DOIS temas. Um botão que apaga alguma coisa não pode
  // ter o rótulo ilegível.
  //
  // Não é defeito daqui: `DS/components/core/Button.jsx` mandava a mesma coisa,
  // e a emenda E2 do pacote criou os degraus de AÇÃO que faltavam, do mesmo
  // jeito que `--action` já existia separado de `--color-primary-500`. Medido
  // depois, com os tokens da E2:
  //
  //   perigo   repouso 4,83:1   hover 6,47:1
  //   sucesso  repouso 5,48:1   hover 7,68:1
  //
  // Em valor arbitrário pelo motivo da regra (d) do D8-a: abaixo do piso de
  // navegador a classe utilitária cairia para transparente, e um botão de
  // apagar invisível é pior do que um mal contrastado.
  //
  // ── O que este conserto NÃO alcança ───────────────────────────────────
  //
  // Seis botões não passam por aqui: são `<button>` escritos à mão, com
  // `bg-sucesso`/`bg-perigo` e texto branco, e continuam nos 2,54:1 e 3,76:1
  // que este componente acabou de deixar para trás —
  // `ChamadoDetalhes.tsx:726, :762, :1285, :1356, :1432` e
  // `cadastros/CategoriasTab.tsx:324`.
  //
  // É código de PÁGINA, que a §25 põe nas Fases 11–16, e por isso não entra
  // nesta fase. Fica escrito aqui para ninguém ler "botão semântico
  // corrigido" e concluir que o sistema inteiro está: corrigir o primitivo
  // não alcança quem não o usa.
  sucesso:
    'bg-[var(--action-success)] text-[var(--text-on-success)] hover:bg-[var(--action-success-hover)]',
  perigo:
    'bg-[var(--action-danger)] text-[var(--text-on-danger)] hover:bg-[var(--action-danger-hover)]',
  fantasma: 'text-conteudo-suave hover:bg-superficie-elevada',
};

const TAMANHOS: Record<TamanhoBotao, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

/**
 * Botão.
 *
 * `carregando` desabilita junto: um botão que mostra spinner mas continua
 * clicável é como se envia o mesmo formulário duas vezes.
 *
 * O foco é `focus-visible` e não `focus`, para o anel não piscar em quem
 * usa mouse — mas continuar aparecendo para quem navega por teclado.
 */
export const Button: React.FC<ButtonProps> = ({
  variante = 'primario',
  tamanho = 'md',
  carregando = false,
  disabled,
  className,
  children,
  ...resto
}) => (
  <button
    disabled={disabled || carregando}
    aria-busy={carregando || undefined}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
      'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      // O anel de foco é UM só, e não um por variante.
      //
      // Cada variante trazia a própria cor, e três das cinco eram invisíveis.
      // Medido contra o `ring-offset-superficie` que esta mesma linha declara,
      // claro | escuro:
      //
      //   ring-borda    1,23:1 | 1,39:1   secundário e fantasma — 27 dos 51 usos
      //   ring-sucesso  2,54:1 | 6,30:1   reprovava no claro
      //   ring-perigo   3,76:1 | 4,25:1   passava raspando
      //   ring-sinal    5,29:1 | 5,95:1   só o primário estava certo
      //
      // O piso de indicador de foco é 3:1 — é elemento não textual, e a §21 o
      // exige visível. `--focus-ring` é o token que o pacote reserva para
      // exatamente isto, dá 5,29:1 e 5,95:1, e é o mesmo nas cinco variantes:
      // quem navega por teclado não deveria descobrir o botão pela cor dele.
      //
      // Em valor arbitrário pela regra (d) do D8-a: anel de foco que cai para
      // transparente abaixo do piso de navegador é perda de função, não de
      // acabamento — some a única pista de onde o teclado está.
      'focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-superficie',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      VARIANTES[variante],
      TAMANHOS[tamanho],
      className
    )}
    {...resto}
  >
    {carregando && (
      // Anel PRÓPRIO, e não o `Spinner` do kit — de propósito.
      //
      // O `Button.jsx` do pacote faz exatamente isto: desenha o anel inline em
      // `0.875rem` (14px) em vez de usar o `Spinner.jsx`, que só tem 16, 24 e
      // 32. Um anel de 16px num botão `sm`, que tem 12px de texto, fica maior
      // que a letra ao lado.
      //
      // `aria-hidden` porque o botão já se anuncia: ele tem texto, e
      // `aria-busy` acima diz que está ocupado. Um `role="status"` aqui faria
      // o leitor ler "Carregando..." por cima do rótulo do próprio botão.
      <span
        aria-hidden="true"
        className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
    )}
    {children}
  </button>
);

export default Button;
