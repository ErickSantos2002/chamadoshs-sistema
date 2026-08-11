/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // 🔥 habilita suporte ao modo escuro baseado em classe
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "bg-white",
    "bg-red-500",
    "bg-blue-500",
    "dark:bg-darkGray",
    "dark:text-lightGray",
    "dark:hover:bg-accentGray",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563eb", // azul principal (mantido)
        },

        // 🎨 Paleta de tons de cinza para o modo escuro
        // LEGADO: usada pelas telas antigas. Sai quando a última migrar para
        // os tokens semânticos abaixo.
        darkGray: "#121212",    // fundo principal (substitui o darkBlue)
        mediumGray: "#2a2a2a",  // painéis / cards
        lightGray: "#d1d1d1",   // texto claro
        accentGray: "#3a3a3a",  // bordas, hover, divisores

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
