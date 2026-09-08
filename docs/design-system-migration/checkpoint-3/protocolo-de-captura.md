# As dezesseis capturas — protocolo

Preparado em 04/09/2026. **Falta o ambiente**: as quatro telas vivem atrás do
login, e o login depende da API.

## As dezesseis

Quatro telas × dois tamanhos × dois temas. **São dezesseis, e só dezesseis** —
ver a pendência do estado de erro no fim.

| # | tela | rota | viewport | tema | sonda |
|---|---|---|---|---|---|
| 1 | painel | `/dashboard` | 1366×768 | claro | `--tabela` |
| 2 | painel | `/dashboard` | 1366×768 | escuro | `--tabela` |
| 3 | painel | `/dashboard` | 390×844 | claro | `--tabela` |
| 4 | painel | `/dashboard` | 390×844 | escuro | `--tabela` |
| 5 | listagem | `/cadastros` | 1366×768 | claro | `--tabela` |
| 6 | listagem | `/cadastros` | 1366×768 | escuro | `--tabela` |
| 7 | listagem | `/cadastros` | 390×844 | claro | `--tabela` |
| 8 | listagem | `/cadastros` | 390×844 | escuro | `--tabela` |
| 9 | formulário | `/chamados/novo` | 1366×768 | claro | sem |
| 10 | formulário | `/chamados/novo` | 1366×768 | escuro | sem |
| 11 | formulário | `/chamados/novo` | 390×844 | claro | sem |
| 12 | formulário | `/chamados/novo` | 390×844 | escuro | sem |
| 13 | detalhe | `/chamados/6` | 1366×768 | claro | sem |
| 14 | detalhe | `/chamados/6` | 1366×768 | escuro | sem |
| 15 | detalhe | `/chamados/6` | 390×844 | claro | sem |
| 16 | detalhe | `/chamados/6` | 390×844 | escuro | sem |

A **listagem** é a aba **Categorias**, que é a que abre por padrão.

Em **390×844** a barra lateral vira gaveta, e ela fica **fechada** — é o estado
padrão, e a gaveta aberta já foi fotografada na galeria da casca no
Checkpoint 1.

### O que cada bloco consome da massa

| capturas | precisa de |
|---|---|
| 1–4 | chamados espalhados por status e prioridade, e **2+ linhas** na tabela de recentes |
| 5–8 | **2+ categorias ativas** |
| 9–12 | categorias e solicitantes, para os seletores não saírem vazios |
| 13–16 | **CHAM-2025-0006** (id 6): resolvido, com nota, 3 comentários e 6 entradas de histórico |

O perfil do login é **Administrador**: é o único em que tudo que a migração
tocou está em cena. Como `Usuario`, `podeEditar` fecha a barra de ações inteira
do detalhe, o painel filtra para os próprios chamados, e a aba Usuários some.

E a avaliação tem **quatro** estados, não dois — esta seção afirmava dois, e
estava errada. `Avaliacao.tsx` decide assim:

| estado | condição | o que desenha |
|---|---|---|
| nada | chamado não encerrado, ou cancelado | `return null` — a seção some |
| **leitura** | não é o solicitante, **e existe nota** | cinco estrelas preenchidas até a nota + selo `N de 5` |
| espera | não é o solicitante, e **não** existe nota | "Aguardando avaliação do solicitante" |
| edição | `solicitante_id === user.id` | cinco `<button>` clicáveis, com foco e hover |

O que estava escrito aqui — "senão mostra 'Aguardando avaliação' em vez das
estrelas" — só vale na linha da **espera**, isto é, quando não há nota. Com nota,
quem não é o solicitante vê as estrelas do mesmo jeito; o que ele não vê são os
botões.

Isso muda o requisito do bloco 13–16: o chamado **não** precisa ter sido aberto
pela conta que loga. Precisa ter **nota** — e é bom que seja assim, porque
**nenhum dos 159 resolvidos é da conta admin**, então a linha de edição não é
capturável nesta massa de jeito nenhum. Fica registrado como ressalva da ficha
da §29, e não como defeito.

