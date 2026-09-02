# Fase 0 — Diagnóstico — ChamadosHS

> Escopo desta sessão: **apenas `chamadoshs-sistema`**. O HelpHS está sendo migrado
> em paralelo por outra sessão e não é acessível aqui — a coluna HelpHS das matrizes
> fica marcada como `— (outra sessão)`.
>
> `design-system/` e `chamadoshs-api/` foram lidos, e **nada** foi escrito neles.
> Nenhum arquivo de código deste repositório foi alterado nesta fase.

Data: 02/09/2026 · HEAD `165d919` · árvore limpa · versão do app `1.7.6`

---

## 0. Entradas confirmadas

| Entrada | Caminho | Situação |
|---|---|---|
| Design System (`DS/`) | `GitHub/design-system/` | ✅ presente, **158 arquivos** — bate com o manifesto |
| ChamadosHS | `GitHub/chamadoshs-sistema/` | ✅ alvo desta sessão |
| API do ChamadosHS | `GitHub/chamadoshs-api/` | ✅ lida, somente leitura |
| HelpHS | — | ⛔ fora desta sessão |
| `COMPARTILHADO/DECISOES.md` | — | ⛔ **não existe ainda** (ver §7) |

---

## 1. O achado que condiciona todo o resto

**O Design System descreve um ChamadosHS que não existe mais desde 27/08/2026.**

`DS/github.md` grava a data de sincronização: `2026-08-23T19:23:16Z`. O mapa de telas
desse mesmo arquivo cita, como origem do ChamadosHS, arquivos que hoje não existem:

| Arquivo citado em `DS/github.md` | Situação hoje |
|---|---|
| `components/ui/Colchetes.tsx` | ❌ removido — commit `0f94122` (27/08) |
| `components/Sidebar.tsx`, `components/Header.tsx` | ❌ movidos para `components/layout/{Sidebar,Topbar}.tsx` — `d146405` (27/08) |
| `components/ui/Rotulo.tsx` (mono, 11px) | ⚠️ existe, mas reescrito em sans/10px — `993ebc5` (27/08) |

Entre 23/08 e 27/08 entrou o merge `241db32` — *"o front do ChamadosHS passa a usar o
design do HelpHS (1.7.0)"* —, que desfez deliberadamente as quatro marcas da pele de
console:

```
e30761b  feat(design): paleta, fonte e cantos do HelpHS
993ebc5  feat(design): o rótulo sai da monoespaçada, e sete campos ganham o rótulo certo
0f94122  feat(design): retira os colchetes de canto dos painéis
d146405  feat(casca): AppLayout, Sidebar e Topbar no molde do HelpHS
```

Consequência prática: a seção 8.1 do prompt mestre manda **preservar** a pele de
console, mas neste repositório não há o que preservar — o que ela pede é uma
**restauração**. Isso muda o tamanho e o risco das Fases 1, 5, 7–10 e 16, e está
detalhado como Decisão **D2** na §7.

---

## 2. Matriz de Diagnóstico

