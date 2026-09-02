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
    'bg-sinal text-[var(--text-on-primary)] hover:brightness-110 focus-visible:ring-sinal',
  secundario:
    'bg-superficie-elevada text-conteudo border border-borda hover:bg-borda focus-visible:ring-borda',
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
  // O anel de foco de cada variante fica como está NESTE commit e sai no
  // seguinte: medido, `ring-sucesso` dá 2,54:1 e `ring-borda` 1,23:1 contra o
  // próprio `ring-offset`, e o piso de indicador de foco é 3:1. É defeito de
  // outro assunto — cor de foco, não cor de ação — e vai num commit próprio.
  //
  // Em valor arbitrário pelo motivo da regra (d) do D8-a: abaixo do piso de
  // navegador a classe utilitária cairia para transparente, e um botão de
  // apagar invisível é pior do que um mal contrastado.
  sucesso:
    'bg-[var(--action-success)] text-[var(--text-on-success)] hover:bg-[var(--action-success-hover)] focus-visible:ring-sucesso',
  perigo:
    'bg-[var(--action-danger)] text-[var(--text-on-danger)] hover:bg-[var(--action-danger-hover)] focus-visible:ring-perigo',
  fantasma: 'text-conteudo-suave hover:bg-superficie-elevada focus-visible:ring-borda',
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
      'focus-visible:ring-offset-superficie',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      VARIANTES[variante],
      TAMANHOS[tamanho],
      className
    )}
    {...resto}
  >
    {carregando && (
      <span
        aria-hidden="true"
        className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
    )}
    {children}
  </button>
);

export default Button;
