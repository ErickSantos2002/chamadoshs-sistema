import React from 'react';
import { cn } from '../../lib/utils';

export type PaddingDoCard = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /**
   * O respiro interno, com os valores de `DS/components/core/Card.jsx`:
   * `none` 0 · `sm` 12px · `md` 16px (padrão) · `lg` 24px.
   *
   * `none` é para card que contém tabela ou lista sangrando até a borda — a
   * própria linha desenha o espaçamento dela, e um padding aqui criaria uma
   * calha da cor do card em volta da tabela.
   */
  padding?: PaddingDoCard;
  /** Deixa o card clicável, com realce no hover. */
  onClick?: () => void;
}

const PADDING: Record<PaddingDoCard, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

/**
 * O padding do `Card` mais próximo acima. `null` fora de qualquer card.
 *
 * Existe para o `CardBody` conseguir avisar quando o respiro vai dobrar. Um
 * comentário no arquivo não alcança quem compõe as duas peças em telas
 * diferentes — e são onze telas para migrar nas Fases 11–16, cada uma num
 * commit próprio, escritas por quem não vai reler este arquivo antes.
 *
 * Contexto, e não uma checagem de `children`: o `CardBody` raramente é filho
 * DIRETO do card. Ele costuma vir embrulhado por um `<div>` de layout, por um
 * `map`, ou por um componente da própria tela — e nenhum desses casos apareceria
 * numa inspeção de `React.Children`. O contexto atravessa todos.
 */
const PaddingDoCardContext = React.createContext<PaddingDoCard | null>(null);

/**
 * Superfície padrão: card, painel, coluna do kanban.
 *
 * Existe para as telas pararem de repetir a mesma pilha de dez classes com
 * hexadecimal cravado — que é de onde vêm as divergências de tom entre uma
 * tela e outra hoje.
 *
 * ── Quem paga o padding ───────────────────────────────────────────────
 *
 * O CARD paga, e é ele que o `padding` controla. Antes desta fase o Card não
 * tinha padding nenhum e o `CardHeader` trazia o próprio `px-5 py-4`, o que
 * obrigava toda composição a saber onde o respiro morava.
 *
 * A §7.2 diz que o `CardHeader` tem `padding-x --space-5`; o `Card.jsx` do
 * pacote não põe padding horizontal nenhum nele. **A implementação vence**,
 * pela §2.1 e pelo precedente que a emenda E2 abriu — a §7.2 também estava
 * desatualizada nos degraus de `danger` e `success`, e perdeu para o `.jsx`.
 *
 * Então o cabeçalho vive DENTRO do padding do card e só desenha a régua
 * embaixo de si (`pb-4 mb-4 border-b`).
 *
 * O `CardBody` é a exceção que confirma: ele tem padding próprio
 * (`--space-4 --space-5`) e existe para o caso `padding="none"`, onde o card
 * não paga nada e cada bloco paga o seu. Usar `CardBody` dentro de um card com
 * padding dobra o respiro — é um ou outro, nunca os dois.
 */
export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = 'md',
  onClick,
}) => {
  const clicavel = onClick !== undefined;

  const conteudo = cn(
    'relative rounded-xl border border-borda bg-superficie transition-colors',
    PADDING[padding],
    clicavel &&
      // O anel de foco sai de `--focus-ring`, como o do Button, e tem 2px com
      // deslocamento — era `ring-1` sem cor declarada, que herdava o azul
      // padrão do Tailwind e não o token.
      'w-full cursor-pointer text-left hover:border-sinal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-superficie',
    className
  );

  // O padding desce para quem estiver dentro, em qualquer profundidade. É o que
  // permite ao `CardBody` reclamar quando o respiro vai dobrar.
  const corpo = (
    <PaddingDoCardContext.Provider value={padding}>
      {children}
    </PaddingDoCardContext.Provider>
  );

  // Card clicável vira <button> de verdade, não <div onClick>: assim recebe
  // foco, responde a Enter e Espaço, e é anunciado como interativo.
  if (clicavel) {
    return (
      <button type="button" onClick={onClick} className={conteudo}>
        {corpo}
      </button>
    );
  }

  return <div className={conteudo}>{corpo}</div>;
};

/** Título de card: 16px semibold em `--text-heading`. */
export const CardTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <h3 className={cn('text-base font-semibold text-conteudo', className)}>
    {children}
  </h3>
);

interface CardHeaderProps {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  acao?: React.ReactNode;
  className?: string;
}

/**
 * Cabeçalho de card: título, descrição opcional e uma ação à direita.
 *
 * Sem padding horizontal próprio — ver a nota no `Card`. A régua embaixo é
 * `border-b`, e o `mb-4` a separa do conteúdo com o mesmo `--space-4` que o
 * card usa por dentro.
 */
export const CardHeader: React.FC<CardHeaderProps> = ({
  titulo,
  descricao,
  acao,
  className,
}) => (
  <div
    className={cn(
      'flex items-start justify-between gap-4 border-b border-borda pb-4 mb-4',
      className
    )}
  >
    <div>
      <CardTitle>{titulo}</CardTitle>
      {descricao && (
        <p className="mt-0.5 text-sm text-conteudo-tenue">{descricao}</p>
      )}
    </div>
    {acao}
  </div>
);

/**
 * Bloco com respiro próprio, para o card `padding="none"`.
 *
 * Não usar dentro de card com padding: o respiro dobra — 16px do card mais
 * 16px/20px daqui, e o conteúdo encolhe sem que ninguém tenha pedido. Em
 * desenvolvimento, a combinação errada reclama no console.
 *
 * O aviso some do pacote publicado: `import.meta.env.DEV` vira `false` literal
 * no build e o Vite remove o bloco inteiro. Não é `throw` de propósito —
 * respiro dobrado é feio, não é quebra, e derrubar a tela de quem está
 * migrando seria uma punição maior que o defeito.
 */
export const CardBody: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const paddingDoCard = React.useContext(PaddingDoCardContext);

  if (
    import.meta.env.DEV &&
    paddingDoCard !== null &&
    paddingDoCard !== 'none'
  ) {
    console.error(
      `[Card] CardBody dentro de um Card com padding="${paddingDoCard}": ` +
        'o respiro dobra. Ou o Card leva padding="none" e cada bloco paga o ' +
        'seu, ou o Card paga e o CardBody sai. Nunca os dois.'
    );
  }

  return <div className={cn('px-5 py-4', className)}>{children}</div>;
};

export default Card;