| Área | HelpHS atual | ChamadosHS atual | Design System | Ação necessária |
|---|---|---|---|---|
| **Versões** | — (outra sessão) | React 19.1 · TS 5.8 · Vite 7.0 · **Tailwind 3.4.17** · Vitest 3.2 | assume React/TS/Vite/Tailwind | Nenhuma. Tailwind v3 → `theme.extend` clássico (§5.3), sem `@theme` |
| **Tema** | — | classe `dark` no `<html>` via `ThemeContext` (`documentElement.classList`), persistida em `localStorage['theme']`; escuro é o padrão de quem nunca escolheu; **sem** `prefers-color-scheme` | classe `dark` no `<html>` | ✅ já é a estratégia do pacote. Único ruído: o `ThemeProvider` **também** aplica `dark` num `<div>` interno (`ThemeContext.tsx:57`) — redundante |
| **CSS global** | — | `src/styles/index.css` — 6 `@import` do `@fontsource` → `@tailwind base/components/utilities` → tokens em `@layer base` | tokens **antes** das diretivas | Reordenar: `@import "../design-system/styles.css"` antes de `@tailwind` (§5.2). Depende de **D1** |
| **Tailwind config** | — | `tailwind.config.js` (CommonJS): `darkMode:"class"`, `safelist:[]`, `theme.extend.colors` = rampa `primary` **sky `#0EA5E9`** + `superficie/borda/conteudo/sinal` (via `rgb(var() / <alpha-value>)`) + `sucesso/perigo/alerta/info` (hex fixos); `fontFamily.sans/mono`; **sem** `borderRadius` (escala padrão do Tailwind, deliberado) | bloco de `adocao.md` | Mesclar preservando `safelist` e `fontFamily.mono`. Rampa `primary` sky → **#1F89CA**. `borderRadius` depende de **D2** |
| **Tokens de cor** | — | 11 tokens semânticos próprios em formato **`R G B`** (canais, não hex) — exigido pelo `<alpha-value>` do Tailwind | 102 tokens de cor em **hex** e `rgb()/opacidade` | Conflito de formato → **D3** |
| **Fonte** | — | Plus Jakarta Sans **auto-hospedada** (`@fontsource`, 6 pesos latinos, ~76 KB no bundle). Política escrita no repo: nada de CDN externo | `tokens/typography.css` faz `@import` do **Google Fonts** | Conflito direto → **D1** |
| **Ícones** | — | conjunto próprio em `src/components/ui/icones.tsx`, SVG desenhado no projeto (12 ícones vieram de `icons8` e foram internalizados) | `Icon` + `ICON_PATHS` (25 nomes) | Manter o conjunto próprio (§7.1 concorda); alinhar **tamanho e stroke** (16/20/24; 1.75 nav, 2 botão) |
| **Gráficos** | — | `recharts` 3.5.1 + `src/lib/graficos.ts` (5 categóricas + status + prioridade, por tema, validadas por ΔE e daltonismo) | não define paleta categórica | Manter (§2.2). Série principal e grade/eixos → tokens. Lacuna registrada |
| **Toast** | — | `react-hot-toast` 2.6.0, config única em `App.tsx`: `top-right`, `top:80`, `4000ms`, cores por `var(--toast-*)` | mesma especificação | ✅ já conforme. Só os 4 hex do `iconTheme` (`App.tsx:33-34`) saem para token |
| **Casca (layout)** | — | `components/layout/{AppLayout,Sidebar,Topbar}.tsx`. Sidebar 256/72px, topbar 64px, `<main>` rola sozinho, `p-4 md:p-6`, gaveta mobile 300ms, rodapé com versão + `© 2026 Health & Safety Tech` 11px | `AppShell.jsx` | **Já muito próxima.** Falta: **h1 da página na topbar** (hoje há um `<div class="flex-1"/>` vazio, `Topbar.tsx:113`) |
| **Roteamento e permissões** | — | `react-router-dom` 6.30, `src/router.tsx` (`<Routes>` único, lazy). `ProtectedRoute` com `perfil={['Administrador','Tecnico']}` em `/cadastros`, `/tarefas-recorrentes`, `/auditoria`; tela `Bloqueio` explica em vez de redirecionar | governado pelo projeto | Não tocar |
| **Navegação** | — | `src/lib/navegacao.ts` — lista única, grupos `Principal` / `Gestão`, mostra tudo a todos por decisão registrada | grupos por área | Preservar. Só o rótulo de grupo muda de token |
| **Componentes ui** | — | 13 primitivos em `src/components/ui/` + barril `index.ts`. **Sem** biblioteca de terceiros (sem Radix/shadcn/headless) | 30 primitivos | Ver matriz §4 |
| **Páginas** | — | 12 páginas (§3) | — | Fases 11–16 |
| **Testes** | — | Vitest 3.2 + jsdom + Testing Library. **36 arquivos, 447 testes.** Sem Playwright, sem Storybook, sem e2e | — | Rodar em cada checkpoint. Sem regressão visual automatizada → §28 será por screenshot manual |
| **Lint** | — | **Não há ESLint.** Há `prettier` + `prettier-plugin-tailwindcss` | `_adherence.oxlintrc.json` como inspiração | §5.4: lint de aderência é opcional e **só se já houver ESLint** → não instalar |
| **Validações próprias** | — | ✅ **`npm run validar:paleta` existe** (`scripts/validar-paleta.js`) e roda **dentro do `npm run build`**. Exige 4,5:1 para os 3 tokens de conteúdo + sinal, 3:1 para gráfico, ΔE ≥ 20 entre cores vizinhas em 4 visões | — | É uma trava real sobre a Fase 1 → **D4** |
| **`dark:` por classe** | — | **48 ocorrências** reais (§5) — todas em cores semânticas | `--on-tint-*` troca sozinho | Fase 3: substituir por `--on-tint-*` |

