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
 * A tabela status -> slot da E18, adotada em PARTE.
 *
 * ── A tabela e fixada para os dois repositorios ──────────────────────
 *
 * A E18 fixa sete status com os nomes do HelpHS. O `StatusEnum` daqui tem
 * cinco, e `cancelado`/`arquivado` sao campos booleanos, nao status. Os slots
 * sem dono ficam DECLARADOS e vagos: nao se remove nem se renumera, porque
 * renumerar de um lado quebra o alinhamento entre os dois repositorios.
 *
 *     E18                     slot           aqui
 *     open                    --chart-1      Abertos
 *     in_progress             --chart-2      Em Andamento
 *     awaiting_client         --chart-3      Aguardando
 *     awaiting_technical      --chart-4      VAGO — este modelo nao separa
 *     resolved                --chart-5      NAO ADOTADO — ver abaixo
 *     closed                  --chart-6      NAO ADOTADO — ver abaixo
 *     cancelled               --chart-7      VAGO — cancelado aqui e flag
 *
 * ── Por que `resolved` e `closed` ficam de fora ──────────────────────
 *
 * Hoje "Resolvido" e "Fechado" pintam a MESMA cor. A E18 lhes daria slots
 * diferentes — e aplicar isso responderia por acidente a pergunta de produto
 * registrada como aberta desde o Checkpoint 3: se "Fechado" e "Resolvido" sao
 * estados distintos. O sistema passaria a afirmar que sim, sem ninguem ter
 * decidido.
 *
 * Quando a pergunta for respondida, a adocao completa e um commit.
 *
 * ── A cor sai por CLASSE, e nao por hexadecimal ──────────────────────
 *
 * `classeDeStatus` devolve o nome da classe; as regras estao em
 * `src/styles/index.css` e leem `var(--chart-N)`. Nao ha copia de token, pelo
 * mesmo motivo da moldura: atributo de apresentacao perde para regra CSS, e o
 * `Cell` do Recharts repassa `className` ao elemento.
 *
 * Devolve `null` para quem nao foi adotado, e quem chama continua usando
 * `corDoStatus` nesses casos.
 */
export function classeDeStatus(status: string): string | null {
  const SLOT: Record<string, string> = {
    'Aberto': 'serie-status-1',
    'Abertos': 'serie-status-1',
    'Em Andamento': 'serie-status-2',
    'Aguardando': 'serie-status-3',
  };
  return SLOT[status] ?? null;
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
 * A moldura do gráfico NÃO mora mais aqui — ela virou CSS.
 *
 * O `estiloDoGrafico` existia para copiar tokens em hexadecimal, porque o
 * Recharts escreve cor em ATRIBUTO de apresentação e `var()` não resolve ali.
 * A cópia divergiu duas vezes; a última na E14, e atravessou três emendas sem
 * nada acusar.
 *
 * Atributo de apresentação tem especificidade zero e perde para qualquer regra
 * CSS — medido no Chrome 153 e em jsdom, sem `!important`, e preso em
 * `graficos-css.test.ts`. As três regras estão em `src/styles/index.css`, sobre
 * as classes que o Recharts já emite, e leem o token direto.
 *
 * A dica saiu antes, para `components/ui/DicaDoGrafico.tsx`, porque nunca foi
 * SVG: o Recharts a desenha num `div` sobreposto, que lê token por classe.
 *
 * A cópia foi de cinco campos para dois, e de dois para ZERO. Não há mais o que
 * manter em sincronia, e a catraca `exigirMolduraFiel` deixou de ser muro para
 * ser rede: ela guarda contra a cópia VOLTAR.
 */
