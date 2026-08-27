/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // 🔥 habilita suporte ao modo escuro baseado em classe
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // A safelist tinha classes da paleta antiga, que saíram com ela. Só entra
  // aqui classe montada em tempo de execução, que o Tailwind não enxerga no
  // código-fonte — hoje não há nenhuma.
  safelist: [],
  theme: {
    extend: {
      colors: {
        // ── Rampa da marca ──────────────────────────────────────────
        // A escala `sky` do HelpHS, copiada valor a valor: é o que dá a
        // identidade de família entre os dois sistemas.
        //
        // Cuidado de uso: `primary` (#0EA5E9) dá 2,77:1 sobre branco. Serve
        // para PREENCHIMENTO — fundo de botão, trilho de interruptor, ponto —
        // não para texto sobre superfície clara. Texto usa `sinal`, que é a
        // mesma família ajustada por tema e validada em 4,5:1.
        primary: {
          DEFAULT: "#0ea5e9",
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },

        // ── Tokens semânticos ────────────────────────────────────────
        // Nomeados pelo PAPEL, não pela cor: `superficie` continua fazendo
        // sentido se o fundo virar azul, `mediumGray` não.
        //
        // Os valores vivem em CSS variables (styles/index.css) e trocam
        // sozinhos entre claro e escuro — a classe não precisa de `dark:`.
        // Formato "R G B" sem vírgula porque é o que o Tailwind exige para
        // conseguir aplicar opacidade (bg-superficie/50).
        superficie: {
          DEFAULT: "rgb(var(--superficie) / <alpha-value>)",
          base: "rgb(var(--superficie-base) / <alpha-value>)",
          elevada: "rgb(var(--superficie-elevada) / <alpha-value>)",
        },
        borda: {
          DEFAULT: "rgb(var(--borda) / <alpha-value>)",
          suave: "rgb(var(--borda-suave) / <alpha-value>)",
          // Traço mais presente: colchete de HUD, régua de seção, scrollbar.
          forte: "rgb(var(--borda-forte) / <alpha-value>)",
        },
        conteudo: {
          DEFAULT: "rgb(var(--conteudo) / <alpha-value>)",
          suave: "rgb(var(--conteudo-suave) / <alpha-value>)",
          tenue: "rgb(var(--conteudo-tenue) / <alpha-value>)",
        },

        // A cor de sinal. Marca o que está ativo, focado ou selecionado, e
        // nada além disso — no instante em que virar cor decorativa, para de
        // significar qualquer coisa. Deriva do azul da marca (#1F89CA,
        // matiz 203°), escurecido no tema claro e clareado no escuro.
        sinal: "rgb(var(--sinal) / <alpha-value>)",

        // Cores de significado. Existem em variantes fixas porque o
        // significado não muda com o tema: erro é vermelho nos dois.
        sucesso: {
          DEFAULT: "#10B981",
          forte: "#047857",
          suave: "#34D399",
        },
        perigo: {
          DEFAULT: "#EF4444",
          forte: "#B91C1C",
          suave: "#F87171",
        },
        alerta: {
          DEFAULT: "#F59E0B",
          forte: "#B45309",
          suave: "#FBBF24",
        },
        info: {
          DEFAULT: "#3B82F6",
          forte: "#1D4ED8",
          suave: "#60A5FA",
        },
      },

      fontFamily: {
        // Monoespaçada para dado de MÁQUINA: protocolo, data, contador,
        // rótulo de campo. É ela que faz a tela parecer console.
        //
        // Não serve para texto humano — título, descrição e comentário
        // continuam em sans. Descrição de chamado em monoespaçada pequena é
        // o caminho mais curto para o usuário reclamar da tela nova.
        mono: [
          "ui-monospace",
          "Cascadia Mono",
          "Segoe UI Mono",
          "SF Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
        // A fonte do HelpHS. Hospedada no próprio bundle
        // (`@fontsource/plus-jakarta-sans`, importada em styles/index.css) e
        // NÃO no CDN do Google, que é como o HelpHS carrega: o ChamadosHS roda
        // na rede interna, e `src/recursos-externos.test.ts` existe justamente
        // para impedir que a interface dependa de servidor de terceiro.
        //
        // A pilha de sistema fica de reserva, para o intervalo do carregamento
        // e para o caso de a fonte não chegar.
        sans: [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },

      // Ponto de corte por ALTURA, não por largura.
      //
      // Os breakpoints do Tailwind são todos de largura, e largura não diz
      // nada sobre o problema que apareceu: uma TV em paisagem é larguíssima
      // e baixa. O login cabia folgado no notebook e era cortado lá.
      //
      // Espaçamento generoso passa a ser condicional: `alto:` só vale quando
      // há altura para gastar.
      screens: {
        alto: { raw: '(min-height: 720px)' },
      },

      // As animações `blinkLight`/`blinkDark` saíram daqui junto com o único
      // lugar que as usava: o "ACESSO NEGADO" piscando em vermelho da tela de
      // bloqueio. Alarme para quem não fez nada errado ensina a ignorar alarme.
      keyframes: {
        // ── Entradas ────────────────────────────────────────────────
        // Todas rodam UMA vez. A diferença entre entrada e enfeite é
        // essa: a entrada termina. O que fica em laço numa tela aberta
        // o dia inteiro vira incômodo por volta das dez da manhã.
        subir: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "none" },
        },
        acender: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        varrer: {
          "0%": { top: "-2px", opacity: "0" },
          "15%": { opacity: "1" },
          "85%": { opacity: "1" },
          "100%": { top: "100%", opacity: "0" },
        },
      },

      animation: {
        subir: "subir .6s cubic-bezier(.2,.8,.2,1) both",
        acender: "acender .5s ease-out .35s both",
        varrer: "varrer 1.1s cubic-bezier(.4,0,.2,1) .25s 1 both",
      },
    },

    // ── Cantos ───────────────────────────────────────────────────────
    //
    // A escala PADRÃO do Tailwind, de volta.
    //
    // Da 1.4 até a 1.6.20 ela era zerada: canto reto era o traço que mais
    // lia como console, e zerar a escala aplicava isso às 112 classes
    // `rounded-*` já escritas sem um diff de 200 linhas.
    //
    // O alvo visual agora é o HelpHS, que não sobrescreve a escala. Voltar
    // ao padrão usa a mesma alavanca na direção contrária: as mesmas 112
    // ocorrências em 25 arquivos passam a arredondar de novo, com
    // `rounded-lg` = 8px e `rounded-xl` = 12px, que são exatamente os
    // valores que o HelpHS usa em botão, card, input e dropdown.
    //
    // Não há bloco `borderRadius` aqui de propósito: escrever os mesmos
    // valores do padrão seria uma cópia que só pode divergir.

  },
  plugins: [],
};