---

## 3. Páginas, rotas e perfis

| Rota | Arquivo | Perfil |
|---|---|---|
| `/login` | `pages/Login.tsx` | público |
| `/dashboard` | `pages/Dashboard.tsx` | autenticado |
| `/chamados` | `pages/Chamados.tsx` (kanban) | autenticado |
| `/chamados/novo` | `pages/NovoChamado.tsx` | autenticado |
| `/chamados/:id` | `pages/ChamadoDetalhes.tsx` | autenticado |
| `/cadastros` | `pages/CadastrosBasicos.tsx` (abas) | Administrador, Tecnico |
| `/tarefas-recorrentes` | `pages/TarefasRecorrentes.tsx` | Administrador, Tecnico |
| `/auditoria` | `pages/Auditoria.tsx` | Administrador, Tecnico |
| `/` | → `/dashboard` | — |
| `*` | `pages/NotFound.tsx` | — |
| (sem rota) | `pages/Bloqueio.tsx` | acesso negado |
| (sem rota) | `pages/EmConstrucao.tsx` | — |

---

## 4. Matriz de componentes (§7.1) — coluna ChamadosHS

`✅` existe e está próximo · `⚠️` existe e diverge · `➕` não existe, precisa ser criado · `➖` não se aplica

| Componente oficial | HelpHS | ChamadosHS (`src/…`) | Situação | Estratégia |
|---|---|---|---|---|
| `core/Button` | — | `components/ui/Button.tsx` | ⚠️ | Variantes em PT (`primario/secundario/sucesso/perigo/fantasma`) mapeiam 1:1 para as do DS. **Preservar a API em português** (adaptador interno). Corrigir: `hover:brightness-110` → `--action-hover` (§8.2 proíbe hover que clareia). Texto do primário no escuro → **D5** |
| `core/Card` (+Header/Body) | — | `components/ui/Card.tsx` | ⚠️ | Falta `CardTitle` e a prop `padding none/sm/md/lg` (hoje o padding é fixo `px-5 py-4`). `clickable` já vira `<button>` e faz hover de borda — ✅ conforme. Raio → **D2** |
| `core/Badge` | — | `components/ui/Badge.tsx` | ⚠️ | Opacidade **20% → 15%** (`--tint-*`); borda 30% ✅. Faltam variantes `primary` e `muted` (hoje: `neutro/info/sucesso/alerta/perigo`). `dark:` sai por `--on-tint-*` |
| `core/StatusBadge` | — | ➕ | ➕ | Hoje o rótulo/cor de status é escrito à mão nas telas. Criar a partir do mapa da §6 |
| `core/PriorityBadge` | — | ➕ | ➕ | Idem |
| `core/TagBadge` | — | ➖ | ➖ | Não há etiqueta de cor livre no cadastro |
| `core/Avatar` | — | `components/ui/Avatar.tsx` | ⚠️ | Existe e deriva cor do nome ✅. Falta a prop `size` (`xs/sm/md/lg`) — hoje o tamanho vai por `className` |
| `core/Spinner` | — | ➕ | ➕ | Há 3 spinners inline (`router.tsx:26`, `ProtectedRoute`, `Button`). Extrair primitivo |
| `core/Rotulo` | — | `components/ui/Rotulo.tsx` | ⚠️ | **Existe, mas em sans/10px** — foi tirado da mono em `993ebc5`. Voltar a mono/12px/`0.1em` depende de **D2** |
| `core/Colchetes` | — | ➕ | ➕ | **Removido em `0f94122`.** Recriar depende de **D2** |
| `core/Icon` | — | `components/ui/icones.tsx` | ⚠️ | Conjunto próprio, mantido. Alinhar `size`/`strokeWidth` |
| `forms/Input` | — | `components/ui/Input.tsx` + `ui/Campo.tsx` | ⚠️ | `Input` não tem `label`/`error`/`hint` — isso mora em `Campo.tsx` (`RotuloDeCampo`, `MensagemDeErro`). Composição válida; alinhar tokens e a regra "erro **substitui** o hint" |
| `forms/Textarea` | — | `components/ui/Textarea.tsx` | ⚠️ | Existe. Conferir `min-height 80px` e `resize: vertical` |
| `forms/Select` | — | `<select>` solto em `NovoChamadoForm.tsx`, `Auditoria.tsx` | ⚠️ | Extrair primitivo com os tokens do `Input` |
| `forms/SearchSelect` | — | `components/ui/Seletor.tsx` | ⚠️ | Lista própria, já com posicionamento calculado. Falta `variant="form" \| "filter"` |
| `forms/Checkbox` | — | inline em `cadastros/UsuarioModal.tsx`, `TarefasRecorrentes.tsx` | ➕ | Extrair primitivo |
| `forms/Radio` | — | ➖ | ➖ | **Não há nenhum `type="radio"` no projeto.** Não criar |
| `forms/Switch` | — | inline em `layout/Topbar.tsx:155-168` | ➕ | Ocorrência **única** (a duplicação Sidebar/Header que o prompt cita saiu em `d146405`). Extrair mesmo assim |
| `forms/FileUpload` | — | ➖ | ➖ | Não há upload de anexo no front (o model `Anexo` existe na API, a tela não) |
| `data/Table` | — | `<table>` em `cadastros/{Categorias,Setores,Usuarios}Tab.tsx`, `Auditoria.tsx`, `Dashboard.tsx`, `TarefasRecorrentes.tsx` | ➕ | 6 tabelas escritas à mão. Extrair `Table`+`TableEmpty` — maior ganho de consistência da Fase 9 |
| `data/Pagination` | — | ➖ (verificar) | ➖ | Nenhuma lista pagina hoje; o kanban carrega tudo. Não criar |
| `data/SlaChip` | — | `components/SlaBadge.tsx` | ⚠️ | Existe como badge. Alinhar ao `SlaChip` (raio `--radius-md`, cor por `breached`) |
| `data/Progress` | — | `components/SlaProgresso.tsx` | ⚠️ | Existe. Alinhar `tone` (`ontrack/attention/breached/neutral`) e `done` |
| `data/Rating` | — | `components/Avaliacao.tsx` | ⚠️ | Existe. Conferir contra `Rating.prompt.md` (só solicitante, só após resolvido, `aria-label`) |
| `feedback/Alert` | — | ➕ | ➕ | Não existe primitivo; hoje são caixas ad-hoc |
| `feedback/Modal` | — | `components/ui/Modal.tsx` | ⚠️ | Existe com `largura sm/md/lg/xl` (DS tem 5: `sm/md/lg/xl/2xl`) e `fecharAoClicarFora` (hoje **desligado** por decisão de 01/09 — `bef6d38`, `be572ef`; o DS pede que feche no clique de fora → **D6**) |
| `feedback/Toast` | — | config do `react-hot-toast` em `App.tsx` | ✅ | Só os 4 hex do `iconTheme` |
| `feedback/Tooltip` | — | inline em `layout/Sidebar.tsx` (2×) e `Topbar` | ➕ | Extrair primitivo |
| `navigation/Tabs` | — | abas em `pages/CadastrosBasicos.tsx` | ➕ | Extrair primitivo |
| `navigation/AppShell` | — | `components/layout/{AppLayout,Sidebar,Topbar}.tsx` | ⚠️ | Muito próxima. Falta o **h1 na topbar** |

