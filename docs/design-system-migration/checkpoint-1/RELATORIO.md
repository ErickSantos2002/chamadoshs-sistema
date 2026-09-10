# Checkpoint 1 — Fundação (Fases 1–6) — ChamadosHS

02/09/2026 · branch `chore/design-system-adoption` · **sem push**

## Evidências que a §26 exige

| Evidência | Estado |
|---|---|
| `diff -r` vazio entre os `src/design-system/` dos dois repos | ⚠️ falta **um** arquivo — ver abaixo |
| Contagem de hex cravados, antes e depois | ✅ 48 → 42, com a lista |
| `tailwind.config.js` final | ✅ commitado (`8ce59e3`) |
| Screenshot da casca nos dois temas e nos dois sistemas | ❌ **não feito** — decisão 2 |
| `lint`, `typecheck`, `build` verdes com saída colada | ✅ (não há script de lint neste projeto — §27: "não invente scripts") |

### `diff -r` entre os dois repositórios

```
$ diff -rq HelpHS/frontend/src/design-system chamadoshs-sistema/src/design-system
Files .../VERSION.md and .../VERSION.md differ
Files .../tokens/typography.css and .../tokens/typography.css differ
```

Eram **oito** diferenças antes deste checkpoint; agora são duas, e nenhuma é
defeito:

- `VERSION.md` difere **por natureza** — é o registro local de cada repositório,
  e foi justamente para lá que o D3 mandou o aviso de origem.
- `tokens/typography.css` é o **D1-a**, que nesta data virou decisão dos dois
  repositórios. Some quando a sessão do HelpHS auto-hospedar a fonte. Alvo:
  `BD819C48CF0264A48CA8F509A9BAF18E226ADFA8F52C1E2B6CB888BE6C0EECBF`.

As outras seis sumiram no commit `c28ee40`: o cabeçalho de origem da §5.2 saiu
dos sete arquivos, cumprindo o D3 (`o hash vence`), que já estava aprovado para
os dois repositórios e só o HelpHS tinha aplicado. Os seis agora batem byte a
byte com o pacote **e** com o HelpHS, nos hashes que o D3 publicou.

### Hexadecimais cravados

Contados sobre `src/**/*.{ts,tsx,css}`, fora de `src/design-system/`, com os
comentários removidos — o contador ingênuo **sobe** de 84 para 90 porque os
comentários novos citam hex para explicar contraste.

```
antes da Fase 1 (165d919):  48
agora            (HEAD):    42
```

Os seis que saíram são o bloco de toast em `styles/index.css`
(`--toast-bg`, `--toast-color`, `--toast-border`, nos dois temas), que agora vem
de `tokens/colors.css`.

Os 42 que ficam estão **todos** em `src/lib/graficos.ts` (+2 no teste dele) e se
dividem em dois grupos:

- **28 são a paleta categórica de gráfico**, que o pacote não define — lacuna
  registrada na §2.2 e no `VERSION.md`. Validada por contraste e por ΔE em três
  formas de daltonismo (`npm run validar:paleta`).
- **14 são a moldura do gráfico** — grade, eixo, texto e tooltip do Recharts.
  Estes **são token duplicado como literal**: a Fase 1 atualizou os valores para
  os do pacote (`eixo` foi de `#5E6E84` para `#64748B` = `--text-muted`), mas
  continuam escritos à mão porque o Recharts recebe cor por prop, não por CSS.
  É segunda fonte de verdade, contra a §5.4. **Divergência aberta**, a resolver
  na Fase 9 (componentes de dados) ou na Fase 13 (dashboard).

## O que cada fase fez

