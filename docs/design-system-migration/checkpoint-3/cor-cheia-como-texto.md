# A cor cheia da rampa usada como TEXTO

Achado no Checkpoint 3, a partir de um aviso da sessão do HelpHS. **Não
corrigido** — é trabalho de uma fase própria, e a decisão de escopo é do
operador.

## O buraco

A catraca (`scripts/validar-paleta.js`) cobre um caso: **fundo de cor cheia
com texto branco**. Foi desenhada para o defeito que existia — botões
`bg-perigo text-white` — e o levou de doze pares a zero.

Ela não vê o caso inverso: **cor cheia como a COR DO TEXTO**, sobre fundo
neutro. `text-perigo`, `text-alerta`, `text-sucesso`, `text-info`.

A sessão do HelpHS chegou nisso por outro caminho — mediu os candidatos a ícone
de toast antes de escolher, e viu `--color-success-500` dar 2,54:1 no claro.
É o mesmo número que aparece aqui embaixo, porque é a mesma cor.

## As medições

As quatro cores de significado são **fixas nos dois temas**: `--sucesso`,
`--perigo`, `--alerta` e `--info` são declaradas só em `:root` e não há bloco
`.dark` que as redefina. Isso é deliberado e está escrito no
`tailwind.config.js` — "o significado não muda com o tema: erro é vermelho nos
dois". A consequência é que o contraste delas muda muito entre os temas, e um
valor bom no escuro pode ser péssimo no claro.

Composição em ponto flutuante, sem arredondar por canal — o mesmo método das
outras tabelas desta migração, para os números dos dois repositórios serem
comparáveis.

```text
                        claro                          escuro
                        base    surface elevada        base    surface elevada
perigo   #EF4444        3,60    3,76    3,44           4,62    4,25    3,60
alerta   #F59E0B        2,05    2,15    1,96           8,10    7,44    6,31
sucesso  #10B981        2,42    2,54    2,32           6,86    6,30    5,34
info     #3B82F6        3,52    3,68    3,36           4,73    4,35    3,69
```

**Dezesseis dos vinte e quatro pares reprovam o piso de texto (4,5:1).**

**Seis reprovam até o piso de forma (3:1)** — `alerta` e `sucesso` nas três
superfícies claras. Esses seis não passam nem como ícone.

O pior é `text-alerta` sobre `--surface-elevated` no claro: **1,96:1**.

## Onde isso está em uso

| Arquivo | Uso | Piso | Medida | |
|---|---|---|---|---|
| `ui/Campo.tsx:133` | mensagem de erro, `text-perigo` | 4,5 | 3,76 | reprova |
| `ui/Campo.tsx:99` | asterisco de obrigatório (`aria-hidden`) | 3 | 3,76 | passa |
| `ContadorMinimo.tsx:39` | contador, `text-alerta` | 4,5 | 2,15 | reprova |
| `SlaProgresso.tsx:40` | rótulo, `text-perigo`/`text-sucesso` | 4,5 | 3,76 / 2,54 | reprova |
| `SlaProgresso.tsx:106` | rótulo, `text-perigo` | 4,5 | 3,76 | reprova |
| `Chamados.tsx:403` | ícone de agenda, `text-info` | 3 | 3,68 | passa |
| `Chamados.tsx:413` | ícone de visto, `text-sucesso` | 3 | 2,54 | reprova |
| `TarefasRecorrentes.tsx:417` | ícone de atenção, `text-alerta` | 3 | 2,15 | reprova |
| `TarefasRecorrentes.tsx:433` | ícone de repetir, `text-info` | 3 | 3,68 | passa |
| `TarefasRecorrentes.tsx:579` | botão, `text-perigo` | 4,5 | 3,76 | reprova |
| `Avaliacao.tsx:160` | estrela acesa, `fill-alerta text-alerta` | 3 | 2,15 | reprova |
| `Chamados.tsx:448` | `hover:text-info` no link de tarefa | 4,5 | 3,68 | reprova |

### A contagem, refeita com fronteira exata

A primeira versão desta lista veio de um `grep` frouxo, e **estava errada em
dois sentidos**. A correta usa fronteira de classe dos dois lados:

```bash
grep -rn -P "(?<![\w-])(?:text|fill|stroke)-(?:perigo|alerta|sucesso|info)(?![-\w])" \
  src --include=*.tsx | grep -v "\.test\."
```

- **Faltava um**: o `hover:text-info` do `Chamados.tsx:448` — que é o link que
  esta mesma rodada criou, ao trocar um botão-que-navega por `Link`. Entrou com
  a cor errada no mesmo dia em que o defeito foi descoberto.
- **Sobravam dois**: `Topbar.tsx:245` e `Spinner.tsx:179` casam o padrão dentro
  de **comentários**, e não são uso.

São **12 sites reais**, e não os 11 que eu tinha escrito.

O `-P` com fronteira também responde à pergunta que faltava: **zero** usos de
`text-perigo-forte` / `-suave` e equivalentes. Isso importa porque os degraus
são cores diferentes, com contraste diferente, e um `grep` sem a fronteira à
direita os contaria junto — o `\b` do POSIX casa antes do hífen.

