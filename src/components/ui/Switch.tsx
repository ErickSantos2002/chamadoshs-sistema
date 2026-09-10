import React from 'react';
import { cn } from '../../lib/utils';

interface SwitchProps {
  ligado: boolean;
  aoMudar: (ligado: boolean) => void;
  /** O texto ao lado. É ele que dá nome ao controle. */
  children?: React.ReactNode;
  desabilitado?: boolean;
  id?: string;
  className?: string;
}

/**
 * Interruptor de duas posições.
 *
 * Liga na hora, sem botão de salvar — é o que o separa do `Checkbox`, que só
 * vale depois do Salvar. Usar um no lugar do outro é prometer à pessoa um
 * comportamento que não vai acontecer.
 *
 * ── AINDA SEM CONSUMIDOR, e isso é deliberado ────────────────────────
 *
 * Hoje nenhuma tela usa este componente, e o único controle do sistema com
 * cara de interruptor — o "Modo escuro" do menu do usuário — **não é um caso
 * dele**: ali a linha inteira do menu já é o controle, com
 * `role="menuitemcheckbox"`, e o desenho ao lado é decoração. Pôr este `Switch`
 * lá significaria um `<input>` dentro de um `<button>`, que é HTML inválido, e
 * dois controles para uma ação só.
 *
 * Fica escrito porque um primitivo sem uso costuma ser esquecimento, e este
 * não é: a Fase 8 pede o interruptor, e a primeira tela que precisar de um
 * liga/desliga fora de menu — nas Fases 11–16 — encontra a decisão pronta, com
 * o foco que o pacote não mostra e o botão no token certo.
 *
 * ── `role="switch"` no input, e não `aria-pressed` num botão ─────────
 *
 * Os dois são defensáveis, e o pacote escolheu o input com `role="switch"`.
 * A diferença prática é o que o leitor de tela diz: com `switch` ele anuncia
 * "ligado"/"desligado", que é o vocabulário do controle; com `aria-pressed`
 * anuncia "pressionado", que é o de um botão que ficou apertado.
 *
 * ── O foco, que o `Switch.jsx` do pacote não mostra ──────────────────
 *
 * Lá o input é `position:absolute; width:1; height:1; opacity:0` e nada reage
 * ao foco dele — quem navega por teclado chega no interruptor e não vê onde
 * está. Aqui o input é `peer` e o trilho desenha o anel de `--focus-ring`,
 * como o `Button` e os campos. Mesmo conserto do `Checkbox` daqui.
 *
 * ── O trilho e o botão, medidos ──────────────────────────────────────
 *
 * Ligado, o trilho é `--action` e o botão é `--text-on-primary`: 5,29:1 no
 * claro e 5,11:1 no escuro. **Branco cravado daria 2,69:1 no escuro** — é a
 * regra permanente que a emenda E7-b fechou, e a bolinha do `Switch.jsx` do
 * pacote foi uma das seis aparições dela.
 *
 * Desligado, o trilho é `--surface-elevated` com contorno `--border-control`.
 * O contorno é o que faz o trilho existir: sem ele, um trilho quase da cor do
 * fundo com um botão claro em cima não se lê como controle nenhum.
 *
 * Em VALOR ARBITRÁRIO e não por classe utilitária, pela regra (d) do D8-a:
 * abaixo do piso do `color-mix` a classe cairia para transparente, e um
 * interruptor sem trilho perde o estado — com o botão à esquerda e sem trilho,
 * ninguém sabe se está desligado ou quebrado.
 */
export const Switch: React.FC<SwitchProps> = ({
  ligado,
  aoMudar,
  children,
  desabilitado = false,
  id,
  className,
}) => (
  <label
    className={cn(
      'inline-flex items-center gap-3 text-sm text-conteudo-suave',
      desabilitado ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      className
    )}
  >
    <span className="relative inline-block h-5 w-9 shrink-0">
      {/* Primeiro no DOM: `peer` só alcança irmão posterior. */}
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={ligado}
        disabled={desabilitado}
        onChange={(e) => aoMudar(e.target.checked)}
      />

      {/* Trilho */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-0 rounded-full border transition-colors',
          ligado
            ? 'border-[var(--action)] bg-[var(--action)]'
            : 'border-borda-control bg-superficie-elevada',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--focus-ring)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-superficie'
        )}
      />

      {/* Botão */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-[var(--text-on-primary)] shadow transition-transform',
          ligado ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </span>

    {children && <span>{children}</span>}
  </label>
);

export default Switch;
