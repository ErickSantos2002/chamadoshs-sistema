# Fase 13 — Dashboard do ChamadosHS

Checklist da §29, preenchido antes e depois, lendo o **código** e não a tela.

O template de dashboard da Fase 11 foi **pulado por decisão do operador**: um
template existe para transferir decisão a outras telas do mesmo tipo, e o
`Dashboard` é único no sistema. Fazer meia migração na Fase 11 e outra metade
aqui dividiria o checklist em duas partes que não conferem. Esta fase é o
template dela mesma.

## O checklist

```text
Página: /dashboard — src/pages/Dashboard.tsx (1.034 linhas)

ANTES                                                          DEPOIS
[x] carrega dados (chamadosService.listarTodos)                 [x] chamada inalterada
[x] filtra (status, prioridade, cancelados, período)             [x] inalterado
[–] busca — não existe                                          [–] não existe
[–] pagina — não existe                                         [–] não existe
[–] ordena — não existe                                         [–] não existe
[–] cria / edita / exclui — não é tela de escrita               [–] não se aplica
[x] abre detalhes (navigate para /chamados/:id)                  [x] inalterado
[–] anexa/remove arquivo — não existe                           [–] não existe
[x] respeita permissões (Usuario vê só os próprios)              [x] inalterado
[ ] mostra erro — FALHAVA, ver abaixo                            [x] Aviso na tela
[x] mostra estado vazio (por gráfico, "Sem dados para exibir")   [x] inalterado
[x] mostra loading (BlocoCarregando)                            [x] inalterado
[x] funciona no mobile (grid com md:/lg:)                        [x] inalterado
[x] funciona no tema escuro (estiloDoGrafico(darkMode))          [x] inalterado
[ ] nenhum campo depende do placeholder — FALHAVA                [x] os dois campos de data
[ ] toda barra desenhada tem papel declarado — FALHAVA           [x] ver abaixo
```

Três itens falhavam. Nenhum era visível.

## O que falhava, e o que foi feito

### 1. A falha de carga não aparecia — e o painel mentia

O `catch` do `useEffect` só fazia `console.error`. Quando a API falha,
`chamados` fica em `[]`, o `loading` cai, e **o painel renderiza zeros**.

Uma falha de rede ficava idêntica a "não há chamados". O painel respondia "0
abertos, 0 resolvidos, 0% no prazo" quando na verdade **não conseguiu
perguntar** — e um número desses se lê como uma afirmação sobre a operação da
empresa.

É o mesmo argumento que o `TrilhaErro` da auditoria já fazia por escrito: erro
é um ESTADO, não um aviso somado aos outros.

Agora há `Aviso variante="perigo"` acima dos números, dizendo que eles podem
estar desatualizados. Ele fica ANTES e não NO LUGAR: dados de uma carga
anterior ainda podem valer, e o texto diz exatamente isso.

**É acréscimo de comportamento**, e está registrado como tal — a tela passa a
mostrar algo que antes não mostrava. Foi feito porque a §29 lista o item e diz
que um item não marcado bloqueia o checkpoint.

### 2. Os dois campos de data estavam na forma anterior à E7

`<input type="date">` escritos à mão, com `border-borda` (**1,23:1** contra a
página) e `focus:ring-sinal`. Os primitivos foram para `--border-control`
(4,76:1) na Fase 8 e estes ficaram para trás: **a migração aumentou a distância
entre eles e o resto do sistema.**

O rótulo era um `<label>` sem `htmlFor`, com o campo sem `id`: clicar no texto
"De" não focava o campo, e o leitor de tela não anunciava o nome. Agora os dois
passam pelo `Campo`, que amarra rótulo e controle.

### 3. Os gráficos não tinham papel declarado

O item da §29 é específico: `progressbar` quando há escala de 0 a 100 **e um
alvo**; `meter` quando é medida sem alvo; e **nenhum papel de progresso** quando
é comparação ou distribuição.

Estes são distribuição — quantos chamados por prioridade, por categoria. Não há
alvo, e a soma não é progresso rumo a nada. Os números existiam **apenas dentro
do SVG** do recharts: quem não vê o gráfico não recebia nem os valores nem a
informação de que havia um gráfico ali.

| Gráfico | Tratamento | Por quê |
|---|---|---|
| Rosca de status | `aria-hidden` só no desenho | os nomes e números já estão na lista de texto ao lado; anunciar seria ler duas vezes |
| Barras por prioridade | `role="img"` + `aria-label` | não há equivalente em texto |
| Barras por categoria | `role="img"` + `aria-label` | idem |

O `aria-label` é montado do próprio dado: "Chamados por prioridade: Baixa 3,
Média 12, Alta 5." O total no centro da rosca **não** entrou no recorte — ele
não está repetido em lugar nenhum e sumiria junto.