O tema entra **pela URL**, e não pelo interruptor:

```
http://localhost:5173/dashboard?tema=claro
http://localhost:5173/dashboard?tema=escuro
```

Isso aplica o tema **antes da primeira pintura**. Pelo interruptor, a primeira
pintura sai no tema errado e troca um quadro depois — e uma foto tirada nesse
intervalo mostra a cor errada com a legenda certa. Já aconteceu aqui: o DOM
dizia `dark`, a tela estava clara, e o painel dizia "claro".

> **`?tema=` reescreve `localStorage.theme`.** A última captura deixa o sistema
> no tema dela para a próxima visita — inclusive fora das capturas. Só no build
> de desenvolvimento.

## Antes de cada foto, a sonda

```bash
node scripts/sonda-captura.js --tema=claro --tabela > node_modules/.sondas/cap.js
```

No console da página:

```js
eval(await (await fetch('/@fs/<raiz>/node_modules/.sondas/cap.js?v=' + Date.now(),
  { cache: 'no-store' })).text())
```

O `?v=` e o `no-store` **não são zelo**: sem eles o navegador serve a sonda do
cache, e já aconteceu — a sonda voltou `ok: true` sem os campos novos porque era
a versão anterior. Uma sonda de frescor servida velha é a piada que ela conta
sobre si mesma, e o modo de falha é o mesmo de sempre: parece que passou.

**Não fotografe com `ok: false`.** A foto sairia parecendo certa — é esse o
ponto dos cinco modos de falha que a sonda cobre:

| | o que pega | por que não se vê |
|---|---|---|
| −1 | **outro produto na porta** | a tela funciona — e é bonita |
| 0 | API de produção | a tela funciona — e é a real |
| 1 | CSS servido velho | classes sem regra, elementos herdam a cor do pai |
| 2 | tema por efeito | a primeira pintura sai no tema errado |
| 3 | tabela com 1 linha | o divisor entre linhas não existe sem a segunda |

O menos um já custou caro, e do outro lado: duas aplicações Vite convivem nesta
máquina e as duas nasciam na 5173. Sem `strictPort` o Vite escorrega calado para
a 5174, e quem cravou o endereço abraça o servidor do outro produto — a suíte
e2e do HelpHS rodou contra **este** sistema. Agora cada um tem porta própria
(ChamadosHS 5191, HelpHS 5190) com `strictPort`, e a sonda ainda confere o
`data-app` do `<html>` antes de liberar: **porta exclusiva protege por acordo,
identidade protege quando o acordo falha.**

O zero é o mais grave e o menos visível dos cinco: contra produção **tudo
funciona**, e é justamente esse o problema. A captura leva dado real para
dentro de `docs/`, e o passo "derrube a API" da 17–18 vira uma
indisponibilidade. Regra no `DECISOES.md`; a sonda confere o `.env` e também
para onde a página de fato falou.

O terceiro é o mais fácil de deixar passar: uma tabela de uma linha **parece**
uma tabela normal, e a captura sai sem o elemento que a E14 mudou.

`--tabela` nas telas que têm tabela — listagem e painel. As outras duas rodam
sem ele.

## Antes de cada foto, o quadro — a sexta checagem

A sonda mede a página. Sem esta checagem ela não media o **quadro**, e o quadro
foi onde o Checkpoint 3 quase saiu errado.

> **A sonda cobra `innerWidth × innerHeight` e bloqueia se não for exatamente o
> tamanho da linha do protocolo** — 1366×768 ou 390×844. Gerada com
> `--viewport=1366x768`; sem a opção, ela não cobra tamanho, que é o certo para
> quem só quer medir uma página fora de uma sessão de captura.

### A primeira régua foi descartada, e o motivo importa

