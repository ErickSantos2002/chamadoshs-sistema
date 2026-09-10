# Checkpoint 4 — o que a migração entregou, e o que não

**10/09/2026.** Vinte fases, `chore/design-system-adoption`, 170 commits.

Este documento é para quem vai decidir se isto entra em produção. Ele diz o que
foi feito, **o que não foi**, e o que fica pendente com nome e custo.

---

## Em uma frase

> O ChamadosHS adotou o design system em tokens, primitivos, telas e
> acessibilidade, com nove travas automáticas e 647 casos de teste — **e a
> verificação visual final não foi feita.**

---

> # ⏰ O QUE FAZER HOJE: **NÃO EMPURRAR EM `main`**
>
> Esta é a **única pendência com prazo**, e o prazo não é nosso — é de quem tiver
> acesso ao repositório.
>
> As 32 capturas antes/depois não existem. O "antes" só é recuperável porque
> `main` continua em **`165d9198…`**, que é onde o ramo nasceu. Uma
> `git worktree` ali reproduz o estado anterior em minutos.
>
> **Um push em `main` acaba com isso.** Não some do histórico — some da
> facilidade: vira arqueologia de commit, e alguém terá de **decidir** qual
> commit era o estado anterior, que é decisão e não comando.
>
> | | |
> |---|---|
> | custo de preservar | **zero** — é não fazer nada |
> | custo de perder | a comparação antes/depois, **para sempre** |
>
> A receita de remontagem está em
> `docs/design-system-migration/fase-19/LINHA-DE-BASE.md`, com as quatro
> diferenças declaradas e o passo do `.env`, sem o qual ela não vale.

---

## O que a migração entregou

### A fundação

| | |
|---|---|
| tokens do pacote | `src/design-system/`, hashes conferidos |
| fonte | Plus Jakarta Sans, carregada uma vez |
| tema claro e escuro | por token, **zero `dark:` residual** |
| casca | `AppLayout`, `Sidebar` 256/72px, `Topbar` 64px |
| primitivos | 30 componentes em `components/ui/` |

### As travas que ficaram

**Nove catracas** no `validar-paleta`, encadeadas ao `build`. Elas não existiam
quando a migração começou:

| catraca | o que impede |
|---|---|
| contraste de texto e de gráfico | par abaixo de 4,5:1 ou 3:1 |
| separação ΔE ≥ 20 | duas séries de gráfico indistinguíveis, em quatro visões |
| ponte do D3-a | os 32 pares divergindo do pacote |
| modificador de opacidade | `/N` nos sete tokens com alfa |
| nome acessível | `aria-label` que apaga o conteúdo visível |
| fundo cheio com texto branco | par novo abaixo de 4,5:1 |
| rótulo que some no breakpoint | botão sem nome abaixo de `sm` |
| **cópia de token** | hexadecimal igual ao de um token, **ou** com `--token` anotado |
| semântica no papel certo | cor cheia como texto, e preenchimento nu |
| dica do gráfico | `<Tooltip>` sem dica própria |
| função duplicada | o validador se duplicando |

E **647 casos de teste em 62 arquivos**, com `tsc`, `validar-paleta` e `build`
verdes.

### Os defeitos que a migração encontrou e consertou

Nenhum destes era visível a olho, e nenhum quebrava a compilação:

| defeito | onde |
|---|---|
| a moldura do gráfico derivara do token na E14 | invisível por três emendas |
| 12 pares de texto de dica abaixo de 4,5:1 | o texto saía na cor da série |
| 13 usos de cor cheia como texto | onde a semântica pede o par tênue |
| 3 botões sem nome abaixo de `sm` | rótulo escondido por breakpoint |
| 4 preenchimentos nus | entre duas catracas |
| **10 hexadecimais idênticos a `--chart-1..5`** | sob uma catraca que imprimia zero |
| **um `<Tooltip>` mostrando `{selecionada.titulo}` ao pé da letra** | em produção |
| gráfico `aria-hidden` **na ordem de tabulação** | parada de foco que não anuncia nada |
| regra de movimento reduzido copiada do pacote | e **vencendo** por ordem |
| duas cópias na barra de rolagem | de carona |
| pulso perpétuo em todas as telas | §22, literal |
| 8 textos abaixo de 12px | piso do pacote |

---

## O que a migração NÃO entregou

### 1. A regressão visual da §28

**As 32 capturas antes/depois não existem.**

> **A última verificação de tela deste sistema é de 08/09/2026** — as dezesseis
> do Checkpoint 3.