| Fase | Commit | Resumo |
|---|---|---|
| 1 — Tokens | `a624fd8`, `b721ffc` | Sete arquivos do pacote em `src/design-system/`, importados antes do Tailwind; `theme.extend` remapeado; rampa da marca de `sky` para o azul do logo (#1F89CA); canto reto restaurado; dez hex cravados removidos; `VERSION.md`; `.gitattributes` com `eol=lf` |
| 1 (correção) | `c28ee40` | Cabeçalho de origem removido dos sete arquivos, cumprindo o D3; hashes do `VERSION.md` refeitos; D1-a passa a valer para os dois repositórios |
| 2 — Fontes e assets | `40972e9` | Fonte já era carregada uma única vez (nada a fazer, conferido); `type` do favicon corrigido; `bg-gray-100` sai do `<body>` e o `--bg-base` volta a pintar a página |
| 3 — Tema | `cffce2b` | 41 pares `text-<tom>-forte dark:text-<tom>-suave` em 16 arquivos viram `--on-tint-*`; sobram **três** classes `dark:` no projeto, todas do D5-a |
| 4 — AppLayout | (sem mudança) | Conferido item a item contra a §9; já conforme. `--container-max` não se aplica — o projeto não limita largura |
| 5 — Sidebar | `8ce59e3` | Logo 32→28px; monograma e item ativo em `--action-tint`/`--action`; item inativo em `--text-muted`; `title` no item recolhido; `transition-colors`; gaveta anima o `transform`; `bg-black/50` → `--overlay` |
| 6 — Topbar | `55cc0eb` | `gap-4`; nome da pessoa em `--text-body`. **Falta o `<h1>` da página** — decisão 1 |

### Funcionalidades preservadas (§29)

Nenhuma página foi alterada nas Fases 4–6 — a casca não faz chamada de API, não
filtra, não pagina e não decide permissão. O que ela governa e que foi conferido
no código:

```
[x] a lista de áreas continua saindo de `lib/navegacao.ts`, e só de lá
[x] um único <nav> na árvore (travado por teste)
[x] as cinco áreas e todos os `href` continuam presentes (travado por teste)
[x] item ativo com aria-current (NavLink) e aria-expanded no botão de recolher
[x] gaveta no celular, barra no desktop, no mesmo breakpoint md de antes
[x] menu do usuário: nome, perfil, modo escuro e Sair, todos intactos
[x] a versão continua abrindo o aviso de novidades, com o ponto de não lida
[x] pular para o conteúdo principal continua sendo o primeiro foco
```

Na Fase 3 as 16 telas tiveram troca de **nome de classe de cor**, sem tocar em
chamada, estado, permissão ou texto. `tsc` e os 447 testes cobrem o resto.

## Testes executados

```
npm test        -> Test Files  36 passed (36)
                   Tests      447 passed (447)
                   Duration    44.16s

npm run typecheck -> tsc --noEmit, sem saída (sem erros)

npm run build   -> validar:paleta ok
                   tsc --noEmit ok
                   ✓ built in 10.70s

não há script de lint neste `package.json` (§27)
```

Duas quebras no caminho, ambas por **nome de classe** e ambas tratadas como a
§27 manda (atualizar e explicar), nenhuma por comportamento:

- `ui/BotaoDeAcao.test.tsx`, 2 casos — `hover:text-<tom>-forte` virou
  `hover:text-on-tint-*`. A asserção que importa (a cor do tom só atrás de
  `hover:`) continua igual, inclusive a que proíbe a versão sem variante.
- `layout/casca.test.tsx`, 1 caso — `bg-black/50` virou `bg-overlay`. Acrescentei
  uma asserção nova: o `title` de cada item no modo recolhido.

## Preciso de decisão em três pontos

### 1. O `<h1>` da página, na topbar

A §9 põe o título da página na faixa do topo (`--text-base`, semibold,
`--text-heading`; `AppShell.jsx:163`). Hoje ele não existe lá: o lugar dele é um
`<div className="flex-1" />`.

Pôr agora cria **dois títulos em toda tela**, porque as onze páginas desenham o
próprio `<h1>`: `Auditoria:153`, `Bloqueio:54`, `CadastrosBasicos:99`,
`ChamadoDetalhes:643`, `Chamados:274`, `Dashboard:436`, `EmConstrucao:20`,
`NotFound:8`, `NovoChamado:26`, `TarefasRecorrentes:433` (e `Login:149`, que não
usa a casca). Tirar o `<h1>` das onze é trabalho de página, que a §25 coloca nas
Fases 11–16, uma tela por vez.

- **(a)** Topbar sem título até a Fase 16. Custo: a casca não bate com a §9 no
  checkpoint que existe para conferir a casca.
- **(b)** `<h1>` na topbar agora, lido de `lib/navegacao.ts` pela rota ativa, e
  os onze cabeçalhos de página ajustados no mesmo commit. Custo: mexe em onze
  páginas fora da ordem das fases; cada uma tem subtítulo e ações em volta do
  `<h1>`, então não é remoção mecânica.

**Recomendo (b)**, num commit só e com o checklist da §29 preenchido por página.
A ordem das fases existe para não migrar tela antes de ter primitivo pronto — e
aqui não se está migrando a tela, só tirando um título duplicado.

### 2. Screenshots da casca

A §26 pede screenshot da casca — sidebar expandida, recolhida, gaveta mobile,
topbar — nos dois temas. **Não consegui produzir**: a casca só existe depois do
login, e o login depende da API. Rodar o front sozinho alcança só a tela de
login, que não usa a casca.

- **(a)** Você sobe o ambiente, faz login, e eu dirijo o navegador a partir daí
  para capturar as oito imagens.
- **(b)** Fica registrado como limitação deste checkpoint — foi o que a sessão do
  HelpHS fez no D6, pelo mesmo motivo.

### 3. O `color-mix` do D1 não foi aplicado aqui

O D1 de `COMPARTILHADO/DECISOES.md` está marcado "vale para os dois
repositórios" e manda declarar as cores com `color-mix`. O ChamadosHS declara a
ponte em canais `R G B` (D3-a) e os nomes do pacote em `var()` puro. Medido aqui,
com Tailwind 3.4.17, rodando o Tailwind direto sobre uma sonda de uma linha:

```
bg-sucesso/90            [rgb(var(--x) / <alpha-value>)]   GERADA      <- controle
bg-action/90             [var(--action) puro]              NAO GERADA
bg-tint-info/90          [var(--tint-info) puro]           NAO GERADA
text-on-tint-danger/90   [var(--on-tint-danger) puro]      NAO GERADA
```

Hoje **nada está quebrado**: nenhum utilitário usa opacidade sobre nome do
pacote. Mas as Fases 11–16 migram as telas para esses nomes, e é lá que alguém
escreve `bg-tint-danger/10` e não recebe nada — sem erro de lint, tipo, teste ou
build.

- **(a)** Aplicar o `color-mix` nos nomes do pacote. Custo: Chrome 111+,
  Safari 16.2+, Firefox 113+.
- **(b)** Manter como está e aceitar que o nome do pacote não aceita opacidade
  até a ponte morrer nas Fases 11–16.

**Recomendo (a)** antes da Fase 11, porque a falha é calada e chega justamente
quando o volume de migração for maior.

## Divergências restantes

| O que | Onde | Quando fecha |
|---|---|---|
| `typography.css` diferente do HelpHS | D1-a | quando o HelpHS aplicar |
| 14 cores do Recharts como literal | `lib/graficos.ts` | Fase 9 ou 13 |
| Sem `<h1>` na topbar | §9 | decisão 1 |
| Ponte em português ainda de pé | D3-a | Fases 11–16 |
| `Rotulo` e `Colchetes` | D2-a | Fase 7 |
| Login sem malha e vinheta | D2-a | Fase 16 |
| Nomes misturados (`ring-sinal` ao lado de `text-action`) | §5.3 manda mesclar | Fases 11–16 |

## Risco de regressão

**Baixo.** Nada de comportamento foi tocado: as Fases 2–6 mexeram em nome de
classe, medida e token. As duas mudanças com efeito visual perceptível são o
fundo da gaveta (50% → 60% de preto) e a tinta do item ativo (azul a 10% escrito
à mão → `--action-tint` do pacote, que no tema claro é `primary-50` e no escuro
15%). As duas são o valor que o pacote define.

O que **não** está coberto por teste nem por screenshot é o resultado visual da
troca de `--text-body` para `--text-muted` no item inativo da barra: é meio
degrau mais claro, e só o olho decide se ficou apagado demais. Está na lista da
decisão 2.

---

# Adendo — as três decisões, resolvidas

02/09/2026, mesmo dia, depois do retorno do operador. O corpo do relatório acima
não foi reescrito: ele registra o estado em que o checkpoint parou, e este
adendo registra o que aconteceu depois.

## Decisão 1 — o `<h1>` da topbar → **prop opcional, vazia** (nem (a) nem (b))

O relatório recomendava **(b)**: `<h1>` na topbar agora e os onze cabeçalhos de
página ajustados no mesmo commit. O operador ficou com o caminho do HelpHS, que
é o **D8** de `COMPARTILHADO/DECISOES.md`, e é uma terceira saída que o
relatório não tinha posto na mesa.

`Topbar` e `AppLayout` ganharam a prop opcional `pageTitle`. Ela **nasce vazia**
e nada a passa hoje. Sem ela a topbar não desenha cabeçalho nenhum — nem um
`<h1>` vazio, que leitor de tela anuncia como cabeçalho sem nome. Cada tela
passa a preencher no commit em que for migrada (Fases 11–16), soltando no mesmo
commit o `<h1>` que tem hoje. É a troca dentro do mesmo commit que garante que
nunca haja dois nem zero. A Fase 20 confere.

Custa menos que o (b) e não mexe em onze páginas fora da ordem das fases; em
troca, a topbar só bate com a §9 quando a última tela migrar. Dois testes novos
travam as duas pontas.

Commit `f5e5336`. A prop, preenchida, está fotografada em
`screenshots/chamadoshs-casca-topbar-menu-*.png`.

## Decisão 2 — screenshots da casca → **feitos**, por uma galeria de DEV

O relatório dava duas saídas: (a) subir o ambiente e dirigir o navegador, ou
(b) registrar como limitação. O operador escolheu uma terceira: uma **galeria de
desenvolvimento** que monta a casca de verdade sem token, sem API e sem rede,
com o estado escolhido pela URL.

As **oito** imagens que a §26 pedia estão em `screenshots/`, nas resoluções que
a §28 exige (1366×768 e 390×844), com o índice, os endereços para refazer cada
uma e as limitações em `screenshots/LEIA-ME.md`.

A galeria (`/dev/galeria`) só existe sob `import.meta.env.DEV`: depois do
`npm run build`, nenhum arquivo de `dist/` contém a palavra "galeria".

Fica **fechada** a linha "Screenshot da casca nos dois temas e nos dois
sistemas: ❌ não feito" da tabela de evidências — para o ChamadosHS. O HelpHS
segue com a limitação do D6.

**Continua em aberto**, e não deve ser lido como cumprido: a §28 pede
**antes/depois**, e o "antes" não existe para tela autenticada, pelo mesmo
motivo. Estas oito são o depois.

Uma coisa que só o olho decidia e agora está decidida: o item inativo da barra
lateral em `--text-muted` em vez de `--text-body`. Está nas quatro imagens de
1366px e não ficou apagado demais.

## Decisão 3 — o `color-mix` do D1 → **aplicado** (a), e o D7 fica desatualizado

O relatório recomendava **(a)**, e é o que o operador mandou fazer.

A medição refeita foi bem mais ampla do que a do relatório: não eram três
classes, eram **31** — todas as cores do pacote. Numa sonda com uma classe com
modificador para cada cor declarada em `theme.extend.colors`, 6 de 37 eram
geradas antes e 37 de 37 depois. As 6 que já funcionavam eram as da ponte em
português (D3-a), que não foi tocada.

Isso derruba o argumento do **[HelpHS] D7**, que tinha tirado o D1 de "vale para
os dois" dizendo que a ponte daqui já cumpria o invariante. Ela cumpria **só
para os nomes em português** — não para os nomes do pacote, que é justamente o
vocabulário para onde as Fases 11–16 migram. O D1 volta a valer para os dois
repositórios. Registrado como **D8-a** em `COMPARTILHADO/DECISOES.md`.

Prova no CSS compilado do projeto, não só na sonda — `dist/assets/index-*.css`
traz `color-mix` em 9 regras (14 ocorrências com as variantes `:hover`).

**Duas coisas que a auditoria pegou depois de aplicado**, ambas confirmadas por
medição no Chrome e escritas por extenso no D8-a:

1. Em **sete** tokens que já carregam alfa próprio (`--overlay`, os cinco
   `--tint-*` e o `--action-tint` no escuro) o modificador **multiplica** em vez
   de definir: `bg-tint-danger/10` sai em alfa 0,015, não 0,10. Não é
   regressão — a classe não existia antes —, mas é armadilha, porque
   `bg-perigo/10` (a ponte) **define**. Regra de uso escrita no
   `tailwind.config.js`: nesses sete, sem modificador.
2. Abaixo do piso do `color-mix` (Chrome/Edge 107–110, Firefox 104–112, Safari
   16.0–16.1) a falha é **calada e parcial**, e um fallback antes da declaração
   **não** cobre — medido: cai para `unset`, não para a declaração anterior. O
   `build.target` que o Vite 7.3.6 resolve por padrão aqui é
   `chrome107/edge107/firefox104/safari16`, ou seja, abaixo do piso, e nada na
   cadeia avisa.

## O que este adendo NÃO fecha

Segue tudo o que a tabela "Divergências restantes" lista, menos a linha do
`<h1>`. Em especial:

- **`typography.css` diferente do HelpHS (D1-a).** Nesta rodada foi preparado o
  material para resolver na raiz, no pacote, em vez de repetir o desvio nos
  dois consumidores: `COMPARTILHADO/emendas-pacote/` traz o `typography.css`
  com bloco `@font-face` auto-hospedado (seis pesos, `latin` e `latin-ext` com
  `unicode-range`) e os doze `.woff2`. **Nada foi aplicado**: o `@fontsource` e
  os `@import` de `styles/index.css` continuam no lugar de propósito, para não
  haver uma janela sem fonte. A remoção vira commit próprio depois que o pacote
  for emendado e recopiado.
- 14 cores do Recharts como literal (Fase 9 ou 13).
- Ponte em português de pé (D3-a, Fases 11–16).
- `Rotulo` e `Colchetes` (Fase 7), login sem malha e vinheta (Fase 16).
