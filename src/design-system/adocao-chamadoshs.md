# Adoção do Design System no ChamadosHS — status

**Cópia local do `DS/guidelines/adocao.md`, com o que foi feito e o que
diverge.** Escrita em 10/09/2026, ao fim da Fase 20.

O original tem quatro passos e um checklist de dez itens por tela migrada. Este
documento responde **em que pé cada um está neste repositório**.

---

> ## ⚠️ A REGRESSÃO VISUAL DA §28 NÃO FOI FEITA
>
> **A última verificação de tela deste sistema é de 08/09/2026** — as dezesseis
> capturas do Checkpoint 3.
>
> Depois delas vieram **três fases que mudaram pixels**: a 16-H (cor cheia como
> texto, `--chart-*`, moldura e dica do gráfico), a 16-mestre (quatro cartões
> passando ao primitivo, com o respiro mudando de `p-5`/`px-8 py-10` para
> `md`/`lg`) e a 18 (`tabIndex` no gráfico, movimento reduzido).
>
> **Nenhuma tela foi olhada depois dessas três fases.**
>
> `tsc`, o validador com nove catracas, 647 casos de teste e a sonda da §20 não
> veem aparência — veem token, classe, geometria e contraste calculado.
>
> A pendência está nomeada: **32 capturas por Playwright**, com a receita da
> linha de base em `docs/design-system-migration/fase-19/LINHA-DE-BASE.md`.
> Enquanto `main` estiver em `165d9198…`, a comparação é possível; depois de um
> push nela, deixa de ser.

---

## Os quatro passos

| passo | estado |
|---|---|
| **1 — instalar os tokens** | ✅ `src/design-system/` com `styles.css` e `tokens/`, hashes conferidos em `VERSION.md` |
| **2 — apontar o Tailwind** | ✅ `theme.extend` completo; a ponte do D3-a é **exceção documentada**, não pendência |
| **3 — trocar os primitivos** | ✅ 30 primitivos em `components/ui/` |
| **4 — checklist por tela** | abaixo, item a item |

---

## O checklist do passo 4, medido

| # | item | estado |
|---|---|---|
| 1 | nenhum hexadecimal cravado no JSX | ✅ **zero** |
| 2 | nenhum `dark:` onde há token semântico | ✅ **zero** — as 7 ocorrências são comentários explicando que saiu |
| 3 | azul de ação é `--action`, não o da marca | ✅ pela catraca da ponte, que confere os 32 pares |
| 4 | um primário por bloco de decisão | ✅ **conferido por leitura em 10/09/2026** |
| 5 | nenhum texto abaixo de 12px | ✅ **oito subidos, nenhuma exceção** |
| 6 | estado vazio com frase completa | ✅ |
| 7 | ícone é componente, não emoji | ✅ **zero emoji** |
| 8 | contagem de paginação em frase | ❌ **divergência declarada** — ver abaixo |
| 9 | `focus-visible` com anel de 2px | ✅ **com uma exceção declarada** |
| 10 | nada animando em laço fora spinner | ✅ corrigido em 10/09/2026 |

### Item 4 — o alcance vai escrito

Conferido em **quatro telas**, e não em todas: `/dashboard`, `/cadastros`,
`/chamados/novo`, `/chamados/6`.

| tela | primários |
|---|---|
| `/dashboard` | **nenhum** |
| `/cadastros` | 1 por aba — "Nova Categoria" / "Novo Setor" / "Novo Usuário" |
| `/chamados/novo` | 1 — "Abrir chamado" |
| `/chamados/6` | 1 — "Enviar Comentário" |

> **O painel não pede decisão, então não tem primário.** É o desenho certo: um
> botão sólido ali competiria com a leitura dos números, que é o que a tela
> existe para dar.

### Item 5 — os oito, e os dois que foram medidos antes

Cinco pastilhas, o copyright da barra, e **dois candidatos a quebrar que foram
medidos em vez de estimados**:

```
ROTULO DE GRUPO      "Principal" 10px = 60,8px  →  12px = 72,9px
                     "Gestão"    10px = 46,8px  →  12px = 56,2px
                     espaço disponível = 233px  →  o maior ocupa 31%

AVATAR               "AD" 10px = 17 × 15 px   (medido na variante de 32px)
                     "AD" 12px = 20,4 × 18 px (projeção linear)
                     caixa de 24px            →  folga de 3,6 × 6
```

