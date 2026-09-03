import React from 'react';
import { cn } from '../../lib/utils';

interface CheckboxProps {
  marcado: boolean;
  aoMudar: (marcado: boolean) => void;
  /** O texto ao lado. É ele que dá nome ao controle. */
  children: React.ReactNode;
  /** Segunda linha, menor, abaixo do rótulo. */
  dica?: React.ReactNode;
  /**
   * Estado misto — nem marcado nem desmarcado.
   *
   * Para "marcar todos" quando só alguns filhos estão marcados. Ler a nota
   * sobre o DOM abaixo antes de usar.
   */
  misto?: boolean;
  desabilitado?: boolean;
  id?: string;
  className?: string;
}

/**
 * Caixa de seleção.
 *
 * Vale depois do Salvar e aceita várias por grupo — é o que a separa do
 * `Switch`, que liga na hora.
 *
 * ── O input é escondido, e a caixa é desenhada ────────────────────────
 *
 * É o padrão do `Checkbox.jsx` do pacote, e a razão é que o `<input>` nativo
 * quase não aceita estilo. O input continua lá, recebendo clique, teclado e
 * leitor de tela; o que se vê é o `<span>` ao lado.
 *
 * ── O que este consertou em relação ao do pacote: O FOCO ──────────────
 *
 * No `Checkbox.jsx` o input é `position:absolute; width:1; height:1;
 * opacity:0`, e **nada no componente reage ao foco dele**. Quem navega por
 * teclado chega na caixa e não vê onde está — o único indicador possível
 * seria o contorno do próprio input, que tem um pixel e é transparente.
 *
 * Aqui o input é `peer`, e a caixa desenha o anel:
 * `peer-focus-visible:ring-2` em `--focus-ring`. Mesmo anel do `Button`, do
 * `Card` e dos campos.
 *
 * `focus-visible` e não `focus`: quem clica com o mouse não precisa do anel, e
 * numa lista de caixas ele piscaria a cada clique.
 *
 * Levado à sessão do HelpHS como candidato a emenda do pacote.
 *
 * ── O estado misto precisa ser MARCADO, e não só desenhado ────────────
 *
 * `indeterminate` não é atributo de HTML: não existe `<input indeterminate>`.
 * Só se marca por PROPRIEDADE, no elemento, o que em React exige um `ref` e um
 * efeito. O `Checkbox.jsx` do pacote desenha o traço do estado misto e não
 * marca a propriedade — então quem usa leitor de tela ouve "não marcado", que
 * é a informação errada.
 *
 * **O desenho certo com o anúncio errado é pior que não ter o estado**, porque
 * parece resolvido. O aviso veio da sessão do HelpHS, que tropeçou nisso.
 *
 * Não se acrescenta `aria-checked="mixed"` junto: o navegador já expõe
 * "mixed" a partir da propriedade, e sobrepor ARIA à semântica nativa de um
 * controle é justamente o que a especificação de ARIA in HTML desaconselha.
 * Uma fonte, não duas.
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  marcado,
  aoMudar,
  children,
  dica,
  misto = false,
  desabilitado = false,
  id,
  className,
}) => {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = misto;
  }, [misto]);

  return (
    <label
      className={cn(
        'inline-flex items-start gap-2 text-sm text-conteudo-suave',
        desabilitado ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className
      )}
    >
      {/* Primeiro no DOM porque `peer` só alcança irmão POSTERIOR. A ordem
          visual não muda: o input não ocupa espaço. */}
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="peer sr-only"
        checked={marcado}
        disabled={desabilitado}
        onChange={(e) => aoMudar(e.target.checked)}
      />

      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
          // O contorno de repouso é `--border-control`, o degrau da E7: a caixa
          // é um CONTROLE, e o separador de superfície dava 1,23:1 contra a
          // página. Piso de 3:1 aqui, não 4,5 — não é texto.
          marcado || misto
            ? 'border-sinal bg-sinal'
            : 'border-borda-control bg-superficie',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--focus-ring)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-superficie'
        )}
      >
        {misto ? (
          // O traço do estado misto. `--text-on-primary` e não branco cravado:
          // o fundo aqui é `--action`, o único do pacote que troca de degrau
          // por tema, e branco sobre ele dá 2,69:1 no escuro. É a regra
          // permanente que a emenda E7-b fechou, em seis aparições.
          <span className="h-0.5 w-2 rounded-sm bg-[var(--text-on-primary)]" />
        ) : marcado ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-on-primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        ) : null}
      </span>

      <span>
        {children}
        {dica && (
          <span className="mt-0.5 block text-xs text-conteudo-tenue">{dica}</span>
        )}
      </span>
    </label>
  );
};

export default Checkbox;
