# As dezesseis — fichas da §29

As **imagens** ficam fora do repositório, em
`docs/design-system-migration/capturas-locais/`, ignorada inteira no
`.gitignore`. Estas fichas ficam **dentro**: são elas que dizem o que a imagem
mostra, sob que condições e com que ressalvas.

Cada linha traz a saída da sonda e o tamanho em pixels da imagem devolvida — as
duas provas, uma da página e outra do quadro. O protocolo está em
`protocolo-de-captura.md`.

## As duas provas de cada captura

**A sonda**, antes da foto: identidade da página, `.env`, canário do CSS
servido, marcador de tema com o fundo computado, e contagem de linhas nas telas
que têm tabela. Sem `ok: true`, não se fotografa.

**A régua**, na foto: a imagem devolvida é 1:1 com o viewport CSS, então as
dimensões dela *são* a medida do viewport. Só valem **1366×768** e **390×844**
exatos.

A régua já foi vista reprovando, que é o que a faz valer: a captura 1 saiu em
**672×448** — uma foto de aparência perfeitamente normal, tirada num estado de
zoom que ninguém pediu — e foi descartada. O viewport é fixado pelo operador na
barra de dispositivo do DevTools, porque `resize_window` responde
"Successfully resized" sem redimensionar nada.

## Ressalvas que valem para o bloco 13–16

O chamado é o **CHAM-2025-0006** (id 6): resolvido, nota 5, 3 comentários com
autor e papel, 6 entradas de histórico, prioridade **Alta**.

**1. A avaliação sai no estado de leitura, e não no de edição.** `Avaliacao.tsx`
só desenha os cinco `<button>` clicáveis quando `solicitante_id === user.id`, e
**nenhum dos 159 chamados resolvidos foi aberto pela conta admin** — a única com
que se pode logar para ver o resto da tela. Então o painel sai com as cinco
estrelas preenchidas e o selo `5 de 5`, que é o estado mais rico disponível
nesta massa. O estado de edição — com foco visível e hover nas estrelas — **não
é capturável aqui**, e fica registrado como lacuna de evidência, não como
defeito. É verificado por leitura de código e pela suíte.

**2. A ressalva do selo `discreto` caiu.** Ela existia enquanto o escolhido era
o CHAM-2026-0086, de prioridade **Baixa**, que puxava o selo para o tom mais
fraco do mapa. O id 6 é **Alta**, então o selo sai em tom cheio. A troca custou
o painel de Solução: 75 letras contra as 979 do 0086. Foi escolha consciente —
dois painéis cheios (comentários e histórico) contra um painel gordo e dois
vazios.

## As dezesseis

| # | tela | rota | viewport | tema | arquivo | sonda | régua |
|---|---|---|---|---|---|---|---|
| 1 | painel | `/dashboard` | 1366×768 | claro | `01-painel-1366x767-claro.png` | ok | 1366×767 ✓ |
| 2 | painel | `/dashboard` | 1366×768 | escuro | `02-painel-1366x767-escuro.png` | ok | 1366×767 ✓ |
| 3 | painel | `/dashboard` | 390×844 | claro | | | |
| 4 | painel | `/dashboard` | 390×844 | escuro | | | |
| 5 | listagem | `/cadastros` | 1366×768 | claro | `05-listagem-1366x767-claro.png` | ok | 1366×767 ✓ |
| 6 | listagem | `/cadastros` | 1366×768 | escuro | `06-listagem-1366x767-escuro.png` | ok | 1366×767 ✓ |
| 7 | listagem | `/cadastros` | 390×844 | claro | | | |
| 8 | listagem | `/cadastros` | 390×844 | escuro | | | |
| 9 | formulário | `/chamados/novo` | 1366×768 | claro | `09-formulario-1366x767-claro.png` | ok | 1366×767 ✓ |
| 10 | formulário | `/chamados/novo` | 1366×768 | escuro | `10-formulario-1366x767-escuro.png` | ok | 1366×767 ✓ |
| 11 | formulário | `/chamados/novo` | 390×844 | claro | | | |
| 12 | formulário | `/chamados/novo` | 390×844 | escuro | | | |
| 13 | detalhe | `/chamados/6` | 1366×768 | claro | | | |
| 14 | detalhe | `/chamados/6` | 1366×768 | escuro | | | |
| 15 | detalhe | `/chamados/6` | 390×844 | claro | | | |
| 16 | detalhe | `/chamados/6` | 390×844 | escuro | | | |

