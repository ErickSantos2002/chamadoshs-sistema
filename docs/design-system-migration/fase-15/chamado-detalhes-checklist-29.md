# Fase 15 — `ChamadoDetalhes`, o quadro e o que veio junto

Checklist da §29, preenchido antes e depois, lendo o **código** e não a tela.

`ChamadoDetalhes` é a maior tela do sistema (1.528 linhas) e a única que faz
tudo: lê, edita, comenta, resolve, cancela, arquiva, exclui e recebe a nota de
satisfação. Não tem template equivalente — é o fim da fila da migração, e o que
sobrou de escrito à mão no sistema estava quase todo aqui.

## Como cada item foi conferido

Igual à Fase 11: a página vive atrás do login, e o front sozinho não passa da
tela de entrada. O que dá para conferir sem navegador foi conferido por
**leitura do código** e pela suíte (535 casos, 46 arquivos); os dois itens que
dependem do navegador estão ditos abaixo, com o caminho usado.

## O checklist

```text
Página: /chamados/:id — src/pages/ChamadoDetalhes.tsx (1.528 linhas)

ANTES                                                           DEPOIS
[x] carrega dados (buscarChamado + comentários + histórico)      [x] chamada inalterada
[–] filtra — não existe                                          [–] não existe
[–] busca — não existe                                           [–] não existe
[–] pagina — não existe                                          [–] não existe
[–] ordena — comentário e histórico saem em ordem da API         [–] inalterado
[x] cria (comentário)                                            [x] + nome acessível
[x] edita (modoEdicao, Administrador/Tecnico)                    [x] inalterado
[x] exclui (modal com confirmação por protocolo)                 [x] inalterado
[x] abre detalhes — é a própria tela de detalhe                  [x] inalterado
[–] anexa/remove arquivo — não existe                            [–] não existe
[x] respeita permissões (podeEditar, podeExcluir, Avaliacao)     [x] inalterado
[ ] mostra erro — FALHAVA, ver 1 abaixo                          [x] Aviso, com role="alert"
[x] mostra estado vazio (comentários e histórico)                [x] inalterado
[x] mostra loading (BlocoCarregando)                             [x] inalterado
[x] funciona no mobile                                           [x] inalterado, ver nota
[x] funciona no tema escuro (só tokens, nenhum hex)              [x] inalterado
[ ] nenhum campo depende do placeholder — FALHAVA (2 de 6)       [x] os seis
[x] toda barra desenhada tem papel declarado (SlaProgresso)      [x] inalterado
```

Dois itens falhavam. Nenhum dos dois era visível.

### Os dois itens que dependem do navegador

**mobile** — a tela não tem largura fixa nenhuma (`w-[…]`, `min-w-[…]`,
`max-w-[…]`: zero ocorrências). O layout é `flex-wrap` em toda a barra de ações
e um `md:grid-cols-2` no painel de informações, que colapsa para uma coluna.
As duas listas — comentários e histórico — são blocos empilhados. Não há tabela,
que é o que costuma estourar a largura.

**tema escuro** — conferido pela galeria de componentes (`/dev/componentes`),
que mede os tokens no navegador nos dois temas. Os primitivos que esta página
passou a usar — `Aviso`, `Badge`, `Button`, `Campo`, `Textarea`, `Input`,
`Seletor`, `BlocoCarregando` — estão entre as amostras medidas, sem reprovação.

## O que falhava

### 1. A falha de carga não tinha papel, e a cor era outra

A saída de erro era um bloco vermelho escrito à mão:

```
border-perigo/30  bg-perigo/10  text-on-tint-danger
```

Sem `role="alert"`. É a **décima** cópia literal do `Aviso` do sistema — as
outras nove saíram na Fase 8, e esta sobreviveu por estar num `return`
antecipado, antes do corpo da tela, onde a varredura por bloco de erro não
passou.

O fundo também estava fora: `bg-perigo/10` contra os 15% que o `--tint-danger`
do pacote define. Dez por cento e quinze por cento de vermelho são a mesma coisa
para o olho e coisas diferentes para a régua de contraste, que é justamente o
motivo de o alias existir.

Agora é `Aviso variante="perigo"`, que traz o papel e a tinta.

### 2. Dois dos seis campos só tinham placeholder

O comentário novo e a solução em modo de edição eram `<textarea>` com
`placeholder` e nada mais. Placeholder some quando se digita, e não é nome
acessível: quem usa leitor de tela ouvia "caixa de texto, em branco".

Os seis campos passaram a `Textarea`/`Input`/`Campo`, cada um com nome próprio.

## O que mudou sem estar no checklist

| Antes | Depois |
|---|---|
| 24 `<button>` escritos à mão | 1 (ver a decisão aberta) |
| 6 campos escritos à mão | 0 |
| 12 `<label>` (9 sem apontar para nada) | 0 `<label>`; lista de definições |
| 7 selos pintados por `seloDaCor`/`getRoleBadgeColor` | mapas da §16 e `PapelBadge` |

### A descrição saiu de `disabled` para `readOnly`

Em modo de edição a descrição é imutável de propósito — preserva o relato
original do solicitante. Estava marcada `disabled`, e `disabled` faz três
coisas, não uma: tira o campo da ordem de Tab, apaga o campo para o leitor de
tela **e impede selecionar o texto**.

Quem atende precisa citar o relato ao escrever a solução, e não conseguia
copiá-lo. `readOnly` + `aria-readonly` diz "não editável" sem tirar nada disso.

### Os nove rótulos do painel eram `<label>` inertes

