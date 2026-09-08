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
| 3 | painel | `/dashboard` | 390×844 | claro | `03-painel-390x844-claro.png` | ok | 389×843 ✓ |
| 4 | painel | `/dashboard` | 390×844 | escuro | `04-painel-390x844-escuro.png` | ok | 389×843 ✓ |
| 5 | listagem | `/cadastros` | 1366×768 | claro | `05-listagem-1366x767-claro.png` | ok | 1366×767 ✓ |
| 6 | listagem | `/cadastros` | 1366×768 | escuro | `06-listagem-1366x767-escuro.png` | ok | 1366×767 ✓ |
| 7 | listagem | `/cadastros` | 390×844 | claro | `07-listagem-390x844-claro.png` | ok | 389×843 ✓ |
| 8 | listagem | `/cadastros` | 390×844 | escuro | `08-listagem-390x844-escuro.png` | ok | 389×843 ✓ |
| 9 | formulário | `/chamados/novo` | 1366×768 | claro | `09-formulario-1366x767-claro.png` | ok | 1366×767 ✓ |
| 10 | formulário | `/chamados/novo` | 1366×768 | escuro | `10-formulario-1366x767-escuro.png` | ok | 1366×767 ✓ |
| 11 | formulário | `/chamados/novo` | 390×844 | claro | `11-formulario-390x844-claro.png` | ok | 389×843 ✓ |
| 12 | formulário | `/chamados/novo` | 390×844 | escuro | `12-formulario-390x844-escuro.png` | ok | 389×843 ✓ |
| 13 | detalhe | `/chamados/6` | 1366×768 | claro | `13-detalhe-1366x767-claro.png` | ok | 1366×767 ✓ |
| 14 | detalhe | `/chamados/6` | 1366×768 | escuro | `14-detalhe-1366x767-escuro.png` | ok | 1366×767 ✓ |
| 15 | detalhe | `/chamados/6` | 390×844 | claro | `15-detalhe-390x844-claro.png` | **não colada** | 389×843 ✓ |
| 16 | detalhe | `/chamados/6` | 390×844 | escuro | `16-detalhe-390x844-escuro.png` | ok | 389×843 ✓ |

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

> **O que "LIBERA" afirma, exatamente:** *a cor **dominante** de cada faixa
> horizontal está no conjunto de tokens de superfície do tema*. **Não** afirma
> que cada faixa carrega o token que deveria (mutação B), nem enxerga mancha que
> ocupe minoria da linha (mutação A). Ver a seção das mutações.

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

> **Afirmação que ela FAZ:** a cor **dominante** de cada faixa horizontal está
> no conjunto de tokens de superfície do tema declarado.
>
> **Duas coisas que ela NÃO faz:** não afirma que cada faixa carrega o token que
> aquela faixa deveria carregar (mutação B); e não enxerga mancha de cor que
> ocupe **minoria** da linha (mutação A).

Mais uma verificação mínima de presença: **`--superficie-base` tem de aparecer em
alguma faixa** — o canvas da página precisa estar em cena.

**A regra do canvas que eu propus foi derrubada pelos dados.** Eu disse "primeira
e última faixa são `--superficie-base`", olhando um exemplo. Em **9 de 9**
capturas a primeira faixa é `--superficie`, que é a topbar; e a última varia —
`--superficie` 5×, `--superficie-base` 2×, `--superficie-elevada` 2×. O que
sobrevive às nove é só a presença.

## Proveniência, porque sem ela a checagem nasce cega

Cada linha diz a coordenada de onde veio o valor e o token contra o qual
comparou, e a saída nomeia o arquivo de onde os tokens foram lidos:

```
y  64.. 87  rgb(248, 250, 252)  = --superficie-base  ok  (x=700)
```

Na reprovação, nomeia a faixa, a cor encontrada e o token mais próximo.

## As três mutações, e por que são três

| | mutação | resultado | o que ela estabelece |
|---|---|---|---|
| **tema** | captura 6 (escura) declarada clara | REPROVA, 16 pontos | piso — ver abaixo |
| **A′** | faixa **inteira** em `rgb(240, 240, 240)` | REPROVA, nomeando a faixa | compara com **token**, não com faixa de cor |
| **A** | **22%** da faixa em `rgb(240, 240, 240)` | **LIBERA** | limite: mancha minoritária não é vista |
| **B** | faixa em `--superficie-elevada` | **LIBERA** | limite: a afirmação é fraca |

