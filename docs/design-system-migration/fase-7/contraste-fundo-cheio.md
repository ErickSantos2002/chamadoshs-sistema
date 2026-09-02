# Fundo de cor cheia com texto branco cravado — varredura de 02/09/2026

Lista de trabalho para as Fases 11–16, e evidência para o Checkpoint 2.

Consertar um primitivo não alcança quem não o usa. A Fase 7 corrigiu as
variantes `sucesso` e `perigo` do `Button` e o texto do `primario`; este
documento é o que **continua errado fora dele**.

## Como foi medido

WCAG 2.x, lendo os valores resolvidos de `src/styles/index.css` e
`src/design-system/tokens/colors.css` — nenhum valor digitado de cabeça.

O script varre `src/` inteiro (menos a cópia do pacote), lê cada literal de
lista de classes **inclusive quando quebra em várias linhas**, e pareia fundo e
cor de texto **pelo mesmo estado**.

Três armadilhas que a primeira versão desta varredura caiu, e que valem para
quem repetir o exercício:

1. **Filtrar diretório.** A primeira busca excluía `components/ui/`, e por isso
   contou 6 casos. O pior de todos estava em `components/layout/`.
2. **Casar linha a linha.** `className` quebra em várias linhas o tempo todo, e
   `bg-perigo` numa linha com `text-white` na seguinte não casa.
3. **Ignorar o estado.** `hover:bg-perigo-forte` casado com um `text-white` de
   repouso troca a cor do hover (6,47:1) pela cor em repouso (3,76:1) e
   **transforma reprovação em aprovação**. Fundo e texto precisam ser do mesmo
   estado.

Com os três consertos, 6 viraram 19 elementos, 13 deles reprovando.

## O que reprova

| Fundo | Claro | Escuro | |
|---|---:|---:|---|
| `bg-sucesso` | 2,54:1 | 2,54:1 | reprova até o piso de forma |
| `bg-info` | 3,68:1 | 3,68:1 | reprova para texto |
| `bg-perigo` | 3,76:1 | 3,76:1 | reprova para texto |
| `bg-sinal` | 5,29:1 ✅ | **2,69:1** | só no escuro, onde a rampa inverte |

E o que passa, para não se mexer no que está certo: `bg-sucesso-forte` 5,48:1,
`bg-alerta-forte` 5,02:1, `bg-perigo-forte` 6,47:1, `bg-info-forte` 6,70:1.

Note o padrão: **o degrau 500 nunca serve para carregar texto, e o 700 serve.**
É exatamente o que a emenda E2 do pacote reconheceu ao criar `--action-danger`
e `--action-success` — e é a mesma razão pela qual `--action` sempre existiu
separado de `--color-primary-500`.

## Onde

Doze elementos, todos em código de página, que a §25 põe nas Fases 11–16:

```
bg-sucesso   (2,54:1)   pages/ChamadoDetalhes.tsx:762, :1285
bg-info      (3,68:1)   pages/ChamadoDetalhes.tsx:445, :472, :1136
bg-perigo    (3,76:1)   pages/ChamadoDetalhes.tsx:726, :1356, :1432
                        components/cadastros/CategoriasTab.tsx:324
bg-sinal     (2,69:1    pages/ChamadoDetalhes.tsx:418, :461, :616
              no escuro)
```

Nove dos doze estão em `ChamadoDetalhes.tsx` — a tela de detalhe do chamado,
que é onde as ações do sistema acontecem.

## O décimo terceiro, que foi consertado agora

`components/layout/AppLayout.tsx:105` — o link **"Pular para o conteúdo
principal"**, com `focus:bg-sinal focus:text-white`: **2,69:1 no tema escuro**.

Não ficou para as Fases 11–16 por três motivos que se somam:

- é **casca**, não página, e casca é escopo das Fases 4–6;
- é o **primeiro foco de toda página** do sistema;
- existe **exclusivamente** para quem navega por teclado — ou seja, a única
  pessoa que chega a vê-lo era justamente a que não conseguia lê-lo.

Corrigido para `--text-on-primary`: 5,29:1 no claro, 5,11:1 no escuro.

## Por que o Checkpoint 1 não pegou

A conferência da §26 mediu os **tokens** — `--action` contra as superfícies — e
deu a casca por conforme. Mas as telas não escrevem tokens: escrevem classes
por cima deles, e `text-white` não é token nenhum.

Medir o token prova que a paleta é sólida. Não prova que as telas a usam.

A sessão do HelpHS chegou ao mesmo tipo de lacuna por outro caminho — lá o
`ui/Pagination.tsx` pinta a página ativa com `bg-primary text-white`, 3,83:1,
e é primitivo, não página. Vale a regra dos dois lados: **varredura de
contraste tem de partir do que está escrito no JSX, não do que está declarado
no `colors.css`.**

## O que fazer com esta lista

Não migrar por componente. A §25 é explícita: nas Fases 11–16 migra-se **por
tela**, e `ChamadoDetalhes.tsx` concentra nove dos doze — é uma tela só,
resolvida de uma vez, na fase dela.

O conserto de cada um é o mesmo que a Fase 7 já fez no `Button`: trocar o
degrau 500 pelo degrau de ação da E2, ou simplesmente **usar o `Button`**, que
é o que a maioria deveria estar fazendo.
