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
  // A cor de sinal, que é o azul da marca. O texto NÃO é branco nos dois
  // temas: sobre o sinal claro do tema escuro, branco dá 2,69:1 e reprova.
  // Escurecendo o texto ali, vai a 7,05:1.
  // O gradiente é um véu branco de 10% por cima do preenchimento sólido, não
  // uma segunda cor: dá o relevo de um botão físico sem inventar um token de
  // "sinal claro" que precisaria ser validado à parte.
  primario:
    'bg-sinal bg-gradient-to-b from-white/10 to-transparent text-white dark:text-superficie-base hover:brightness-110 focus-visible:ring-sinal',
  secundario:
    'bg-superficie-elevada text-conteudo border border-borda hover:bg-borda-suave focus-visible:ring-borda',
  // Para concluir algo — registrar execução, marcar como feito. É o mesmo verde
  // de "no prazo" e "resolvido": a cor já carrega esse significado no sistema.
  sucesso: 'bg-sucesso text-white hover:bg-sucesso-forte focus-visible:ring-sucesso',
  perigo: 'bg-perigo text-white hover:bg-perigo-forte focus-visible:ring-perigo',
  fantasma: 'text-conteudo-suave hover:bg-superficie-elevada focus-visible:ring-borda',
};

const TAMANHOS: Record<TamanhoBotao, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
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