**A do tema é fácil demais e quase não prova nada.** Trocar o tema muda todas as
faixas, então qualquer coisa pega — inclusive uma heurística grosseira de "é
claro ou escuro". Está aqui como piso.

**A A′ é a que prova a comparação com token.** `rgb(240, 240, 240)` é claro, é
plausível, e não é token nenhum. A ideia veio da sessão do HelpHS.

**A A é a mesma mutação em 22% da largura, e ela LIBERA — registrada como
limite.** A amostragem passou a ser pela cor **dominante** da linha porque uma
coluna única atravessa botão e texto: em 390 a coluna do meio cruzava o botão
"Tudo" e o antialiasing de subpixel do rótulo, que produz cores como
`rgb(255, 246, 232)` — canal por canal, de token nenhum. A modal resolve isso e
**perde** a mancha minoritária.

Vale dizer o que aconteceu, porque é a lição de novo: **a mutação A reprovava
antes da troca de amostragem e passou a liberar depois dela.** Ganhar robustez
contra texto custou, calado, a detecção que a checagem existe para ter. Só
apareceu porque as mutações foram rodadas de novo depois da mudança.

E não há como separar as duas coisas por estatística: widget legítimo também é
minoria de linha.

**A mutação B é a que prova que a afirmação é FRACA — e ela fica registrada por
isso.** Repintar o canvas com `--superficie-elevada` põe um token legítimo, do
tema certo, no lugar errado, e a checagem **libera**. Sem este caso escrito,
alguém relê a checagem daqui a um mês como se ela fizesse a afirmação forte — e
essa releitura é o defeito, não a checagem.

---

## 13 — detalhe, 1366×768, claro

**Vista, e o tema da legenda confere com o pixel.**

```
SONDA  ok true   vp [1366, 768]   problemas []
       marcador claro   fundo rgb(248, 250, 252)   canário ok   linhas []
PINTA  tag MAIN   bg rgb(248, 250, 252)
```

**Régua:** `13-detalhe-1366x767-claro.png`, PNG RGBA 8 bits, 95.177 bytes,
**1366×767**. **Cor por disco:** LIBERA, com a ressalva da afirmação fraca.

### O que entrou no quadro

Cabeçalho do chamado `#CHAM-2025-0006` com os três botões de ação, "Ações
Rápidas: Reabrir", e o bloco **Informações do Chamado** inteiro.

Fica registrado por evidência visual:

- **"Cancelar Chamado" saiu como `secondary`**, cinza, ao lado de "Arquivar" e
  "Editar Detalhes" — é a pendência (1) do Checkpoint 3, agora fotografada.
- **Cinco selos em cena:** "Resolvido" (verde), "Alta" (âmbar), "Estourado ·
  120%" (vermelho), "Usuario" e "Administrador" (azul). A prioridade **Alta**
  sai no tom cheio, que era o motivo de trocar o chamado — essa parte da troca
  se pagou.

### O que NÃO entrou, e é a maior parte

**Descrição, Solução, Avaliação, Comentários (3) e Histórico (6) ficaram abaixo
da dobra.** Com 767 de altura o quadro termina no "Tempo em aberto" e corta no
começo do cartão seguinte.

São exatamente os cinco painéis pelos quais o `CHAM-2025-0006` foi escolhido, e
o motivo da escolha era ter Comentários e Histórico preenchidos.

**A troca de chamado, nesta parte, não mudou a evidência.** O
`CHAM-2026-0086` teria produzido um quadro visualmente equivalente, porque a
diferença entre os dois está toda abaixo dos 767 pixels. O que se pagou foi só o
selo de prioridade.

### A lição, e ela é do mesmo tamanho da semana

A escolha do chamado foi otimizada por **conteúdo** — 159 resolvidos varridos,
23 com comentário, 6 com nota, uma lista curta pontuada por tamanho de solução —
e ninguém mediu se esse conteúdo **cabia no quadro** antes de escolher.

