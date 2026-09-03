# Design System — versão adotada no ChamadosHS

| | |
|---|---|
| **Pacote** | Health & Safety Design System |
| **Export** | 02/09/2026 (`Health__amp__Safety_Design_System.zip`, 158 arquivos) |
| **Namespace do manifesto** | `HealthAmpSafetyDesignSystem_ef9f35` |
| **Sincronização do pacote com os repositórios** | 23/08/2026 (`DS/github.md`) |
| **Copiado para cá em** | 02/09/2026, Fase 1 |
| **Estratégia** | Opção A — tokens e componentes locais sincronizados (§6 do prompt mestre). Sem pacote npm, sem monorepo |

## Como atualizar

Alterar no design system → recopiar `styles.css` e `tokens/` para cá → reaplicar
os desvios listados abaixo → conferir os hashes → rodar `npm run build`.

**Não editar os arquivos desta pasta.** Eles são cópia; a fonte é o pacote.

## Piso de navegador

**Chrome/Edge 111 · Firefox 113 · Safari 16.2**

É a regra **(c)** do D8-a em `COMPARTILHADO/DECISOES.md`, e vale para os dois
repositórios que consomem o pacote.

O piso é do `color-mix()`, e ele entrou porque é como `tailwind.config.js`
declara as cores do pacote — a única forma que preserva o modificador de
opacidade sem duplicar o valor da cor num arquivo local (decisão D1). Com
`var(--token)` puro, **31** utilitários com modificador simplesmente não eram
gerados, sem erro de lint, de tipo, de teste ou de build.

Declarado em `vite.config.ts`, em `build.target`. Antes disso o padrão que o
Vite 7 resolvia aqui era `chrome107 / edge107 / firefox104 / safari16` —
**abaixo** do piso em toda linha, e nada na cadeia avisava.

A declaração **não conserta** quem estiver abaixo: o esbuild não sabe rebaixar
`color-mix`, não tenta e não avisa. Ela existe para o alvo parar de mentir e
para haver um lugar só a mexer se o piso mudar.

Abaixo do piso a falha é **calada e parcial**: a declaração é inválida em tempo
de valor computado e a propriedade cai para `unset`, não para a declaração
anterior — fallback antes não cobre, só `@supports` cobriria, e o operador
decidiu não usar. Os três elementos que perderiam FUNÇÃO, e não só beleza —
véu da gaveta, item ativo da barra e trilho do interruptor de tema — usam o
token direto e não dependem do `color-mix`. É a regra **(d)** do D8-a, e o que
ela não cobre está listado lá.

## Emendas do pacote aplicadas nesta cópia

O pacote foi **emendado** em 02/09/2026, em três pontos, todos registrados em
`design-system/EMENDAS.md` com hash antes e depois. Esta cópia é a do pacote
**já emendado** — por isso os hashes abaixo não são mais os do export original.

| | O que | Arquivo | Escrita por |
|---|---|---|---|
| **E1** | `.dark` ganha `--text-on-primary`: branco sobre `--action` no escuro dava 2,69:1 | `tokens/colors.css` | HelpHS |
| **E2** | botões `danger`/`success` ganham degrau de ação; `--on-tint-warning` e `--on-tint-neutral` passam a AA | `tokens/colors.css` | HelpHS |
| **E3** | a fonte passa a ser servida pelo pacote — 12 `@font-face` e `fonts/` | `tokens/typography.css` + `fonts/` | ChamadosHS |
| **E5** | `--text-muted` vai ao slate-600: sobre `--surface-elevated` o 500 dava 4,34:1 | `tokens/colors.css` | ChamadosHS |

O que cada uma significa aqui:

- **E1 fecha o D5-a.** A exceção local do botão primário no escuro deixa de ser
  necessária: o token resolve sozinho. Ver a seção do D5-a abaixo.
- **E2 muda a conclusão do D4-a** no caso de fronteira do `--on-tint-warning`.
  O valor não foi "mantido": foi corrigido na raiz. Ver a seção do D4-a.
- **E3 fecha o D1-a.** O desvio local do `@import` deixa de existir: este
  `typography.css` é o do pacote, sem uma vírgula de diferença.