A primeira versão media **o tamanho da imagem entregue**, na observação de que a
captura saía 1:1 com o viewport CSS — verificada plantando uma moldura
`position: fixed; inset: 0` e vendo-a preencher o quadro exato.

A observação era verdadeira e a régua não prestava. A **mesma** página, sem nada
mudar entre as duas chamadas, voltou **672×448** e depois **1026×684** — ora 1:1
com o viewport, ora reduzida a 0,655. A redução vai e volta sozinha. Uma régua
que oscila reprova captura boa em metade das vezes, e o pior é que ela parece
rigorosa enquanto faz isso.

A medida boa é `innerWidth`/`innerHeight`, lida na própria página. E o lugar
certo dela é **antes** da foto: depois, uma trava só informa que o trabalho foi
perdido.

### Por que precisou existir

`resize_window` responde `Successfully resized` e não redimensiona nada. Foram
pedidos 1366×768, 900×600 e 390×844 em sequência: o viewport ficou nos mesmos
1026×684 nas três, e o pedido de 390×844 devolveu **layout desktop, com a gaveta
aberta**. Janela aberta por script é bloqueada por falta de gesto do usuário, e o
atalho de zoom a própria ferramenta recusa por contrato.

O `innerWidth` lido no meio disso chegou a dizer `1368×912, dpr 2`, que era o
zoom a 75% e não outra janela — por isso a sonda cobra o número exato, e não uma
faixa.

A captura 1 chegou a ser tirada em 672×448 e foi descartada. Era uma foto de
aparência perfeitamente normal, no tamanho errado, com o número certo escrito ao
lado — o modo de falha de sempre.

### A ferramenta de automação reaplica a emulação dela a cada comando

**Este é o motivo de as dezesseis não saírem pela ferramenta, e de a sonda ter
mudado de mão.**

O primeiro sinal foi medido dentro de uma única chamada, sem nada entre as
linhas além da própria foto:

```
antes:    1368×912  dpr2
          [screenshot]
depois:   1026×684  dpr1
de novo:  1026×684  dpr1
```

A conclusão inicial foi "a foto mexe no viewport e não devolve". Estava certa e
era **pequena demais**. O alcance real apareceu quando o operador fixou
Responsivo 1366×768 e a leitura seguinte devolveu 1368×912 — que é exatamente o
preset "Surface Pro 7" que ele acabara de abandonar. Ele lia 1366 no computado
do `<html>`; a ferramenta lia 1368. Os dois não podiam estar certos.

O teste que fechou: o operador olhou a barra logo **depois** de uma chamada
minha, sem tocar em nada. Ela tinha voltado sozinha para "Surface Pro 7".

> **Toda chamada da ferramenta — navegar, ler, fotografar — reaplica a emulação
> de dispositivo dela e sobrescreve a do operador.** A interface do DevTools
> continua exibindo o que ele digitou, porque não reflete a sobrescrita.

Ou seja: **o ato de medir destrói o estado medido.** Uma sonda rodada por esse
caminho não é imprecisa — é estruturalmente incapaz de dizer a verdade, e diria
`ok: true` sobre um viewport que ela mesma acabou de trocar. Que é o modo de
falha que ela existe para impedir.

Isso também desfaz, retroativamente, os mistérios da sessão: `resize_window`
respondendo "Successfully resized" sem redimensionar; os números alternando
entre exatamente 1368×912 e 1026×684; o tamanho da imagem entregue oscilando
entre 1:1 e 0,655; e a barra do operador nunca grudando.

### O ciclo, e por que a abstinência é a trava

Quem faz tudo é o **operador**. O assistente não emite **nenhuma** chamada pela
ferramenta enquanto a sessão de captura durar — nem navegação, nem leitura, nem
foto. Não é excesso de zelo: é a única condição sob a qual o tamanho fixado
sobrevive.

