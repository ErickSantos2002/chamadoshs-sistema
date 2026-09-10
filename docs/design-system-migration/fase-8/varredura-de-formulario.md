# Varredura da camada de formulário — Fase 8

Inventário de todo controle de formulário do ChamadoshS, com auditoria de
rótulo programático, erro, e contorno/foco/desabilitado. 03/09/2026.

## Método

Quatro varreduras independentes, cada uma cega para o que as outras achariam,
depois uma passagem **adversarial** (cada defeito entregue a um cético com
ordem de refutar, e o veredito de "real" exigindo um cenário concreto de quem
é prejudicado e como), e por fim um crítico de completude.

235 sítios. O crítico é o que rendeu mais: quase tudo abaixo veio dele, porque
as quatro varreduras procuravam o que existe e errado, e a maior parte dos
defeitos desta camada é coisa que **não existe**.

## O que foi consertado nesta fase

Só a camada de primitivos. Os três primeiros são defeitos funcionais, e não de
acabamento.

**`Seletor` — Esc fechava o modal junto.** Com a lista aberta, `Escape` fazia
`preventDefault()` e não `stopPropagation()`. O `Modal` escuta `keydown` no
`document`, e `preventDefault` **não interrompe a propagação** — só cancela a
ação padrão do navegador. Resultado: desistir de escolher um item fechava o
formulário inteiro e perdia o que estava digitado. A lista ainda vive num
portal em `document.body`, então nem a hierarquia de React ajudaria: o evento
nativo sobe pela árvore do DOM até o `document` de qualquer jeito.

**`Button` — sem `type`, nasce submit dentro de `<form>`.** O componente
repassava `...resto` sem nunca declarar `type`. Hoje escapava por acaso: quem
submete declara `type="submit"`, e quem não declara está fora de qualquer
form. Bastava alguém envolver um bloco de ações num `<form>` para "Resolver" e
"Cancelar" passarem a enviar o formulário. Passa a `type="button"`, declarado
**antes** do `...resto` para quem precisa de submit continuar vencendo.

**`MensagemDeErro` — entrava na tela em silêncio.** Ganhou `role="alert"`.
Quem usa leitor de tela apertava Salvar, o formulário recusava, e nada era
anunciado.

**Contorno de campo em `--border-control`** (emenda E7), numa constante
compartilhada — ver `Campo.tsx`.

**`Checkbox` e `Switch` criados**, com o anel de foco que o pacote não mostra e
com `input.indeterminate` marcado no DOM, não só desenhado.

## O que NÃO entra nesta fase, e por quê

Tudo abaixo é código de TELA, que a §25 põe nas Fases 11–16. Registrado com
arquivo e linha para não se perder.

### Cinco controles escritos à mão onde existe primitivo

`ChamadoDetalhes.tsx` — textarea da solução (1067), de novo comentário (1120),
da solução no modal de resolver (1302), do motivo de cancelamento (1377), e o
input de confirmação do protocolo (1461).

São **cópias** da forma do primitivo, feitas antes de ele existir. E a Fase 8
piorou a situação delas: os primitivos passaram a `--border-control` (4,34 a
6,78:1) e as cópias ficaram em `--border-color` (1,13 a 1,51:1).

O caso mais duro é o mesmo campo em duas telas: o comentário pelo `ChamadoModal`
usa o primitivo e aparece contornado; pelo `ChamadoDetalhes` não usa e some no
fundo. Mesmo ato, mesma pessoa, e só uma das telas ela enxerga.

Três deles têm `<label>` sem `htmlFor` com o campo sem `id`: clicar no rótulo
não foca o campo, e o leitor de tela não anuncia o nome.

### Defeitos que corrompem dado — os mais graves da varredura

Não são de acabamento, e não são desta fase. Levados ao operador em separado.

| Onde | O quê |
|---|---|
| ~~`SlaTab.tsx:54`~~ | **REFUTADO por mim, ao ler o código.** O agente relatou que apagar o campo grava SLA de 0 minutos, "sem clamp no salvar". Há clamp: `salvar` (linha 121) recusa `< 1` nos dois prazos e mostra "Os prazos precisam ser de pelo menos 1 minuto". Zero nunca chega ao servidor. O que sobra é cosmético: o campo pode exibir `0` enquanto se digita, porque `Number('')` é `0`. |
| `TarefasRecorrentes.tsx:707` | `dia_mes` vira **0** ao limpar o campo, fora do próprio `min={1} max={31}` declarado ao lado. Conferido: `montarPayload` (279) manda `form.dia_mes` cru quando a recorrência é mensal, sem clamp. O 0 chega ao servidor. |
| `TarefasRecorrentes.tsx:720` | `intervalo` sofre o mesmo `Number('') === 0`, mas aqui `montarPayload` corrige calado. A tela pode dizer uma coisa e o sistema gravar outra. |
| ~~`UsuariosTab.tsx:567`~~ | **CORRIGIDO** em `3018452`, como desvio funcional aprovado pelo operador em 03/09/2026. Trava por `useRef` — o `useState` não serve, porque não muda no mesmo tique em que os dois cliques caem. Com teste, e com a prova negativa nos dois sentidos. |
| ~~`UsuarioModal.tsx:302`~~ | **CORRIGIDO** em `0e09c35`, como desvio funcional aprovado pelo operador em 03/09/2026. `autoComplete="new-password"` nos dois campos do par, com teste que varre os 8 campos de senha dos 4 arquivos — falha no dia em que alguém acrescentar um campo novo sem o atributo. |
| `ChamadoDetalhes.tsx:605` | Falha ao salvar **destrói a página inteira e o que foi digitado**: os `catch` chamam `setError`, e o guarda de render troca a ficha toda pela tela de erro. Quem escreveu 400 caracteres de solução e recebeu um 500 perde tudo. |

