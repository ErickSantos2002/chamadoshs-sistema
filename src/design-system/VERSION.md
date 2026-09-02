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

## Hashes (SHA-256)

Conferidos com `Get-FileHash -Algorithm SHA256` em 02/09/2026.

```
3D4FEED0E3300C5F5CC7D7CDE0D26BFBAC433954917F51862653B0297F9743BB  styles.css
4CF24B587B1392FD5C2080C983D83F191A23C97DF9E116FE29E18D23A920FC27  tokens/base.css
893461E5DFE113B8E0BC555FE9EF5CD364275F23301DE3FDE620355552F20072  tokens/colors.css
56E3AA0451F158A1C6FA854DA2BC8CA58A8BC00AC15491F7E144EBDE0F3725E3  tokens/motion.css
5F5B6ADC9255A8DAF2C570776FF2ECA4814A74DB36B68ECE97D1641ADCFCEE86  tokens/shape.css
7EA1E828E395EA34A38B8BB8C8EC9CEC1A943A3DAE99FB10DD4AEAF685921D1A  tokens/spacing.css
82E8408799D75DBFA24EF4204A5B844EFDEE98EDEB80C8D652CBE49FE9E7AF81  tokens/typography.css
```

Conferência contra o pacote original, com `Compare-Object` ignorando o cabeçalho
de origem que a §5.2 manda acrescentar:

```
styles.css               IDENTICO ao pacote
tokens/colors.css        IDENTICO ao pacote
tokens/spacing.css       IDENTICO ao pacote
tokens/shape.css         IDENTICO ao pacote
tokens/motion.css        IDENTICO ao pacote
tokens/base.css          IDENTICO ao pacote
tokens/typography.css    22 linhas de diferença  ← desvio D1-a, abaixo
```

> **Pendência entre repositórios.** A §5.2 pede que os arquivos sejam idênticos
> byte a byte **nos dois repositórios**. Por causa do desvio D1-a, o
> `typography.css` daqui só será idêntico ao do HelpHS se o HelpHS também
> passar a auto-hospedar a fonte. Os outros seis já devem bater — os hashes
> acima existem para a sessão do HelpHS conferir. Decisão pendente, registrada
> em `COMPARTILHADO/DECISOES.md`.

---

## Desvios locais aprovados

Cada um foi decidido em 02/09/2026 e nada além destes é desvio. Se algo mais
divergir do pacote, é defeito, não exceção.

### D1-a — `tokens/typography.css`: `@import` do Google Fonts comentado

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
