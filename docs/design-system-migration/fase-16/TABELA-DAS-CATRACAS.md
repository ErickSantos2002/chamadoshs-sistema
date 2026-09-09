# A tabela das catracas, e os vãos entre elas

**Primeiro item de trabalho da Fase 16-H**, antes de qualquer chave nova. Derivada
do **código**, lendo o predicado real de cada checagem — não da memória de quem
as escreveu.

## A pergunta que ela existe para responder

> **O vão do item 3 é o único, ou só o primeiro que encontramos?**

**Resposta: o primeiro.** São **quatro** vãos, e a tabela achou **um que não
estava na lista** — texto sobre `--superficie-elevada`, a terceira superfície,
que nenhuma checagem mede.

## As catracas

Cinco, e cada uma nasceu do defeito que existia na hora.

| catraca | o que cobre | onde PARA |
|---|---|---|
| **opacidade** | modificador `/N` nos **7 tokens com alfa** (`overlay`, `action-tint`, `tint-*`), em `.ts`, `.tsx`, `.css`, `.html` | só esses sete; só a forma `classe/N` |
| **ponte D3-a** | os **32 pares** `--x: R G B;` do `index.css` que trazem o token do pacote **no comentário ao lado** | linha sem esse comentário é invisível; resolve `var()` e cai no `:root` |
| **nome acessível** | `aria-label` que apaga conteúdo visível, em tag de abertura, `.tsx` | só `.tsx`; `design-system/` excluído |
| **fundo cheio** | `bg-*` com **`text-white`** no mesmo conjunto de classes, casando variantes (`md:hover:`), `.ts`/`.tsx` | **só `text-white`** — texto por token pareado está fora de escopo, de propósito |
| **rótulo no breakpoint** | `<Button>`/`<button>` com rótulo em `hidden (sm\|md\|lg\|xl):(inline\|block\|flex)` e sem `aria-label`, `title` ou `sr-only` | só essas duas tags; `<a>` e `role="button"` não |

## As medições de paleta

Não são catracas — não têm linha de base que só encolhe —, mas são guarda, e a
fronteira delas importa igual.

| medição | cobre | PARA |
|---|---|---|
| contraste de **texto** | `conteudo`, `conteudo-suave`, `conteudo-tenue`, `sinal` sobre **`superficie` e `superficie-base`** | **não mede `superficie-elevada`** |
| contraste de **gráfico** | categóricas, status e prioridades sobre **`superficie`** | uma superfície das três |
| **separação ΔE ≥ 20** | pares **dentro** de cada grupo, nas quatro visões | nunca **entre** grupos |

## As checagens da sonda de captura

| | cobre |
|---|---|
| **−1** | identidade da página pelo `data-app`, falha fechada |
| **0** | `.env` e origens em uso, com exceção por rodada |
| **1** | canário: 6 tokens e 7 classes, servido contra disco |
| **2** | marcador de tema, classe `.dark`, bloco do canário |
| **2b** | **canvas** contra `--superficie-base`, no maior opaco que cobre o viewport inteiro |
| **3** | tabela **visível** com 2+ linhas |
| **4** | `innerWidth × innerHeight` exatos |

---

# Os vãos, MEDIDOS

Cada um com a pergunta que importa: **existe defeito vivo hoje?**

## Vão 1 — preenchimento nu *(o item 3 do `HERANCA.md`)*

**Entre** a catraca do fundo cheio (que exige `text-white` por cima) e a chave da
cor cheia como texto (que o item 1 vai escrever). Preenchimento **sem texto por
cima** não é coberto por nenhuma.

**Defeito vivo: não, desde hoje.** Os quatro sítios saíram para `--fill-*` no
commit de higiene. Até esta manhã havia quatro — `--sucesso` a **2,32** e
`--alerta` a **1,96** contra o piso de 3:1.

É o único dos quatro vãos que **teve** ocorrência viva, e é por isso que ele foi
o primeiro a aparecer: **vão se descobre pelo defeito que cai nele.**

## Vão 2 — texto sobre `--superficie-elevada` *(novo, achado por esta tabela)*

O contraste de texto roda sobre **duas** superfícies. A terceira — `elevada`,
que é a superfície de cartão elevado, dica e trilho — **não é medida por nada**.

**Defeito vivo: não.** As oito combinações passam:

```
                          claro    escuro     piso 4,5:1
--conteudo                16,30    12,37
--conteudo-suave          13,35    10,99
--conteudo-tenue           6,92     5,29
--sinal                    4,83     5,04      <- a mais apertada
```

**`--sinal` sobre elevada no claro dá 4,83**, folga de **0,33**. Passa, e é a
margem mais estreita do conjunto — a mesma ordem de grandeza do `warning-600`
que reprovou por 0,09. Um degrau de rampa que mude, e ninguém saberá.

## Vão 3 — a paleta de gráfico contra UMA superfície *(item 4)*

Já registrado. O que a tabela acrescenta é o número que ordena:

| | mede |
|---|---|
| a **aprovação** da E16-b | 36 células, três superfícies, pior **3,22** |
| a **catraca** | uma superfície, mínimo impresso **3,66** |

## Vão 4 — a moldura do gráfico *(item 4)*

Rótulo das marcas, eixo, grade, fundo e borda da dica: **sem piso, sem medição,
sem menção**.