- **E5 corrige a tabela do D4-a e resolve sete pares de tela.** O token de
  texto tênue passa de slate-500 a slate-600 no tema claro: 4,76 · 4,55 · 4,34
  viram 7,58 · 7,24 · 6,92, contra `--surface` · `--bg-base` ·
  `--surface-elevated`. O tema escuro não muda — lá é slate-400 e já passava.

  **A ponte do D3-a foi atualizada no mesmo commit**, de `100 116 139` para
  `71 85 105`. Ela existe para carregar os valores do pacote em canais
  `R G B`; se ficasse no slate-500, o pacote diria uma coisa e as telas
  pintariam outra — a segunda fonte de verdade que a §5.4 proíbe.

  E veio com uma regra permanente, escrita no `EMENDAS.md` do pacote:
  **contraste de token de texto se mede contra as três superfícies**, não
  contra a mais clara. A ausência dela produziu quatro descobertas
  independentes do mesmo defeito.

## Hashes (SHA-256)

Conferidos com `Get-FileHash` em 03/09/2026, na recópia do pacote emendado
(E1+E2+E3+E5), e comparados com `Compare-Object` contra o pacote: **19
arquivos, sem diferença**.

```
1EF6324844AA066488F0D8A015B39E3CA0756C629512FCE4E1BD95CA8B93B9B2  styles.css
BDD047CE432E74B33FA7F752DA08CF025419E83EA18485BD947C889C0AC1C221  tokens/base.css
66BE0CD316F79902177E0558B21833B545E9939549F55095939DFC97CE80D89B  tokens/colors.css      <- E1+E2+E5
C70D51A982AE0B91BD53ECE150D8D16E0E70BEF9CA59586541A9A7177228478E  tokens/motion.css
7BCFBBC585D3EA8C7F689A27EEB3AE13DE0C2A9DCC3C6CC0C8F41D440D193F7D  tokens/shape.css
C093B261C6893A893A418CDF64798555326D4586A8ADB37CC7ECA457FABAE420  tokens/spacing.css
1DD9B29E47D31005DA89BBE96F1C7883A89371173E0FA8862D868480EEE839C9  tokens/typography.css  <- E3
```

E os doze arquivos de fonte, que a **E3** trouxe (diretório novo):

```
740D9B0F5A33987E21ACFF7E20BBD4C02BF40E470CDA58B761127D159C7941A7  fonts/plus-jakarta-sans-latin-300-normal.woff2
221A4135D06A4B33ABBD535E9A0DA4E565D19545DDD9267C4E678A916D54D9B6  fonts/plus-jakarta-sans-latin-400-normal.woff2
BAD081C8DBC15AED6C5E4CDE5461914F7B3BDC295B7A7AED177E4BEDDB79BFFA  fonts/plus-jakarta-sans-latin-500-normal.woff2
8872BB5C9111DF9BD3162C2394AEE6354D782B13408A4DD5BBF65C48207206E6  fonts/plus-jakarta-sans-latin-600-normal.woff2
2050755BF475817C96AC7D914C7F07CC3C2D11FF4B3FB4747B8D41DE584AAD17  fonts/plus-jakarta-sans-latin-700-normal.woff2
5F301A8EF9C266C8B596E6793D3CC826DAEFF9849C5AF035F5386439137955AD  fonts/plus-jakarta-sans-latin-800-normal.woff2
3BFBC7278A6723BC895A1C088F8C216A79C21A9C5C227C7B6ED194C58E12FB53  fonts/plus-jakarta-sans-latin-ext-300-normal.woff2
65B5680BF2BA9C6C42AF74DDD2E8AADDE93AF7C523454EBB3D4E32FDBA3F94DB  fonts/plus-jakarta-sans-latin-ext-400-normal.woff2
D1584F50C388CAE7E570BED35BE331FA4A9AFD6832EF45A32FA8BF81930E6DB9  fonts/plus-jakarta-sans-latin-ext-500-normal.woff2
080A1FEA8589C2BD4FA08750D0D99B3388BE63DF8C41A649DE05CB2DDA1EC007  fonts/plus-jakarta-sans-latin-ext-600-normal.woff2
B202EC87899E78825DB955E6AB43858B88C0CD444ABE2DFAC2E763F837B8F234  fonts/plus-jakarta-sans-latin-ext-700-normal.woff2
7C27E3FD36E9C1D6A2F354943B32993B01DC0B1E64E8275BDD5122B260CA6A24  fonts/plus-jakarta-sans-latin-ext-800-normal.woff2
```

