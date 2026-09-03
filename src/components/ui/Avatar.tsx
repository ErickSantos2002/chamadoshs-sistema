import React from 'react';
import { cn } from '../../lib/utils';
import { iniciais } from '../../lib/formato';

interface AvatarProps {
  nome: string | null | undefined;
  /** Texto do title; sem ele, usa o próprio nome. */
  title?: string;
  className?: string;
}

/**
 * Círculo com as iniciais de quem é responsável.
 *
 * A cor sai de um hash do nome, para a mesma pessoa aparecer sempre na mesma
 * cor em toda a interface — é o que permite reconhecer de relance quem está
 * com o chamado sem ler o texto.
 *
 * ── A paleta é a do pacote, e por quê ─────────────────────────────────
 *
 * Até 03/09/2026 a cor vinha da paleta CATEGÓRICA de gráficos
 * (`lib/graficos.ts`), com o texto na cor e o fundo na mesma cor a 20%.
 * O raciocínio parecia bom — identificar sem significar — e o resultado era
 * ruim: medido, **14 de 20 combinações reais reprovavam 4,5:1, e 6 delas não
 * chegavam nem a 3:1**.
 *
 * A causa era de construção, não de escolha de tom: texto e fundo eram A MESMA
 * COR, um deles a 20%. O contraste possível entre uma cor e ela mesma
 * esmaecida tem teto baixo, e nenhum ajuste de paleta o levanta. A paleta
 * categórica é certificada para FORMA (piso 3:1, barra e ponto de gráfico), e
 * estava sendo usada para carregar TEXTO.
 *
 * Agora são os seis pares de `DS/components/core/Avatar.jsx`, que são pares
 * [fundo, texto] pensados um contra o outro — degrau 50/100 no fundo, 700 no
 * texto. Medidos, depois da emenda E5:
 *
 *   primary   6,31 · 6,31      danger    5,91 · 5,91
 *   info      6,16 · 6,16      success   5,21 · 5,21
 *   warning   4,84 · 4,84      neutro    6,92 · 5,29
 *                                        (claro · escuro)
 *
 * Nenhum reprova. O pior é 4,84, contra os 2,64 do pior de antes.
 *
 * Some junto a segunda fonte de verdade que a §5.4 proíbe: a cor do avatar
 * deixa de sair de um arquivo de gráficos e passa a sair de `tokens/`.
 *
 * ── Uma consequência visual, para não ser surpresa ────────────────────
 *
 * No tema claro os fundos do pacote são degraus 50/100, quase brancos: o disco
 * fica discreto contra a página (1,04 a 1,19 contra `--surface`) e quem carrega
 * a identificação são as iniciais. No escuro é o contrário — os mesmos fundos
 * pálidos saltam sobre o navy. É o desenho do pacote, e não efeito colateral.
 *
 * ── A derivação também é a do pacote ──────────────────────────────────
 *
 * `soma dos charCodes % 6`, sem o `% 997` que havia aqui. A consequência é que
 * cada pessoa pode trocar de cor uma vez, nesta migração; o que importa é que
 * continue estável a partir de agora, e que os dois sistemas derivem igual.
 */
const PARES: ReadonlyArray<readonly [fundo: string, texto: string]> = [
  ['var(--color-primary-100)', 'var(--color-primary-700)'],
  ['var(--color-info-50)', 'var(--color-info-700)'],
  ['var(--color-warning-50)', 'var(--color-warning-700)'],
  ['var(--color-danger-50)', 'var(--color-danger-700)'],
  ['var(--color-success-50)', 'var(--color-success-700)'],
  ['var(--surface-elevated)', 'var(--on-tint-neutral)'],
];

/** O índice do pacote: soma dos códigos do nome, módulo o tamanho da lista. */
function parDoNome(nome: string): (typeof PARES)[number] {
  const soma = nome.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return PARES[soma % PARES.length];
}

/**
 * Sem nome, o par NEUTRO — que é o sexto da mesma lista, não uma cor à parte.
 *
 * O pacote mandaria o nome vazio para o par 0 (soma 0), pintando de azul quem
 * não tem responsável. Aqui isso seria mentira: "Sem responsável" não é uma
 * pessoa, e já era cinza antes desta migração. A §30 não deixa trocar isso por
 * motivo visual.
 */
const PAR_NEUTRO = PARES[5];

export const Avatar: React.FC<AvatarProps> = ({ nome, title, className }) => {
  const [fundo, texto] = nome ? parDoNome(nome) : PAR_NEUTRO;

  return (
    <span
      title={title ?? nome ?? 'Sem responsável'}
      style={{ backgroundColor: fundo, color: texto }}
      className={cn(
        // `rounded-full` fica: é círculo de verdade, a exceção que o canto reto
        // do D2-a preserva junto com o ponto de status e o anel do spinner.
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
        'text-[10px] font-medium leading-none',
        className
      )}
    >
      {iniciais(nome)}
    </span>
  );
};

export default Avatar;
