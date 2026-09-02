/** @type {import('tailwindcss').Config} */

/* Mapeia o Tailwind sobre os tokens do design system oficial da Health &
 * Safety (`src/design-system/`, export de 02/09/2026), conforme o passo 2 de
 * `DS/guidelines/adocao.md`.
 *
 * Nenhum valor de cor mora aqui. Todos apontam para uma CSS variable, e as
 * variables vêm do pacote. Trocar uma cor do sistema é recopiar o token, não
 * editar este arquivo. */

module.exports = {
  darkMode: "class", // classe `dark` no <html>, aplicada pelo ThemeContext
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  // Só entra aqui classe montada em tempo de execução, que o Tailwind não
  // enxerga no código-fonte — hoje não há nenhuma.
  safelist: [],
  theme: {
    extend: {
      colors: {
        // ── Rampa da marca ──────────────────────────────────────────
        // O azul do logo H&S, medido do arquivo: #1F89CA, matiz 203°.
        // Substitui a rampa `sky` (#0EA5E9) que estava aqui — ela era a cor
        // do HelpHS antes de o design system existir, e o pacote unificou as
        // duas famílias nesta.
        //
        // Cuidado de uso, gravado em `tokens/colors.css`: o 500 dá 3,83:1 no
        // branco. Serve para PREENCHIMENTO — logo, superfície de marca,
        // borda, barra de gráfico, trilho de interruptor — nunca para texto.
        // Quem carrega texto é `action`, abaixo.
        primary: {
          DEFAULT: "var(--color-primary-500)",
          50: "var(--color-primary-50)",
          100: "var(--color-primary-100)",
          200: "var(--color-primary-200)",
          300: "var(--color-primary-300)",
          400: "var(--color-primary-400)",
          500: "var(--color-primary-500)",
          600: "var(--color-primary-600)",
          700: "var(--color-primary-700)",
          800: "var(--color-primary-800)",
          900: "var(--color-primary-900)",
        },

        // ── Nomes do pacote ─────────────────────────────────────────
        // O vocabulário oficial, disponível a partir de agora. As telas
        // migram para cá tela a tela nas Fases 11–16.
        action: {
          DEFAULT: "var(--action)",
          hover: "var(--action-hover)",
          tint: "var(--action-tint)",
        },
        // O fundo do que fica ATRAS — gaveta no celular, modal em qualquer
        // largura. Preto a 60%, valor do pacote. A gaveta escrevia
        // `bg-black/50`: preto cravado, e 10 pontos mais claro que o do
        // design system.
        overlay: "var(--overlay)",
        surface: {
          DEFAULT: "var(--surface)",
          base: "var(--bg-base)",
          elevated: "var(--surface-elevated)",
        },
        // Fundo de badge, aviso e chip: a cor de significado a 15% de
        // opacidade, com o par `on-tint` por cima. É o que faz o selo
        // funcionar nos dois temas sem uma regra `dark:` separada.
        tint: {
          primary: "var(--tint-primary)",
          success: "var(--tint-success)",
          danger: "var(--tint-danger)",
          warning: "var(--tint-warning)",
          info: "var(--tint-info)",
          neutral: "var(--tint-neutral)",
        },
        "on-tint": {
          primary: "var(--on-tint-primary)",
          success: "var(--on-tint-success)",
          danger: "var(--on-tint-danger)",
          warning: "var(--on-tint-warning)",
          info: "var(--on-tint-info)",
          neutral: "var(--on-tint-neutral)",
        },

        // ── Ponte (temporária — decisão D3-a) ───────────────────────
        // Os nomes em português que as telas já usam, no formato de canais
        // "R G B" que o Tailwind exige para aplicar opacidade
        // (`bg-perigo/10`, `bg-sinal/10`, `border-sucesso/30` — 78 usos).
        //
        // Os VALORES são os mesmos do pacote: `src/styles/index.css` declara
        // cada canal com o token de origem no comentário ao lado. Isto não é
        // uma segunda paleta, é a mesma escrita noutro formato.
        //
        // Cada chave em inglês abaixo (`muted`, `strong`, `heading`, `faint`)
        // é o nome do pacote apontando direto para o token, sem passar pela
        // ponte — quem escrever tela nova já pode usar esses.
        superficie: {
          DEFAULT: "rgb(var(--superficie) / <alpha-value>)",
          base: "rgb(var(--superficie-base) / <alpha-value>)",
          elevada: "rgb(var(--superficie-elevada) / <alpha-value>)",
        },
        borda: {
          DEFAULT: "rgb(var(--borda) / <alpha-value>)",
          suave: "rgb(var(--borda-suave) / <alpha-value>)",
          // Traço mais presente: colchete de painel, régua de seção, scrollbar.
          forte: "rgb(var(--borda-forte) / <alpha-value>)",
          muted: "var(--border-muted)",
          strong: "var(--border-strong)",
        },
        conteudo: {
          DEFAULT: "rgb(var(--conteudo) / <alpha-value>)",
          suave: "rgb(var(--conteudo-suave) / <alpha-value>)",
          tenue: "rgb(var(--conteudo-tenue) / <alpha-value>)",
          heading: "var(--text-heading)",
          body: "var(--text-body)",
          muted: "var(--text-muted)",
          // Reprova em 4,5:1 nos dois temas — só elemento NÃO textual
          // (decisão D4-a). Texto terciário usa `conteudo-tenue`.
          faint: "var(--text-faint)",
        },

        // A cor de sinal. Marca o que está ativo, focado ou selecionado, e
        // nada além disso — no instante em que virar cor decorativa, para de
        // significar qualquer coisa. É o `--action` do pacote.
        sinal: "rgb(var(--sinal) / <alpha-value>)",

        // Cores de significado. Existem em variantes fixas porque o
        // significado não muda com o tema: erro é vermelho nos dois. Os três
        // degraus são o 500/700/400 do pacote — já eram, valor a valor, antes
        // desta migração.
        sucesso: {
          DEFAULT: "rgb(var(--sucesso) / <alpha-value>)",
          forte: "rgb(var(--sucesso-forte) / <alpha-value>)",
          suave: "rgb(var(--sucesso-suave) / <alpha-value>)",
        },
        perigo: {
          DEFAULT: "rgb(var(--perigo) / <alpha-value>)",
          forte: "rgb(var(--perigo-forte) / <alpha-value>)",
          suave: "rgb(var(--perigo-suave) / <alpha-value>)",
        },
        alerta: {
          DEFAULT: "rgb(var(--alerta) / <alpha-value>)",
          forte: "rgb(var(--alerta-forte) / <alpha-value>)",
          suave: "rgb(var(--alerta-suave) / <alpha-value>)",
        },
        info: {
          DEFAULT: "rgb(var(--info) / <alpha-value>)",
          forte: "rgb(var(--info-forte) / <alpha-value>)",
          suave: "rgb(var(--info-suave) / <alpha-value>)",
        },
      },

      fontFamily: {
        // As duas pilhas saem do token, e não de uma lista escrita aqui: uma
        // segunda cópia só pode divergir da primeira.
        sans: ["var(--font-sans)"],
        // Monoespaçada para dado de MÁQUINA: protocolo, data, contador,
        // rótulo estrutural, cabeçalho de tabela.
        //
        // Não serve para texto humano — título, descrição e comentário
        // continuam em sans. Descrição de chamado em monoespaçada pequena é
        // o caminho mais curto para o usuário reclamar da tela nova.
        mono: ["var(--font-mono)"],
      },
    },

    // ── Cantos ───────────────────────────────────────────────────────
    //
    // Canto RETO, em tudo. É a pele de console do ChamadosHS, a exceção
    // documentada na seção 8.1 do prompt mestre e em `DS/readme.md`
    // (Fundamentos visuais → Cantos: "ChamadosHS: reto, em tudo"). O
    // `--radius-none` de `tokens/shape.css` existe para isto.
    //
    // Zerar a ESCALA, e não reescrever as telas, é o que aplica a decisão às
    // 112 classes `rounded-*` já escritas em 25 arquivos sem um diff de 200
    // linhas. Foi assim da 1.4 até a 1.6.20; a 1.7.0 devolveu a escala padrão
    // ao portar o visual do HelpHS, e a decisão D2-a de 02/09/2026 traz a
    // pele de console de volta.
    //
    // `full` continua sendo círculo de verdade porque avatar, ponto de status
    // e o anel do spinner são círculo por natureza, não canto arredondado —
    // um spinner quadrado que gira não é um canto reto, é um defeito. Badge e
    // chip, que a seção 8.1 lista como retos, deixam de usar `rounded-full` na
    // Fase 7.
    borderRadius: {
      none: "var(--radius-none)",
      sm: "var(--radius-none)",
      DEFAULT: "var(--radius-none)",
      md: "var(--radius-none)",
      lg: "var(--radius-none)",
      xl: "var(--radius-none)",
      "2xl": "var(--radius-none)",
      "3xl": "var(--radius-none)",
      full: "var(--radius-full)",
    },
  },
  plugins: [],
};