A suspeita sobre o `tracking-widest` era razoável **e o número a derrubou**.

> **Intuição sobre layout tipográfico erra com frequência, e a medição custou 10
> chamadas.**

A do `Avatar` é **projeção medida, não medida direta** — a variante de 24px não
estava na tela onde se mediu. É sólida porque o glifo não depende da caixa: as
mesmas duas letras, a mesma fonte, escala linear. E são sempre **duas**:
`iniciais()` não tem ramo que produza três.

### Item 8 — divergência declarada

O guia pede *"Mostrando 1 a 10 de 84 chamados"*. **A `Auditoria` mostra "Página
N".**

**Motivo, escrito no próprio código:** *"A API devolve exatamente `limit` quando
ainda há mais. Uma página curta é o sinal de fim — não existe contagem total, e
pedi-la custaria uma segunda varredura das duas tabelas a cada troca de
página."*

**Custo da alternativa:** uma consulta de contagem por página, sobre duas
tabelas, numa tela que a pessoa usa justamente para varrer muitas páginas.

> **Se um dia houver contagem barata — um `COUNT` indexado, ou um cabeçalho
> `X-Total-Count` na resposta —, a exceção cai** e a frase entra. Ela existe pelo
> custo, não pelo desenho.

### Item 9 — a exceção, e por que ela não é descuido

O **link de pular conteúdo** (`AppLayout.tsx:116`) usa `focus:`, e não
`focus-visible:`.

Um atalho de pular conteúdo existe para **aparecer** ao receber foco. Em
`:focus-visible`, um foco que o navegador julgasse não merecer indicador o
deixaria invisível — e **atalho invisível que recebe Tab é pior que atalho
nenhum**: a pessoa tabula, o foco está em lugar nenhum visível, e o próximo Tab
já passou.

Os outros dois casos foram **corrigidos** em 10/09/2026: o `Seletor` (defeito
real — é `<button>`, e o anel acendia no clique de mouse) e o `Campo`
(divergência literal sem efeito, corrigida mesmo assim).

---

## As cinco exceções do ChamadosHS

A lista fechada está em `VERSION.md`, sob *"nada além delas"*. Em resumo:

| exceção | natureza |
|---|---|
| canto reto | D2-a |
| `Colchetes` | D2-a |
| `Rotulo` | Fase 7 |
| ponte em português (D3-a) | permanente desde 09/09/2026 |
| **paginação sem "Mostrando X a Y de N"** | **acrescentada em 10/09/2026** |

A exceção do **login com malha e vinheta foi REVOGADA** em 09/09/2026: o formato
de duas colunas é a decisão vigente.

---

## Divergências que NÃO são exceção

São dívida nomeada, e fecham juntas:

| # | onde | o quê |
|---|---|---|
| 1 | fatia do gráfico de status | ✅ já adota a E18 |
| 2 | cartão de KPI | `corDoStatus`, hexadecimal |
| 3 | selo de status | `principal` usado como semântica |
| 4 | `paletaCategorica` | **10 hexadecimais idênticos a `--chart-1..5`** |
| 5 | `corDaPrioridade` | hexadecimal próprio |
| 6 | pastilhas do `statusData` | `bg-perigo/15` à mão — são `Badge` pela função |

**São seis formas da mesma pergunta: de onde sai a cor de um status.** Fechar uma
sem as outras deixa o sistema com duas verdades.

E uma pendência de produto, achada ao ler o código: **`TarefasRecorrentes` cai em
`.catch(() => setUsuarios([]))`** ao carregar usuários — sem toast, sem erro. A
tela perde os nomes e não diz por quê, e falha de rede fica indistinguível de
dado ausente.

---

## Ordem sugerida pelo guia, e onde paramos

O guia sugere HelpHS → ChamadosHS → DataCoreHS → TalentHS.

**O ChamadosHS está na Fase 20 de 20**, com o Checkpoint 4 à frente — e com a
§28 por cumprir, que é o que este documento abre dizendo.
