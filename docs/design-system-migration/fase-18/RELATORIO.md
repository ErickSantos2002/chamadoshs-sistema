# Fase 18 — relatório de fechamento

**Acessibilidade, §21.** A fase foi aberta com dois itens, e os dois eram o que
sobrara depois de o levantamento mostrar que a §21 estava **quase toda gasta** —
boa parte das Fases 11 a 16 foi acessibilidade com outro nome.

| item | como terminou |
|---|---|
| **1** — tab order de ponta a ponta | medido nas quatro telas; **um** defeito, consertado |
| **2** — cobertura de `prefers-reduced-motion` | virou **conserto**, não conferência |

---

## Item 1 — o tab order

Medido nas quatro telas, com a sonda a rodar sobre a página já carregada.

| tela | focáveis | `tabindex+` | em `aria-hidden` | fantasma | sem nome |
|---|---:|---:|---:|---:|---:|
| `/cadastros` | 38 | 0 | 0 | 0 | 0 |
| `/dashboard` | 31 | 0 | **2** | 0 | 0 |
| `/chamados/novo` | 18 | 0 | 0 | 0 | 0 |
| `/chamados/6` | 16 | 0 | 0 | 0 | 0 |

Nenhum `tabindex` positivo em lugar nenhum — o anti-padrão que quebra a ordem do
DOM não existe aqui. Nenhum focável sem nome acessível, que é a catraca escrita
na Fase 16-H a fazer o seu trabalho. E as quatro telas começam igual: pular
conteúdo → logo → Dashboard → Chamados.

### O achado, e é o mais sério da fase

Dois elementos com `tabindex="0"` **dentro de `aria-hidden="true"`**, na rosca do
painel.

> `aria-hidden` tira da **árvore de acessibilidade**. Não tira da **ordem de
> tabulação**. E o Recharts 3 liga a camada de acessibilidade por padrão, pondo
> `tabIndex={0}` na superfície — `RootSurface.js:47`.

Somados: **uma parada de foco que não anuncia nada.** Quem navega por teclado
para na rosca, o leitor de tela fica calado, e não há como saber que ali havia
algo — nem o que era, nem como sair. É pior que qualquer uma das duas falhas
isoladas: entrega o incômodo sem a pista.

**O defeito nasce do encontro de duas decisões corretas**, tomadas em lugares
diferentes. A rosca é `aria-hidden` de propósito, porque a lista abaixo já diz os
nomes e os números em texto. E o `tabIndex` é do Recharts, por padrão. Nenhuma
revisão de uma delas o pegaria.

**Consertado com `tabIndex={-1}`**, e o teste pegou o meu conserto pela metade:
só no gráfico arruma a superfície e deixa o `g.recharts-pie` para trás, porque o
`<Pie>` tem prop própria — `rootTabIndex`, padrão 0.

`inert` resolveria árvore e ordem de uma vez e **está errado aqui**: desliga o
ponteiro junto, e a rosca tem `<Tooltip>` no passar do mouse. O conserto certo é
o que mexe só no que está errado.

### O contrato do modal, verificado na tela real pela primeira vez

`role="dialog"` · `aria-modal="true"` · rótulo · **foco inicial** no primeiro
campo · **Escape** fecha · **foco volta ao gatilho** — os seis passam.

E um quase-falso-achado: com o modal aberto, os 38 elementos do fundo continuam
tabuláveis. **Não é falha.** A armadilha existe, é em JS (`prenderTab` no
`keydown`) e tem quatro casos de teste. Ler o código antes de afirmar separou
*"o fundo está tabulável"* — fato — de *"a armadilha não existe"* — falso.

### O percurso humano

O operador percorreu `/cadastros`, `/dashboard` e `/chamados/6` com Tab, que é a
parte que a sonda **não** decide.

> **Nada estranho.** A ordem segue a leitura nas três, o anel aparece em todos os
> pontos, e a aba SLA entra na sequência das outras três agora que a barra não
> corta mais.

Uma observação do percurso, **sem defeito**: a rolagem interna da tabela
acompanha o foco, então as linhas saem e voltam da vista conforme se tabula.
Conferido à mão que as seis continuam lá. Fica registrado porque é o tipo de
comportamento que, numa próxima leitura, pode ser confundido com sumiço de
conteúdo.

---

## Item 2 — o movimento reduzido virou conserto