| passo | quem |
|---|---|
| navegar para a rota com `?tema=` | operador, pela barra de endereço |
| fixar 1366×768 ou 390×844 em Responsivo | operador |
| rodar a sonda | operador, colando no **console dele** |
| conferir `ok: true` | operador |
| tirar a foto (`Ctrl+Shift+P` → "Capture screenshot") | operador |
| preencher a ficha | assistente, depois, fora da sessão |

A linha da sonda, com o `?v=` embutido contra o cache:

```js
eval(await (await fetch('/@fs/<raiz>/node_modules/.sondas/cap-claro.js?v='+Date.now(),{cache:'no-store'})).text())
```

Trocando o arquivo: `cap-claro.js` / `cap-escuro.js` nas capturas 1–8, que
exigem tabela, e `cap-claro-sem-tabela.js` / `cap-escuro-sem-tabela.js` nas
9–16.

Duas armadilhas do próprio DevTools, que custariam capturas inteiras:

- **Não feche o DevTools entre a sonda e a foto.** Fechar muda o viewport, e a
  medição passa a valer para um quadro que não é o fotografado. `Ctrl+Shift+P`
  exige o DevTools aberto, então basta não fechar.
- **"Ajustar à janela" reduz só a EXIBIÇÃO.** O "Capture screenshot" fotografa
  a resolução emulada, não a reduzida. A tela parecer menor não é problema.

### Quem fixa o tamanho

O **operador**, pela barra de dispositivo do DevTools (`Ctrl+Shift+M`), em modo
Responsive, com os dois campos numéricos preenchidos e o zoom em **100%**, não
em "Fit". Ele fixa; a sonda confere.

A proporção fecha o argumento: a janela desta máquina é 1,5 (1026×684), 1366×768
é 1,78 e 390×844 é 0,46. **Nenhum dos dois sai só com zoom** — zoom muda a
escala, não a proporção. Sem a barra de dispositivo as oito capturas de 390×844
não existem, porque com 1026 de largura a gaveta não fecha.

### Onde ela foi vista falhando, sozinha

Com a barra de dispositivo em 1026×684 e a sonda pedindo 1366×768:

```
ok: false
problemas  ["o viewport é 1026×684, e esta captura é de 1366×768. Ajuste a
            barra de dispositivo do DevTools (Ctrl+Shift+M), com o zoom em
            100% e não em \"Fit\"."]
marcador   claro          canario  ok
```

**Um problema só.** Marcador e canário passando ao lado. É isso que distingue
esta checagem da checagem 2, que nunca foi vista falhando sozinha porque três
outras disparavam junto com ela — e escondiam que ela não existia.

## Pendência: a checagem 2 não compara nada, e o conserto já está desenhado

Depois das dezesseis, em `fix(...)` próprio — decisão do operador, 08/09/2026.

O campo `fundo` da sonda é **relatado, nunca asserido**. `fundo` aparece quatro
vezes no `sonda-captura.js`: um comentário prometendo *"o fundo esperado por
tema, para conferir o PIXEL e não só o atributo"*, um comentário dizendo
*"atributo é promessa, pixel é fato"*, a linha que calcula, e o campo do
relatório. **Não existe um único `if`.** O JSDoc documenta um mapa de valores
esperados que nunca foi escrito.

E ele mede o elemento errado: `document.body`. Medido na tela de detalhe em
escuro, com a página visivelmente escura:

```
html         rgba(0, 0, 0, 0)      transparente
body         rgb(248, 250, 252)    CLARO
div do app   rgb(13, 27, 42)       o que de fato pinta
```

### Por que oito provas negativas não pegaram

A prova que existia — sonda escura numa página clara — bloqueia com **três**
motivos: marcador, classe `.dark` e canário. As três são de atributo, disparam
juntas, e a saída fica idêntica com ou sem a quarta. Uma checagem que nunca foi
vista falhando **sozinha** não está provada, está acompanhada.

### O que o conserto faz

