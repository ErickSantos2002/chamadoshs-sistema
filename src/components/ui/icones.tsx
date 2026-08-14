import React from 'react';

/**
 * Os ícones do sistema, desenhados aqui.
 *
 * ── Por que sair de um pacote pronto ──────────────────────────────────
 *
 * Um conjunto pronto resolve rápido e cobra o preço de todo mundo usar o mesmo:
 * a interface passa a parecer montada com peças de catálogo. Mas trocar a
 * origem dos ícones, sozinho, não mudaria quase nada — desenhados à mão sairia
 * o mesmo traço de 2px com ponta redonda, porque é o que um ícone de 24px é.
 *
 * O que destoava de verdade era outra coisa, e estava aqui desde a 1.4: o
 * sistema inteiro tem CANTO RETO — a escala de `borderRadius` foi zerada — e
 * todo ícone chegava com ponta e junção ARREDONDADAS. Duas linguagens na mesma
 * tela, e a do ícone era a do pacote, não a nossa.
 *
 * Daí as três escolhas abaixo, que valem para os 50 e poucos de uma vez:
 *
 *  - `strokeWidth 1.5`, e não 2. Mais leve ao lado de texto pequeno.
 *  - `strokeLinecap="square"`: a ponta termina em esquadro, como as bordas.
 *  - `strokeLinejoin="miter"`: o canto do traço é vivo, como o dos painéis.
 *
 * ── Como usar ─────────────────────────────────────────────────────────
 *
 * Todos herdam `currentColor` e recebem o tamanho por classe, então o ícone
 * acompanha a cor do texto ao redor sem ninguém sincronizar nada:
 *
 *     <IconeBusca className="h-4 w-4 text-conteudo-tenue" />
 *
 * Todos são `aria-hidden`. Ícone aqui acompanha palavra — quando ele for o
 * único conteúdo de um botão, o rótulo vai no `aria-label` do botão, que é
 * onde o leitor de tela procura.
 */

/**
 * Um ícone aceita o que um `<svg>` aceita.
 *
 * Restringir a `className` parecia mais arrumado e quebrou na primeira parada:
 * os KPIs do painel passam a cor do status por `style`, porque ela vem de
 * `corDoStatus` em tempo de execução e não existe como classe. Um componente de
 * apresentação que recusa as props do elemento que ele é vira uma parede.
 */
export type PropsDeIcone = React.SVGProps<SVGSVGElement>;

/**
 * A base comum.
 *
 * Espessura, ponta e junção ficam num lugar só. Repetidas em cada ícone,
 * bastaria um esquecimento para um deles sair com a ponta redonda e destoar
 * sem que ninguém soubesse dizer por quê — que é exatamente o defeito que este
 * arquivo veio corrigir.
 */
const Traco: React.FC<PropsDeIcone> = ({ children, ...resto }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="square"
    strokeLinejoin="miter"
    aria-hidden="true"
    // Depois dos padrões, de propósito: quem chamar pode sobrescrever um deles
    // sem precisar de um ícone novo.
    {...resto}
  >
    {children}
  </svg>
);

// ── Navegação e setas ──────────────────────────────────────────────────

/** Seta para baixo. Abre lista. */
export const IconeSeta: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="m5 9 7 7 7-7" />
  </Traco>
);

export const IconeSetaCima: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="m5 15 7-7 7 7" />
  </Traco>
);

export const IconeSetaDireita: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="m9 5 7 7-7 7" />
  </Traco>
);

/** Abre o menu de gaveta. Estava como o caractere `☰`, que é texto. */
export const IconeMenu: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Traco>
);

export const IconeVoltar: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M20 12H4M10 6l-6 6 6 6" />
  </Traco>
);

export const IconeLinkExterno: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M14 4h6v6M20 4 11 13M18 14v6H4V6h6" />
  </Traco>
);

export const IconeSair: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M10 20H4V4h6M15 8l4 4-4 4M19 12H9" />
  </Traco>
);

// ── Confirmação e negativa ─────────────────────────────────────────────

/** Confere. Marca a opção escolhida. */
export const IconeConfere: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="m5 13 4 4L19 7" />
  </Traco>
);

export const IconeConfereCirculo: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 3 3 5-6" />
  </Traco>
);

export const IconeFechar: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Traco>
);

export const IconeFecharCirculo: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </Traco>
);

export const IconeProibido: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m5.6 5.6 12.8 12.8" />
  </Traco>
);

export const IconeMais: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M12 5v14M5 12h14" />
  </Traco>
);

// ── Avisos ─────────────────────────────────────────────────────────────

export const IconeAlerta: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6M12 16h.01" />
  </Traco>
);

export const IconeAtencao: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M12 3 22 20H2z" />
    <path d="M12 9v5M12 17h.01" />
  </Traco>
);

export const IconeInfo: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 8h.01" />
  </Traco>
);

export const IconeSino: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M18 16V11a6 6 0 1 0-12 0v5l-2 3h16z" />
    <path d="M10 22h4" />
  </Traco>
);

// ── Tempo ──────────────────────────────────────────────────────────────

export const IconeRelogio: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l4 2" />
  </Traco>
);