*(preenchida à medida que cada captura sai)*

---

## 1 — painel, 1366×768, claro

**Vista, e o tema da legenda confere com o pixel.** Fundo `rgb(248, 250, 252)`,
cartões brancos, texto escuro. Não há divergência entre a legenda e a tela.

```
SONDA  ok true   vp [1366, 768]   problemas []
       marcador claro   fundo rgb(248, 250, 252)   canário ok   linhas [10]
```

Canário: os seis tokens e as sete classes conferidos, disco e servido idênticos.

**Régua: 1366×767, e é o número certo.** Decisão do operador, 08/09/2026: a
régua deste bloco é **1366×767**, não 1366×768.

A altura real do quadro emulado é **767,5**. `innerHeight` é inteiro e arredonda
para cima, então a sonda lê 768; o rasterizador trunca para baixo, então o
arquivo sai 767. As duas réguas discordam por um pixel, e a discordância é
estrutural, não um erro de nenhuma das duas.

Está provado dos dois lados da densidade: em DPR 2 a mesma captura saiu
**2732×1535** — dobro exato na largura (1366×2) e um pixel abaixo do dobro na
altura (1536). Em DPR 1 saiu 1366×767. O mesmo meio pixel, visto por dois
caminhos.

Não é tolerância. A régua é igualdade estrita contra **767**, e o motivo está
escrito. O conserto de verdade entra no `fix(...)`: a sonda passa a reportar
`visualViewport.height`, que é fracionário, e a régua de disco exige o piso
exato dele.

`arquivo: 01-painel-1366x767-claro.png`, PNG RGBA 8 bits, 89.219 bytes. O tiro
em DPR 2 foi apagado depois da decisão.

**Estado da tela:** filtro de período em "Tudo", campos De/Até vazios — que é o
estado correto de "Tudo", conforme o `Dashboard.tsx`: sem início e sem fim não
filtra. 159 chamados.

### Duas ressalvas do que esta captura NÃO prova

**A massa de produção tem um status só.** Os cartões saem 159 total, 159
resolvidos, e **zero** em abertos, em andamento, arquivados e cancelados. Já
estava medido antes das capturas: `porStatus` devolve `{Resolvido: 159}` para os
159. As cores semânticas dos seis cartões aparecem — as barras à esquerda e os
ícones —, então a paleta está registrada; o que não se registra é
**distribuição**. Qualquer gráfico por status sai com uma categoria só.

Não é defeito do design system nem da migração: é limite da massa. A condição
que o operador pediu lá atrás — "chamados espalhados por status e prioridade" —
não existe em produção, e não existia como opção porque não houve ambiente
local.

**Os gráficos ficam abaixo da dobra.** Com 768 de altura a captura alcança
cabeçalho, filtros e a fileira de cartões, e corta no começo do bloco SLA —
"RESOLVIDOS DENTRO DO PRAZO", "ESTOURADOS EM ABERTO" e "EM ATENÇÃO" aparecem
apenas encostando na borda inferior. Nenhum gráfico entra no quadro.

É consequência de fotografar o **viewport**, e não a página rolável. Fica
registrado para que ninguém leia estas quatro capturas do painel como evidência
visual dos gráficos.

**Elemento que pinta, medido em sessão:**

```
PINTA  tag MAIN   cls "flex-1 overflow-y-auto bg-superficie-base p-4 md:p"
       bg rgb(248, 250, 252)
```

Bate com o `fundo` da sonda no claro — e é justamente essa coincidência que fez
a checagem 2 parecer funcionar por tanto tempo. No escuro os dois divergem.

A medição também expôs um erro do critério: o `main` **não** é o canvas da
página. Ele exclui a barra lateral e o cabeçalho, e mesmo assim passa do limiar
de 90% de cobertura — e, sendo o mais profundo, ganha o critério de "último". No
claro carrega o mesmo token do wrapper, então o valor coincide e nada denuncia.
Está no registro do `fix(...)`: o critério passa a exigir **cobertura total** do
viewport, não 90%.

---

