# Fase 16 — relatório de fechamento

**09/09/2026.** A fase foi aberta com uma ordem explícita e uma regra de
prioridade, e as duas se sustentaram até o fim.

> A tabela das catracas, **antes de qualquer chave nova**. Depois os quatro
> itens herdados, na ordem 1 → 4.
>
> **Onde a aprovação foi mais rigorosa que a trava, a trava sobe de prioridade.**

Essa regra é o eixo da fase inteira. Ela nomeia um defeito que não aparece em
teste nenhum: **o rigor gasto numa aprovação não se transfere para a guarda que
fica no lugar dela.** Aprovar com 36 células e três superfícies e deixar uma
catraca que mede uma superfície não é erro de execução — é a aprovação
protegendo o dia em que foi feita, e não os dias seguintes.

---

## 1. A tabela das catracas — o que a fase fez primeiro

`TABELA-DAS-CATRACAS.md`. Cada catraca, cada medição e cada portão da sonda com
**onde PARA** escrito ao lado.

O que a tabela mudou não foi a cobertura: foi o **estatuto do vão**. Depois
dela, um vão é um item registrado, e não uma descoberta futura. Os cinco mais
relevantes, com o motivo de cada um estar certo:

| fronteira | por que está certa |
|---|---|
| fundo cheio só com `text-white` | ela existe para o branco **cravado**; quem usa o token pareado está certo — os 4 `bg-sinal` dão 5,29 e 5,11 |
| ΔE só **dentro** do grupo | cada gráfico usa **uma** paleta; vira vão no dia em que um gráfico misturar duas |
| contraste de gráfico numa superfície | a aprovação da E16-b mediu **três**, pior 3,22; a catraca mede uma, mínimo 3,66 |
| duas catracas leem só `.tsx` | conferido: a única classe semântica em `.ts` está em **comentário** |
| `design-system/` fora de todas | é a cópia do pacote, não código nosso |

A terceira linha é a regra de prioridade em números, e foi ela que ordenou o
resto da fase.

---

## 2. Os quatro itens

### Item 1 — cor cheia como texto

**13 usos.** `text-sinal`, `text-alerta`, `text-perigo` em força cheia sobre
superfície, onde a semântica pede o par tênue.

A chave que ficou (`exigirSemanticaNoPapelCerto`) são **duas**: uma para
`text-*` e outra para `bg|fill-*`. Elas viajam juntas porque a dispensa de uma é
condição da outra — um `bg-` semântico é aceitável quando há `text-` pareado na
mesma lista, e essa dispensa **não vale ao contrário**.

### Item 2 — adoção dos `--chart-*`

Adotada em **parte**, por decisão do operador, e a parte que fica de fora é a
decisão:

| E18 | slot | aqui |
|---|---|---|
| `open` | `--chart-1` | `Aberto` |
| `in_progress` | `--chart-2` | `Em Andamento` |
| `awaiting_client` | `--chart-3` | `Aguardando` |
| `awaiting_technical` | `--chart-4` | **vago, declarado** |
| `resolved` | `--chart-5` | **não adotado** |
| `closed` | `--chart-6` | **não adotado** |
| `cancelled` | `--chart-7` | **vago, declarado** |

`resolved` e `closed` pintam hoje a mesma cor. Dar-lhes slots diferentes
**responderia por acidente** a pergunta de produto aberta desde o Checkpoint 3.
Melhor uma pendência nomeada que uma decisão de produto tomada por efeito
colateral de uma tabela de cores.

**A lição é sobre ordem, não sobre cor:** uma tabela de cores parece decisão
técnica e transporta decisão de produto. Mostrar a tabela **antes** de virar
código foi o que pegou — exigência do operador.

### Item 3 — `--fill-*` e preenchimento nu

Feito. E ele rendeu a demonstração mais direta do defeito da semana: a chave
saiu sem `fill-`, e no mesmo dia a estrela de avaliação apareceu com
`fill-alerta` **viva**, do lado de uma catraca que dizia cobrir preenchimento.

### Item 4 — a moldura e a paleta de uma superfície

`estiloDoGrafico` foi **apagado inteiro**. A cópia de token foi de cinco
hexadecimais para dois, e de dois para **zero**, substituída por três regras em
`index.css` que leem `var()`.

Isso comprou um acoplamento — as classes que o Recharts emite — e ele é
**declarado**: três casos de teste reprovam alto se uma versão maior renomear,
em vez de a cor sumir calada. Era esse o defeito do arranjo anterior.

A dica do gráfico ganhou componente próprio (`DicaDoGrafico`). Antes o texto
saía **na cor da série**: 12 pares reprovando 4,5:1.

---

## 3. O que a fase encontrou e consertou