A conferência achou um bloco `@media (prefers-reduced-motion: reduce)` em
`src/styles/index.css` **byte a byte idêntico** ao de
`design-system/tokens/motion.css`. A §22 é explícita: *"o `base.css`/`motion.css`
já zera; **não sobrescreva**"*.

E não era duplicata inofensiva. Medido no CSS **compilado**, não no fonte:

```
linha  789   o bloco do pacote
linha 3707   o bloco local
```

Mesma especificidade, mesmo `!important` — **o último vence, e o último era o
local.** O dia em que o pacote emendasse a regra, a emenda chegaria ao arquivo e
seria silenciosamente sobrescrita.

**Quarta aparição da mesma forma**, e a primeira em que a cópia é de *regra* e
não de *valor*: moldura da E14, `estiloDoGrafico`, `paletaCategorica`, e agora um
bloco CSS inteiro.

### A pergunta do operador, que rendeu mais dois consertos

> *"Existe mais alguma cópia de bloco inteiro do pacote em `src`? A busca por
> hexadecimal não pega regra CSS duplicada — é outra granularidade."*

**Existia.** Comparando bloco a bloco — 33 no pacote, 16 locais, normalizados e
sem comentário — apareceram quatro encontros, todos na barra de rolagem:

| seletor | veredito |
|---|---|
| `::-webkit-scrollbar` | **cópia idêntica** — removida |
| `::-webkit-scrollbar-track` | **cópia idêntica** — removida |
| `::-webkit-scrollbar-thumb` | **sobrescrita intencional** — fica |
| `::-webkit-scrollbar-thumb:hover` | **sobrescrita intencional** — fica |

As duas que ficam são **decisão**: canto reto pela D2-a e cor por token nosso em
vez do slate cravado do pacote. As duas que saíram foram **de carona**, quando
alguém copiou o bloco inteiro para customizar o polegar.

> **Carona custa o mesmo que cópia.** No dia em que o pacote levar a barra a 8px,
> aquelas linhas segurariam 6 caladas — e ninguém ligaria a barra fina a uma
> emenda de meses atrás.

---

## Os erros desta fase

**1. A sonda contou 177 falsos.** O primeiro balde de "focável invisível"
misturava `display:none` — que **não está** na ordem de tabulação — com o que é
alcançável e invisível. Corrigido antes de virar relatório; o número real é zero
nas quatro telas.

**2. Meu comentário fez a catraca da dica reprovar.** `achadosDeDicaSemDono`
varria o arquivo **cru** e casava a marca do componente **dentro de comentário**.
Quarta aparição do delimitador dentro do conteúdo, e a mais irônica: **catraca
que reprova quem documentou.**

**3. E o conserto do item 2 criou o item 3.** Corrigi o detector para ler o texto
sem comentário e **deixei a contagem impressa saindo do cru**. A catraca passou a
imprimir `4 encontrados, 0 sem dica` com três usos reais.

> Ninguém reprovaria por isso — o `0` estava certo. E é justamente o problema:
> quem lesse veria quatro onde há três. **Instrumento cujo trabalho é não mentir
> sobre o que viu passou a imprimir um número que ele próprio não usava.**

Parente da catraca que afirmava o contrário do que media, com uma diferença que a
torna pior: **lá o instrumento sempre esteve errado; aqui ele ficou errado no
momento em que foi consertado.**

---

## Estado ao fechar

- **642 casos, 61 arquivos.** `tsc` e `validar-paleta` limpos.
- **38 chamadas** à produção, em leitura pura — uma a mais que as 37 estimadas,
  porque `/chamados/6` deu 15 desta vez.
- A **tabela das catracas** foi atualizada: ganhou as três catracas nascidas
  depois da Fase 16-H e uma seção de **vãos conhecidos**.

### Vãos declarados

1. **A armadilha do modal é em JS** — intercepta `Tab`, não cobre reentrada pelo
   cromo do navegador (F6, barra de endereço). `inert` cobriria e custaria o
   ponteiro. **Não corrigível sem custo maior.**
2. **`aria-hidden` + `tabIndex` não tem catraca.** Escrever uma exigiria decidir
   o que fazer com o caso legítimo — `aria-hidden` não-focável é a maioria
   esmagadora. Hoje quem vigia é um caso de teste, e ele cobre **um** gráfico.
3. **A busca por cópia de bloco CSS foi à mão, uma vez.** Virar catraca depende
   de decidir o que ela faz com sobrescrita legítima.
