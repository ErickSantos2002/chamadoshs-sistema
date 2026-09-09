# Fase 16 (mestre) — demais páginas: o que há antes de mexer

**09/09/2026.** Aberta depois da Fase 17, na ordem aprovada. A ponte do D3-a já é
exceção documentada, então esta fase é o que o levantamento mediu: as telas que
restaram, o `Card` montado à mão, e as fichas da §29.

> **`main` conferida antes de abrir:** `165d9198…`, **local e remoto**. A linha de
> base da Fase 19 continua a um `git worktree` de distância. Conferir os dois
> lados importa — um push de terceiro apareceria só no remoto.

---

## Correção de número: são SEIS telas, não sete

O levantamento contou sete. **`EmConstrucao` foi apagada nesta mesma sessão**
(`75a411c`), por ser página sem rota e sem import. Restam:

| tela | linhas | hex cravado | `dark:` | o que tem de próprio |
|---|---:|---:|---:|---|
| `Login` | 313 | 0 | 0 | exceção §8.1 — malha de 46px e vinheta |
| `Auditoria` | 395 | 0 | 0 | lista com rolagem e paginação |
| `TarefasRecorrentes` | 972 | 0 | 0 | a maior; cartões de tarefa |
| `NotFound` | 23 | 0 | 0 | cartão central |
| `Bloqueio` | 72 | 0 | 0 | cartão central, acesso negado |
| `NovoChamado` | 42 | 0 | 0 | invólucro do `NovoChamadoForm` |

**Os tokens já chegaram a todas**: zero hexadecimal cravado, zero `dark:`
residual. O que sobra não é migração de cor.

---

## Os 17 blocos, classificados — e a maioria NÃO é cartão

A varredura por `border border-borda bg-superficie` deu 17 ocorrências. Convertê-las
em bloco seria erro: **só sete são cartão.**

| # | onde | o que é | vai virar `Card`? |
|---|---|---|---|
| 1 | `NotFound:7` | cartão central | **sim** |
| 2 | `Bloqueio:47` | cartão central | **sim** |
| 3 | `NovoChamado:32` | cartão do formulário | **sim** |
| 4 | `NovoChamado:18` | cabeçalho com "Voltar" | **sim** |
| 5 | `Auditoria:174` | cartão de filtros | **sim** |
| 6 | `Auditoria:259` | cartão da lista, com rolagem própria | **sim** |
| 7 | `TarefasRecorrentes:479` | cartão de tarefa, clicável | **sim** |
| 8 | `Auditoria:150` | barra de cabeçalho (`rounded-2xl`, `px-5 py-4`) | *a decidir* |
| 9 | `TarefasRecorrentes:431` | barra de cabeçalho, idem | *a decidir* |
| 10 | `Auditoria:369` | barra de paginação | *a decidir* |
| 11 | `Auditoria:231` | **`<input>` de data** | não — é campo |
| 12 | `Auditoria:243` | **`<input>` de data** | não — é campo |
| 13 | `Auditoria:200` | **pastilha** de contagem, `superficie-elevada` | não |
| 14 | `TarefasRecorrentes:961` | **bloco de texto** pré-formatado, `superficie-elevada` | não |
| 15 | `TarefasRecorrentes:465` | **esqueleto** de carregamento | não |
| 16 | `TarefasRecorrentes:416` | **estado vazio** | não |
| 17 | `TarefasRecorrentes:468` | **estado vazio** | não |

`Login` não aparece: ele tem a exceção §8.1 e nenhum bloco desse tipo.

---

## A deriva, medida — e é o motivo de a fase existir

A escala de padding do `Card` é fixa:

```
none p-0    sm p-3    md p-4    lg p-6
```

Os sete cartões à mão usam:

| onde | padding | está na escala? |
|---|---|---|
| `NotFound`, `Bloqueio` | `px-8 py-10` | **não** — 32/40px, e assimétrico |
| `NovoChamado:32`, `Auditoria:174`, `TarefasRecorrentes:479` | `p-5` | **não** — 20px |
| `NovoChamado:18` | `px-5 py-4` | **não** |
| `Auditoria:259` | sem padding | `none` ✓ |

**Seis dos sete usam um respiro que o primitivo não sabe produzir.**

Isto não é "a mesma coisa escrita duas vezes". É o mesmo defeito que a
`paletaCategorica` e a moldura da E14, um nível acima: **um cartão montado à mão
é uma cópia das decisões do primitivo, e ela derivou.** Ninguém veria, porque
cada tela sozinha parece certa — a divergência só existe na comparação, e não
havia comparação.

### E ela carrega uma decisão que não é minha

`p-5` são 20px. Está na grade de 4px, então **não é erro de grade** — é um degrau
que o primitivo não tem. Duas leituras, e as duas se sustentam:

**(a) Os cartões descem para a escala.** `p-5` → `md` (16px) ou `lg` (24px). É
mudança visual em seis lugares, e o primitivo passa a ser a única fonte.

**(b) A escala ganha o degrau.** O `Card` do pacote define quatro; acrescentar um
quinto é emenda de primitivo local, e a §2.1 diz que a implementação do pacote
vence.

E `px-8 py-10` dos dois cartões centrais é outro caso: **assimétrico e fora de
qualquer degrau**, e ele existe porque é um cartão de página inteira, não de
conteúdo. Pode ser que o certo ali seja `lg` com o espaço vindo do layout.

**Não decido isto.** É a mesma regra que a tabela de cores da E18 estabeleceu:
**mostrar antes de virar código**, quando a mudança carrega mais do que parece.

---

## As fichas da §29

Nenhuma das seis tem ficha de preservação funcional. A §29 pede que as
funcionalidades sejam listadas **lendo o código, não a tela**, antes de alterar —
e conferidas uma a uma depois.

É o grosso do trabalho da fase, e vem **antes** de qualquer conversão: sem a
ficha, não há contra o que conferir.

---

## O que a fase NÃO faz

- **Não mexe nos 52 alvos de toque.** Ficam para depois da linha de base da Fase
  19, na ordem já dada.
- **Não toca na ponte.** Exceção documentada desde 09/09/2026.
- **Não converte os itens 11 a 17.** Campo, pastilha, esqueleto e estado vazio
  não são cartão, e forçá-los ao primitivo trocaria um acerto por uma
  arrumação.