**Mede o maior elemento opaco que cobre o viewport**, e não a cascata do canvas.

A sessão paralela do HelpHS propôs a cascata — fundo do `html` se não for
transparente, senão o do `body`, bloqueando se os dois forem. Lá funciona,
porque o `base.css` pinta o `body` e nada o cobre. **Aqui ela aprovaria o
defeito**: leria o `body`, encontraria um valor opaco e legítimo, e liberaria a
captura com a cor do tema errado. A regra é dependente da forma do app, e a
diferença está medida acima.

**Compara com o valor do token**, resolvido do `colors.css` do pacote em disco
pela cadeia de `var()` — nunca com uma faixa de cor.

### Os casos de prova, e por que estes

| caso | o que separa |
|---|---|
| marcador, `.dark` e canário **neutralizados** | a linha do pixel bloqueando sozinha — o que faltou às oito |
| fundo em `rgb(240, 240, 240)` | é claro, casa qualquer faixa, e **não** é o token: separa comparação de faixa |
| `body` certo e a div de cima errada | mata uma sonda que lê o `body`; é o caso que só existe nesta forma de app |

O segundo veio da sessão do HelpHS, que rodou uma mutação e descobriu que a
bateria de provas dela **não distinguia** "compara com o token" de "casa uma
faixa plausível" — as duas passavam em todos os casos. O terceiro é o irmão
local dele.

### Três refinamentos, e um deles conserta erro já desenhado

Vieram da sessão paralela do HelpHS, que adotou a regra do elemento e achou
defeito ativo ao fazê-lo.

**O último elemento que cobre, não o primeiro.** O código de sondagem usado
aqui para levantar os candidatos parava no primeiro em ordem de documento — o
wrapper mais externo. Não deu diferença na medição porque todos os candidatos
tinham a mesma cor, e é exatamente aí que mora o perigo: acertar por
**coincidência de valor** e quebrar calado no dia em que uma superfície interna
divergir. Lá a mesma troca foi morta por mutação.

**Normalizar o formato antes de comparar.** O Chromium devolve
`color(srgb 0.051 0.106 0.165)` para tudo que sai de `color-mix()`, e o
`tailwind.config.js` declara as cores do pacote com `color-mix` — está dito no
`vite.config.ts`, na justificativa do `build.target`. Igualdade de string contra
o `rgb(r, g, b)` lido do disco **nunca casaria**.

Aqui o valor veio como `rgb(13, 27, 42)` porque os tokens em português passam
pela ponte do D3-a, que usa `rgb(var(--x) / <alpha-value>)`. As classes que usam
as cores do pacote não passam por ela. Sem normalizar, o conserto trocaria um
erro silencioso por outro.

**A prova afirma DE ONDE veio a medição, não só que passou.** Um caso deles
nasceu cego pelo mesmo padrão desta seção: o teste da normalização passava
**sem** a normalização, porque o elemento em `color(srgb)` era descartado, a
sonda caía no recuo do `body`, e o `body` estava certo. O recuo mascarava a
perda.

É a mesma forma do "três motivos disparam juntos": um caminho alternativo
produzindo o resultado certo pelo motivo errado. Se o conserto tiver recuo, a
sonda precisa **relatar o elemento de origem**, e o caso precisa afirmar qual
foi — senão a mutação não morre.

### O valor velho: investigar junto, no mesmo trecho

A sessão do HelpHS propôs ler o fundo **duas vezes** e só valer quando as duas
leituras concordam, contra a transição de 150ms do `--duration-fast`, que faz o
`getComputedStyle` devolver a cor no meio do caminho.

Aqui o sintoma existe e a causa é **outra**: o `body` foi amostrado por 12
segundos com a página escura e ficou claro o tempo todo, virando só depois de um
recálculo forçado de estilo. Doze segundos não cabem em 150ms — é valor velho
que não recalcula sozinho, e o gatilho é desconhecido.

