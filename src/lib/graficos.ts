/**
 * Cores e estilo dos gráficos.
 *
 * ── Como estas cores foram escolhidas ─────────────────────────────────
 *
 * Por busca, não a olho, e conferidas por `npm run validar:paleta` — que roda
 * sobre ESTE arquivo e falha o build se alguém baixar um valor.
 *
 * Dois critérios, os dois obrigatórios:
 *
 *   contraste  >= 3:1 contra a superfície onde a cor é desenhada. É o piso da
 *              WCAG 2.1 para elemento não textual: barra e ponto são forma.
 *   separação  >= 20 de ΔE*ab entre QUALQUER par do conjunto, simulado para
 *              visão normal, deuteranopia, protanopia e tritanopia.
 *
 * ── Por que "qualquer par", e não só os vizinhos ──────────────────────
 *
 * A paleta da 1.3.2 foi verificada comparando cada cor com a SEGUINTE, e
 * passou. A verificação estava errada: num gráfico de cinco barras todas as
 * cinco estão na tela ao mesmo tempo, e o olho compara qualquer uma com
 * qualquer outra. Refeita par a par, aquela paleta tinha quatro colisões —
 * azul com violeta (ΔE 1,9), rosa com laranja (9,9), rosa com verde (3,0) e
 * vermelho com âmbar (14,1). Todas em deuteranopia, todas invisíveis para quem
 * enxerga as três cores.
 *
 * ── Por que elas parecem mais contidas que antes ──────────────────────
 *
 * Porque precisam ser. Para quem tem deuteranopia o eixo vermelho-verde
 * colapsa, e o que resta é azul-amarelo mais luminosidade. Cinco cores
 * simultaneamente distintas nesse espaço reduzido exigem escada de
 * luminosidade — não dá para ter cinco tons vibrantes de saturação parecida e
 * ao mesmo tempo distinguíveis. As tentativas de manter o brilho reprovaram
 * todas na conta.
 *
 * A ordem não importa mais para a corretude, já que todos os pares foram
 * verificados. Continua sendo a ordem em que ficam melhor lado a lado.
 */
export const CATEGORICA_CLARA = [
  '#174E8C', // azul profundo
  '#91633B', // âmbar queimado
  '#1493A3', // turquesa
  '#981652', // vinho
  '#8F4ADE', // violeta
];

export const CATEGORICA_ESCURA = [
  '#4E86C6', // azul
  '#BC7638', // âmbar
  '#2ED0E5', // ciano
  '#EE1178', // rosa
  '#9E53F3', // violeta
];

export function paletaCategorica(escuro: boolean): string[] {
  return escuro ? CATEGORICA_ESCURA : CATEGORICA_CLARA;
}

/**
 * Cor de uma série pela POSIÇÃO dela, nunca pelo tamanho do valor.
 *
 * Se a cor seguisse a ordenação, filtrar o gráfico repintaria as barras que
 * sobraram — a mesma categoria mudaria de cor entre duas visualizações, e a
 * cor deixaria de identificar coisa alguma.
 */
export function corDaSerie(indice: number, escuro: boolean): string {
  const paleta = paletaCategorica(escuro);
  return paleta[indice % paleta.length];
}

/**
 * Cor de prioridade.
 *
 * Prioridade é escala, não categoria, e a escada de luminosidade que a
 * acessibilidade exige acaba servindo aos dois propósitos: Baixa é a mais
 * apagada, Crítica a mais pesada.
 *
 * O gráfico anterior pintava "Baixa" de verde, que neste sistema significa
 * "no prazo" — a mesma cor dizia duas coisas na mesma tela.
 */
const PRIORIDADE_CLARA: Record<string, string> = {
  'Crítica': '#8D3535',
  'Alta': '#A57531',
  'Média': '#4A7FC9',
  'Baixa': '#6C757F',
};

const PRIORIDADE_ESCURA: Record<string, string> = {
  'Crítica': '#EF6B6B',
  'Alta': '#D59234',
  'Média': '#66A2F4',
  'Baixa': '#91A3B6',
};

export function corDaPrioridade(prioridade: string, escuro: boolean): string {
  const mapa = escuro ? PRIORIDADE_ESCURA : PRIORIDADE_CLARA;
  return mapa[prioridade] ?? (escuro ? '#91A3B6' : '#6C757F');
}