**Resumo:** 13 primitivos existentes (11 a ajustar, 2 conformes), **11 a criar**, 4 não se aplicam.

---

## 5. Linha de base — hexadecimais e `dark:`

### Hexadecimais cravados fora dos arquivos de token

| Arquivo | Linhas | Valores | Natureza |
|---|---|---|---|
| `src/App.tsx` | 33, 34 | `#10b981`, `#fff`, `#ef4444`, `#fff` | `iconTheme` do toast — **têm token** (`--color-success-500`, `--color-danger-500`) → sai na Fase 10 |
| `src/lib/graficos.ts` | 39–43, 47–51, 81–91, 96, 117–133, 138, 158–167 | 38 linhas | Paleta de gráfico + tema do tooltip. **O DS não define paleta categórica** (§2.2) → permanece, com as linhas 158–167 passando a ler token |
| `src/components/ui/Input.tsx` | 26 | — | comentário, não é valor |

**Total fora de arquivos de token: 40 linhas** (2 com token disponível, 38 sem).
Dentro de `src/styles/index.css`: 26 linhas (arquivo de token — legítimo).

### Ocorrências de `dark:` por classe

**48 ocorrências reais** (+3 em comentários). Todas em cores semânticas, todas com
token equivalente no DS (`--on-tint-*`):