| achado | tamanho |
|---|---|
| deriva da moldura desde a E14 | 2 campos, invisível por três emendas |
| texto da dica na cor da série | 12 pares abaixo de 4,5:1 |
| cor cheia como texto | 13 usos |
| botão sem nome abaixo do `sm` | 3 |
| preenchimento nu | 4 |
| `estilo.eixo` morto, já com defeito pronto dentro | 1 |
| funções declaradas duas vezes no validador | 182 linhas-sombra |

## 4. O que encontrou e **não** consertou

**`--tint-primary` × `--tint-info` colidem.** ΔE **1,49–1,77** no claro e
**0,80–2,24** no escuro, nos três canais, contra um piso de 20. E
`VARIANTE_DE_STATUS` põe os dois em **linhas vizinhas da mesma tabela**.

O diagnóstico é que **o pacote não está errado**. O piso de 20 foi declarado
para série de gráfico, nunca para tinta, e azul de marca perto de azul de
informação é esperado. O erro é de **uso**: usar a variante de marca para
significar um status trata as variantes do selo como paleta categórica, que não
é o que elas são. **A correção é na nossa tabela de variantes.**

E a formulação que o operador deu, que separa duas coisas que a regra do
portador redundante estava juntando:

> **O portador redundante justifica não exigir 3:1 do reforço; não justifica um
> reforço que engana.**

---

## 5. Os erros desta fase, ditos por inteiro

1. **Funções duplicadas entraram no `bcc2b3e`.** Uma edição inseriu em vez de
   substituir. O comportamento estava certo porque a última declaração vence —
   e é exatamente por isso que ninguém veria. Virou catraca.
2. **As duas chaves novas devolveram ZERO com 13 usos existentes.** Fronteira
   frouxa mais barra invertida simples dentro de literal de string.
   *Catraca que devolve zero e não é confrontada com um caso conhecido é
   aprovação silenciosa.*
3. **Os números de linha eram ficção** — tirar comentário colapsava a contagem.
4. **`fill-` faltou na chave do preenchimento nu**, e o achado apareceu no
   mesmo dia.
5. **`!important` na prova da cascata.** Instrumento que força o resultado que
   se quer ver **não mede, produz**. Remedido limpo: o atributo perde sem ele,
   no Chrome 153 e no jsdom.
6. **Medi tokens na página de erro do Chrome.** O servidor tinha morrido. Estive
   a um passo de relatar *"os tokens do pacote não chegam ao navegador"* —
   grave e falso. A regra de identidade da página foi **estendida** hoje para
   valer em medição solta, não só em captura.
7. **Hoje, no caso da fatia.** Escrevi que a fatia adotada não levaria atributo
   `fill`. Ela leva: o Recharts escreve `#808080` por conta própria. Não é cópia
   de token nossa, e a regra CSS o vence — o caso passou a medir o **computado**,
   que é o que importa.

Sete erros, e todos do mesmo feitio: **o instrumento parecia medir o que
interessava e media perto.** É a família registrada da semana, agora com os
próprios instrumentos dentro dela.

---

## 6. O que a verificação conseguiu, e o que não

**Confirmado no navegador:** o marcador da legenda — `rgb(78,134,198)`,
`rgb(188,118,56)` e `rgb(46,208,229)`, que são os `--chart-1/2/3` do escuro.

**Não confirmado no navegador:** a fatia da rosca. A massa de produção só tem
`Resolvido`, que é exatamente o status **não adotado**; as três séries adotadas
ficam em zero, e o Recharts não desenha caminho para fatia de valor zero. A
fatia está presa em **teste**, com valor não-nulo, com o computado medido contra
regra injetada.

**Custo dito em voz alta:** se a regra CSS não chegar, a fatia não some — fica
**cinza**. Degradação silenciosa. Quem a pega é o caso das classes.

**Legenda:** a exigência da E18 já estava satisfeita. A lista sob a rosca dá
quadradinho de cor **mais o nome escrito**, série por série — e é por isso que a
rosca é `aria-hidden`. Um `<Legend>` do Recharts duplicaria.

---

## 7. Estado ao fechar

- **626 casos, 59 arquivos.** `tsc` e `validar-paleta` limpos.
- **9 catracas**, quatro delas nascidas nesta fase: cópia de token, dica
  própria, semântica no papel certo, e o validador não se duplicar.
- Versão **1.7.7**, com a entrada do aviso.

### Pendências nomeadas que a fase deixa

1. `resolved`/`closed` fora da E18, presos à pergunta de produto. Quando ela for
   respondida, a adoção completa é **um commit**.
2. `corDoStatus` segue pintando os cartões de KPI — gráfico e cartão passam a
   ter **fontes distintas** de status → cor.
3. `--tint-primary` × `--tint-info`, corrigível na nossa tabela de variantes.

**As três fecham juntas**, e é por isso que estão numeradas lado a lado: são a
mesma pergunta — *de onde sai a cor de um status* — vista do gráfico, do cartão
e do selo.

### Parado por decisão

- Recópia da E23, à espera da medição da tinta.
- Checkpoint 4, que vem em seguida e pede **autorização por escrito** para o
  rebase de histórico.