Depois delas vieram **três fases que mudaram pixels**: a 16-H, a 16-mestre — em
que quatro cartões passaram ao primitivo e o respiro mudou de `p-5` e `px-8 py-10`
para `md` e `lg` — e a 18.

**Ninguém olhou nenhuma tela depois disso.** `tsc`, as nove catracas, os 647
casos e a sonda não veem aparência: veem token, classe, geometria e contraste
calculado.

### 2. As fichas da §29 de seis páginas

Seis das doze têm ficha de preservação funcional. **Faltam seis**, e são as
maiores: `Chamados`, `ChamadoDetalhes`, `Dashboard`, `CadastrosBasicos`,
`NovoChamadoForm`, `Avaliacao`.

### 3. O contrato do `pageTitle`, que nunca foi cumprido

Achado hoje, ao reconferir a Topbar. O plano estava escrito no próprio código:

> *"Cada tela passa a preencher no commit em que for migrada (Fases 11–16),
> soltando no mesmo commit o `<h1>` que tem hoje… A Fase 20 confere: nenhuma
> página com `<h1>` dentro do `<main>`, todas com `pageTitle`."*

Medido: **as dez páginas ainda desenham o próprio `<h1>`, e nenhuma passa
`pageTitle`.** Só a galeria de dev usa.

Não é regressão — é a §9 não cumprida, planejada e não executada em nenhuma das
seis fases que deviam fazê-la. **A Fase 20 era quem devia pegar, e pegou.**

---

## Pendência com nome próprio: a §9 do `pageTitle`

**Não é uma linha entre as dez.** É um contrato **escrito no código**, planejado
para seis fases, **executado em zero**, e achado no último dia pelo mecanismo que
devia achá-lo.

O plano está no `Topbar.tsx`, e é explícito:

> *"Cada tela passa a preencher no commit em que for migrada (Fases 11–16),
> **soltando no mesmo commit o `<h1>` que tem hoje e rebaixando o cabeçalho
> próprio para `<h2>`**. É a troca dentro do mesmo commit que garante que nunca
> haja dois nem zero. **A Fase 20 confere:** nenhuma página com `<h1>` dentro do
> `<main>`, todas com `pageTitle`."*

Medido em 10/09/2026: **as dez páginas desenham o próprio `<h1>`, e nenhuma passa
`pageTitle`.** Só a galeria de dev usa.

### O custo real de cumpri-lo agora é maior do que "dez páginas"

`App.tsx` renderiza `<AppLayout>` **envolvendo** `<AppRoutes />`. As páginas são
**filhas** da casca — então **nenhuma delas pode passar `pageTitle` por prop**.

| o que é preciso | tamanho |
|---|---|
| **encanamento novo** — um mapa rota→título no router, ou um contexto que a página alimente | não existe hoje |
| dez páginas | soltar o `<h1>`, rebaixar o cabeçalho próprio |
| **e a parte que pesa** | várias telas têm o título dentro de uma **barra de cabeçalho** com subtítulo e ações — `TarefasRecorrentes`, `NovoChamado`, `Auditoria`. Tirar o título dali **muda o desenho da barra**, e não só a semântica |

> **Cumprir a §9 agora mudaria dez telas — e não há "antes" para comparar.** É o
> argumento mais forte para fazê-lo **depois** das 32 capturas, e não antes.

### O que se perde deixando como está

**Nada quebra.** Cada página tem exatamente um `<h1>`, que é o correto para leitor
de tela. O que se perde é outra coisa:

- **a casca canônica da §9 não está cumprida** — a `Topbar` tem o lugar do título
  e ele fica vazio, em todas as telas;
- **o HelpHS decidiu igual** (D8 do `DECISOES.md`), então os dois produtos
  divergem de uma decisão compartilhada, e divergem **em silêncio**;
- e o pior: **isto é decisão por omissão.** Ninguém decidiu que as páginas
  desenhariam o próprio `<h1>` — elas continuaram desenhando porque as seis fases
  que deviam trocar não trocaram.

> **"As páginas desenham o próprio `<h1>`" não é decisão: é o estado anterior
> sobrevivendo por inércia** — exatamente a forma da linha do D2-a que prometia o
> retorno da malha, e da ponte que se dizia temporária por quinze fases.
>
> **Temporário sem data é permanente sem registro.** Aqui é pior: nem temporário
> se dizia — só ficou.

---

## A §33, item a item

**25 itens.** Dois são do HelpHS e não fecham aqui.

| ✅ 14 | ⚠️ 5 | ❌ 4 | ⏳ 2 |
|---|---|---|---|

### Os quatro ❌

