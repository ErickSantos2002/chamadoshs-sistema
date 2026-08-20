# Coluna e estado "Arquivado" no quadro de chamados

Data: 2026-08-20 · Versão de destino: 1.6.15

## O problema

Arquivar um chamado hoje só liga a marca `arquivado` — o status dele continua
sendo o que era, quase sempre "Aberto". Duas consequências, e a segunda é a que
dói:

1. O chamado arquivado ainda "é" um chamado aberto do ponto de vista do status.
2. Ele desaparece do quadro. `ChamadosContext.carregarChamados` monta os
   parâmetros sem `incluir_arquivados`, e a API omite os arquivados por padrão.
   Não há nenhum controle na tela para trazê-los de volta.

Ou seja: o chamado sai de vista sem sair do estado de aberto, e não existe
caminho na interface para reencontrá-lo.

## O que NÃO vai ser feito

Não vamos criar um status "Arquivado" no enum do banco. Isso exigiria mexer na
API (repositório separado), escrever migration para converter os já arquivados,
e coordenar a ordem de deploy API→front. A marca `arquivado` já existe, já tem
endpoints (`PATCH /chamados/{id}/arquivar` e `/desarquivar`) e já tem parâmetro
de consulta (`incluir_arquivados`). O que falta é o front tratá-la como um
estado visível — e isso é entrega só de front, sem migration.

## O desenho

### Carregamento

`ChamadosContext.carregarChamados` passa a enviar `incluir_arquivados: true`.

Isso é seguro porque `src/pages/Chamados.tsx` é o único consumidor da lista
`chamados` do contexto. Dashboard e TarefasRecorrentes só leem `categorias` de
lá, e o Dashboard já carrega a própria lista com `incluir_arquivados: true`.
Nenhuma outra tela muda de comportamento.

Alternativa descartada: recarregar da API quando o interruptor liga. Custaria
uma espera de rede a cada clique, numa lista que `listarTodos` já pagina até o
fim. Carregar uma vez e separar no front é mais barato e é instantâneo.

### Agrupamento — nova função pura

A regra de agrupamento sai do `useMemo` de `Chamados.tsx` e vira função pura em
`src/lib/quadro.ts`:

```
type ColunaDoQuadro = 'Aberto' | 'Em Andamento' | 'Aguardando' | 'Resolvido' | 'arquivado'

agruparPorColuna(chamados) -> Record<ColunaDoQuadro, Chamado[]>
```

São cinco baldes, não seis. O balde `Fechado` que existe hoje no `useMemo`
("mantido para compatibilidade, mas não será exibido") sai: como todo chamado
Fechado já é redirecionado para Resolvido na própria função, aquele balde nasce
sempre vazio e nunca é lido por ninguém.

A ordem das checagens é a correção em si:

```
se chamado.arquivado   -> coluna "arquivado"    <- ANTES de olhar o status
senão se status FECHADO -> coluna Resolvido
senão                   -> coluna do status
```

Se a checagem de `arquivado` não vier primeiro, o arquivado volta a cair em
Aberto — que é o bug que esta entrega existe para consertar.

Cada coluna continua ordenada por `id` decrescente, como hoje.

O motivo de extrair: dentro do `useMemo` essa ordem não é alcançável por
teste, e é exatamente o tipo de regra que alguém inverte sem perceber.

### O interruptor

Botão "Mostrar arquivados" no cabeçalho de `Chamados.tsx`, ao lado dos filtros
de prioridade e categoria. Estado local (`useState`), desligado por padrão, sem
persistência — a cada visita o quadro volta limpo.

- Desligado: 4 colunas, exatamente como hoje (`xl:grid-cols-4`).
- Ligado: 5 colunas (`xl:grid-cols-5`), a quinta sendo "Arquivado".

Visível para todos os perfis. O usuário comum só encontra os próprios chamados
arquivados, porque o quadro dele já vem recortado por `solicitante_id`.
Arquivar e desarquivar continuam sendo ação de técnico e administrador — isto
aqui é só visibilidade.

O interruptor NÃO entra em `temFiltro` nem é zerado por "Limpar filtros". Não é
um recorte da lista, é uma coluna a mais; limpar filtro não deveria fechar a
coluna que a pessoa acabou de abrir.

### O escopo do quadro, e a contagem do cabeçalho

Consequência de carregar os arquivados sempre: `chamados.length` passa a
incluí-los, e o cabeçalho diz "N chamados" com esse número. Com o interruptor
desligado, isso seria mentira — contaria cards que não estão na tela.

Então o interruptor define um ESCOPO, aplicado antes dos filtros:

```
chamadosNoEscopo = mostrarArquivados ? chamados : chamados sem os arquivados
chamadosFiltrados = chamadosNoEscopo passados pelos filtros de prioridade,
                    categoria e busca
```

O cabeçalho compara `chamadosFiltrados.length` com `chamadosNoEscopo.length`.
Com o interruptor desligado e nenhum filtro, o texto fica idêntico ao de hoje.

### A coluna "Arquivado"

Reusa `KanbanColumn` sem props novas — só mais uma chamada no JSX:

- `title`: "Arquivado"
- `descricao`: uma linha dizendo que está fora do fluxo, guardado para consulta
- `colorDot`: `corDoStatus('Arquivado', darkMode)`

`corDoStatus` não conhece a chave "Arquivado" e cai no cinza neutro de
fallback. Isso é deliberado, por dois motivos que se somam:

- As quatro cores de `STATUS_CLARO`/`STATUS_ESCURO` passam pela conta de
  ΔE >= 20 entre todos os pares, em quatro tipos de visão, rodada por
  `npm run validar:paleta` no build. Uma quinta cor viva teria que ser
  calculada contra as outras quatro e reprovaria o build até fechar.
- Cinza neutro é o que "fora do fluxo" significa. Arquivado não é uma etapa do
  atendimento, é a ausência dela.

### O selo no card

`KanbanColumn` passa a exibir `<Badge variante="neutro">Arquivado</Badge>`
quando `chamado.arquivado`, junto dos selos de categoria e prioridade.

Mesma palavra e mesma variante que `ChamadoModal` já usa. O card e a janela de
detalhes não podem dizer coisas diferentes sobre o mesmo chamado.

Na coluna "Arquivado" o selo é redundante com a coluna, e tudo bem: ele existe
para o caso de o card ser encontrado por busca ou filtro, onde a coluna não
está à vista como contexto.

## Teste

Um arquivo novo, `src/lib/quadro.test.ts`, cobrindo `agruparPorColuna`:

- Um chamado com `arquivado: true` e `status: 'Aberto'` cai na coluna
  arquivado, não na Aberto. (É a regressão principal.)
- Um chamado com `arquivado: true` e `status: 'Resolvido'` também cai na
  coluna arquivado — a marca ganha de qualquer status.
- Um chamado com `status: 'Fechado'` e `arquivado: false` continua caindo em
  Resolvido.
- Cada coluna sai ordenada por `id` decrescente.

## Fecho da entrega

- `package.json`: 1.6.14 -> 1.6.15
- `src/data/novidades.ts`: entrada da 1.6.15, tipo `novidade`, escrita no
  vocabulário de quem abre chamado — algo como "o chamado arquivado agora tem
  coluna própria no quadro, em vez de sumir".
- Tudo no mesmo commit.

## Fora de escopo

Levantados e deliberadamente deixados de fora nesta entrega:

- Opção "Arquivados" no seletor de Status do Dashboard.
- Contagem de arquivados ocultos no cabeçalho do quadro.
- Qualquer tratamento equivalente para chamados cancelados.