**Defeito vivo: não.** Medido à mão no Checkpoint 3 — rótulo a 13,35 e 10,99
contra 4,5:1; `estilo.eixo` removido por ser código morto; grade a 1,13 e 1,18,
**higiene** pela regra do portador redundante.

---

# O que NÃO é vão: fronteira declarada

Distinguir isto do resto é o que impede a tabela de virar lista de reclamações.

| fronteira | por que está certa | conferido |
|---|---|---|
| fundo cheio só com **`text-white`** | ela existe para o branco **cravado**; quem usa o token pareado está certo | os 4 `bg-sinal` com `--text-on-primary` dão **5,29** e **5,11** |
| ΔE só **dentro** do grupo | cada gráfico usa **uma** paleta — `corDoStatus`, `corDaPrioridade` ou `paletaCategorica` | vira vão no dia em que um gráfico misturar duas |
| opacidade só nos **7 com alfa** | a regra é sobre token que já carrega alfa | — |
| rótulo só em `<Button>`/`<button>` | — | **nenhum** `<a>` ou `role="button"` com rótulo escondido hoje |
| duas catracas leem só `.tsx` | — | a única classe semântica em `.ts` está em **comentário** (`utils.ts`) |
| `design-system/` excluído de todas | é a cópia do pacote, não código nosso | — |

---

# A cópia de tokens do `graficos.ts` PODE deixar de existir

**Pergunta do operador:** a catraca `exigirMolduraFiel` prende a divergência, mas
não impede que a cópia exista. O `estiloDoGrafico` pode **ler** os tokens em vez
de copiá-los?

**Resposta: pode, e três dos cinco campos já deixaram de copiar.**

## O que já foi feito

A dica copiava fundo, borda e cor de texto "porque o Recharts escreve em atributo
de SVG". **A dica não é SVG** — o Recharts a desenha num `div` sobreposto
(`recharts-tooltip-wrapper`), que é HTML comum e lê token por classe. Os três
campos saíram com a `DicaDoGrafico`. A cópia encolheu de **cinco para dois**.

## Os dois que sobraram, e por que eles TAMBÉM podem

`grade` e `texto` são atributo de apresentação de verdade — `stroke` na linha da
grade e `fill` no rótulo das marcas. E `var()` não resolve em atributo: `var()` é
valor de **propriedade CSS**, não de atributo.

Mas a premissa que sustentava a cópia era outra, e não se sustenta. Conferido na
fonte instalada:

- `CartesianAxis.js:216` — as props do `tick` são espalhadas no `<Text>`, com a
  classe `recharts-cartesian-axis-tick-value`;
- `CartesianGrid.js` — as linhas saem com `recharts-cartesian-grid-horizontal` e
  `-vertical`.

Os dois viram **atributo de apresentação**, e atributo de apresentação **perde
para qualquer regra CSS**. Então:

```css
.recharts-cartesian-axis-tick-value { fill: rgb(var(--conteudo-suave)); }
.recharts-cartesian-grid line       { stroke: rgb(var(--borda)); }
.recharts-tooltip-cursor            { fill: rgb(var(--borda)); }
```

resolve pelo token, sem cópia, e sem o JS participar. **A cópia pode ir a zero.**

## O que isso muda na catraca

Hoje a `exigirMolduraFiel` é **muro**: existe porque a cópia existe, e o trabalho
dela é impedir que a cópia derive. Com os dois campos em CSS, ela vira **rede**:
não haveria mais o que divergir, e ela passaria a guardar apenas contra alguém
reintroduzir a cópia.

## O custo, dito antes de a gente decidir

**Acoplamento visível aos nomes de classe do Recharts.** Hoje o acoplamento
existe e é invisível — a cópia depende de alguém lembrar de atualizá-la. O
acoplamento por classe é declarado, mora numa folha de estilo, e **pode ser
preso por caso de teste**: renderizar um gráfico e afirmar que os elementos
saem com aquelas classes. Se o Recharts mudar de nome numa versão maior, o caso
reprova em vez de a cor sumir calada.

**Não implementado aqui.** É item próprio, e a decisão de trocar cópia por
acoplamento de classe é do operador.

---

# O que a tabela decide para a fase

**Item 3 é o primeiro vão, não o único.** Quatro no total, e três deles sem
defeito vivo hoje.

**Nenhum vão foi achado por catraca.** Vão 1 apareceu porque um defeito caiu
nele; vãos 3 e 4 apareceram por medição manual no Checkpoint 3; vão 2 apareceu
**por esta tabela**. Nenhuma das cinco catracas apontou para o espaço fora de si
mesma — e nenhuma poderia, porque **cada uma mede o que diz medir, e o espaço
entre elas não é de ninguém.**

**A ordem que a regra da fase impõe.** Onde a aprovação foi mais rigorosa que a
trava, a trava sobe:

1. **vão 3** — a diferença é *medida*: 3,22 aprovado contra 3,66 vigiado;
2. **vão 1** — teve defeito vivo até hoje, e as **duas** chaves saem juntas;
3. **vão 4** — ausência total, sem defeito vivo;
4. **vão 2** — não medido, folga de 0,33 no pior caso.

**E uma advertência sobre a própria tabela.** Ela lista o que se sabe procurar.
Vão 2 estava aqui desde sempre e só apareceu quando alguém foi enumerar as
fronteiras — o que significa que **pode haver um quinto**, e que a tabela precisa
ser refeita quando entrar catraca nova. Ela é instrumento, não certificado, e
cai na mesma família de todos os outros: mede o que diz medir.
