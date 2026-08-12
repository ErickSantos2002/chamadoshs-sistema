/**
 * Cores e estilo dos gráficos.
 *
 * ── Por que uma paleta separada dos tokens do tema ────────────────────
 *
 * Verde, âmbar e vermelho já têm significado fixo neste sistema: são os
 * estados de SLA — no prazo, atenção, estourado. Usar qualquer um deles para
 * dizer "Software" ou "Hardware" faria a mesma cor significar duas coisas na
 * mesma tela. Por isso a paleta categórica abaixo evita as três, mesmo tendo
 * espaço de sobra na roda de cores.
 *
 * ── Por que estas cores, e não outras ─────────────────────────────────
 *
 * A paleta anterior era `#3B82F6, #60A5FA, #2563EB, ...`: o mesmo azul em três
 * luminosidades. Barras vizinhas ficavam indistinguíveis — foi o que motivou a
 * troca.
 *
 * Estas foram verificadas por cálculo, não a olho, contra as duas superfícies
 * do sistema (#FFFFFF no claro, #132238 no escuro). Os critérios: faixa de
 * luminosidade, saturação mínima, separação entre vizinhos para daltonismo
 * (deuteranopia e tritanopia), separação para visão normal e contraste contra
 * o fundo.
 *
 * A ORDEM IMPORTA e não pode ser embaralhada: ela foi escolhida para que cores
 * adjacentes sejam as mais distantes entre si. Azul ao lado de violeta, por
 * exemplo, reprova — os dois se confundem em deuteranopia.
 *
 * O violeta é o único que muda entre os temas: no escuro, o tom do claro cai
 * para 2,81 de contraste contra a superfície e precisa de um degrau acima.
 */
export const CATEGORICA_CLARA = [
  '#2563EB', // azul
  '#DB2777', // rosa
  '#0891B2', // ciano
  '#EA580C', // laranja
  '#7C3AED', // violeta
];

export const CATEGORICA_ESCURA = [
  '#2563EB',
  '#DB2777',
  '#0891B2',
  '#EA580C',
  '#8B5CF6', // um degrau acima: o #7C3AED não contrasta com o fundo escuro
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
 * Cor de prioridade nos gráficos.
 *
 * Prioridade NÃO é categoria: é escala, e já tem cor definida no sistema — os
 * selos do quadro de chamados usam perigo, alerta, info e neutro. O gráfico
 * repete exatamente essas, para a mesma prioridade não ter uma cor no quadro e
 * outra no painel.
 *
 * O gráfico anterior pintava "Baixa" de verde, que aqui significa "no prazo".
 */
const PRIORIDADE_CLARA: Record<string, string> = {
  'Crítica': '#EF4444',
  'Alta': '#F59E0B',
  'Média': '#3B82F6',
  'Baixa': '#94A3B8',
};

const PRIORIDADE_ESCURA: Record<string, string> = {
  'Crítica': '#EF4444',
  'Alta': '#F59E0B',
  'Média': '#3B82F6',
  'Baixa': '#64748B',
};

export function corDaPrioridade(prioridade: string, escuro: boolean): string {
  const mapa = escuro ? PRIORIDADE_ESCURA : PRIORIDADE_CLARA;
  return mapa[prioridade] ?? (escuro ? '#64748B' : '#94A3B8');
}

/**
 * Cor de status do chamado.
 *
 * Precisa ser a MESMA no ponto da coluna do quadro e na barra do painel: é a
 * mesma entidade nas duas telas. Ficava duplicada nos dois arquivos, e o custo
 * disso apareceu — uma varredura de cor transformou o ponto de "Aguardando" no
 * mesmo azul de "Aberto", e duas das quatro colunas ficaram idênticas sem que
 * nada quebrasse.
 *
 * O conjunto foi verificado por cálculo contra as duas superfícies: faixa de
 * luminosidade, saturação, separação para daltonismo e para visão normal, e
 * contraste. Azul saiu de "Aberto" justamente por isso — ele fica perto demais
 * do ciano e do violeta vizinhos para quem não distingue verde e vermelho.
 */
const STATUS_CLARO: Record<string, string> = {
  'Aberto': '#DB2777',
  'Abertos': '#DB2777',
  'Em Andamento': '#0891B2',
  'Aguardando': '#7C3AED',
  'Resolvido': '#059669',
  'Resolvidos': '#059669',
  'Fechado': '#059669',
};

const STATUS_ESCURO: Record<string, string> = {
  'Aberto': '#DB2777',
  'Abertos': '#DB2777',
  'Em Andamento': '#0891B2',
  'Aguardando': '#8B5CF6',
  'Resolvido': '#059669',
  'Resolvidos': '#059669',
  'Fechado': '#059669',
};

export function corDoStatus(status: string, escuro: boolean): string {
  const mapa = escuro ? STATUS_ESCURO : STATUS_CLARO;
  return mapa[status] ?? (escuro ? '#6E829B' : '#94A3B8');
}

/**
 * Estilo dos eixos, grade e dica.
 *
 * Os eixos e a grade ficam discretos de propósito: eles são referência, não
 * conteúdo. Antes o texto dos eixos era azul — a mesma cor de uma das séries —
 * o que fazia o rótulo parecer parte do dado.
 */
export function estiloDoGrafico(escuro: boolean) {
  return {
    grade: escuro ? '#1E3A5F' : '#E2E8F0',
    eixo: escuro ? '#6E829B' : '#94A3B8',
    texto: escuro ? '#A9BAD0' : '#475569',
    dica: {
      backgroundColor: escuro ? '#1A2F4A' : '#FFFFFF',
      border: `1px solid ${escuro ? '#1E3A5F' : '#E2E8F0'}`,
      borderRadius: '8px',
      color: escuro ? '#F1F5F9' : '#0F172A',
      padding: '8px 12px',
      boxShadow: '0 4px 14px rgb(0 0 0 / 0.25)',
    },
  };
}