Decisão do operador, 08/09/2026: **investigar junto com o conserto**, no mesmo
trecho de código, sem rodada separada. O gatilho, quando achado, volta para a
sessão do HelpHS pelo operador — lá o comportamento não aparece, e não saber se
é ausência ou é sorte é a pergunta aberta deles.

O laço de dupla leitura continua **sem decisão**: ele cobriria os dois casos,
mas cobrir por acaso é o que esta seção inteira existe para não fazer. Decide-se
depois de a causa ser conhecida.

## Consulta à API de produção pede autorização, com o número dito antes

**Regra do operador, 08/09/2026.**

> Autorização para **capturar telas** em leitura pura **não** cobre **consultar
> a API**. Cada consulta à API de produção pede autorização própria, e o número
> de chamadas é dito **antes**.

### O que a motivou

Para escolher o chamado das 13–16 eu varri os 159 resolvidos atrás de quais
tinham comentário: uma listagem mais 159 `GET /comentarios/chamado/{id}`, cerca
de 320 chamadas contra produção. Todas de leitura, sem dano, e o resultado foi
útil — dos 159 resolvidos só 23 têm comentário e só 6 têm comentário **e** nota,
o que trocou o chamado escolhido.

Ter dado certo não é o critério. A autorização era para fotografar telas, e
varrer a API é outra coisa: é volume contra um serviço em produção que atende
gente de verdade, decidido por mim sem ninguém saber o tamanho antes.

O "número dito antes" é a parte que faz a regra funcionar. "Vou consultar a API"
não deixa ninguém avaliar nada; "vou fazer cerca de 320 GETs contra produção"
deixa — e é uma frase que teria mudado a resposta.

## Onde a sonda já foi vista funcionando

Oito provas negativas antes de o protocolo valer — as cinco primeiras no
navegador, as três últimas (6–8) rodando a sonda de verdade contra documentos
controlados, porque a extensão do Chrome caiu no meio. É a regra do
`DECISOES.md`: verificação nova roda contra um defeito conhecido antes de o
"passou" dela contar.

| | prova | resultado |
|---|---|---|
| 1 | sonda do tema escuro numa página clara | bloqueia, com 3 motivos |
| 2 | maior tabela reduzida a 1 linha | bloqueia, nomeando a contagem |
| 3 | linhas devolvidas | libera de novo |
| 4 | página sem `?tema=` na URL | bloqueia por marcador ausente |
| 5 | `/login?tema=escuro`, página do **app** | libera: marcador `escuro`, fundo `rgb(13,27,42)`, canário ok |
| 6 | `.env` apontando para a API de produção | bloqueia, nomeando o endereço |
| 7 | página com `data-app="helphs"` | bloqueia: "é do produto helphs, e não do chamadoshs" |
| 8 | página sem `data-app` nenhum | bloqueia — falha **fechada**, não libera por omissão |

A quinta é a que importa para as dezesseis: o marcador de TEMA passou a existir
fora de `/dev/`, que é onde as capturas acontecem. A sétima e a oitava são a
identidade do PRODUTO, e vivem em `src/identidade.test.ts` — rodam a cada
`npm test`, e não só no dia em que foram feitas.

## O que o operador precisa fornecer

1. **A API de pé, e você logado no Chrome.** A sessão do navegador usa o seu
   Chrome, então o login vale para mim.
2. **Um chamado com dados** para a tela de detalhe — de preferência resolvido,
   para a avaliação aparecer.
3. **Pelo menos duas linhas** na listagem e na tabela de recentes do painel.
   A sonda bloqueia se não houver, mas é melhor saber antes.

## O andaime, e quando ele sai

O gancho de tema por URL é o **item 3 da lista de remoção da Fase 20**, que
mora em `src/router.tsx`, ao lado das duas rotas de `/dev/`. Este protocolo, o
`canario-css.js` e o `sonda-captura.js` dependem dele e saem junto.

