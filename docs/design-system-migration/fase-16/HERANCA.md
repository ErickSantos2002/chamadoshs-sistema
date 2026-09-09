# O que a Fase 16 herda

Escrito no fecho do **Checkpoint 3**, aprovado em 08/09/2026. É o maior bloco que
resta antes do Checkpoint 4.

## 1. A dívida da cor cheia usada como TEXTO

**Item (3) das pendências do Checkpoint 3.** A medição está em
`../checkpoint-3/cor-cheia-como-texto.md`; aqui fica o estado e a ordem.

As quatro cores de significado são **fixas nos dois temas** — declaradas só em
`:root`, sem bloco `.dark` que as redefina. É deliberado ("erro é vermelho nos
dois"), e a consequência é que um valor bom no escuro pode ser péssimo no claro:

```
                claro (base/surface/elevada)     escuro
perigo  #EF4444   3,60  3,76  3,44               4,62  4,25  3,60
alerta  #F59E0B   2,05  2,15  1,96               8,10  7,44  6,31
sucesso #10B981   2,42  2,54  2,32               6,86  6,30  5,34
info    #3B82F6   3,52  3,68  3,36               4,73  4,35  3,69
```

**Estado hoje: 13 ocorrências em 7 arquivos**, das quais **9 reprovam** o piso
que lhes cabe. A tabela por arquivo está no documento do Checkpoint 3 — com uma
correção: os números de linha do `SlaProgresso` deslocaram (40 → 52, 106 → 118),
porque o commit de higiene inseriu comentário acima.

**A ordem, decidida pelo operador:**

1. **chave nova na catraca primeiro** — a existente cobre o caso inverso, fundo
   de cor cheia com texto branco, e não vê `text-perigo` sobre fundo neutro;
2. **os erros de formulário antes** dos outros arquivos;
3. depois os seis arquivos restantes.

**A regra:** *cor semântica como texto usa `--on-tint-*`.*

E a lição que a catraca deve carregar: escrevê-la **antes** do conserto, e
vê-la **acusar** os nove antes de eles serem corrigidos. Foi assim com a catraca
do rótulo que some, e é o que separa uma catraca provada de uma escrita depois
do fato.

## 2. Os `--chart-*`: declarados, e ainda NÃO consumidos

E16, E16-b e E18 estão na cópia do pacote. **Nada aqui os lê** —
`src/lib/graficos.ts` continua sendo a fonte dos gráficos. A adoção é da Fase 16.

O que a adoção herda junto:

- **`--chart-7` existe** (`#7d7dcd` no claro, `#91cd82` no escuro), e a E18
  verificada aqui: pior par **21,9** contra `--chart-1` em protanopia no claro e
  **24,6** contra `--chart-2` em deuteranopia no escuro.
- **A tabela status → slot**, na ordem do ciclo de vida, e a **legenda
  obrigatória** em gráfico de status.
- **A regra anterior está REVOGADA** — "gráfico de status usa as cores da §16"
  não vale mais.
- **Não há folga para uma oitava série.** De 140.608 candidatos, nove ficam
  dentro da faixa de luminância *e* de croma das seis. **Mudar qualquer uma das
  seis obriga a refazer a busca.**

E a verificação de inexistência, feita aqui e registrada no `VERSION.md`:
restrita às rampas semânticas, a capacidade do claro é **exatamente cinco**. A
tentativa de refutar achou sete — usando `slate-900`, de L\* 7,96, que passa a
régua numérica e não lê como série. A armadilha é conhecida e está documentada.

## 3. Os `--fill-*`: consumidos, com uma lacuna aberta

Quatro sítios já apontam para eles — `SlaProgresso`, `KanbanColumn`, `SlaTab` e
`Login`. **Isso está feito**, no commit de higiene.

**A lacuna:** nada impede que um `bg-sucesso` de força cheia volte a aparecer. A
catraca existente cobre *fundo cheio com texto branco*, e a nova cobrirá *cor
cheia como texto*. **Preenchimento sem texto por cima não é coberto por
nenhuma.** É chave de catraca a escrever, e a medição já existe: `--sucesso` dá
2,32 e `--alerta` dá 1,96 no pior caso do claro.

## 4. A moldura do gráfico, e a paleta medida contra UMA superfície

**Quinta ocorrência da família registrada no `DECISOES.md`**, e entra na Fase 16
porque é a guarda do que a fase vai adotar.

O `validar-paleta.js` lê o `src/lib/graficos.ts` e valida **três arrays
nomeados** — `CATEGORICA_*`, `STATUS_*`, `PRIORIDADE_*` — contra
**`--superficie`**, uma das três superfícies.

**Duas coisas diferentes, e a distinção decide o que fazer com cada uma:**

- **Escopo declarado.** A superfície única tem motivo escrito no código:
  *"Gráficos contra a superfície do card, que é onde eles são desenhados."* É
  defensável enquanto for verdade, e vira defeito silencioso no dia em que um
  gráfico for desenhado sobre outra superfície. **Medir contra as três** tira a
  dependência dessa premissa.
- **Ausência.** A **moldura** do gráfico — cor do rótulo das marcas, do eixo, da
  grade, e o fundo e a borda da dica — não tem piso, nem medição, nem menção.
  Foi por esse buraco que o eixo reprovando em quatro superfícies atravessou os
  **dois** repositórios sem aparecer em catraca nenhuma.

**Hoje não há defeito vivo aqui, e isso é sorte e não cobertura.** Medidos à mão
durante o Checkpoint 3: o rótulo das marcas dá 13,35 no claro e 10,99 no escuro
contra o piso de texto de 4,5:1; o `estilo.eixo` foi removido por ser código
morto; e a grade dá 1,13 e 1,18, abaixo de 3:1, mas é **higiene** pela regra do
portador redundante — linha de grade não carrega informação.

E há o argumento que ordena a prioridade, do `DECISOES.md`:

> **O rigor gasto no dia da decisão não se transfere sozinho para a guarda.** A
> E16-b foi aprovada com **36 células contra três superfícies, pior 3,22**. A
> catraca que a vigia mede **uma** superfície, e o menor número que ela imprime é
> **3,66** — o 3,22 nem aparece, porque a superfície onde ele acontece não é
> medida.

Uma regressão que a aprovação teria pego passa pela catraca. **A decisão se prova
uma vez; a guarda vale todo dia.**

## 5. O que fica registrado para depois, fora da Fase 16

| item | onde está escrito |
|---|---|
| valor velho do `getComputedStyle` — **não reproduzido**, investigação aberta | `../checkpoint-3/protocolo-de-captura.md` |
| painéis abaixo da dobra: gráficos do painel, e Comentários/Histórico do detalhe | `../checkpoint-3/fichas-das-capturas.md` |
| estado de erro do formulário, cortado por prazo | `../checkpoint-3/protocolo-de-captura.md` |
| voltar o Vite para a **5191** quando existir API local, ou se a 5191 entrar no `ALLOWED_ORIGINS` | `vite.config.ts` |
| aproximar os dois conjuntos de ícones — **produto**, não recópia | este documento |

## 6. O que a Fase 16 NÃO herda, e é bom dizer

- **A migração das telas está fechada.** As cinco fases entregaram, e as fichas
  da §29 estão preenchidas.
- **As dezesseis capturas existem**, com régua e cor conferidas, e as fichas
  dentro do repositório.
- **A E19 está aplicada**, não pendente.
- **Os três botões sem nome acessível estão corrigidos**, com catraca própria.
