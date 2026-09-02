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

---

# Segunda varredura: texto COLORIDO sobre fundo colorido

02/09/2026, depois que a sessão do HelpHS perguntou se eu cobria este caso. Eu
não cobria — só procurava `text-white`.

## O que ela achou, e o que corrigi

Dez pares abaixo de 4,5:1. Dois eram de casca ou primitivo e saíram agora:

**`Topbar.tsx` — o item "Sair" do menu do usuário.** Era `text-perigo`, o degrau
500 cru, e reprovava nas **quatro** combinações:

| texto | sobre `--surface` | sobre `--surface-elevated` |
|---|---|---|
| `text-perigo` (antes) | 3,76 · 4,25 | 3,44 · 3,60 |
| `--on-tint-danger` (agora) | 6,47 · 5,78 | 5,91 · 4,90 |

*(claro · escuro)*

**`perigo-forte` seria o palpite óbvio e é o errado:** 6,47 no claro e **2,47 no
escuro**, porque é degrau fixo. Quem resolve é o token que inverte por tema —
700 no claro, 400 no escuro. É a mesma lição do D5-a, num terceiro lugar.

**`ui/Avatar.tsx` — o avatar sem cor derivada.** Era `text-conteudo-tenue`
(`--text-muted`) sobre `--surface-elevated`: 4,34:1. É **exatamente** o número
que a emenda E2 corrigiu no `--on-tint-neutral`, no mesmo par de superfície e
texto. O avatar tinha ficado para trás por usar o token de texto direto em vez
do par `on-tint`. Agora 6,92:1.

## Os sete que restam

Todos `--text-muted` sobre `--surface-elevated`, 4,34:1 no tema claro, todos em
código de página:

```
components/Avaliacao.tsx:113, :145
components/cadastros/CategoriasTab.tsx:282
components/cadastros/SetoresTab.tsx:293
components/cadastros/UsuariosTab.tsx:213, :377
pages/Auditoria.tsx:345
```

São chips de contagem — "3 avaliações", "12 usuários". O conserto é o mesmo do
avatar: `--on-tint-neutral` no lugar de `--text-muted`, porque o fundo já é
`--tint-neutral` com outro nome.

## Isto expõe um furo na tabela do D4-a

O D4-a publica **4,76:1** para `--conteudo-tenue`. Esse número é contra
`--surface` (branco). Contra `--surface-elevated` (slate-100) o mesmo token dá
**4,34:1** e reprova.

Não é erro de conta: é a tabela ter medido **uma** superfície onde existem três.
É a mesma falha que a E2 encontrou no `--on-tint-warning` — que o D4-a tinha
registrado como "caso de fronteira, 0,02 abaixo do piso" medindo só sobre
branco, quando reprovava nas três.

**Regra que sai daí, e que vale para os dois repositórios:** contraste de token
de texto se mede contra **todas** as superfícies onde ele pode assentar —
`--surface`, `--bg-base` e `--surface-elevated` —, não contra a mais clara.

E alcança o pacote: a sessão do HelpHS achou o mesmo par `--text-muted` +
`--surface-elevated` dentro do **`Button.jsx` do pacote**, na variante `ghost`.
São três usos do mesmo par ruim no pacote — ghost do Button, sexto par do
Avatar, e o `muted` do Badge — e a E2 corrigiu o token sem varrer quem o usa.

*(O `fantasma` daqui escapou por acaso: usa `--text-body`, não `--text-muted`.
Alinhar ao pacote pela §2.1 introduziria o defeito.)*

## O que esta varredura NÃO vê

**Fundo declarado no ancestral.** Ela pareia fundo e texto no MESMO elemento. O
"Sair" ilustra: em repouso o fundo vem do painel do menu, num elemento acima, e
por isso os 3,76:1 de repouso não apareceram — só o hover, que declara o próprio
fundo. Foi assim também que o caso dos selos no `<aside>` do `ChamadoModal`
precisou ser achado a olho.

Quem quiser fechar esse buraco precisa resolver a árvore, não a lista de
classes. Enquanto isso: **varredura acha o que está no mesmo elemento; o resto
continua sendo trabalho de ler o JSX.**