/**
 * Cor de status do chamado.
 *
 * Precisa ser a MESMA no ponto da coluna do quadro, no selo do detalhe e na
 * fatia do painel: é a mesma entidade nas três telas. Já esteve duplicada, e o
 * custo apareceu — uma varredura de cor transformou o ponto de "Aguardando" no
 * mesmo azul de "Aberto", e duas das quatro colunas ficaram idênticas sem que
 * nada quebrasse. Esta é a única fonte.
 *
 * As chaves no plural existem porque o painel rotula as fatias como "Abertos"
 * e "Resolvidos", e o quadro nomeia as colunas no singular. Mesmo status, dois
 * rótulos, uma cor.
 *
 * "Resolvido" é o mais escuro do conjunto no tema claro. Não é estética: verde
 * e rosa são o par que colapsa em deuteranopia, e a diferença de luminosidade
 * é o único canal que sobrevive ali.
 */
const STATUS_CLARO: Record<string, string> = {
  'Aberto': '#EB1471',
  'Abertos': '#EB1471',
  'Em Andamento': '#0D9BBF',
  'Aguardando': '#6B389F',
  'Resolvido': '#22593D',
  'Resolvidos': '#22593D',
  'Fechado': '#22593D',
};

const STATUS_ESCURO: Record<string, string> = {
  'Aberto': '#E2126D',
  'Abertos': '#E2126D',
  'Em Andamento': '#2F97B1',
  'Aguardando': '#995ED4',
  'Resolvido': '#15D56F',
  'Resolvidos': '#15D56F',
  'Fechado': '#15D56F',
};

export function corDoStatus(status: string, escuro: boolean): string {
  const mapa = escuro ? STATUS_ESCURO : STATUS_CLARO;
  return mapa[status] ?? (escuro ? '#7590A3' : '#5A7287');
}

/**
 * Estilo dos eixos, grade e dica.
 *
 * Os valores acompanham os tokens de tema: grade e eixo saem das bordas, o
 * texto sai de `--conteudo-suave`. Antes eram hexadecimais soltos, que é como
 * a grade de um gráfico acabava mais escura que a borda do card ao lado.
 *
 * A dica não tem canto arredondado, como o resto da interface.
 */
export function estiloDoGrafico(escuro: boolean) {
  return {
    // Hexadecimal, e não `var(--token)`, porque o Recharts escreve estes
    // valores em ATRIBUTO de SVG (`stroke=`, `fill=`) e não em estilo — e
    // atributo com `var()` não resolve em todo navegador.
    //
    // A seção 5.4 de `DS/guidelines/adocao.md` prevê exatamente este caso:
    // onde a biblioteca não aceita a variável, o objeto pode ser "gerado a
    // partir dos mesmos valores com comentário apontando o token de origem".
    // É o que está abaixo — cada linha nomeia o token do design system de que
    // saiu, e os dois têm de bater.
    //
    // Esta cópia JÁ divergiu uma vez: quando a paleta mudou, a grade ficou no
    // cinza-azulado antigo dentro de cards que já eram slate. Se mexer nos
    // tokens, mexa aqui.
    grade: escuro ? '#1E3A5F' : '#E2E8F0', // --border-color  (#1E3A5F / slate-200)
    eixo: escuro ? '#94A3B8' : '#64748B', // --text-muted    (slate-400 / slate-500)
    texto: escuro ? '#E2E8F0' : '#1E293B', // --text-body     (slate-200 / slate-800)
    dica: {
      // No escuro a dica sobe para a superfície elevada, senão ela se confunde
      // com o card por onde passa; no claro o branco já contrasta com a página.
      backgroundColor: escuro ? '#1A2F4A' : '#FFFFFF', // --surface-elevated / --surface
      border: `1px solid ${escuro ? '#1E3A5F' : '#E2E8F0'}`, // --border-color
      // Reto, como o resto da interface — a pele de console do ChamadosHS
      // (`--radius-none`). O Recharts desenha a dica em estilo inline, fora do
      // alcance do Tailwind, então o canto precisa ser dito aqui à mão.
      borderRadius: '0px',
      color: escuro ? '#F1F5F9' : '#0F172A', // --text-heading (slate-100 / slate-900)
      padding: '8px 12px',
      boxShadow: '0 4px 14px rgb(0 0 0 / 0.25)',
    },
  };
}
