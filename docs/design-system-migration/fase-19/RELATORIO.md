# Fase 19 — regressão visual: **o que ESTE RAMO mudou**

> ### Leia esta linha antes de qualquer imagem
>
> As 32 capturas comparam o ramo `chore/design-system-adoption` contra `main`.
> **Não** comparam "antes e depois da migração do design system".
>
> Quando o ramo nasceu, em `165d919`, as **Fases 1 a 6 já estavam em `main`** —
> tokens do pacote, fonte Plus Jakarta Sans, tema claro/escuro, `AppLayout`,
> `Sidebar` e `Topbar`. O "antes" destas fotos **já é um sistema com o design
> system aplicado na fundação**.
>
> O que elas mostram é o trabalho das Fases 7 a 18: primitivos, telas, cartões,
> gráficos, acessibilidade.

**10/09/2026.** É a primeira comparação antes/depois desta migração, e ela só
existe porque `main` não se moveu em nove dias.

---

## Por que só agora, e o que isso custou

A §28 pede o "antes" tirado **na Fase 0**, antes de qualquer alteração. O
relatório da Fase 0 registra a intenção e o adiamento:

> *"Sem screenshots de linha de base ainda: o projeto não tem Playwright, e a §28
> pede captura manual. Faço na Fase 1…"*

**Não há pasta `fase-1`.** O "antes" nunca foi tirado, e passaram-se quinze
fases.

Ele foi recuperado por `git worktree` em `main`, que continua em `165d9198…` —
conferido nos dois lados, local e remoto, antes de montar. **O risco estava
datado no `DECISOES.md` desde 09/09**, com o procedimento escrito: conferir
`git rev-parse main` *antes* de contar com a worktree, e não depois de planejar
em cima dela.

Se `main` tivesse andado, o "antes" não sumiria do histórico — sumiria da
facilidade, virando arqueologia de commit em vez de um comando.

---

## O arranjo da sessão

| | **antes** | **depois** |
|---|---|---|
| commit | `165d919` **+ 4 diferenças declaradas** | ramo, `9245e75` |
| porta | 5173 | 5174 |
| versão | 1.7.6 | 1.7.7 |

As quatro diferenças da worktree estão em `LINHA-DE-BASE.md`, com o motivo de
cada uma e por que nenhuma afeta o que a foto mostra.

**Condições fixadas pelo operador:**

1. Mesma sessão, mesmas quatro telas, mesmos dois viewports e temas, mesma massa.
2. **Alternando por tela**, e não em bloco — se algo mudar no meio da sessão,
   muda para os dois lados do mesmo par em vez de contaminar um lado inteiro.
3. Leitura pura nos dois.

---

## O que a montagem já encontrou

### O `.env` ausente quase produziu 32 imagens incomparáveis

A worktree nasceu sem `.env` — ele é gitignored. E `api.ts` recua:

```ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

**As duas metades apontavam para APIs diferentes.** E falharia calada:

> **O recuo não dá erro. Dá uma URL.**

Sem exceção, sem aviso, sem log. A tela renderizaria a casca com zero dado —
exatamente como renderizaria uma base vazia. As imagens sairiam com o "antes"
vazio, e a leitura natural seria *"o painel antigo não tinha dados"*.

O que pegou foi **ler o `baseURL` no navegador em vez de supor**. É a regra da
identidade da página aplicada a um objeto novo: identidade diz *que página é
esta*; atualidade, *que versão dela é*; **destino, com quem ela está falando**.

### O `strictPort` que o `165d919` não tinha

O `vite.config.ts` daquele commit **não declara porta nem `strictPort`** — é
anterior à decisão da porta. Sem a linha acrescentada, o servidor do "antes"
poderia subir na 5174 e as duas metades seriam o mesmo código sem ninguém
perceber.

### A sessão de login é separada

`localStorage` é por origem, então a 5173 não herda a sessão da 5174. Quem entra
é o operador — credencial não passa por aqui.

---

## As 32 capturas

*(a preencher conforme os pares forem fotografados)*

| # | tela | rota | viewport | tema | antes | depois |
|---|---|---|---|---|---|---|
| 1–4 | painel | `/dashboard` | 1366×768 e 390×844 | claro e escuro | ⏳ | ⏳ |
| 5–8 | listagem | `/cadastros` | idem | idem | ⏳ | ⏳ |
| 9–12 | formulário | `/chamados/novo` | idem | idem | ⏳ | ⏳ |
| 13–16 | detalhe | `/chamados/6` | idem | idem | ⏳ | ⏳ |

Os nomes usam o viewport **pedido**; a **régua medida** vai na ficha de cada
captura — foi ela que pegou a janela travada na Fase 17, e os arquivos do
Checkpoint 3 mostram que o real foi 1366×767 e 389×843.

---

## O resto da fase

| item | estado |
|---|---|
| `build` com os três passos encadeados | ✅ **primeira execução da migração**, verde em 14,93s |
| os três vazios da `Auditoria` presos em teste | ✅ 5 casos, com mutação provando que pegam |
| `lint` | **não existe** no `package.json` — §27: script que não está lá, não existe |
| Playwright / e2e | **não existe** — registrado na Fase 0 |
| as 32 capturas | ⏳ |