A sessão do HelpHS caiu exatamente nessa: contou `text-danger\b` e chegou a
**106** usos, quando o número real era **24** — o resto eram degraus da rampa,
já corretos. Pegou porque quatro dos "achados" estavam num primitivo que ela
sabia migrado, e a conta não fechava. Se tivesse publicado 106, teria dimensionado
uma fase inteira em cima de um regex.

Duas dessas doem mais que as outras:

- **`Campo.tsx:133` é a mensagem de erro de todo formulário do sistema.** É o
  texto que a pessoa mais precisa ler, no momento em que mais precisa lê-lo.
- **`ContadorMinimo` a 2,15:1** é o contador que diz quantos caracteres faltam
  para a solução ser aceita. Texto pequeno, e o número é a informação inteira.

## O substituto, medido

`--on-tint-*`, que o `Badge` e o `Aviso` já usam. Ele **troca de degrau com o
tema** — 700/800 no claro, 300/400 no escuro —, que é exatamente o que falta às
cores cheias.

Medido nas três superfícies, em cada tema, com o valor daquele tema:

```text
                        claro                          escuro
                        base    surface elevada        base    surface elevada
--on-tint-danger        6,18    6,47    5,91           9,16    8,42    7,14
--on-tint-warning       6,78    7,09    6,47           10,42   9,58    8,12
--on-tint-success       7,34    7,68    7,01           9,05    8,32    7,05
--on-tint-info          6,41    6,70    6,12           9,65    8,87    7,52
```

**Pior caso: 5,91:1.** Os vinte e quatro passam o piso de texto com folga, e
portanto também o de forma.

### E o palpite óbvio, que é errado

`perigo-forte` — o degrau 700 — parece a resposta e não é: **6,47 no claro e
2,47 no escuro**, porque é degrau FIXO, com o mesmo defeito da cor cheia, em
espelho. Quem resolve é o token que inverte por tema.

Isso **já estava escrito neste repositório**, no item "Sair" do `Topbar`, que
passou por esta mesma correção numa fase anterior, com a mesma tabela e o mesmo
alerta. A regra existia; só não tinha sido generalizada dos quatro pares
daquele menu para o sistema.

Vale dizer porque muda o risco da Fase 16: não é caminho novo, é caminho já
percorrido uma vez e não estendido.

### As duas medições bateram, sem se olharem

A sessão do HelpHS mediu as mesmas 24 combinações no lado dela, com outra
ferramenta e sem ver esta tabela, e chegou às mesmas células — incluindo o
5,91 do pior caso do substituto. Dois métodos independentes com o mesmo
resultado é o que separa "eu calculei" de "isto é assim".

A troca é `text-perigo` → `text-on-tint-danger` e equivalentes. Não muda
estrutura, não muda comportamento, não muda uma medida de layout — é a mesma
troca que o `Badge` e o `Aviso` já fizeram, nas mesmas cores, pelo mesmo
motivo.

**Uma ressalva antes de aplicar em lote:** cada uso precisa ser lido no
contexto do fundo REAL. `text-perigo` sobre `bg-tint-danger` é um par
diferente de `text-perigo` sobre `--surface`, e trocar sem olhar repetiria o
erro que a galeria já cometeu uma vez — medir o elemento errado e concluir
com confiança.

## A proposta

**Estender a catraca**, com a mesma disciplina da atual: falha em par novo E em
par removido, imprime a lista corrigida pronta para colar, e a linha de base só
pode encolher.

A regra nova: **classe de cor cheia da rampa aplicada a texto ou a ícone**
(`text-*`, `fill-*`, `stroke-*` das quatro cores de significado), medida contra
as três superfícies nos dois temas, com dois pisos — 4,5:1 quando o elemento
carrega texto, 3:1 quando é forma.

Ela nasceria vermelha, com a linha de base na contagem que ela mesma apurar.
Isso não é regressão: é o mesmo movimento que a catraca atual fez ao nascer com
doze e chegar a zero. A diferença é que agora se sabe o remédio antes de
começar.

O piso duplo é o ponto delicado. Misturar 4,5 com 3 num teste só reprova coisa
que passa — foi o erro da primeira galeria. A regra precisa saber, para cada
ocorrência, se o elemento tem texto dentro; `text-alerta` num `<span>` com
palavras e `text-alerta` num `<svg>` são casos diferentes com a mesma classe.

## O que este documento NÃO faz

Não corrige nada. As onze ocorrências acima continuam como estão, e a
Fase 15 fechou sem tocá-las.

Foi decisão de escopo: o operador marcou o Checkpoint 3 como ponto de parada, e
uma varredura em seis arquivos com uma regra nova de catraca é uma fase, não um
remate. O achado chegou por mensagem da outra sessão no meio da Fase 15, e o
que dava para fazer sem abrir escopo foi feito — medir tudo, medir o remédio, e
deixar a proposta pronta.