Vale só no build de desenvolvimento: o bloco está dentro de
`import.meta.env.DEV`, e foi conferido no bundle de produção — zero ocorrências
de `temaPronto`.

A alternativa a reescrever o `localStorage` seria a captura aplicar o tema por
efeito, depois de montar — e aí a primeira pintura sairia no tema errado, que é
o defeito que este gancho existe para não ter. O preço é o tema ficar trocado
depois; o benefício é a foto não mentir.

---

## Pendência registrada: o estado de erro do Dashboard

**Cortado das capturas por decisão do operador, 04/09/2026.** Seriam as 17–18.

### O que fica sem registro visual

O `Aviso` que o Dashboard passou a mostrar quando a carga falha — desvio
funcional aprovado na Fase 13, item da §29 que estava falhando.

Antes dele o `catch` só escrevia no console: `chamados` ficava em `[]`, o
`loading` caía, e **o painel renderizava zeros**. Uma falha de rede ficava
idêntica a "não há chamados", e um painel que responde "0 abertos, 0 resolvidos,
0% no prazo" quando não conseguiu perguntar se lê como afirmação sobre a
operação da empresa.

O conserto está no código e coberto pela ficha da §29. O que falta é a foto.

### Por que foi cortado: PRAZO, e não risco

**Derrubar a API local é `docker stop`.** Não é um passo destrutivo, não é
perigoso, e o ambiente local está sendo montado de qualquer forma para as
dezesseis. Reconstruí-lo custa um `docker start`.

O que faltou foi **tempo dentro desta sessão de captura**, e a decisão foi do
operador: fechar as dezesseis primeiro, e não pendurar o checkpoint numa
captura a mais.

Não confunda com a regra do `DECISOES.md` que proíbe captura apontada para
produção. Ali o "derrube a API" seria mesmo uma indisponibilidade, e por isso a
regra existe. **Contra o banco local, nada disso se aplica** — e é contra o
banco local que estas duas serão feitas.

### O que falta para capturar, concretamente

Não é "esperar um ambiente". É esta lista, levantada em 04/09/2026:

| | estado |
|---|---|
| **Docker** | **ausente** na máquina do operador — não há como subir o `chamadoshs-api` em contêiner |
| **PostgreSQL 18** | **presente**, mas a credencial de superusuário é desconhecida — não dá para criar banco nem carregar massa |
| **suíte de testes da API** | roda em **SQLite**, sem precisar de banco — por isso ela passa e não cobre este caso |

A terceira linha é a que explica por que ninguém tropeçou nisso antes: a suíte
verde não exercita o caminho que a captura precisa.

Qualquer uma das três destrava:

1. instalar Docker, e subir o `chamadoshs-api` com massa de teste;
2. recuperar ou redefinir a senha de superusuário do PostgreSQL 18 local;
3. um ambiente de homologação, que resolve os dois de uma vez.

Feita qualquer uma, a captura custa meia hora. **O que falta é acesso, não
tempo** — e é por isso que esta lista está aqui em vez de uma data.

A receita está escrita e continua válida:

1. abrir `/dashboard?tema=claro` com a API de pé e deixar carregar;
2. derrubar a API — `docker stop` no contêiner do `chamadoshs-api`;
3. clicar em **"Exibir cancelados"** — o efeito depende de
   `[user, incluirCancelados]`, então refaz a carga, ela falha, e o aviso
   aparece **sobre os números que já estavam lá**.

O passo 3 importa: com a API já derrubada na abertura, o painel mostra zeros com
o aviso por cima. O desenho aprovado é o aviso ACIMA de dados de uma carga
anterior, que ainda podem valer — e é esse estado que a foto precisa mostrar.

Duas capturas bastam: os dois temas em 1366×768. O que muda com o tema é a
tinta do `Aviso`, não o layout.

---

## As dezesseis foram feitas contra PRODUÇÃO — a exceção, e o que ela cobre