| Classe | × |
|---|---|
| `dark:text-perigo-suave` | 20 |
| `dark:text-alerta-suave` | 10 |
| `dark:text-sucesso-suave` | 6 |
| `dark:text-info-suave` | 5 |
| `dark:text-superficie-base` | 3 |
| `dark:hover:text-{sucesso,perigo,info,alerta}-suave` | 4 |

Por arquivo: `ChamadoDetalhes.tsx` 10 · `Dashboard.tsx` 7 · `UsuariosTab.tsx` 6 ·
`ui/Badge.tsx` 5 · `ui/BotaoDeAcao.tsx` 4 · outros 16 arquivos com 1–2.

> Observação: a arquitetura semântica do ChamadosHS **já elimina** o `dark:` de
> superfície, borda e conteúdo. As 48 restantes existem só porque
> `sucesso/perigo/alerta/info` foram declarados como hex fixos no Tailwind, sem
> variação por tema. É exatamente o buraco que `--on-tint-*` tapa.

---

## 6. Enums da API (somente leitura) — insumo do mapa da §16

`chamadoshs-api/app/models/chamado.py:48-50`

```
status      IN ('Aberto', 'Em Andamento', 'Aguardando', 'Resolvido', 'Fechado')
prioridade  IN ('Baixa', 'Média', 'Alta', 'Crítica')
urgencia    IS NULL OR IN ('Não Urgente', 'Normal', 'Urgente', 'Muito Urgente')
```

Mais duas **flags booleanas** que não são status e mudam a aparência do cartão:
`cancelado` e `arquivado` (`chamado.py:40-41`).

O mapa status → variante será apresentado no **Checkpoint 2**, como pedido. Anoto
desde já os dois pontos que vão precisar de decisão lá: o `Aguardando` do ChamadosHS
não distingue *cliente* de *técnico* (o DS tem duas variantes para isso, ambas
`warning`), e `cancelado`/`arquivado` não têm equivalente no mapa do pacote.

---

## 7. Decisões que travam a Fase 1