Um `<label>` sem `for` e sem controle dentro não cria relação nenhuma. A ligação
"Protocolo" → `#4187` existia só para quem enxerga, pela proximidade e pelo
tamanho da fonte.

Quatro dos nove ficam mais delicados: em modo de edição eles ganham um
`Seletor` ao lado. Pôr `htmlFor` neles seria pior — o id só existe nesse modo, e
fora dele o rótulo apontaria para um id inexistente, que é o ponteiro quebrado
já travado por teste no `Campo`. Envolver o `Seletor` também não: ele já se
nomeia por `aria-label`, e envolver criaria um segundo nome para o mesmo
controle (§5.4).

`<dl>`/`<dt>`/`<dd>` resolve os nove de uma vez e não move um pixel: `dt` e `dd`
já são bloco, e o preflight do Tailwind zera a margem de 40px que o `dd` traria
do navegador.

### O selo de papel separava Administrador de Técnico por 5% de alfa

O `getRoleBadgeColor` local dava `bg-info/15` para Administrador e `bg-info/20`
para Técnico — a **única** diferença entre os dois papéis, e ela não é visível.
O `default` trazia `text-conteudo` e `text-conteudo-suave` na mesma string de
classes, com o vencedor decidido pela ordem da folha de estilo.

Virou `PapelBadge`, em `SelosDeChamado.tsx`, com quatro casos de teste
conferidos por mutação.

## A decisão aberta desta fase

**"Cancelar Chamado" ficou escrito à mão de propósito.** É o único
`<button>` que sobrou na página, e a razão é uma tensão real entre duas regras
que já valem:

- A regra registrada no `DECISOES.md` diz **"vermelho só em irreversível"**. E
  cancelar É irreversível pelo front: a API tem `arquivar`/`desarquivar` como
  par, mas `cancelar` não tem volta — não existe endpoint de descancelar.
  Por essa leitura, `Button variante="perigo"`.

- A nota que já estava no código diz que **"Excluir" é o único em vermelho
  cheio**, porque é a única ação sem volta e "não pode parecer irmã de Arquivar
  nem de Editar". Hoje "Cancelar Chamado" é vermelho VAZADO — moldura e texto,
  sem preenchimento —, e o pacote não tem essa variante: `perigo` é cheio.
  Converter põe dois botões vermelhos cheios lado a lado e apaga a distinção.

As cinco variantes do pacote não têm um degrau entre "neutro" e "vermelho
cheio", e criar um seria E12 — que já foi recusada.

**Recomendação:** `secundario`. O cancelamento não apaga o chamado, só o tira do
fluxo; ele continua visível, buscável e com o histórico inteiro. O que não tem
volta é a exclusão, e é ela que deve ficar sozinha em vermelho. O rótulo
"Cancelar Chamado", o ícone de proibido e o modal de confirmação com motivo
obrigatório já carregam o peso — que é o mesmo argumento que decidiu os três
"Desativar".

**Se a decisão for `perigo`,** aí a nota do código precisa mudar junto, e a
distinção entre cancelar e excluir passa a ser só o rótulo e o modal.

## O quadro, a avaliação e a aba de SLA

Os três estavam **migrados desde fases anteriores**, e a passagem aqui foi de
conferência. O que se achou:

| Arquivo | Estado | O que mudou agora |
|---|---|---|
| `Chamados.tsx` (quadro) | migrado | 1 `<button>` que navegava virou `Link` |
| `KanbanColumn.tsx` | migrado | anel de foco para `--focus-ring` |
| `SlaTab.tsx` | migrado | nada — 0 botões, 0 campos, 0 rótulos à mão |
| `Avaliacao.tsx` | migrado | anel de foco; **um defeito achado, ver abaixo** |

A barra de prazo do `SlaTab` é cor, mas não é cor sozinha: os números
("Resposta 4h", "Resolução 1d") estão escritos por extenso logo abaixo dela.

### O defeito achado em `Avaliacao.tsx`, NÃO corrigido

A gravação da nota tem guarda de clique duplo por `useState`:

```tsx
const [salvando, setSalvando] = useState(false);
// ...
<button disabled={salvando} onClick={() => salvar(n)} />
```

É **o mesmo defeito** que foi corrigido em `UsuariosTab.tsx:567` — e que só foi
possível provar depois de descobrir que o primeiro teste passava com a guarda
removida, porque o próprio `disabled` bloqueava o segundo clique. Dois cliques
no mesmo tique do laço de eventos leem `salvando === false` os dois, e o
`disabled` ainda não foi aplicado.

Consequência aqui: duas notas gravadas, e **quem vence é a última resposta a
chegar, não o último clique**. Clicar 5 e depois 4 pode registrar 5.

A janela é estreita — precisa dos dois cliques no mesmo tique — e a correção é
conhecida (trocar por `useRef`, como na `UsuariosTab`). **Não foi aplicada:**
mudança funcional pede aprovação explícita, e as três anteriores desta migração
(as duas de senha e a de confirmação de exclusão) seguiram esse caminho.

## Uma recomendação de ferramenta, para o operador decidir

Os `<label>` inertes desta tela são de uma classe que dá para pegar por máquina,
e a regra existe pronta: `jsx-a11y/label-has-associated-control`. Junto com ela
vêm `anchor-is-valid` (que teria pegado os dois botões-que-navegam) e
`no-redundant-roles`.

O projeto **não tem ESLint** — nem configuração, nem dependência. Instalar é
dependência nova e passo novo na suíte, então fica como proposta e não como
ação: hoje esta classe de defeito depende de alguém ler o arquivo, e foi assim
que os nove rótulos passaram por três fases de migração sem serem vistos.
