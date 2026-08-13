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
        primary: {
          DEFAULT: "#2563eb", // azul principal (mantido)
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
        sans: [
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

      fontSize: {
        // Tamanho dos rótulos monoespaçados. 11px, não os 9,6px da maquete:
        // lá era textura de fundo, aqui carrega a palavra "PROTOCOLO" acima de
        // um número que alguém precisa ler.
        rotulo: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.14em" }],
      },

      keyframes: {
        blinkLight: {
          "0%, 100%": { color: "#000000" }, // preto
          "50%": { color: "#dc2626" }, // vermelho
        },
        blinkDark: {
          "0%, 100%": { color: "#ffffff" }, // branco
          "50%": { color: "#dc2626" }, // vermelho
        },

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
        blinkLight: "blinkLight 1s infinite",
        blinkDark: "blinkDark 1s infinite",

        subir: "subir .6s cubic-bezier(.2,.8,.2,1) both",
        acender: "acender .5s ease-out .35s both",
        varrer: "varrer 1.1s cubic-bezier(.4,0,.2,1) .25s 1 both",
      },
    },

    // ── Cantos ───────────────────────────────────────────────────────
    //
    // Sobrescreve a escala inteira, em vez de estender: assim `rounded-lg`,
    // `rounded-xl` e companhia passam a valer 0 sem precisar editar as 202
    // ocorrências espalhadas por 25 arquivos. Canto reto é o traço que mais
    // lê como console, e este é o jeito de aplicá-lo sem um diff de 200
    // linhas no mesmo commit que troca a paleta — se algo quebrar, dá para
    // saber o que foi.
    //
    // As classes que sobraram viraram ruído e saem tela a tela, junto com o
    // redesenho de cada uma (1.4.1 em diante).
    //
    // `full` continua existindo porque avatar e ponto de status são círculo
    // por natureza, não canto arredondado.
    borderRadius: {
      none: "0",
      sm: "0",
      DEFAULT: "0",
      md: "0",
      lg: "0",
      xl: "0",
      "2xl": "0",
      "3xl": "0",
      full: "9999px",
    },
  },
  plugins: [],
};
