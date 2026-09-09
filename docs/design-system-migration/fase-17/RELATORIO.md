# Fase 17 — relatório de fechamento

**09/09/2026.** Responsividade, §20. A fase foi aberta com uma inversão decidida
pelo operador:

> **Sonda dos quatro critérios antes de qualquer foto.** As capturas ficam só
> para o que a sonda não alcança, e a lista delas é apresentada antes.

A inversão se pagou: seis larguras × quatro telas × dois temas seriam **48
imagens**, e nenhuma delas mostraria um alvo de toque de 38px, uma sobreposição
de 3px ou um botão sob camada transparente.

---

## O resultado

**Três dos quatro critérios da §20 estão limpos.** Nada cortado, nada coberto,
nada sobreposto — em quatro telas, e em seis larguras de 360 a 2560.

**O quarto falha em todas: alvo de toque.**

| tela | alvo < 40px |
|---|---:|
| `/dashboard` | 9 |
| `/cadastros` | **26** |
| `/chamados/novo` | 9 |
| `/chamados/6` | 8 |
| **total** | **52** |

E a série de seis larguras mostrou o que uma medição só não mostraria: **os oito
alvos de `/chamados/6` são os mesmos nas seis, com as mesmas dimensões.** É falha
de **altura fixa**, não de layout responsivo.

A prova mais direta está no botão de recolher a barra: ele **troca de elemento**
no `md` — `button.md:hidden` abaixo, `button.hidden.md:flex` acima — e os dois
têm 36×36. **A troca responsiva preserva o defeito.**

Isso **desqualifica qualquer conserto por breakpoint**: não há largura em que o
defeito melhore, então não há largura em que valha remendar.

---

## As três famílias, e a ordem de conserto

**Registradas e NÃO corrigidas nesta fase, por decisão do operador.** São 52
alvos, e mexer em altura de controle é mudança visual em todo o sistema — a
comparação pede o "antes" da Fase 19. Corrigir agora seria corrigir às cegas:
sem linha de base, ninguém distingue *"o botão cresceu 2px"* de *"a tela inteira
andou"*.

| # | família | altura | conserto | por que nesta posição |
|---|---|---|---|---|
| **1** | controle de formulário | 38 | **38 → 40** | dois pixels; o mais barato e o mais espalhado |
| **2** | botão-ícone quadrado | 32–36 | área, com o ícone no tamanho | quatro por linha de tabela; muda densidade |
| **3** | botão que é texto | 16–20 | área de toque **sem virar botão desenhado** | por último, porque é o que muda a aparência de verdade |

A terceira é a mais séria em risco de uso e a mais delicada em desenho: dar 40px
de altura a um `"Voltar"` de 54×16 **sem transformá-lo num botão** é o trabalho, e
não o número.

---

## O custo, e o que ele ensinou

**37 chamadas** contra produção, em leitura pura: 6 no `/dashboard`, 10 no
`/cadastros`, 7 no `/chamados/novo`, 14 no `/chamados/6`. Sem login — o token já
estava no `localStorage`. **As seis larguras não custaram nada**: medidas sem
recarregar.

Eu havia estimado **12 a 20**. Estourou 85%, e a causa está no padrão das
contagens — o `React.StrictMode` monta cada componente duas vezes em
desenvolvimento.

**As 37 valem como 37, sem desconto**: chegaram à produção de verdade. O conserto
é do lado da promessa, e ficou registrado:

> **Quem estima lendo código conta cada efeito uma vez, e o navegador dispara
> duas. Estimativa feita no código dobra antes de virar promessa.**

---

## Os erros desta fase

**1. Tratei o limite de uma ferramenta como limite do ambiente.** O
`resize_window` relatou sucesso e não redimensionou **cinco vezes** — três na aba
da aplicação, duas numa aba nova contra documento sintético. Registrei as seis
larguras como *"não medidas — a janela não redimensiona por automação"*.

A frase estava certa sobre a ferramenta e **errada sobre a conclusão**. O
operador mediu as seis pelo **modo dispositivo do DevTools**, que é o mesmo
caminho que o Checkpoint 3 já tinha usado para as dezesseis capturas.