**`.gitattributes`:** `*.woff2 binary`, e a linha vem **depois** de
`src/design-system/** text eol=lf` de propósito — em `.gitattributes` vence a
última regra que casa. Sem isso o Git trataria a fonte como texto, converteria
fim de linha dentro do binário e a corromperia no checkout, sem quebrar build
nenhum: o browser é que se recusaria a desenhar e cairia na fonte do sistema.

**Sem cabeçalho de origem.** A §5.2 manda acrescentar um comentário de origem no
topo de cada arquivo copiado; a §33 e o D3 de `COMPARTILHADO/DECISOES.md` mandam
conferir o SHA-256 da cópia contra o pacote. As duas coisas não cabem juntas — o
comentário muda o hash de todos os sete. **O hash vence**, como o D3 decidiu para
os dois repositórios: aqui ficam cópias cruas, e o aviso "não editar aqui" mora
neste `VERSION.md`. O cabeçalho existiu entre a Fase 1 e a Fase 3, e saiu.

Conferência de 02/09/2026, com `Compare-Object` por arquivo + hash:

```
contra design-system/ (o pacote emendado)
  19 arquivos: styles.css, os seis tokens/*.css e os doze fonts/*.woff2
  Compare-Object por Arquivo+Hash  ->  SEM DIFERENCA
```

**Não há mais desvio local nos sete arquivos.** O D1-a, que era o último, foi
resolvido na raiz pela E3. Esta cópia é o pacote, byte a byte.

> **Para o HelpHS:** os sete arquivos e o `fonts/` aqui são os do pacote
> emendado. `typography.css` fecha em `1DD9B29E…` e `colors.css` em
> `66BE0CD3…`. Quem estiver com `99D1A02B…` ou `63D96084…` está desatualizado,
> não divergente. O `VERSION.md` continua diferindo por natureza — é o registro
> local de cada repositório.

---

## Desvios locais aprovados

Cada um foi decidido em 02/09/2026 e nada além destes é desvio. Se algo mais
divergir do pacote, é defeito, não exceção.

### D1-a — `tokens/typography.css`: `@import` do Google Fonts comentado

> **ENCERRADO em 02/09/2026 pela emenda E3 do pacote.** Não é mais desvio: a
> auto-hospedagem passou a ser do pacote, e este arquivo voltou a ser cópia
> crua (`1DD9B29E…`). O texto abaixo fica como registro do que motivou a
> emenda — é o argumento que a E3 usa.
>
> O que ainda falta daqui, e sai em commit próprio: os seis `@import` de
> `@fontsource/plus-jakarta-sans` em `src/styles/index.css` e a dependência no
> `package.json`. Enquanto os dois coexistem, a fonte é carregada duas vezes —
> do mesmo bundle, sem sair para a rede. A ordem é essa de propósito: o
> contrário abriria uma janela sem fonte nenhuma.

**O que muda:** uma linha, comentada. O original é

```css
@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap");
```

**Por quê:** o ChamadosHS roda na rede interna da HS e não pode depender de
servidor de terceiro para a tipografia. Se o Google cair ou o IP da empresa for
bloqueado, a fonte some em silêncio — o `display=swap` garante que some sem
erro. A política está escrita em `tailwind.config.js` e guardada por
`src/recursos-externos.test.ts`, que existe porque já houve 12 ícones vindos de
`img.icons8.com`.

**O que substitui:** a **mesma** fonte, nos **mesmos** seis pesos (300–800),
servida do próprio bundle por `@fontsource/plus-jakarta-sans` (~76 KB, subconjunto
latino), importada em `src/styles/index.css`. O valor de `--font-sans` não muda.