| item | o que falta | custo |
|---|---|---|
| **22** — screenshots antes/depois | as 32 capturas | **Playwright** — o único caminho que não custa uma sessão de operador |
| **17** — §29 completa | seis fichas | leitura integral de seis arquivos |
| **3** — sem cores duplicadas | 10 cópias de `--chart-1..5` na `paletaCategorica` | fecha com o nó de seis lados |
| **§9** — `pageTitle` | dez páginas | troca por tela, `<h1>` → `<h2>` no mesmo commit |

### Os cinco ⚠️

| item | estado |
|---|---|
| **7** — Sidebar | ✅ **fechado hoje**: `w-64`/`md:w-[72px]` e rodapé com versão, conferidos no código |
| **8** — Topbar | ✅ 64px e `Avatar`, **mas** revelou o `pageTitle` acima |
| **13** — Dashboard contra o template | ❌ **não verificado** — o template é `Dashboard.dc.html`, cartão para abrir no navegador lado a lado; é comparação de tela, não leitura de código |
| **11** — "Mostrando X a Y de N" | ✅ **exceção declarada**, com data de queda |
| **15** — "nada além delas" | ✅ **fechado hoje** — a lista real é de **cinco**, e o prompt mestre foi emendado |

---

## O rebase de histórico: RECUSADO

Estava reservado desde o Checkpoint 3. **A autorização não foi dada.**

| motivo | |
|---|---|
| a §31 proíbe | *"Não altere histórico"* |
| os 170 commits **são** o registro | e os hashes são referência viva em relatórios |
| o único ganho vale para a frente | o idioma dos assuntos corrige-se nos próximos |
| não se sabia quantos mudariam | dois classificadores, 67 e 31, ambos com falso positivo |

E o decisivo: **o propósito nunca foi registrado em lugar nenhum.**

Em vez disso: `git tag antes-do-rebase da1c37b`, **empurrada para o servidor**.

---

## O que fica pendente, com nome e custo

| # | pendência | custo |
|---|---|---|
| 1 | **32 capturas antes/depois** | um roteiro Playwright; a receita da linha de base está escrita |
| 2 | **a linha de base é perecível** | zero hoje; **infinito** depois de um push em `main` |
| 3 | **seis fichas da §29** | leitura integral |
| 4 | **`pageTitle` em dez páginas** | uma troca por tela |
| 5 | **o nó de seis lados** — de onde sai a cor de um status | fecham juntos |
| 6 | **52 alvos de toque abaixo de 40px** | ordem decidida: formulário, ícone, texto |
| 7 | **`TarefasRecorrentes` perde nomes em silêncio** | defeito de produto |
| 8 | **`Fechado` vs `Resolvido`** | pergunta de produto aberta desde o Checkpoint 3 |
| 9 | **`--tint-primary` × `--tint-info` colidem** | corrigível na nossa tabela de variantes |
| 10 | **duas lacunas de ambiente** | não são de esforço: exigem massa e uma API que se possa derrubar |

---

## O que este projeto aprendeu, e vale além dele

A migração encontrou uma família de defeitos que atravessa código, instrumento e
documento:

> **A afirmação e a coisa se descolam, e nada acusa.**

Ela apareceu numa catraca que dizia *"a cópia de token não voltou"* enquanto dez
cópias viviam no arquivo que ela lia; numa lista de exceções que atestava uma
exceção inexistente; numa ficha que listava um `<Helmet>` que não existe; num
comentário que prometia o retorno de algo que se decidira remover.

As regras que saíram disso estão em `COMPARTILHADO/DECISOES.md`. As três que mais
se pagaram:

1. **Toda varredura que vira método declara o que não alcança, no mesmo lugar em
   que é descrita.**
2. **Confirmar que a página é a que se pensa — e que as chamadas vão para onde se
   pensa — antes de qualquer medição que vire afirmação.**
3. **Antes de escrever instrumento novo: o defeito escapa hoje?** Se já é pego,
   o instrumento novo acrescenta superfície, não cobertura.


---

## O que este checkpoint NÃO autoriza

**Aprovação do Checkpoint 4 é aprovação do TRABALHO, e não autorização de
merge.**

| ação | estado |
|---|---|
| abrir PR | ❌ **não** |
| fazer merge | ❌ **não** |
| tocar em `main` | ❌ **não** — e ver o aviso do prazo, acima |

O ramo `chore/design-system-adoption` fica no `origin`, com a tag
`antes-do-rebase` marcando `da1c37b`.

**A decisão de merge é do operador com o Nicholson**, e passa pelo registro no
SGI que a regra 7 exige. Nada aqui a antecipa.