**Decisão do operador, 04/09/2026.** É exceção explícita à regra do
`DECISOES.md` que diz que captura de evidência nunca aponta para produção.

### Por que

Não havia ambiente local: **Docker ausente** nesta máquina, e a credencial de
superusuário do **PostgreSQL 18** desconhecida — os dois caminhos para levantar
massa de teste estavam fechados. A alternativa era não ter as dezesseis.

### O que a exceção cobre, e o que NÃO cobre

**Cobre:** o endereço da API. A sonda deixa de bloquear por `VITE_API_URL` não
ser local, e passa a **avisar** — em amarelo, com o motivo escrito dentro do
resultado.

**Não cobre nada mais.** Identidade da página, tema aplicado antes da primeira
pintura, CSS servido e segunda linha na tabela continuam valendo e continuam
bloqueando. Uma exceção que dispensasse as outras checagens junto seria como
não ter checagem nenhuma justamente no dia mais arriscado.

E ela **não foi removida**: continua no código, continua medindo, e continua
bloqueando por omissão. Só cede diante de um motivo digitado:

```bash
node scripts/sonda-captura.js --tema=claro --tabela \
  --producao="Checkpoint 3, 04/09/2026 — leitura pura, imagem fora do repositório"
```

Sem o motivo, `--producao` é recusado com erro. O motivo viaja para dentro da
saída da sonda e daí para o relatório, porque **uma exceção silenciosa é
indistinguível de uma trava quebrada.**

### E a porta volta para a 5173, também por exceção

A porta permanente do ChamadosHS é a **5191**, com `strictPort` — foi o
conserto do incidente em que a suíte e2e do HelpHS abraçou este servidor. Nas
dezesseis ela está em **5173**, e volta assim que elas saírem.

O motivo é **CORS**, e não preferência. As capturas são contra a API de
produção, e o `ALLOWED_ORIGINS` dela lista `http://localhost:5173` — está em
`app/core/config.py` do `chamadoshs-api`. Da 5191 o navegador bloqueia a
requisição **antes de ela chegar ao login**: não é credencial recusada, é
requisição que não sai.

**O conserto não foi desfeito.** `strictPort` continua ligado, e é ele que
resolve o defeito: o escorregão silencioso para a 5174 continua impossível — se
algo mais estiver na 5173, o servidor **morre** em vez de andar.

O que a 5191 acrescentava era o **acordo** — cada produto na sua porta —, e é
essa metade que está suspensa. A outra metade segue de pé: o `data-app` no
`<html>`, conferido pela sonda antes de cada captura. Se a 5173 estiver
servindo outra coisa, a sonda bloqueia nomeando o produto encontrado.

É a formulação do `DECISOES.md` em uso: **porta exclusiva protege por acordo,
identidade protege quando o acordo falha** — e aqui o acordo está suspenso de
propósito, com a outra trava cobrindo.

### As duas mitigações

**1. Leitura pura.** Nada é criado, editado ou excluído. Sem "Exibir
cancelados", sem mudança de status, sem submissão de formulário — as capturas
9–12 saem com o formulário **em branco**, e isso é deliberado.

O que ainda escreve, e fica dito: `?tema=` reescreve `localStorage.theme`, que
é do navegador e não do sistema; e a própria navegação pode gerar registro na
trilha de auditoria da API, que é efeito de ler e não há como evitar.

**2. As imagens ficam fora do repositório.** Vão para
`docs/design-system-migration/capturas-locais/`, ignorado inteiro no
`.gitignore`. Elas contêm nome de solicitante, título de chamado e protocolo de
gente real.

**A ressalva que sobra, e é honesta:** não versionar resolve o repositório, não
o disco. Os arquivos existem na máquina e viajam se forem compartilhados. Quem
for movê-los precisa saber o que há dentro.

As fichas da §29 e este protocolo são texto, sem dado pessoal, e vão para o
repositório normalmente.
