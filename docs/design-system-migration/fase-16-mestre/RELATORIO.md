# Fase 16 (mestre) — relatório de fechamento

**09/09/2026.** Demais páginas. Aberta depois da Fase 17, na ordem aprovada, com
`main` conferida antes — `165d9198…`, local **e** remoto.

---

## O que a fase entrega

**Quatro cartões passaram ao primitivo `Card`**, cada um com o respiro escolhido
pela função e o motivo escrito no próprio arquivo:

| tela | era | virou | por quê |
|---|---|---|---|
| `NotFound` | `px-8 py-10` | **`lg`** | cartão de página inteira; o enquadramento vem do layout |
| `Bloqueio` | `px-8 py-10` | **`lg`** | idem, e o `relative` saiu — o `Card` já o traz |
| `NovoChamado:32` | `p-5` | **`lg`** | formulário de página inteira, um por tela |
| `TarefasRecorrentes:479` | `p-5` | **`md`** | muitos numa grade de duas colunas; 24px por cartão só alongariam a lista |

**Não se uniformizou.** Cartão de conteúdo denso e cartão de página inteira não
pedem o mesmo respiro.

**As seis fichas da §29 estão escritas**, lidas no código e não na tela.

---

## O que a fase decidiu não fazer, e por quê

**Dez dos dezessete blocos não viraram `Card`.** A varredura por
`border border-borda bg-superficie` acha o que *parece*; a migração precisa do
que *é*. Campo de data, pastilha, bloco de texto, esqueleto e estado vazio têm as
mesmas classes porque **borda de 1px sobre superfície é o vocabulário comum de
tudo que se destaca do fundo** — não a assinatura de um componente.

E três blocos que eu classificara como cartão **saíram pelo critério do
operador** — *cartão contém conteúdo de um item; barra organiza a página*:

- `NovoChamado:18` — cabeçalho com "Voltar", título e subtítulo;
- `Auditoria:174` — a grade de filtros;
- `Auditoria:259` — contêiner de rolagem, e **o `padding: none` confirma o
  diagnóstico**: cartão sem respiro nenhum não é cartão.

> Converter os dez teria produzido um diff grande, verde no `tsc`, limpo no
> validador — e teria **piorado** o código.

---

## O que a fase encontrou

### Um defeito vivo, consertado em commit próprio

```
titulo="Histórico — {selecionada.titulo}"
```

Entre aspas. Em JSX, atributo com string literal **não interpola** — o modal de
histórico mostrava as chaves e o nome da variável ao pé da letra, em produção.

**Nenhum instrumento pegaria**, e por três motivos somados: `tsc` fica verde
porque é uma `string` válida para uma prop `string`; o validador não olha texto
de interface; e o modal precisa ser **aberto**, numa tela que só Administrador e
Técnico alcançam.

Varri o padrão no repositório — os outros dois casamentos são **falsos
positivos**, dentro de crases, onde `${}` interpola de verdade. Ocorrência única:
conserto, não catraca.

### Uma exceção oficial que nunca existiu

A tabela do D2-a prometia que a **malha e a vinheta do login** voltariam *"junto
com a reescrita de `pages/Login.tsx`"*. A reescrita aconteceu; elas não voltaram.
E o próprio `Login.tsx` explica por quê, em comentário: as quatro camadas eram de
outra família, e o painel à esquerda com formulário à direita é o que faz as duas
telas parecerem do mesmo produto.

**Decisão do operador: revogada.** A lista da §33 passa de cinco exceções para
**quatro** — e diz a diferença entre *"caída por engano"* e *"revogada por
decisão"*, porque uma lista que não distingue as duas deixa o próximo leitor sem
saber se pode reabrir.

> **Registro que não acompanha a decisão vira dívida que se cobra sozinha
> depois.** A linha por pouco não virou trabalho de Fase 16 para restaurar algo
> que se decidiu remover.

### Dezesseis funcionalidades que a varredura tinha perdido

Refazer as fichas lendo os arquivos inteiros levou `Auditoria` de 12 para 24
itens e `Login` de 7 para 20. Nenhuma é defeito — são **comportamentos corretos
que nenhuma captura mostraria**:

- **a guarda de cancelamento da `Auditoria`** — sem ela a resposta mais lenta
  chega por último e sobrescreve a mais nova, numa tela cuja função é ser
  confiável sobre o passado;
- **`alvoEfetivo`** — o técnico consulta sempre `'setor'`, nunca `''`. Não é tela
  escondida: é **pergunta diferente feita à API**;
- **os três vazios**, e não dois — com exatamente 50 eventos a página 2 volta
  vazia, e a versão antiga declarava que a trilha nunca registrara nada logo
  depois de a pessoa ter lido 50 linhas. **Já corrigido no código**; a ficha
  registra por que existem três estados.

---

## Os erros desta fase

**Três fichas minhas nasceram erradas**, e a terceira é de outra espécie:

| ficha | erro | sobre o quê |
|---|---|---|
| `NotFound` | listou um `<Helmet>` inexistente | o conteúdo de um arquivo |
| `Bloqueio` | listou três itens; faltavam quatro | o conteúdo de um arquivo |
| **`Login` / §33** | afirmou uma exceção que o código não cumpre | **a relação entre o documento e o código** |

Os dois primeiros erraram sobre o conteúdo de um arquivo. O terceiro errou sobre
**o que a lista existe para garantir**.

E o mecanismo foi o mesmo nos três: escrevi *"lendo o código"* e escrevi parte de
memória — no terceiro, copiando a linha do prompt mestre sem conferir se o código
a cumpria. **A afirmação veio de onde era cômodo, e não de onde era
verificável**, com o código a um `grep` de distância.

Ficha que lista o que não existe é **conferência sem conferir**: dá a sensação de
cobertura sem a cobertura, e por isso é pior que ficha curta.

---

## Estado ao fechar

- **639 casos, 60 arquivos.** `tsc` e `validar-paleta` limpos.
- **Quatro cartões** no primitivo; dez blocos classificados e deixados como
  estão; três reclassificados como barra.
- **Seis fichas da §29** escritas, as quatro maiores refeitas por leitura
  integral.
- Lista de exceções da §33 com **quatro** entradas, e a revogação registrada.

### Pendências que a fase deixa

1. **As pastilhas do `statusData`** — `bg-perigo/15` e `bg-alerta/15` montados à
   mão que, pela função, são `Badge`. É o **sexto lado** do nó de de-onde-vem-a-
   cor-de-um-status.
2. **A falha silenciosa ao carregar usuários** em `TarefasRecorrentes` —
   `.catch(() => setUsuarios([]))` deixa a tela sem nomes e sem dizer por quê.
   **Defeito de produto**, registrado no nó.
3. **`EstadosDaTrilha` é compartilhado** entre `Auditoria` e o
   `HistoricoDaConta`, que é tela da Fase 15. Nada foi alterado nele, e a
   dependência fica escrita.

### O que fica para a Fase 18

Nada desta fase. A ordem aprovada segue: **18 — acessibilidade**, dois itens
concretos; depois **19**, com a linha de base recuperada da worktree em `main`;
depois **20**.
