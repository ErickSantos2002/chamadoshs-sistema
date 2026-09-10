import React from 'react';

/**
 * A dica dos gráficos, com o texto legível e a cor da série no MARCADOR.
 *
 * ── O defeito que ela conserta ───────────────────────────────────────
 *
 * A dica padrão do Recharts pinta cada item **na cor da série**. Conferido na
 * fonte instalada, `recharts/lib/component/DefaultTooltipContent.js` linha 70:
 *
 *     color: entry.color || '#000'
 *
 * A paleta é certificada como FORMA, com piso de 3:1 contra o card. Dentro da
 * dica ela vira TEXTO, onde o piso é 4,5:1 — e **doze das treze cores
 * reprovavam**: cinco no claro, sete no escuro, a pior a 2,93.
 *
 * Papel novo não herda piso antigo. A cor não mudou; o que mudou foi o que ela
 * está fazendo.
 *
 * ── Por que uma dica própria, e não `itemStyle` ──────────────────────
 *
 * `itemStyle` resolveria o texto e **cortaria o vínculo**: a dica padrão não
 * tem marcador nenhum — o `<li>` traz só `<span>` de nome, separador, valor e
 * unidade —, então a cor do texto é o ÚNICO elo entre a linha da dica e a série
 * do gráfico. Trocar a cor sem pôr marcador troca um defeito por outro.
 *
 * `formatter` também não serve: o `DefaultTooltipContent` testa
 * `isNumOrStr(finalName)` antes de desenhar o nome, então elemento React
 * devolvido ali é **descartado em silêncio**.
 *
 * ── E ela apaga três cópias de token ─────────────────────────────────
 *
 * O `estiloDoGrafico` copia hexadecimais porque o Recharts escreve em ATRIBUTO
 * de SVG, onde `var()` não resolve. **A dica não é SVG**: o Recharts a desenha
 * num `div` sobreposto (`recharts-tooltip-wrapper`), que é HTML comum.
 *
 * Então aqui a cor vem por CLASSE, do token, sem cópia — e o fundo, a borda e a
 * cor do texto da dica saem da lista de hexadecimais que alguém precisa lembrar
 * de atualizar. Sobram dois, `grade` e `texto`, que são atributo de SVG de
 * verdade e continuam sob a catraca `exigirMolduraFiel`.
 *
 * ── As medições ──────────────────────────────────────────────────────
 *
 *   --conteudo sobre o fundo da dica     claro 17,85   escuro 12,37   piso 4,5
 *   marcador (cor da série) como forma   claro  3,25   escuro  2,93   piso 3
 *
 * O marcador do escuro tem uma residual: `#E2126D` a 2,93, faltando 0,07. É
 * **higiene**, não acessibilidade, pela regra do portador redundante — o nome
 * escrito é quem carrega a informação, e o marcador é reforço.
 */

type ItemDaDica = {
  name?: string | number;
  value?: string | number;
  color?: string;
  dataKey?: string | number;
};

export type PropsDaDica = {
  active?: boolean;
  payload?: ItemDaDica[];
  label?: string | number;
};

export const DicaDoGrafico: React.FC<PropsDaDica> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-none border border-borda bg-superficie px-3 py-2 text-sm shadow-lg">
      {label !== undefined && label !== '' && (
        <p className="mb-1 font-semibold text-conteudo">{label}</p>
      )}
      <ul className="space-y-0.5">
        {payload.map((item, i) => (
          <li key={`${item.dataKey ?? i}`} className="flex items-center gap-2 text-conteudo">
            {/* O marcador é o elo com a série, e é `aria-hidden` porque o nome
                ao lado já diz de qual série se trata — cor aqui é reforço, não
                canal. */}
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-none"
              style={{ backgroundColor: item.color }}
            />
            <span>
              {item.name}: <span className="font-semibold">{item.value}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