Não é a família do "mede perto do que interessa": é vizinha dela. Aqui a medição
estava certa e completa; o que faltou foi notar que ela caía **fora da fronteira
do que a captura registra**. Uma seleção cuidadosa a respeito de algo que a
evidência não ia mostrar.

O sintoma prático é o mesmo de sempre: teria sido pego em dez segundos, antes das
320 chamadas à API, por uma pergunta que ninguém fez — *"os painéis cabem em 767
pixels?"*.

### Encaminhamento

Mesmo tratamento já decidido para os gráficos do painel: se a §29 do detalhe
exigir os painéis de baixo, eles viram **captura própria, nomeada como tal,
depois das dezesseis**. Rolar antes de fotografar destrói o enquadramento que a
régua garante.

---

## 14 — detalhe, 1366×768, escuro

**Vista, e o tema da legenda confere com o pixel.**

```
SONDA  ok true   vp [1366, 768]   problemas []
       marcador escuro   fundo rgb(13, 27, 42)   canário ok   linhas []
PINTA  tag MAIN   bg rgb(13, 27, 42)
```

**Régua:** `14-detalhe-1366x767-escuro.png`, PNG RGBA 8 bits, 93.513 bytes,
**1366×767**. **Cor por disco:** LIBERA, com a ressalva da afirmação fraca.

Tela confirmada: `#CHAM-2025-0006`, Resolvido, Alta, "Estourado · 120%",
categoria Software, solicitante Lara, técnico Welton. Par escuro exato do
recorte da captura 13 — mesmo corte, mesmos elementos.

Os cinco selos aparecem nos dois temas, e o par 13/14 é o registro deles:
"Resolvido", "Alta", "Estourado · 120%", "Usuario" e "Administrador".
"Cancelar Chamado" em `secondary` também nos dois.

---

# O corte de 767 pixels, dito com todas as letras

**Vale para as capturas 13 e 14, e é a mesma consequência dos gráficos nas 1 e 2.**

> **O quadro termina em "Tempo em aberto". Comentários e Histórico ficam
> ABAIXO do corte, e o registro visual dos dois NÃO existe em 1366×767.**

Foi por causa desses dois painéis que o `CHAM-2025-0006` foi escolhido, entre
159 resolvidos varridos. A escolha **continua certa** por outro motivo: a
prioridade **Alta** tirou o selo do tom `discreto`, que era a segunda ressalva
da ficha, e essa parte aparece nas duas fotos.

O que não se paga é a primeira metade: **Comentários (3) e Histórico (6) não
entram no quadro em nenhuma das duas.** O `CHAM-2026-0086` teria dado um
recorte visualmente equivalente.

Encaminhamento, igual ao dos gráficos do painel: se a §29 do detalhe exigir os
painéis de baixo, eles viram **captura própria, nomeada como tal, depois das
dezesseis**. Rolar antes do clique destrói o enquadramento que a régua garante.

---

## 3 — painel, 390×844, claro

**Vista, e o tema da legenda confere com o pixel.**

```
SONDA  ok true   vp [390, 844]   problemas []
       marcador claro   fundo rgb(248, 250, 252)   canário ok   linhas [10]
PINTA  tag DIV   cls "relative rounded-xl border border-borda bg-superfi..."
       bg rgb(255, 255, 255)
```

**Régua: 389×843.** Um pixel a menos nos **dois** eixos — em 1366×768 faltava só
na altura. Mesma causa, mais visível: o quadro emulado carrega meio pixel por
eixo, `innerWidth`/`innerHeight` arredondam para cima e o rasterizador trunca.

**Cor por disco:** LIBERA, 22 faixas.

**O que está no quadro:** gaveta **fechada**, coluna única, filtros empilhados,
"Tudo" selecionado, "TOTAL DE CHAMADOS 159" começando ao pé. A topbar reduz ao
hambúrguer e ao avatar — nome e papel do usuário somem nesta largura.

### O `PINTA` mudou de elemento: a heurística depende do viewport

Em 1366 devolvia `MAIN` (`bg-superficie-base`). Em 390 devolveu um **DIV de
card** (`bg-superficie`, branco): em coluna única o card cresce e passa a cobrir
≥90% do viewport, então "último que cobre" deixa de significar canvas.

