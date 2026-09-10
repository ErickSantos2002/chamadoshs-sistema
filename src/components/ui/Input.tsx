import React from 'react';
import { cn } from '../../lib/utils';
import { FORMA_DE_CAMPO } from './Campo';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Ícone à esquerda, dentro do campo. */
  icone?: React.ReactNode;
}

/**
 * `forwardRef` porque a `ref` precisa chegar ao `<input>`.
 *
 * Sem ela era impossivel mandar o foco ao primeiro campo com erro depois de
 * uma submissao recusada — e, coerentemente, isso nao existia em lugar nenhum:
 * havia tres `.focus()` em todo o `src`, os tres de navegacao.
 *
 * A varredura da Fase 8 registrou a falta e nao a corrigiu ali, porque sem
 * consumidor seria API especulativa. O consumidor chegou: e o `Campo`, no
 * template de formulario da Fase 11.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ icone, className, ...resto }, ref) => (
  <div className="relative">
    {icone && (
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-conteudo-tenue"
        aria-hidden="true"
      >
        {icone}
      </span>
    )}
    <input
      ref={ref}
      className={cn(
        // A forma do campo no HelpHS: canto de 8px, fundo da própria
        // superfície e um anel de 2px no foco.
        //
        // O fundo era recuado (`superficie-base`), para o campo se distinguir
        // do painel sem depender da borda. Com a paleta nova esse recuo deixou
        // de comprar quase nada — #F8FAFC contra #FFFFFF é 1,05:1 — e quem
        // passou a carregar a distinção é o anel de foco, que dobrou de
        // espessura e é o que de fato importa para quem navega por teclado.
        FORMA_DE_CAMPO,
        'py-2',
        icone ? 'pl-9 pr-3' : 'px-3',
        className
      )}
      {...resto}
    />
  </div>
  )
);

Input.displayName = 'Input';

export default Input;