**Amparo:** §11 do prompt mestre — *"Se houver política de não usar CDN externo,
pare e pergunte antes de baixar arquivos de fonte."* Perguntado e decidido.

**Escopo — vale para os dois repositórios.** Confirmado pelo operador em
02/09/2026: o desvio fica, e deixa de ser exceção só daqui. O HelpHS aplica o
mesmo conteúdo de `tokens/typography.css`, e então os sete arquivos voltam a ser
idênticos byte a byte dos dois lados, como a §5.2 pede. A alternativa — reverter
para o `@import` do Google — traria a fonte de servidor de terceiro **além** do
bundle, porque o Vite mantém URL externa como está: dois carregamentos da mesma
fonte, contra o objetivo declarado da Fase 2.

### D3-a — Camada de ponte em `src/styles/index.css` (**temporária**)

**O que é:** os tokens em português (`--superficie`, `--borda`, `--conteudo`,
`--sinal` e as cores de significado) continuam declarados, no formato de três
canais `R G B`, com os **valores do pacote** e o token de origem no comentário
de cada linha.

**Por quê:** o Tailwind exige `rgb(var(--x) / <alpha-value>)` para aplicar
opacidade, e há 78 classes com opacidade escritas hoje (`bg-perigo/10`,
`bg-sinal/10`, `border-sucesso/30`). Um alias direto para o hex do pacote
quebraria todas: `rgb(#ffffff / 0.5)` não é CSS válido.

**Quando sai:** tela a tela, nas Fases 11–16. Quando não sobrar uso dos nomes em
português, o bloco inteiro sai e ficam só os tokens do pacote. **Este desvio tem
data de validade.**

### D4-a — `--text-faint` reservado a elemento não textual

**O que muda:** o terceiro nível de texto (`--conteudo-tenue`) aponta para
`--text-muted`, não para `--text-faint`.

**Por quê:** `--text-faint` reprova em 4,5:1 nos dois temas — **2,56:1** no claro
(slate-400 sobre branco) e **3,36:1** no escuro (slate-500 sobre `#132238`). A
§21 exige WCAG AA, e `npm run validar:paleta` — que roda dentro do
`npm run build` — falha se um token de conteúdo cair abaixo de 4,5:1.

**Encaixe dos três níveis do projeto nos quatro do pacote:**

| Projeto | Pacote | Claro | Escuro |
|---|---|---|---|
| `--conteudo` | `--text-heading` | slate-900 · 17,85:1 | slate-100 · 14,59:1 |
| `--conteudo-suave` | `--text-body` | slate-800 · 14,63:1 | slate-200 · 12,97:1 |
| `--conteudo-tenue` | `--text-muted` | slate-500 · 4,76:1 | slate-400 · 6,23:1 |
| — | `--text-faint` | *só elemento não textual* | |

**Caso de fronteira anotado:** `--on-tint-warning` no tema claro dá **4,48:1**
sobre a tinta de 15% composta em `--surface` — 0,02 abaixo do piso. É valor do
pacote, mantido; registrado aqui para não passar por descuido.

### D5-a — Texto do botão primário no tema escuro

> **ENCERRADO em 02/09/2026 pela emenda E1 do pacote.** O token passou a ser
> redefinido no `.dark` (`--color-primary-900`), então o desvio local saiu e os
> três lugares que o aplicavam passaram a usar `--text-on-primary` direto:
> `ui/Button.tsx`, `pages/Dashboard.tsx` e `pages/NotFound.tsx`. Com isso o
> projeto ficou com **zero classes `dark:` de utilitário**.
>
> Medido depois da emenda, nos quatro estados:
>
> | | repouso | hover |
> |---|---:|---:|
> | claro | 5,29:1 ✅ | 4,53:1 ✅ |
> | escuro | 5,11:1 ✅ | 6,19:1 ✅ |
>
> O desvio local dava mais no escuro (6,47 e 7,83), mas a §2.1 é clara: token
> vence componente, e o do pacote mantém a família azul do botão em vez de
> pintar o texto com a cor de fundo da página.
>
> **Anotado:** o 4,53:1 do hover no claro é 0,03 acima do piso. Não é novo — já
> era assim antes —, mas é o número que quebra primeiro se alguém mexer no
> `brightness-110` ou no degrau de `--sinal`.
>
> O texto abaixo fica como registro do que motivou a emenda.