export const IconeAgenda: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M3 6h18v15H3zM3 10h18M8 3v4M16 3v4" />
    <path d="M12 13v3l2 1" />
  </Traco>
);

export const IconeHistorico: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 8v4l3 2" />
  </Traco>
);

export const IconeDesfazer: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Traco>
);

export const IconeRecarregar: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </Traco>
);

export const IconeRepetir: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M4 9V6h13l-3-3M20 15v3H7l3 3" />
  </Traco>
);

/**
 * Carregando.
 *
 * É um arco, e não um círculo: o vão é o que faz a rotação aparecer. Um anel
 * fechado girando fica parado aos olhos.
 */
export const IconeCarregando: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </Traco>
);

// ── Ações sobre registros ──────────────────────────────────────────────

export const IconeEditar: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M4 20h4L20 8l-4-4L4 16z" />
    <path d="m14 6 4 4" />
  </Traco>
);

export const IconeApagar: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M4 6h16M9 6V3h6v3M6 6v15h12V6" />
    <path d="M10 11v6M14 11v6" />
  </Traco>
);

export const IconeSalvar: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M4 4h13l3 3v13H4z" />
    <path d="M8 4v6h8V4M8 20v-6h8v6" />
  </Traco>
);

export const IconeEnviar: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M21 3 3 10l7 3 3 7z" />
    <path d="M21 3 10 13" />
  </Traco>
);

export const IconeArquivar: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M3 4h18v4H3zM5 8v12h14V8" />
    <path d="M10 12h4" />
  </Traco>
);

export const IconeDesarquivar: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M3 4h18v4H3zM5 8v12h14V8" />
    <path d="M12 17v-5M9 14l3-3 3 3" />
  </Traco>
);

export const IconeIniciar: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m10 8 6 4-6 4z" />
  </Traco>
);

export const IconeEnergia: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M12 3v9" />
    <path d="M6.5 6.5a8 8 0 1 0 11 0" />
  </Traco>
);

// ── Objetos do domínio ─────────────────────────────────────────────────

export const IconePainel: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" />
  </Traco>
);

export const IconeChamado: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z" />
    <path d="M13 7v10" />
  </Traco>
);

export const IconeEtiqueta: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M3 3h8l10 10-8 8L3 11z" />
    <path d="M7.5 7.5h.01" />
  </Traco>
);

export const IconeSetor: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M4 21V3h11v18M15 9h5v12M4 21h17" />
    <path d="M8 7h3M8 11h3M8 15h3" />
  </Traco>
);

export const IconeDocumento: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M5 3h9l5 5v13H5z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h6" />
  </Traco>
);

export const IconeTrilha: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M6 3h13v15a3 3 0 0 1-3 3H6" />
    <path d="M6 3a3 3 0 0 0-3 3v2h3" />
    <path d="M9 8h7M9 12h7M9 16h4" />
  </Traco>
);

export const IconeConfiguracoes: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M19.1 4.9l-2.2 2.2M7.1 16.9l-2.2 2.2" />
  </Traco>
);

export const IconeFiltro: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M3 4h18l-7 8v8l-4-2v-6z" />
  </Traco>
);

export const IconeBusca: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m16 16 5 5" />
  </Traco>
);

export const IconeAtividade: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </Traco>
);

export const IconeEstrela: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="m12 3 2.8 6 6.2.8-4.5 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.8 9.2 9z" />
  </Traco>
);

/** Novidades. Um brilho, não uma estrela — a estrela é avaliação. */
export const IconeBrilho: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="m12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
    <path d="M18 4v3M16.5 5.5h3" />
  </Traco>
);

// ── Pessoas e acesso ───────────────────────────────────────────────────

export const IconeUsuario: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2" />
  </Traco>
);

export const IconeUsuarios: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" />
    <path d="M16 4a4 4 0 0 1 0 8M18 14a5 5 0 0 1 4 5v2" />
  </Traco>
);

export const IconeCadeado: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M5 11h14v10H5z" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Traco>
);

export const IconeChave: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <circle cx="7" cy="17" r="4" />
    <path d="m10 14 10-10M17 7l3 3M14 10l3 3" />
  </Traco>
);

export const IconeEscudo: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z" />
  </Traco>
);

export const IconeEscudoConfere: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z" />
    <path d="m9 12 2 2 4-4" />
  </Traco>
);

export const IconeOlho: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z" />
    <circle cx="12" cy="12" r="3" />
  </Traco>
);

export const IconeOlhoFechado: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M4 6.5C2.8 7.9 2 12 2 12s3.6 6 10 6c1.9 0 3.5-.5 4.9-1.2M9.5 6.3A11 11 0 0 1 12 6c6.4 0 10 6 10 6a18 18 0 0 1-3.3 3.7" />
    <path d="m9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m3 3 18 18" />
  </Traco>
);

// ── Tema ───────────────────────────────────────────────────────────────

export const IconeSol: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
  </Traco>
);

export const IconeLua: React.FC<PropsDeIcone> = (p) => (
  <Traco {...p}>
    <path d="M20 14A9 9 0 0 1 10 4a9 9 0 1 0 10 10z" />
  </Traco>
);