> **"Não consegui" não é "não dá".** Registrar impossibilidade a partir de uma
> ferramenta que falhou é registrar a ferramenta, não o mundo.

O que salvou a rodada de um registro falso foi a régua da própria sonda: sem ela,
três medições idênticas teriam entrado como três larguras diferentes.

**2. A sonda acusou o link de pular conteúdo.** No primeiro uso real ela deu 10
alvos no `/dashboard`, e o décimo era o `a.sr-only` de 1×1 — atalho de leitor de
tela, que é 1×1 até receber foco porque é assim que se escreve. Falso positivo do
pior tipo: **a checagem cobrando de quem fez acessibilidade direito.**

Nenhum dos doze documentos controlados tinha `sr-only`. Não por descuido de
execução — por descuido de **imaginação**. Virou regra:

> **Caso controlado prova o que se previu; só o uso real mostra o que não se
> previu.** Por isso o primeiro uso sério de uma checagem é **parte da prova
> dela**, e não consumo dela.

**3. A cobertura saía ao lado do resultado, e ao lado se perde.** A série de seis
larguras revelou que o denominador é **variável** — 8 de 17 controles aferidos em
360, 16 de 17 em 2560 — porque `elementFromPoint` só responde sobre o viewport.

`"coberto 0"` em 360 e `"coberto 0"` em 2560 não são a mesma afirmação. Agora o
campo `coberto_resumo` gruda os dois, e o zero não sai sozinho.

Os três são a mesma família da semana: **o instrumento parecia medir o que
interessava e media perto** — e nos três casos quem pegou foi o próprio
instrumento carregando a sua régua junto.

---

## O que fica

- **`scripts/sonda-responsividade.js`** — a sonda, com as fronteiras declaradas.
- **`LINHA-DA-SONDA.txt`** — uma linha, para colar no console.
- **`SONDA.md`** — as treze provas contra documentos controlados.
- **`MEDICAO.md`** — as quatro telas e as seis larguras, com o custo.

### Capturas

**Nenhuma nesta fase, e não por corte de escopo.** A sonda cobriu os quatro
critérios da §20 nas seis larguras, e o que sobra para captura — cor,
alinhamento, hierarquia tipográfica, se o layout *faz sentido* na largura — é
material da **Fase 19**, onde existirá o "antes" para comparar. Fotografar agora
produziria imagens sem par.

### Pendências

1. **Os 52 alvos**, na ordem acima, depois da linha de base da Fase 19.
2. **Tema não foi variado** — os quatro critérios são geométricos. Vira vão no
   dia em que uma regra de tema mexer em caixa, peso ou `letter-spacing`.
3. **Um estado de tela por vez** — menu fechado não é menu aberto; a gaveta do
   mobile não entrou na conta.

### E as pendências 2 e 3 são uma primeira vez

**Observação do operador ao aceitar a fase, e ela merece estar no registro.**

As duas são **vãos previstos e nomeados ANTES de morderem**. Foram escritas na
seção "onde ela PARA" do `sonda-responsividade.js` **antes de a sonda rodar uma
única vez** — não depois de um defeito escapar por elas.

É a **primeira vez na migração inteira** que isso acontece. Todo o resto do
inventário de vãos deste projeto nasceu ao contrário:

| vão | como apareceu |
|---|---|
| preenchimento nu | **entre** duas catracas, achado por leitura depois de as duas existirem |
| moldura da E14 | deriva silenciosa por três emendas |
| `paletaCategorica` | dez cópias sob uma catraca que imprimia zero |
| `fill-` na chave | ausente, e a estrela apareceu viva no mesmo dia |
| `sr-only` na sonda | falso positivo no primeiro uso real |

Cinco vãos descobertos **depois** de custarem alguma coisa; dois declarados
**antes** de custarem. A tabela das catracas da Fase 16-H foi escrita justamente
para inverter esse sinal, e esta é a primeira evidência de que inverteu.

Vale dizer o que **não** prova: vão declarado continua sendo vão. Nomear não
fecha. O que muda é o estatuto — vira item que alguém decidiu deixar aberto, e
não descoberta futura.
