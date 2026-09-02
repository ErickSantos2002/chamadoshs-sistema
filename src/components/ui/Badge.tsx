import React from 'react';
import { cn } from '../../lib/utils';

export type VarianteBadge =
  | 'neutro'
  | 'info'
  | 'sucesso'
  | 'alerta'
  | 'perigo';

interface BadgeProps {
  variante?: VarianteBadge;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

/**
 * Selo de estado.
 *
 * O fundo é a cor de significado translúcida e o texto é o par `on-tint` dela,
 * do design system. Funciona nos dois temas sem `dark:` por dois motivos que
 * se somam: o fundo translúcido pega o tom da superfície embaixo, e
 * `--on-tint-*` já troca de degrau sozinho — 700 no claro, 400 no escuro.
 *
 * Eram quatro pares `text-X-forte dark:text-X-suave` escritos à mão, com
 * exatamente esses valores. O token faz a mesma coisa e não pode ficar para
 * trás quando alguém acrescentar uma variante.
 *
 * ── Fase 7: a tinta passa a ser a do pacote ──────────────────────────
 *
 * O fundo era a cor cheia da ponte a 20% (`bg-info/20`). Agora é o alias
 * `--tint-*`, que é a mesma cor a 15% — e é alias JUSTAMENTE para não se
 * escrever a opacidade à mão: pela regra (a) do D8-a, modificador nesses
 * tokens multiplica em vez de definir, e `validar:paleta` derruba o build
 * se alguém tentar.
 *
 * Medido em todas as combinações reais (quatro variantes × três superfícies ×
 * dois temas): a troca MELHORA as 24, entre 0,2 e 0,7 ponto. Amostra, claro
 * sobre `--surface`: info 5,31 → 5,64, sucesso 4,54 → 4,76, alerta
 * 6,08 → 6,32, perigo 4,97 → 5,32.
 *
 * A composição do alfa é feita em ponto flutuante, sem arredondar por canal —
 * é o que o navegador faz, e é o método que a sessão do HelpHS usa, para os
 * números dos dois repositórios serem comparáveis. Arredondando para inteiro
 * a diferença fica em até 0,02 e não muda veredito nenhum; fica dito porque
 * uma tabela de contraste sem o método é um número sem procedência.
 *
 * ── Três casos continuam reprovando, e o defeito é do pacote ─────────
 *
 * Sobre `--surface-elevated`, mesmo depois da troca:
 *
 *   claro   sucesso  4,39:1
 *   escuro  info     4,40:1
 *   escuro  perigo   4,38:1
 *
 * Não é teórico: `ChamadoModal.tsx:356` põe os selos de status, prioridade e
 * "Cancelado" DENTRO de um `<aside>` `bg-superficie-elevada` — a tela mais
 * usada do sistema.
 *
 * A causa é a mesma da emenda E2, que mediu `--on-tint-warning` nas TRÊS
 * superfícies e o levou ao degrau 800 por causa disso. Os pares de
 * `success`, `info` e `danger` não receberam a mesma medição. Levado ao
 * operador como candidato a emenda do pacote — não se conserta aqui, porque
 * consertar local recria o desvio que a E2 acabou de eliminar.
 *
 * ── A variante `neutro` mantém o texto local, e isso é medido ────────
 *
 * O fundo passa a se chamar `bg-tint-neutral`, que é MESMO valor de
 * `--surface-elevated` — renomear, não repintar. Mas o texto continua em
 * `--text-body` (`conteudo-suave`) e não em `--on-tint-neutral`: medido,
 * 13,35:1 contra 6,92:1 no claro e 10,99:1 contra 5,29:1 no escuro. Os dois
 * passam; adotar o do pacote seria trocar por menos contraste sem ganhar
 * nada, porque o fundo já é o do pacote.
 */
// A borda continua saindo da ponte, a 30%: o pacote pede "1px na cor
// semântica a 30%" e não tem token para esse degrau — só `--action-tint-border`
// existe, e é da cor de ação, não das de significado. Enquanto não houver,
// `border-info/30` é a ponte em canais `R G B`, que define o alfa e funciona
// em qualquer navegador.
const VARIANTES: Record<VarianteBadge, string> = {
  neutro: 'bg-tint-neutral text-conteudo-suave border-borda',
  info: 'bg-tint-info text-on-tint-info border-info/30',
  sucesso: 'bg-tint-success text-on-tint-success border-sucesso/30',
  alerta: 'bg-tint-warning text-on-tint-warning border-alerta/30',
  perigo: 'bg-tint-danger text-on-tint-danger border-perigo/30',
};

export const Badge: React.FC<BadgeProps> = ({
  variante = 'neutro',
  children,
  className,
  title,
}) => (
  <span
    title={title}
    className={cn(
      // Canto RETO, e não pílula: a §8.1 lista badge e chip entre o que é
      // reto no ChamadosHS, e a decisão D2-a marcou isto como pendência da
      // Fase 7. O `rounded-full` saiu; a escala já é zero, então não entra
      // `rounded-none` no lugar — não haveria o que zerar.
      //
      // `whitespace-nowrap` é do pacote: rótulo de status quebrado em duas
      // linhas dentro de um selo é o que acontece em coluna estreita.
      'inline-flex items-center gap-1 whitespace-nowrap border px-2.5 py-0.5 text-xs font-medium leading-5',
      VARIANTES[variante],
      className
    )}
  >
    {children}
  </span>
);

export default Badge;