`COMPARTILHADO/DECISOES.md` **não existe**. Nenhuma das decisões abaixo está tomada,
e as Fases 1–3 não podem começar sem D1–D4. Todas são casos que o próprio prompt
mestre manda parar e perguntar (§1, §2.2, §11, §26).

Proponho uma opção em cada; a escolha é sua.

---

### D1 — Fonte: o token do DS traz o Google Fonts, e este repo proíbe CDN

`DS/tokens/typography.css:17` faz `@import url("https://fonts.googleapis.com/...")`.
A §5.2 manda copiar os tokens **byte a byte, sem editar**.

Este repositório **já serve a mesma fonte, nos mesmos 6 pesos**, auto-hospedada
(`@fontsource/plus-jakarta-sans`, ~76 KB). A política está escrita em três lugares
(`styles/index.css`, `tailwind.config.js`, `recursos-externos.test.ts`) e tem
motivo registrado: o sistema roda na rede interna e já houve 12 ícones vindos de
`img.icons8.com`. A §11 do prompt prevê exatamente isto: *"Se houver política de não
usar CDN externo, pare e pergunte."*

| Opção | Consequência |
|---|---|
| **D1-a (recomendada)** — copiar `typography.css` com a **única** alteração de comentar o `@import` do Google, mantendo os `@fontsource` no CSS global. Registrar como desvio local em `VERSION.md` | Fonte idêntica, zero dependência externa, política do repo preservada. Custo: 1 desvio documentado do "byte a byte" |
| D1-b — copiar verbatim e remover os `@fontsource` | Introduz dependência de CDN externo contra política escrita; a tipografia some em silêncio se o Google for bloqueado |
| D1-c — copiar verbatim **e** manter `@fontsource` | Fonte carregada duas vezes; a §11 proíbe explicitamente |

---

### D2 — A pele de console: restaurar ou assumir que a 1.7.0 a aposentou

Este é o item de maior impacto. Ver §1: o DS fotografou o ChamadosHS em **23/08**, e
em **27/08** a 1.7.0 desfez as quatro marcas de propósito, com justificativa escrita
em cada arquivo.

Você me instruiu que as exceções da §8.1 valem para este repositório. Antes de eu
executar isso, quero que a conta esteja à vista, porque é uma reversão e não uma
preservação:

| Marca | Estado hoje | Restaurar custa |
|---|---|---|
| Canto reto (`--radius-none` em tudo) | escala padrão do Tailwind (8px/12px), deliberado em `e30761b` | zerar `borderRadius` no config — atinge **112 classes `rounded-*` em 25 arquivos** de uma vez |
| `Colchetes` | removido em `0f94122` | criar o componente + aplicar em modal, coluna do kanban, seção e login |
| `Rotulo` mono | sans/10px desde `993ebc5` | reescrever o componente; conferir os 7 campos que ganharam `RotuloDeCampo` na mesma leva |
| Login malha + vinheta | removido em `0f94122`; a tela virou o formato de duas colunas do HelpHS | reescrever `pages/Login.tsx` e devolver `.malha`/`.vinheta` ao CSS |

| Opção | Consequência |
|---|---|
| **D2-a** — restaurar as quatro, como manda a §8.1 e sua instrução | ChamadosHS volta a ter identidade própria e o DS passa a descrever a realidade. Custo alto: reverte 4 dos 12 commits da 1.7.0 e reescreve o login. Risco visual alto, funcional baixo |
| D2-b — aplicar tokens, cor, tipografia e casca do DS, **sem** a pele de console; registrar a §8.1 como divergência intencional e pedir que o DS seja re-sincronizado | Custo baixo, risco baixo, ganho grande (paleta oficial, `--on-tint-*`, primitivos). Mas contraria a §8.1 e sua instrução explícita |
| D2-c — restaurar só `Rotulo` mono e `Colchetes` (as duas baratas), manter canto arredondado e o login novo | Meio-termo sem coerência: colchete de console em painel de canto redondo |

