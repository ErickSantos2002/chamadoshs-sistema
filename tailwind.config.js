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
        // Nomeados pelo PAPEL, não pela cor: `surface` continua fazendo
        // sentido se o fundo virar azul, `mediumGray` não.
        //
        // Os valores vivem em CSS variables (styles/index.css) e trocam
        // sozinhos entre claro e escuro — a classe não precisa de `dark:`.
        // Formato "R G B" sem vírgula porque é o que o Tailwind exige para
        // conseguir aplicar opacidade (bg-surface/50).
        superficie: {
          DEFAULT: "rgb(var(--superficie) / <alpha-value>)",
          base: "rgb(var(--superficie-base) / <alpha-value>)",
          elevada: "rgb(var(--superficie-elevada) / <alpha-value>)",
        },
        borda: {
          DEFAULT: "rgb(var(--borda) / <alpha-value>)",
          suave: "rgb(var(--borda-suave) / <alpha-value>)",
        },
        conteudo: {
          DEFAULT: "rgb(var(--conteudo) / <alpha-value>)",
          suave: "rgb(var(--conteudo-suave) / <alpha-value>)",
          tenue: "rgb(var(--conteudo-tenue) / <alpha-value>)",
        },

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

      keyframes: {
        blinkLight: {
          "0%, 100%": { color: "#000000" }, // preto
          "50%": { color: "#dc2626" }, // vermelho
        },
        blinkDark: {
          "0%, 100%": { color: "#ffffff" }, // branco
          "50%": { color: "#dc2626" }, // vermelho
        },
      },

      animation: {
        blinkLight: "blinkLight 1s infinite",
        blinkDark: "blinkDark 1s infinite",
      },
    },
  },
  plugins: [],
};
