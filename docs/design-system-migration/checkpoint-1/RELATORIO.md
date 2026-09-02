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