Não escolho por você. Se confirmar **D2-a**, executo sem mais perguntas — só queria
que a reversão fosse uma decisão tomada, e não um efeito colateral.

---

### D3 — Formato dos tokens: hex do DS × canais `R G B` do Tailwind

Os tokens do ChamadosHS são canais separados por espaço (`--superficie: 255 255 255`)
porque o Tailwind exige esse formato para `rgb(var(--x) / <alpha-value>)` — é o que
faz `bg-superficie/50`, `bg-info/20`, `bg-sinal/10` funcionarem. Há **~30 usos** de
classe com opacidade hoje.

Os tokens do DS são hex. Um alias direto (`--superficie: var(--surface)`) **quebra
todas essas classes**, porque `rgb(#ffffff / 0.5)` não é CSS válido.

| Opção | Consequência |
|---|---|
| **D3-a (recomendada)** — copiar `DS/tokens/` intacto e manter, em `styles/index.css`, uma camada fina de ponte com os canais correspondentes, comentando o token do DS de origem em cada linha. Migrar as classes tela a tela nas Fases 11–16 e remover a ponte no fim | Tokens do DS ficam byte a byte idênticos ✅; opacidade continua funcionando; migração incremental e verificável. Custo: duas camadas coexistindo até a Fase 16 |
| D3-b — converter as ~30 classes com opacidade para `var(--tint-*)` já na Fase 1 | Elimina a ponte de imediato, mas mistura Fase 1 com Fases 11–16 e vai contra "migre por tela, não por componente" (§25) |

---

### D4 — `--text-faint` não passa em 4,5:1, e o `validar:paleta` roda no build

Contas feitas com os valores reais de `DS/tokens/colors.css`:

```
=== TEMA CLARO — texto (piso 4,5:1) ===
  ok     --text-muted    slate-500     surface   4.76:1   bg-base   4.55:1
  FALHA  --text-faint    slate-400     surface   2.56:1   bg-base   2.45:1
=== TEMA ESCURO ===
  ok     --text-muted    slate-400     surface   6.23:1   bg-base   6.78:1
  FALHA  --text-faint    slate-500     surface   3.36:1   bg-base   3.66:1
```

O DS usa `--text-faint` em texto de verdade: rótulo de grupo da sidebar, placeholder,
rodapé "© 2026". O ChamadosHS usa `--conteudo-tenue` nesses mesmos lugares, com
**5,20:1 / 4,87:1** — medido e travado pelo `validar:paleta`, que roda dentro do
`npm run build`. Apontar `--conteudo-tenue` para `--text-faint` derruba o build.

(Um caso de fronteira no mesmo levantamento: `--on-tint-warning` no claro dá
**4,48:1** — 0,02 abaixo do piso.)

| Opção | Consequência |
|---|---|
| **D4-a (recomendada)** — `--conteudo-tenue` → **`--text-muted`** (4,76/4,55 ✅), e `--text-faint` fica reservado a elemento **não textual**. Registrar como desvio em `VERSION.md`. Para `--on-tint-warning`, usar `--color-warning-700` sobre tinta, que é o mesmo valor, e anotar o 4,48 | Mantém WCAG AA e o build verde. Custo: 1 desvio documentado |
| D4-b — adotar `--text-faint` como está e afrouxar o piso do `validar:paleta` | Contraria a §21 e desmonta a única trava automática de cor do projeto |
| D4-c — adotar `--text-faint` só onde o DS usa e manter `--conteudo-tenue` no resto | Duas cores de texto terciário convivendo — a divergência que a migração existe para acabar |

---

### D5 — Texto do botão primário no escuro

`DS/components/core/Button.jsx` usa `--text-on-primary` (branco) nas duas temas. No
escuro `--action` é `#47A6E1`, e **branco sobre ele dá 2,69:1** — reprova.
O ChamadosHS resolve hoje com `dark:text-superficie-base` (navy sobre azul claro):
**6,47:1**.