**O que muda:** o botão primário usa `--bg-base` (navy) como cor de texto no
escuro, e não `--text-on-primary` (branco).

**Por quê:** `DS/components/core/Button.jsx` usa branco nos dois temas. No escuro
`--action` é `#47A6E1`, e **branco sobre ele dá 2,69:1** — reprova. Navy sobre
azul claro dá **6,47:1**.

`--text-on-primary` é declarado em `:root` como branco e **não é redefinido no
`.dark`** — é lacuna do pacote, não escolha local. Pela §2.1 (`tokens` vencem
`components`), o token está incompleto para o tema escuro. **A sugerir ao design
system** no relatório final.

### D6-a — Modal não fecha no clique de fora

**O que muda:** `Modal.prompt.md` diz que o modal fecha com Esc **e** com clique
no fundo. Aqui o clique no fundo continua desligado.

**Por quê:** foi desligado em 01/09/2026 pelos commits `bef6d38` e `be572ef` —
dois consertos, ou seja, resposta a perda real de formulário preenchido. A §30
proíbe reverter comportamento por motivo visual. Esc continua fechando.

### D2-a — Pele de console restaurada

Não é desvio do pacote: é a **exceção oficial** da §8.1, que este repositório
havia desfeito na 1.7.0 (27/08/2026, merge `241db32`) — quatro dias **depois** de
o pacote fotografar o código em 23/08. Restaurada por decisão de 02/09/2026.

| Marca | Estado | Onde |
|---|---|---|
| Canto reto (`--radius-none` em tudo) | ✅ Fase 1 | escala `borderRadius` zerada em `tailwind.config.js`; `rounded-full` preservado para círculo de verdade (avatar, ponto de status, anel do spinner) |
| Cor de sinal só no que está ativo | ✅ já valia | `--sinal` = `--action`; item ativo, botão primário, link, foco |
| `Rotulo` mono, caixa alta, 12px, `0.1em` | ⏳ Fase 7 | hoje em sans/10px desde `993ebc5` |
| `Colchetes` só em painel | ⏳ Fase 7 | removido em `0f94122`; recriar e aplicar em modal, coluna do quadro, seção e login |
| Login com malha de 46px e vinheta | ⏳ Fase 16 | `.malha`/`.vinheta` saíram do CSS em `0f94122`; voltam junto com a reescrita de `pages/Login.tsx` |

**Nada além destas cinco.** Toda outra diferença em relação ao pacote é defeito a
corrigir, não identidade a preservar (§8.2).

---

## Lacunas do pacote registradas (§2.2)

O que o design system **não** define, e a conduta adotada aqui:

| Lacuna | Conduta |
|---|---|
| **Breakpoints** | Mantidos os do Tailwind padrão. Sidebar ↔ gaveta alterna em **`md` (768px)**, em `components/layout/Sidebar.tsx` |
| **z-index** | Escala existente preservada: gaveta `z-40`, fundo da gaveta `z-[35]`, menu do usuário `z-50`, toast `z-[9999]`, atalho de teclado `z-[100]`. Modal fica acima da topbar e da barra lateral |
| **Skeleton** | Não existe no projeto e não foi criado. O carregamento é `Spinner` centralizado, como manda o pacote |
| **DatePicker** | `<input type="date">` nativo, como já era. Nenhuma biblioteca instalada |
| **Paleta categórica de gráfico** | O pacote não define. Mantida a de `src/lib/graficos.ts`, validada por contraste e por ΔE em três formas de daltonismo (`npm run validar:paleta`) |
| **Tokens de tamanho de ícone** | Não existem como CSS var. Regra do `Icon.d.ts`: 16 em botão, 20 em nav, 24 em cabeçalho; stroke 1.75 na navegação, 2 em botão e aviso |
| **Breadcrumb, Banner** | Não existem no pacote nem no projeto. Não foram criados |
