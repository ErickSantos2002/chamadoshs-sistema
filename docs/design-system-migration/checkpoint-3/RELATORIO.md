# Checkpoint 3 — páginas principais (Fases 11 a 15)

## O resultado, em uma linha

As cinco fases fecharam, **537 testes em 46 arquivos passam, a catraca de
contraste está em zero**, e restam **duas decisões abertas** e **uma evidência
que este ambiente não consegue produzir**.

## O que a §26 pede, e o que está aqui

| Evidência exigida | Estado |
|---|---|
| Checklist da §29 de cada página migrada, preenchido e conferido | **completo**, cinco fichas |
| Screenshots antes/depois, 1366×768 e 390×844, dois temas | **não produzido** — ver abaixo |

### As cinco fichas

| Fase | Página | Itens que falhavam |
|---|---|---|
| 11 | `CategoriasTab` (template de listagem) | 3 |
| 11 | `CategoriaModal` (template de formulário) | — |
| 12 | `SetoresTab` e `UsuariosTab` | 1, o mesmo nas duas |
| 13 | `Dashboard` | 3, mais 3 achados depois (adendo) |
| 15 | `ChamadoDetalhes`, quadro, avaliação e SLA | 2 |

Não há ficha da Fase 14 porque ela não tocou nenhuma tela que a ficha da 15 não
cubra: trabalhou os botões de ação do `ChamadoDetalhes`, e a ficha da 15 cobre
aquela tela de ponta a ponta.

### Os screenshots, e por que não estão aqui

As quatro telas pedidas — dashboard, listagem, formulário e detalhe — vivem
**atrás do login**, e o login depende da API. O front rodando sozinho não passa
da tela de entrada. Isso vale igualmente para o "antes": fotografar o estado
anterior exigiria voltar a um commit antigo e entrar no sistema do mesmo jeito.

O que existe e substitui parte disso:

- **A galeria de componentes** (`/dev/componentes`), rota de desenvolvimento sem
  login, que mede contraste ao vivo nos dois temas. Foi a evidência do
  Checkpoint 2 e continua valendo para os primitivos que estas páginas passaram
  a usar.
- **A galeria da casca**, do Checkpoint 1, pelo mesmo motivo.

**O que falta é a foto das páginas com dado real.** Dois caminhos, e a escolha
é do operador:

1. O operador sobe o sistema, entra, e captura as dezesseis telas.
2. O operador sobe o ambiente e entra; a partir daí a sessão captura pelas
   ferramentas de navegador.

Não dá para fingir que isto está entregue: a §26 pede a foto, e a foto não
existe.

## O que as cinco fases entregaram

Contagem no `src`, fora dos primitivos (`components/ui/`) e dos testes.

| | Antes da Fase 11 | Agora |
|---|---|---|
| `<button>` escritos à mão | 24 só no `ChamadoDetalhes` | 1 nele, e é decisão aberta |
| `<textarea>` | 6 no `ChamadoDetalhes` | 0 em todo o sistema |
| `<label>` sem apontar para nada | 9 no `ChamadoDetalhes`, 1 no `Dashboard` | 0 |
| mapas de status/prioridade copiados | 3 cópias | 1 lugar |
| selos pintados por cor de gráfico | `Dashboard` e `ChamadoDetalhes` | 0 |
| cópias literais do bloco de aviso | 10 | 0 |

Dezesseis commits, 28 arquivos de `src` tocados.

## Os defeitos de acessibilidade encontrados

Nenhum destes era visível. Todos foram achados lendo código, e vários por
mutação de teste.

| Onde | O defeito | Família |
|---|---|---|
| `ChamadoDetalhes` × 9 | `<label>` sem `for` e sem controle: inerte | mecanismo inexistente |
| `Dashboard` × 4 | atalho de período dizia o ativo só pela cor | cor sozinha |
| `Dashboard` | interruptor com rótulo e `title` em desacordo | dois nomes, um controle |
| `Dashboard`, `Chamados`, `ChamadoDetalhes` | `<button>` que navega | sinal certo, mecanismo errado |
| `ChamadoDetalhes` | descrição `disabled` impedia copiar o relato | efeito colateral do estado |
| `ChamadoDetalhes` × 2 | campo com placeholder e nenhum nome | nome que some ao digitar |
| `SetoresTab`, `UsuariosTab` | idem, na busca | conserto que não transferiu |
| `ChamadoDetalhes` | erro de carga sem `role`, e fora da tinta | décima cópia do `Aviso` |
| `ui/Aviso` | `role="alert"` nas quatro variantes | assertivo onde cabia educado |
| `SelosDeChamado` | papéis separados por 5% de alfa | distinção que não existe |

## As duas decisões abertas

### 1. "Cancelar Chamado" — a única variante que não coube