| Opção | Consequência |
|---|---|
| **D5-a (recomendada)** — manter a solução atual do ChamadosHS e registrar como desvio; sugerir a correção ao DS no relatório final | AA preservado. §2.1 põe `tokens > componentes`, e o token `--text-on-primary` não é redefinido no `.dark` — então isto é lacuna do pacote, não escolha local |
| D5-b — seguir o `Button.jsx` literalmente | Botão primário reprova contraste no escuro, que é o tema padrão deste sistema |

---

### D6 — Modal: fechar no clique de fora

`Modal.prompt.md` diz que o modal fecha com Esc **e com clique no fundo**. Este repo
**desligou** o clique de fora em 01/09 (`bef6d38`, `be572ef`) — dois commits de
correção, ou seja, foi resposta a um problema real de perda de formulário preenchido.

| Opção | Consequência |
|---|---|
| **D6-a (recomendada)** — manter desligado, registrar como desvio funcional deliberado | Não reintroduz um defeito consertado há um dia. A §30 proíbe reverter comportamento por motivo visual |
| D6-b — religar conforme o DS | Regressão funcional conhecida |

---

## 8. Linha de base de testes (§27) — executada, saída colada

```
$ npm run validar:paleta
  ok   conteudo-tenue sobre superficie                5.20:1
  ok   sinal sobre superficie                         5.93:1
  ok   categóricas entre si                         pior par ΔE  26.1
  ...
Paleta validada.                                   → exit 0

$ npm run typecheck        (tsc --noEmit)          → exit 0, sem erros

$ npm test                 (vitest run)
 Test Files  36 passed (36)
      Tests  447 passed (447)
   Duration  42.94s                                → exit 0

$ npm run build            (validar:paleta && tsc --noEmit && vite build)
 dist/assets/index-CwGFIrUA.js      347.15 kB │ gzip: 115.08 kB
 dist/assets/Dashboard-Br-mejuM.js  361.73 kB │ gzip: 106.16 kB
 ✓ built in 33.40s                                 → exit 0
```

**Tudo verde antes de qualquer alteração.** Este é o estado a que qualquer checkpoint
seguinte tem de voltar.

---

## 9. Divergências de conferência anotadas (§2.1)

- **Rótulo de grupo da sidebar** — o prompt pede que se anote: `AppShell.jsx` usa sans
  (`--text-2xs`, semibold, caixa alta, `--tracking-label`, `--text-faint`) e
  `templates/listagem/Listagem.dc.html` usa mono. O ChamadosHS hoje está **igual ao
  `AppShell.jsx`** (`text-[10px] font-semibold uppercase tracking-widest`), exceto pela
  cor (`--conteudo-tenue`, ver D4). Componente publicado vence.
- **`hs-logo-pulse`** — o `drop-shadow` do keyframe usa `rgb(14 165 233 / …)`, herdado do
  `tailwind.config.js` do HelpHS e não da rampa nova. Mantido como está, conforme §4.2.
- **`--action-tint` no claro** é `--color-primary-50` (cor sólida `#F1F9FE`), enquanto
  no escuro é `rgb(31 137 202 / 0.15)`. O ChamadosHS usa `bg-sinal/10` nos dois. Ajuste
  da Fase 5.

---

## 10. O que **não** foi feito nesta fase

- Nenhum arquivo de código alterado. `git status` limpo em `165d919`.
- Nada escrito em `design-system/` nem em `chamadoshs-api/`.
- Sem screenshots de linha de base ainda: o projeto não tem Playwright, e a §28 pede
  captura manual. Faço na Fase 1, junto com o "antes", assim que D1–D4 estiverem
  decididas — capturar antes disso só produziria imagens a refazer se D2 mudar a tela.
- `COMPARTILHADO/DECISOES.md` **não foi criado**: é arquivo compartilhado com a sessão
  do HelpHS, e escrever nele antes da sua decisão criaria fato consumado para os dois
  repositórios. Assim que você decidir D1–D6, eu o escrevo.