**São três defeitos distintos no mesmo trecho**, e nenhum é o outro:

1. **limiar errado** — 90% aceita elemento que não é o canvas (`MAIN` em 1366);
2. **dependente de viewport** — qual elemento vence muda com a largura (o card em 390);
3. **valor intermitente** — o mesmo `getComputedStyle` dá certo e errado em
   momentos diferentes (capturas 2 × 6 × 10).

**Cobertura total resolve 1 e 2 de uma vez:** um card tem margem, então nunca
cobre o viewport inteiro, e o wrapper volta a vencer em qualquer largura. O 3
continua sendo o laço de assentamento mais o refluxo.

E os três hoje só afetam o **diagnóstico**, não a evidência — a verificação de
cor mudou para o disco, e lá não há seleção de elemento nenhuma.

### Um defeito real, achado por esta captura

Nesta largura o botão de cancelados vira **só ícone**: o rótulo tem
`hidden sm:inline`. Conferindo o padrão inteiro, são cinco sítios:

| arquivo | rótulo escondido | nome acessível abaixo de `sm` |
|---|---|---|
| `Dashboard.tsx:538` | "Cancelados ocultos" | **tem** — `title` + `aria-pressed`, com comentário explicando |
| `CategoriasTab.tsx:189` | "Nova Categoria" | **nenhum** |
| `SetoresTab.tsx:198` | "Novo Setor" | **nenhum** |
| `UsuariosTab.tsx:339` | "Novo Usuário" | **nenhum** |

Os ícones são `aria-hidden` por padrão — está escrito no `icones.tsx`. Então os
três últimos ficam **sem nome acessível nenhum** abaixo de 640px.

E o `icones.tsx` **já enuncia a regra que eles quebram**:

> "Todos são `aria-hidden`. Ícone aqui acompanha palavra — quando ele for o
> único conteúdo de um botão, o rótulo vai no `aria-label` do botão."

A regra foi escrita para o caso estático. `hidden sm:inline` faz o botão
**virar** só-ícone num breakpoint, e ninguém ligou as duas coisas. O
`Dashboard.tsx` resolveu esse mesmo problema uma vez, com `title` e um
comentário explicando o raciocínio — e a solução não se propagou.

Aparece nas capturas **7 e 8**. É correção funcional fora da migração, e pede
chave nova na catraca: hoje ela procura `aria-label` que apaga conteúdo visível,
não rótulo escondido por breakpoint que deixa o botão sem nome.

---

## 4 — painel, 390×844, escuro

**Vista, e o tema da legenda confere com o pixel.**

```
SONDA  ok true   vp [390, 844]   problemas []
       marcador escuro   fundo rgb(13, 27, 42)   canário ok   linhas [10]
PINTA  tag DIV   cls "relative rounded-xl border border-borda bg-superfi..."
       bg rgb(19, 34, 56)
```

**Régua:** `04-painel-390x844-escuro.png`, PNG, 49.135 bytes, **389×843**.
**Cor por disco:** LIBERA.

Par escuro exato do recorte da captura 3 — gaveta fechada, coluna única, "Tudo"
com 159, topbar reduzida ao hambúrguer e ao avatar.

### O par 3/4 separa dois dos três defeitos do `PINTA`

Nos dois temas o `PINTA` devolveu o **mesmo DIV de card** em vez do `MAIN`. E os
valores vieram **certos nos dois**: `rgb(255, 255, 255)` no claro e
`rgb(19, 34, 56)` no escuro, que são `--superficie` de cada tema.

Isso separa o que estava embolado:

| defeito | o par 3/4 diz |
|---|---|
| **limiar de 90%** | disparou — o card passa do limiar sem ser o canvas |
| **dependência de viewport** | disparou — em 1366 vencia o `MAIN`, em 390 vence o card |
| **valor intermitente** | **não** disparou — os dois valores vieram corretos |

Ou seja: a seleção de elemento errou nos dois temas, e a leitura acertou nos
dois. São mecanismos distintos, e o par 3/4 é a evidência de que um pode falhar
com o outro em silêncio.

**Cobertura total resolve os dois primeiros de uma vez** — um card tem margem e
nunca cobre o viewport inteiro, em largura nenhuma.

---