## O que mudou sem estar no checklist

| Antes | Depois |
|---|---|
| 6 painéis com moldura escrita à mão | `Card padding="lg"` + `CardHeader` |
| Tabela de recentes com o cabeçalho copiado de 4 arquivos | `Tabela` + peças |
| Status pintado com a paleta CATEGÓRICA de gráficos | `Badge` com a variante da §16 |
| Prioridade idem | `PrioridadeBadge` |
| "Arquivado"/"Cancelado" como chips `rounded-full` à mão | `MarcaBadge` |

### O selo de status era uma segunda fonte de verdade

`seloDaCor(corDoStatus(...))` pintava o status com a paleta de gráficos a 13% e
uma barra de 2px na cor cheia. A §5.4 proíbe a segunda fonte, e ela **já tinha
divergido**: o mesmo chamado aparecia de um jeito no quadro e de outro aqui.

É a mesma forma do defeito que o `Avatar` tinha na Fase 7 — a paleta categórica
é certificada para FORMA (piso 3:1) e estava carregando TEXTO. Terceira
aparição do padrão "token certo, propósito errado".

`corDoStatus` e `corDaPrioridade` **continuam** e continuam certos: pintam
gráfico, que é o papel para o qual a paleta é certificada. Quem saiu foi
`seloDaCor`, que ficou sem uso.

### O rótulo do status NÃO mudou, e isso foi deliberado

`getStatusDisplay` mostra `FECHADO` como **"Resolvido"**, aqui e em
`ChamadoDetalhes`. Isso é conteúdo, e a §30 não deixa trocar por motivo visual.

Por isso a tabela usa `Badge` com `VARIANTE_DE_STATUS[status]` e não
`StatusBadge` — o segundo traria o rótulo do enum e mudaria o texto da tela.

**Fica como pergunta para o operador:** por que o Dashboard chama "Fechado" de
"Resolvido"? Se for intencional (o domínio trata os dois como o mesmo
desfecho), vale registrar em `DECISOES.md`. Se for herança, é candidato a
alinhamento na Fase 15, junto com `ChamadoDetalhes`.

## Uma falha de processo, registrada

A catraca de contraste (`npm run validar:paleta`) **ficou vermelha desde o
commit `87b597f`** e eu só percebi agora, três commits depois.

O par `CategoriasTab bg-perigo repouso` saiu quando o botão "Confirmar" virou
`Button variante="perigo"` no template de listagem — e a catraca falha tanto em
pares NOVOS quanto em pares REMOVIDOS, de propósito, para a linha de base só
poder encolher. Ela estava me avisando de um acerto.

A causa é simples: depois daquele commit eu rodei `typecheck` e `test`, e não
`validar:paleta`. O `npm run build` não a executa.

A linha de base desceu de 12 para 11. Os quatro pares que restam são todos de
`ChamadoDetalhes`, que é a Fase 15.

---

## Adendo do Checkpoint 3 — o que esta ficha não viu

Escrito depois, ao montar as evidências do checkpoint. **Esta ficha estava
incompleta quando foi dada por pronta**, e vale registrar o que ela deixou
passar, porque o motivo é instrutivo.

Ela conferiu os dezoito itens da §29 e todos passaram. E ainda assim **três
controles interativos continuavam escritos à mão** nesta tela, dois deles com
defeito de acessibilidade:

| Onde | O que era | O defeito |
|---|---|---|
| atalhos de período (×4) | `<button>` à mão | o ativo era dito **só pela cor** |
| interruptor de cancelados | `<button>` à mão | rótulo e `title` se contradiziam por largura |
| "Ver detalhes" da tabela | `<button>` com `navigate()` | botão que navega, e dez com o mesmo nome |

Mais o `<label>` "Período", que nomeia um grupo e não tinha como ter `htmlFor`.

### Por que a ficha não pegou

Porque **a §29 pergunta se a FUNÇÃO sobreviveu, não se o controle foi
migrado.** "Filtra" estava marcado, e filtrava mesmo — antes e depois. Os
quatro atalhos funcionavam perfeitamente para quem os vê.

A lista de dezoito itens é uma rede de preservação: ela pega o que a migração
teria QUEBRADO. Não pega o que a migração deixou de FAZER — um controle não
tocado atravessa a ficha inteira sem disparar nada, porque continua fazendo o
que sempre fez.

É a mesma forma do que apareceu na Fase 12: lá o template tinha o conserto e a
cópia não, e cada cópia passava sozinha na conferência. Aqui a tela passava
sozinha na ficha. Nos dois casos o que faltava só aparece **contando**, e não
conferindo.

O que teria pego, das duas vezes: uma contagem do que resta escrito à mão por
arquivo, rodada no fim de cada fase. É de uma linha, e virou item da proposta
do Checkpoint 3.

Corrigido em `fab2b8e`.