### Acessibilidade que sobra para as telas

- **Zero ocorrências** de `aria-invalid`, `aria-describedby` e
  `aria-errormessage` em todo o `src`. O `role="alert"` desta fase faz a
  mensagem ser lida quando aparece; associar mensagem a campo exige `id` em
  cada sítio.
- `ContadorMinimo.tsx:38` é a **única** explicação para um botão desabilitado e
  nunca é anunciado — sem `aria-live`. Botão desabilitado não recebe foco e não
  expõe motivo: a pessoa digita, o botão nunca aparece, e nada diz por quê.
- `NovoChamadoForm.tsx:126` mostra erro de submissão sem `role="alert"`.
- `Modal.tsx:115` **promete armadilha de foco no próprio docblock e não
  entrega**: só há foco inicial e devolução no fim. Não há ciclo de Tab e o
  conteúdo de trás não recebe `inert`. Fase 10.
- `ChamadoDetalhes.tsx:1037` usa `disabled` onde cabe `readOnly`, para EXIBIR o
  relato original — campo desabilitado sai da ordem de Tab e não deixa
  selecionar nem copiar justamente o texto que o técnico precisa citar.
- `Login.tsx:214` desabilita os campos durante o envio, o navegador tira o foco
  do elemento desabilitado, e login recusado deixa a pessoa fora de qualquer
  campo.

### Formulários que não são `<form>`

`UsuariosTab.tsx:537` (dois campos de senha) e os três modais de
`ChamadoDetalhes` (1302, 1377, 1461) são `<div>` com `onClick` nos botões.
Enter não envia. No caso da troca de senha, sem `<form>` o gerenciador de
senhas nem reconhece a troca para se oferecer a atualizar a credencial.

### Enabler que falta no primitivo

`Input` e `Textarea` são `React.FC` sem `forwardRef`, então a `ref` não chega
ao elemento. Isso torna impossível mandar o foco ao primeiro campo com erro
depois de uma submissão recusada — e, coerentemente, isso não existe em lugar
nenhum: há três `.focus()` em todo o `src`, os três de navegação.

Não foi adicionado aqui porque sem consumidor seria API especulativa; entra
junto da primeira tela que for arrumar o foco de erro, nas Fases 11–16.

### Datas sem restrição cruzada

`Auditoria.tsx:226/238` aceita "De" posterior a "Até" e responde "nenhum
evento", que se lê como "nada aconteceu" — numa tela cuja função é provar o
passado. O mesmo par no `Dashboard` (511/512) acerta, com `max` e `min`
cruzados.

## Desvios funcionais aprovados

A §29 e a §30 dizem que esta migração não muda comportamento. Dois itens desta
lista foram corrigidos mesmo assim, com **aprovação explícita do operador em
03/09/2026**, porque o modo de falha dos dois é gravar credencial errada sem
ninguém perceber:

| Commit | O quê |
|---|---|
| `0e09c35` | `autoComplete="new-password"` no par de senha do `UsuarioModal` |
| `3018452` | trava de duplo clique no reset de senha do `UsuariosTab` |

Os dois têm teste, e nos dois a prova negativa foi feita — o teste reprova
quando a correção é removida. No segundo, essa prova mudou a correção: a
primeira versão travava por `useState` e o teste mostrou que não travava nada.

## Sobre a confiabilidade desta lista

Cada defeito acima passou por um cético com ordem de refutar, e ainda assim
**um dos seis "corrompe dado" caiu quando eu li o código** — o do `SlaTab`. A
passagem adversarial reduz o falso positivo; não o elimina.

O que o derrubou não foi um método melhor, foi abrir o arquivo e procurar a
função de salvar. Vale como regra para quem for agir sobre esta lista: **antes
de consertar qualquer item, leia o caminho inteiro**, e não só a linha
apontada. O agente leu o `onChange` e concluiu sobre o `salvar` sem ler o
`salvar`.

## Falso positivo registrado

`type="category"` em `Dashboard.tsx:892` é prop do `YAxis` do Recharts, não um
`<input>` de tipo inválido. Apareceu na minha primeira busca por `type="..."` e
foi descartado ao ler o arquivo.