## 7 e 8 — listagem, 390×844, claro e escuro

**Vistas, e o tema da legenda confere com o pixel nas duas.**

```
7  SONDA  ok true  vp [390,844]  marcador claro   fundo rgb(248, 250, 252)  canário ok  linhas [6,11,33]
   PINTA  tag MAIN   bg rgb(248, 250, 252)
8  SONDA  ok true  vp [390,844]  marcador escuro  fundo rgb(13, 27, 42)     canário ok  linhas [6,11,33]
   PINTA  tag MAIN   bg rgb(13, 27, 42)
```

**Régua:** 389×843 nas duas — `07-…` 70.682 bytes, `08-…` 69.373 bytes. **Cor por
disco:** LIBERA nas duas.

### Duas previsões minhas, as duas erradas

**(1) Eu disse que a tabela sairia cortada horizontalmente. Não saiu.** As três
colunas — ID, Nome, Descrição — cabem em 390, porque o texto **quebra dentro da
célula**: "Problemas com equipamentos físicos" ocupa três linhas de altura. O
`overflow-x-auto` do `Tabela` existe e **não é acionado** nesta tabela nesta
largura.

O erro foi inferir o comportamento da existência da classe. Ler `overflow-x-auto`
no componente e concluir "vai rolar" pula a única pergunta que importava: o
conteúdo excede a largura? Aqui não excede, porque a célula quebra.

**(2) Mas há corte horizontal — na barra de ABAS.** "Categorias · Setores ·
Usuários" cabem, e o **"SLA" fica fora do quadro**, com barra de rolagem
horizontal visível logo abaixo das abas. Ou seja: a previsão acertou que algo
rolaria e errou o quê, o que é diferente de acertar.

### O `PINTA` voltou ao `MAIN`, e isso refina o diagnóstico

No mesmo 390 em que o painel devolveu um card, os cadastros devolveram o `MAIN`.
Então a regra **não** é "em 390 vence o card":

> **A heurística de cobertura depende do VIEWPORT e do LAYOUT DA TELA.** No
> painel, em coluna única, um card cresce até cobrir ≥90%; nos cadastros nenhum
> cobre, e o `MAIN` volta a vencer.

É pior do que "depende do viewport", porque não dá para prever por largura: teria
de se saber, tela a tela, se algum card cresce o bastante. **Cobertura total
continua resolvendo** — card tem margem e nunca cobre o viewport inteiro, em
largura nenhuma e em layout nenhum.

### O defeito dos três botões, fotografado

Nas duas capturas o "Nova Categoria" aparece como **botão só-ícone** — o `+`
azul ao lado do botão de recarregar. É o defeito documentado na ficha 3:

| arquivo | linha | rótulo escondido | nome acessível abaixo de `sm` |
|---|---|---|---|
| `CategoriasTab.tsx` | **189–192** | "Nova Categoria" | **nenhum** |
| `SetoresTab.tsx` | **198–201** | "Novo Setor" | **nenhum** |
| `UsuariosTab.tsx` | **339–342** | "Novo Usuário" | **nenhum** |

O ícone é `aria-hidden` por padrão e o rótulo é `display:none` abaixo de 640px,
então não sobra nada para o nome acessível. **A foto registra o botão; o defeito
em si é invisível na imagem** — está aqui pelo número da linha, e é correção
funcional fora da migração.

---

## 11 e 12 — formulário, 390×844, claro e escuro

**Vistas, e o tema da legenda confere com o pixel nas duas.**

```
11 SONDA  ok true  vp [390,844]  marcador claro   fundo rgb(248, 250, 252)  canário ok  linhas []
   PINTA  tag DIV   cls "rounded-xl border border-borda bg-superficie p-5"   bg rgb(255, 255, 255)
12 SONDA  ok true  vp [390,844]  marcador escuro  fundo rgb(13, 27, 42)     canário ok  linhas []
   PINTA  tag DIV   cls "rounded-xl border border-borda bg-superficie p-5"   bg rgb(19, 34, 56)
```

**Régua:** 389×843 nas duas — `11-…` 63.789 bytes, `12-…` 62.264 bytes. **Cor por
disco:** LIBERA nas duas.

