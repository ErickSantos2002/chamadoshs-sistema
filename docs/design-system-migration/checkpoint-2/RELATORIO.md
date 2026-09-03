# Checkpoint 2 — componentes (Fases 7 a 10)

03/09/2026 · branch `chore/design-system-adoption`

## O resultado, em uma linha

**192 medições de contraste**, 96 amostras × 2 temas, feitas no navegador a
partir do estilo computado. **Três reprovações — e as três são o mesmo defeito
aberto do pacote**, não deste repositório.

| Tema | Amostras | Reprovam |
|---|---|---|
| claro | 96 | 1 |
| escuro | 96 | 2 |

As três: `badge sucesso` sobre `--surface-elevated` no claro (4,39:1),
`badge info` e `badge perigo` na mesma superfície no escuro (4,40:1 e 4,38:1).
São os pares `tint`/`on-tint` que a emenda E2 corrigiu para `warning` e não
mediu para `success`, `info` e `danger`. Levado ao operador como candidato a
emenda; ainda aberto.

Nenhuma amostra ficou sem medição.

## Como esta evidência foi produzida

A §26 pede "screenshot de cada primitivo em todos os estados nos dois temas".
Uma página que só desenha os componentes cumpre a letra e não prova nada.

`/dev/componentes` mede a razão de contraste **na hora**, com
`getComputedStyle`, sob cada amostra. Quem resolve a cascata, o `color-mix`, a
herança e o alfa é o próprio navegador: se um token estiver errado, se uma
classe não existir, o número muda na imagem.

A medição foi validada contra a varredura estática de arquivos, que é um
caminho independente: os quatro valores de Badge sobre `--surface` que o
`Badge.tsx` documenta saíram idênticos até a segunda casa (5,64 · 4,76 · 6,32 ·
5,32), e as três reprovações conhecidas apareceram sozinhas com os mesmos
números.

Onde o número não podia sair de uma medição de texto, foi conferido no
**computado**, e não pela classe:

| O quê | Conferido |
|---|---|
| `Rotulo` | `ui-monospace`, 12px, `letterSpacing 1.2px` (= 0,1em a 12px), uppercase |
| `Colchetes` | 4 cantos de 12×12, cada um com exatamente duas bordas de 1px, `rgb(49,93,129)` = `--border-strong` do escuro; variante `sinal` em `rgb(31,137,202)` |
| `Spinner` | 16/24/32px com traço 2/2/3, `border-top-color` transparente |
| Contorno de campo | `rgb(100,116,139)` no claro e `rgb(148,163,184)` no escuro = slate-500/400 = `--border-control` |
| `<th>` | todos com `scope="col"` |

## O que as quatro fases entregaram

**Fase 7 — core.** Button, Card, Badge, Avatar, Spinner, Rotulo, Colchetes.
Dezoito anéis de carregamento em três formas viram um primitivo. O `Rotulo`
volta à monoespaçada pela D2-a, com os números do pacote. `Colchetes` criado.
Traço 2 dentro de botão, como regra CSS contextual.

**Fase 8 — formulário.** Contorno em `--border-control` (E7), numa constante
compartilhada. `Checkbox` e `Switch` criados. Três defeitos funcionais
consertados.

**Fase 9 — dados.** `Tabela` com `scope` de graça; os 27 `<th>` do sistema
marcados no lugar. `SlaProgresso` ganha `role="progressbar"`.

**Fase 10 — feedback.** A armadilha de foco do `Modal`, que o docblock
prometia e o código não fazia. `Aviso` substitui nove cópias literais. As abas
viram `tablist`. O ícone do toast sai de 2,54:1.

## Os defeitos de acessibilidade encontrados e corrigidos

Nenhum destes era visível. Todos foram achados medindo ou lendo, não olhando.

| O quê | Onde | Antes |
|---|---|---|
| Anel de foco invisível | `Button`, 3 de 5 variantes | `ring-borda` 1,23:1 — 27 dos 51 usos |
| Skip link | primeiro focável de toda página | 2,69:1 no escuro |
| Botões `sucesso`/`perigo` | `Button` | 2,54:1 e 3,76:1, nos dois temas |
| Avatar | 20 combinações reais | 14 reprovavam, 6 abaixo de 3:1 |
| Três blocos de carregamento | `SlaTab`, `ChamadoModal`, `TarefasRecorrentes` | silêncio total no leitor de tela |
| A única espera sem anel | `ProtectedRoute` | texto parado, e é a primeira de todas |
| Contorno de campo | `Input`, `Textarea`, `Seletor` | 1,23:1 — WCAG 1.4.11 pede 3:1 |
| Foco em `Checkbox`/`Switch` | os dois, no pacote | nada reagia ao foco do input |
| Armadilha de foco | `Modal` | prometida no docblock, ausente no código |
| Nove avisos de erro | vários | apareciam sem `role`, em silêncio |
| `scope` em tabela | as 6 tabelas | nenhuma declarava |
| Abas | `CadastrosBasicos` | quatro botões soltos, sem `role` |
| Ícone do toast | `App.tsx` | 2,54:1, o mesmo número da E2 |
| Esc no `Seletor` | dentro de modal | fechava o modal e perdia o formulário |
| `Button` sem `type` | primitivo | nasce submit dentro de `<form>` |

## O que continua aberto

**Do pacote:** os pares `tint`/`on-tint` de `success`, `info` e `danger` sobre
`--surface-elevated` (as três reprovações acima). Real em
`ChamadoModal.tsx:356`, que põe os selos dentro de um `<aside>` elevado — a
tela mais usada do sistema.

**Deste repositório, para as Fases 11–16:** está em
`docs/design-system-migration/fase-8/varredura-de-formulario.md` e
`fase-7/varredura-de-carregamento.md`, com arquivo e linha. Os cinco mais
graves são funcionais e não de acabamento — um deles grava credencial errada
sem ninguém perceber.

**Não adotados, com motivo registrado:** `Pagination` (a API da trilha não
devolve total), `Tooltip`, `Radio` e `FileUpload` (sem consumidor).

## Uma nota sobre o método

Duas coisas nesta rodada foram achadas por conferência e não por construção, e
as duas quase passaram:

- A galeria reprovou **três amostras corretas** do `Checkbox` (2,77:1) porque o
  seletor media a caixa decorativa, que não tem texto. Um número errado é uma
  RESPOSTA, e uma resposta errada com aparência de medição é pior que um traço.
- Um agente relatou que o `SlaTab` gravava SLA de 0 minutos. Há clamp no
  `salvar`. Ele leu o `onChange` e concluiu sobre o `salvar` sem lê-lo, e eu
  repassei antes de abrir o arquivo.

A regra que sai das duas: **antes de agir sobre um achado, leia o caminho
inteiro** — e antes de acreditar num número, confira o que ele está medindo.