Detalhe completo na ficha da Fase 15. Em resumo: cancelar **é irreversível**
pelo front (há `arquivar`/`desarquivar`, não há descancelar), e a regra
registrada diz "vermelho só em irreversível". Mas hoje ele é vermelho VAZADO, e
o pacote não tem essa variante — `perigo` é cheio, e converter põe dois botões
vermelhos cheios ao lado um do outro, apagando a distinção que a nota do código
defende: "Excluir" é o único em vermelho cheio porque é a única ação sem volta.

**Recomendação: `secundario`.** O cancelamento não apaga o chamado; ele segue
visível, buscável e com o histórico inteiro. O rótulo, o ícone de proibido e o
modal com motivo obrigatório já carregam o peso — o mesmo argumento que decidiu
os três "Desativar".

### 2. "Fechado" mostrado como "Resolvido"

Já registrada no `DECISOES.md` como pergunta aberta de produto, sem decisão
minha. Continua valendo: o rótulo não mudou, e o `Badge` usa a variante que o
mapa dá ao status real.

## O defeito achado e NÃO corrigido

`Avaliacao.tsx` guarda o clique duplo por `useState`, e não por `useRef`. É
**o mesmo defeito** já corrigido em `UsuariosTab.tsx:567` — dois cliques no
mesmo tique leem `salvando === false` os dois, e o `disabled` ainda não foi
aplicado. Consequência: duas notas gravadas, e quem vence é a última resposta a
chegar, não o último clique.

Não foi corrigido porque **mudança funcional pede aprovação explícita**, e as
três anteriores desta migração seguiram esse caminho. A correção é conhecida e
tem teste modelo pronto.

## O achado grande, medido e não aplicado

**A cor cheia da rampa usada como texto reprova em dezesseis dos vinte e quatro
pares**, e em seis reprova até o piso de forma. Documento próprio:
[`cor-cheia-como-texto.md`](./cor-cheia-como-texto.md).

Veio de um aviso da sessão do HelpHS. A catraca não vê esse caso — ela cobre
fundo cheio com texto branco, que era o defeito que existia quando foi escrita.

Está medido, o substituto está medido (`--on-tint-*`, pior caso 5,91:1), e a
proposta de estender a catraca está escrita. **Nada foi corrigido**: são seis
arquivos e uma regra nova de catraca, o que é uma fase e não um remate — e o
ponto de parada era aqui.

## O que este checkpoint aprendeu sobre o próprio método

Duas fases foram dadas por prontas e não estavam, e **as duas passaram pela
conferência sem disparar nada**.

- **Fase 12**: as duas cópias do template receberam a estrutura e não os dois
  consertos de acessibilidade dele. Cada cópia, olhada sozinha, parecia
  completa.
- **Fase 13**: a ficha da §29 do `Dashboard` marcou os dezoito itens, e três
  controles interativos continuavam escritos à mão, dois deles com defeito.

O motivo é o mesmo nas duas: **a §29 pergunta se a função sobreviveu, não se o
controle foi migrado.** Ela é uma rede de preservação — pega o que a migração
teria quebrado. Um controle não tocado atravessa a ficha inteira sem disparar
nada, porque continua fazendo exatamente o que sempre fez.

O que teria pego as duas: **uma contagem do que resta escrito à mão, por
arquivo, ao fim de cada fase.** É de uma linha:

```bash
grep -rc "<button\|<input\|<textarea\|<select" src --include=*.tsx \
  | grep -v "\.test\.\|components/ui/" | grep -v ":0$"
```

Proposta: rodar isso no fim de cada fase, e colar o resultado na ficha. Não
substitui a §29 — responde outra pergunta, que é a que faltava.

### E a proposta de ferramenta

Os `<label>` inertes e os botões-que-navegam são classes que uma máquina pega:
`jsx-a11y/label-has-associated-control` e `jsx-a11y/anchor-is-valid`. O projeto
**não tem ESLint** — nem configuração, nem dependência —, então é dependência
nova e passo novo na suíte, e fica como proposta. Hoje esta classe de defeito
depende de alguém ler o arquivo, e foi assim que nove rótulos atravessaram três
fases.

## Uma nota sobre a mutação

Três achados desta rodada vieram de mutar o código e ver se o teste reclamava,
e não de ler:

- O caso de "interpolações diferentes" da varredura **não provava nada** — o par
  caía no primeiro ramo, e uma implementação de caminho único passaria igual.
  Apontado pela sessão do HelpHS, que achou o mesmo no código deles.
- O `?? 'neutro'` do `PapelBadge` é **redundante hoje**: o `Badge` já tem esse
  valor como parâmetro padrão. O teste passa sem ele, e passa porque testa o
  RESULTADO e não o mecanismo — que é o certo, e ficou escrito no teste para
  ninguém "limpar" a linha achando que é morta.
- Os dois casos novos do `Aviso` foram conferidos do mesmo jeito antes de
  entrarem.

Nos três o teste estava certo E o código estava certo. Só o teste não provava o
que dizia provar — e isso não aparece lendo.