**Formulário em branco:** Título e Descrição com placeholder e texto de ajuda,
Solicitante em "Selecione o solicitante", Categoria em "Sem categoria",
Prioridade em "Média" com o ponto da cor. Nada preenchido, nada submetido. O
bloco de consequência da prioridade aparece cortado ao pé, com o `Rotulo` em
mono e caixa alta.

**O `PINTA` voltou ao card** — `rounded-xl border border-borda bg-superficie p-5`
—, com os valores certos nos dois temas. Confirma o padrão da ficha 4: em coluna
única, tela cujo cartão principal é alto o bastante faz o card vencer o `MAIN`.
Nos cadastros não vence, porque o cartão lá é mais curto que o viewport. É a
dependência de **layout**, não de largura.

---

# A barra de abas em 390: comportamento desenhado

**Achado das capturas 7 e 8**, respondido por leitura de código.

Em 390 a barra mostra "Categorias · Setores · Usuários" e a aba **SLA fica fora
do quadro**, com barra de rolagem horizontal visível logo abaixo.

**É desenhado.** O `<nav role="tablist">` tem `overflow-x-auto` explícito
(`CadastrosBasicos.tsx:127`), e o comentário acima dele explica a marcação de
`tablist`/`tab`/`tabpanel` com `aria-controls`. A rolagem é a saída escolhida
para a barra que não cabe, e não um corte acidental.

E o acesso à aba escondida está coberto pelos dois caminhos que importam:

- **teclado** — em `tablist`, as setas movem entre abas e o navegador rola a aba
  focada para dentro da vista;
- **leitor de tela** — as quatro abas são anunciadas como alternativas do mesmo
  grupo, com a posição no conjunto; nenhuma "some" do anúncio por estar fora da
  vista.

**Portanto não é defeito, e não é item da migração.**

A ressalva honesta, que fica registrada sem virar acusação: para quem usa mouse
ou toque, o **único** indício de que existe uma quarta aba é a barra de rolagem.
Não sobra uma fatia da aba seguinte à mostra — o "Usuários" termina inteiro e o
"SLA" começa fora. Deixar um pedaço visível é o refinamento clássico desse
padrão, e seria **item de produto pós-Checkpoint 3**, não correção.

---

## 15 e 16 — detalhe, 390×844, claro e escuro

**Vistas, e o tema da legenda confere com o pixel nas duas.**

```
16 SONDA  ok true  vp [390,844]  marcador escuro  fundo rgb(13, 27, 42)  canário ok  linhas []
   PINTA  tag DIV  cls "overflow-hidden rounded-xl border border-borda bg-..."  bg rgb(19, 34, 56)
15 SONDA  — não colada no relato; ver a lacuna abaixo
```

**Régua:** 389×843 nas duas — `15-…` 60.044 bytes, `16-…` 59.216 bytes. **Cor por
disco:** LIBERA nas duas.

**Lacuna do registro, dita como lacuna:** a saída da sonda da **captura 15** não
foi colada. O arquivo existe, passa na régua e passa na cor por disco, e a
imagem foi aberta e conferida — mas as três checagens que só a sonda faz
(identidade da página, `.env`, canário do CSS servido) **não têm registro** para
esta captura. As outras quinze têm. Fica assim escrito em vez de suposto.

### O quadro de 390 pega MENOS conteúdo que o de 1366

844 é mais alto que 767, e ainda assim entra menos: em coluna única o bloco de
informações empilha, e o corte cai **dentro** dele — depois de "Tempo em aberto",
com "Técnico Responsável" começando na borda.

Consequência que fecha o assunto do chamado escolhido:

| | 13/14 (1366×767) | 15/16 (390×843) |
|---|---|---|
| botões de ação, "Cancelar Chamado" `secondary` | **sim** | **sim** |
| selos "Resolvido", "Usuario" | **sim** | **sim** |
| selos "Alta" e "Estourado · 120%" | **sim** | **não** |
| Descrição, Solução, Avaliação | não | não |
| Comentários (3), Histórico (6) | não | não |

O selo de prioridade — a metade da troca de chamado que se pagou — existe **só**
nas capturas 13 e 14.

**Aqui eu não previ nada, de propósito**, depois de errar duas previsões seguidas
nas capturas 7 e 8. A foto disse.