## 2 — painel, 1366×768, escuro

**Vista, e o tema da legenda confere com o pixel.** Fundo `rgb(13, 27, 42)`,
cartões sobre `--superficie`, texto invertido. Não há divergência.

```
SONDA (1ª)  ok true   vp [1366, 768]   problemas []
            marcador escuro   fundo rgb(13, 27, 42)    canário ok   linhas [10]
SONDA (2ª)  ok true   vp [1366, 768]   problemas []
            marcador escuro   fundo rgb(248, 250, 252)  canário ok   linhas [10]
```

Canário no bloco `.dark`, seis tokens escuros conferidos. 159 chamados, filtro em
"Tudo".

**Régua:** `02-painel-1366x767-escuro.png`, PNG RGBA 8 bits, 86.753 bytes,
**1366×767** — o mesmo meio pixel da captura 1.

### As duas leituras discordaram no mesmo instante

É o achado desta captura, e ele **encerra uma questão que estava em aberto**.

A primeira leitura deu `rgb(13, 27, 42)` — correto. A segunda, segundos depois e
sem nada mudar na tela, deu `rgb(248, 250, 252)` — o valor do tema claro. As duas
com `marcador: escuro`, as duas com `ok: true`.

O laço de dupla leitura proposto pela sessão do HelpHS deixa de ser hipótese:
aqui ele teria **bloqueado**, porque as leituras discordam. Sai de "em aberto" e
entra no `fix(...)` por decisão do operador.

E o `PINTA` piorou o diagnóstico:

```
PINTA  tag MAIN   cls "flex-1 overflow-y-auto bg-superficie-base p-4 md:p"
       bg rgb(248, 250, 252)
```

No escuro, o `main` — que a tela pinta de escuro, como a imagem mostra —
devolveu o valor **claro**. Não é só escolher o elemento errado: **o valor
computado é que não é confiável**. Trocar de elemento não resolve sozinho.

Hipótese registrada para teste isolado no `fix(...)`: forçar refluxo antes de
medir. Nesta sessão o valor virou correto logo depois de uma varredura que
chamava `getBoundingClientRect` em todos os elementos, que força layout.

### As mesmas duas ressalvas da captura 1

Massa com status único (159/159, zero nos outros quatro) e gráficos abaixo da
dobra. Valem igual aqui, pelos mesmos motivos.

---

## 5 — listagem, 1366×768, claro

**Vista, e o tema da legenda confere com o pixel.** Fundo `rgb(248, 250, 252)`,
cartão branco, texto escuro.

```
SONDA  ok true   vp [1366, 768]   problemas []
       marcador claro   fundo rgb(248, 250, 252)   canário ok   linhas [6, 11, 33]
PINTA  tag MAIN   bg rgb(248, 250, 252)
```

**Régua:** `05-listagem-1366x767-claro.png`, PNG RGBA 8 bits, 122.291 bytes,
**1366×767**.

**O que está no quadro:** aba **Categorias** ativa, com as quatro abas visíveis —
Categorias, Setores, Usuários (com o selo "Admin") e SLA. Tabela de categorias
com as cinco primeiras linhas inteiras (#1 a #5) e a sexta cortada pela borda do
container rolável. Rodapé "Total: 6 categoria(s)".

**O divisor entre linhas aparece**, que era o motivo de a captura exigir `--tabela`
e o que a E14 mudou. Cinco divisores visíveis.

O selo "Admin" da aba Usuários usa `bg-alerta/15` — **tinta**, não força cheia.
Não é o caso dos `--fill-*`, e não entra no commit de higiene.

### Achado: a checagem de linhas olha a maior tabela, não a visível

As três abas montam tabela no DOM ao mesmo tempo — `linhas [6, 11, 33]` são
Categorias, Setores e Usuários. Só a primeira está visível.

A sonda decide por `Math.max(...linhas)` (`sonda-captura.js:229`). Então ela
aprovaria uma captura em que a tabela **visível** tivesse uma linha só, desde que
qualquer outra aba montada tivesse duas — e o divisor, que é o que a checagem
existe para garantir, não apareceria na foto.

Aqui não houve dano: a visível tem 6. Mas é a mesma forma de todos os outros
achados desta semana — **a checagem mede algo próximo do que interessa, e a
proximidade passa por identidade.** Entra no `fix(...)`: contar linhas da tabela
visível, e não da maior. O caso de prova é montar uma aba oculta com muitas
linhas e a visível com uma.

---

## 6 — listagem, 1366×768, escuro

**Vista, e o tema da legenda confere com o pixel — desta vez medido, não olhado.**

```
SONDA  ok true   vp [1366, 768]   problemas []
       marcador escuro   fundo rgb(13, 27, 42)   canário ok   linhas [6, 11, 33]
PINTA  tag MAIN   bg rgb(13, 27, 42)
```

**Régua:** `06-listagem-1366x767-escuro.png`, PNG RGBA 8 bits, 121.150 bytes,
**1366×767**.

### O tema conferido no pixel da imagem entregue

Faixas verticais em `x=700`, comparadas com os tokens lidos do
`src/styles/index.css`:

| faixa | claro (captura 5) | escuro (captura 6) | token |
|---|---|---|---|
| topbar, y 0–62 | `rgb(255, 255, 255)` | `rgb(19, 34, 56)` | `--superficie` ✓ |
| canvas, y 64–87 · 172–191 · 744–766 | `rgb(248, 250, 252)` | `rgb(13, 27, 42)` | `--superficie-base` ✓ |
| cartões, y 89–170 · 193–742 | `rgb(255, 255, 255)` | `rgb(19, 34, 56)` | `--superficie` ✓ |

Nenhuma divergência, nos dois temas. Texto sobre o cartão: 16,30:1 no claro,
9,91:1 no escuro.

### Um falso positivo, medido e descartado

À vista da imagem reduzida, o `#4` da tabela parecia sair num tom avermelhado só
no escuro. Medido: `rgb(234, 238, 249)`, idêntico ao `#1` e ao `#3`. Artefato da
redução, não defeito. Registrado porque a suspeita foi levantada e precisa
morrer por escrito.

### O valor computado é INTERMITENTE, e isso muda o diagnóstico

Achado do operador, e ele está certo:

| | elemento | tema | `PINTA` devolveu |
|---|---|---|---|
| captura 2 | `MAIN` | escuro | `rgb(248, 250, 252)` — **errado** |
| captura 6 | `MAIN` | escuro | `rgb(13, 27, 42)` — **certo** |

Mesmo seletor, mesmo tema, momentos diferentes. Então o `getComputedStyle` não é
sistematicamente errado: é **intermitente**. Isso pesa a favor da hipótese do
refluxo e enfraquece a de "elemento errado".

**Com uma ressalva, e as duas coisas são independentes.** O problema do critério
continua de pé por outro motivo: o `MAIN` passa do limiar de 90% sem ser o canvas
da página — exclui barra lateral e cabeçalho. Isso está errado mesmo nos momentos
em que o valor vem certo. São dois defeitos que se somam, não um só visto de dois
ângulos.

### A prova negativa nº 1 rodou de novo, ao vivo

Antes desta captura, a sonda **clara** foi rodada por engano na página escura e
bloqueou com três motivos — `data-tema-pronto`, classe `.dark` e canário. Erro de
nome de arquivo do operador, e a trava fez o que devia.

Vale registrar porque é a mesma saída de três motivos que, meses de leitura
depois, escondeu a ausência da quarta checagem. A prova funcionou; o que ela
nunca provou foi o que **não** estava lá.

---

## 9 — formulário, 1366×768, claro

**Vista, e o tema da legenda confere com o pixel.**

```
SONDA  ok true   vp [1366, 768]   problemas []
       marcador claro   fundo rgb(248, 250, 252)   canário ok   linhas []
PINTA  tag MAIN   bg rgb(248, 250, 252)
```

`linhas []` é o esperado: a tela não tem tabela, e a captura roda a sonda
`sem-tabela`, que não cobra.

**Régua:** `09-formulario-1366x767-claro.png`, PNG RGBA 8 bits, 91.079 bytes,
**1366×767**.

**Cor por disco:** LIBERA. Quinze faixas em `x=700`, todas casando token de
superfície do tema claro — `--superficie` no topo e nos cartões,
`--superficie-base` nos vãos, `--superficie-elevada` no bloco de prioridade ao
pé da tela.

> **O que "LIBERA" afirma, exatamente:** *nenhuma cor fora do conjunto de tokens
> de superfície do tema*. **Não** afirma que cada faixa carrega o token que
> deveria. Ver a mutação B, abaixo — é a prova de que a distinção existe.

**O que está no quadro:** formulário **em branco**, como a leitura pura exige.
Título e Descrição com marcador de obrigatório e texto de ajuda ("Mínimo 10
caracteres", "Mínimo 20 caracteres"); os três `Seletor` no estado não escolhido
("Selecione o solicitante", "Sem categoria", "Média"); e o bloco de consequência
da prioridade, com o `Rotulo` em mono/caixa-alta. Nenhum estado de erro — que é
o registrado como pendência, e não uma falha desta captura.

---

## 10 — formulário, 1366×768, escuro

**Vista, e o tema da legenda confere com o pixel.**

```
SONDA  ok true   vp [1366, 768]   problemas []
       marcador escuro   fundo rgb(13, 27, 42)   canário ok   linhas []
PINTA  tag MAIN   bg rgb(13, 27, 42)
```

**Régua:** `10-formulario-1366x767-escuro.png`, PNG RGBA 8 bits, 90.052 bytes,
**1366×767**.

**Cor por disco:** LIBERA — `--superficie` no topo e nos cartões,
`--superficie-base` nos vãos, com os valores do bloco `.dark`. Vale a mesma
ressalva da afirmação fraca.

**Placar do `PINTA` no escuro:** dois certos (capturas 6 e 10) contra um errado
(captura 2). O valor computado é intermitente, e a proporção não muda o
diagnóstico — uma leitura errada em três é exatamente o que uma checagem de
leitura única não pega.

---

# A verificação de cor por disco — o que ela afirma e o que não afirma

Desenhada durante as capturas 5–10, adotada por decisão do operador em
08/09/2026. O definitivo entra com o `fix(...)` da sonda; o protótipo viveu no
scratchpad.

> **Afirmação FRACA, e é esta que vale:** nenhuma cor de faixa está fora do
> conjunto de tokens de superfície do tema declarado.
>
> **Afirmação FORTE, que ela NÃO faz:** cada faixa carrega o token que aquela
> faixa deveria carregar.

A única exceção é o **canvas**, fechado por regra própria: a primeira e a última
faixa têm de ser `--superficie-base`. Uma regra só, sem codificar layout, e pega
a classe de defeito que importa — o fundo da página pintado com a superfície
errada.

## Proveniência, porque sem ela a checagem nasce cega

Cada linha diz a coordenada de onde veio o valor e o token contra o qual
comparou, e a saída nomeia o arquivo de onde os tokens foram lidos:

```
y  64.. 87  rgb(248, 250, 252)  = --superficie-base  ok  (x=700)
```

Na reprovação, nomeia a faixa, a cor encontrada e o token mais próximo.

## As três mutações, e por que são três

| | mutação | resultado | o que ela separa |
|---|---|---|---|
| **tema** | captura 6 (escura) declarada clara | REPROVA, 15 faixas, saída 1 | quase nada — ver abaixo |
| **A** | uma faixa em `rgb(240, 240, 240)` | REPROVA, nomeando a faixa | faixa plausível **de** token |
| **B** | uma faixa em `--superficie-elevada` | **LIBERA** | token certo **de** token da faixa |

**A do tema é fácil demais e quase não prova nada.** Trocar o tema muda todas as
faixas, então qualquer coisa pega — inclusive uma heurística grosseira de "é
claro ou escuro". Ela não distingue comparação com token de casamento com faixa
de cor. Está aqui como piso, não como prova.

**A mutação A é a que prova a comparação com token.** `rgb(240, 240, 240)` é
claro, é plausível, e não é token nenhum. Veio da sessão do HelpHS, que
descobriu por mutação que a bateria de provas dela não distinguia as duas
coisas.

**A mutação B é a que prova que a afirmação é FRACA — e ela fica registrada por
isso.** Repintar o canvas com `--superficie-elevada` põe um token legítimo, do
tema certo, no lugar errado, e a checagem **libera**. Sem este caso escrito,
alguém relê a checagem daqui a um mês como se ela fizesse a afirmação forte — e
essa releitura é o defeito, não a checagem.
