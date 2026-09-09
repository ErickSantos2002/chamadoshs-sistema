# O que resta — levantamento das Fases 16, 17–20 e Checkpoint 4

**09/09/2026.** Escrito a pedido do operador *antes* de abrir a Fase 17: ver o
tamanho real primeiro, com a suspeita declarada de que parte já estivesse pronta.

Parte está. E uma parte que eu tinha dado por pequena **não é**.

---

## Nomenclatura, fixada

| nome | o que é |
|---|---|
| **Fase 16-H** | a *herança do Checkpoint 3* — catracas, cor cheia como texto, `--chart-*`, preenchimento nu, moldura. **Fechada em 09/09/2026.** |
| **Fase 16** | a do PROMPT-MESTRE, §25 — "demais páginas". **Continua devendo.** |

As duas se chamavam "Fase 16". O mestre **não** foi renumerado: quebraria as
referências já escritas em relatórios e fichas.

---

## A correção que este levantamento sofreu no meio

Na primeira leitura eu classifiquei a Fase 16 do mestre como **pequena** — sete
telas já tokenizadas, faltando só o primitivo `Card` e as fichas da §29.

**Estava errado, e o erro estava em ler a lista de telas e não a §25 inteira.**
A frase que fecha o desvio D3-a, no relatório da Fase 0:

> *"Migrar as classes tela a tela nas Fases 11–16 e **remover a ponte no fim**"*

E no `DECISOES.md`:

| Formato | Onde | Até quando |
|---|---|---|
| `rgb(var(--x) / <alpha-value>)` | as 22 da ponte em português | **até a Fase 16** |

O validador diz o mesmo de si próprio: *"É o desvio D3-a, aprovado e
**temporário**"*.

**A migração de vocabulário que a ponte pressupõe nunca aconteceu.** Medido
hoje:

```
  usos das 22 classes em português: 1017
  arquivos afetados:                  62
```

Mil e dezessete usos de `bg-superficie`, `text-conteudo`, `border-borda` e
companhia. A ponte tem data de validade escrita e continua de pé, com as 32
linhas conferidas pela catraca.

**Então a Fase 16 do mestre não é pequena: é o maior item que resta.** E ela
carrega uma decisão que não é minha:

> Ou o vocabulário migra para os nomes do pacote e a ponte sai — 1017
> substituições em 62 arquivos —, **ou** o operador decide que os nomes em
> português são permanentes, e a ponte deixa de ser desvio temporário para virar
> exceção documentada, como o canto reto e os `Colchetes`.

As duas são defensáveis. O que não é defensável é a ponte continuar *"aprovada e
temporária"* indefinidamente, porque temporário sem data é permanente sem
registro.

### Decidido no mesmo dia: **a ponte fica**

**O operador decidiu de imediato, para não travar a Fase 16.** A ponte deixa de
ser desvio temporário e passa a **exceção documentada**, ao lado do canto reto e
dos `Colchetes`. Três motivos, registrados no `DECISOES.md`, na §25 do
PROMPT-MESTRE e no `VERSION.md`:

1. os nomes em português são **vocabulário do produto**, e não atalho — mesmo
   argumento que fez `navLabel` ser prop na E13;
2. 1017 usos em 62 arquivos é refatoração maior que toda a migração feita até
   aqui, com **ganho nulo para quem usa**;
3. a ponte **deixou de ser ponto fraco** — a catraca de 32 pares fez dela uma
   das partes mais guardadas do repositório.

**Com isso a Fase 16 volta ao tamanho que eu tinha medido**: sete telas, o `Card`
montado à mão e as fichas da §29. O parágrafo acima fica como registro de que ela
esteve, por algumas horas, medindo o dobro da migração inteira.

---

## O tamanho, bloco a bloco

### Fase 16 (mestre) — demais páginas

As rotas são doze. Descontando o que passou pelas Fases 11–15, sobram **sete
telas**: `Login` (313 linhas), `Auditoria` (395), `TarefasRecorrentes` (972),
`NotFound` (23), `Bloqueio` (72), `NovoChamado` (42) — e `EmConstrucao`, que foi
apagada (ver abaixo). *Relatórios, agenda, KB, perfil e configurações não
existem neste produto.*

| medida | resultado |
|---|---|
| hexadecimal cravado nas sete | **0** |
| `dark:` residual | **0** |
| usam o primitivo `Card` | **nenhuma** — todas montam à mão |
| fichas da §29 | **nenhuma** |
| ~~remoção da ponte D3-a~~ | **fora de escopo** — a ponte virou exceção documentada em 09/09/2026 |

### Fase 17 — responsividade

Feito: **2 das 6 larguras** (1366×768 e 390×844), em 4 telas e 2 temas, pelas
dezesseis capturas do Checkpoint 3. Faltam 360×740, 768×1024, 1920×1080 e
2560×1440.

O que importa não é a contagem de larguras. A §20 diz:

> Não considere responsivo só porque não há scrollbar horizontal: tela cortada,
> botão inalcançável, texto sobreposto e toque menor que 40px contam como falha.

**Nada mede isso hoje**, e foto não mede alvo de toque de 38px. **Decisão do
operador: inverter** — sonda dos quatro critérios nas seis larguras primeiro; as
capturas ficam só para o que a sonda não alcança, e a lista delas é apresentada
antes de qualquer foto.

### Fase 18 — acessibilidade

Quase toda gasta, porque boa parte das Fases 11–16-H foi acessibilidade com
outro nome.

| item | ocorrências |
|---|---|
| `aria-hidden` | 112 |
| `aria-label` | 118 |
| `focus-visible` | 57 |
| `htmlFor` | 46 |
| `sr-only` | 33 |
| `role="status"` | 13 |

Dois vãos que eu ia relatar e **não são** — conferidos antes de virar achado:

- `aria-current="page"` não aparece no código, mas a Sidebar usa `NavLink`, e a
  fonte do `react-router-dom` 6.30 traz `"aria-current": ariaCurrentProp = "page"`
  aplicado quando ativo. **Já satisfeito.**
- `aria-live` é zero, mas `role="status"` implica `aria-live="polite"`. **Já
  satisfeito.**

Sobra concreto: **percorrer o tab order de ponta a ponta**, que nunca foi feito,
e conferir a cobertura de `prefers-reduced-motion` (3 ocorrências, 2 arquivos).

### Fase 19 — regressão visual e testes

Testes: 639 casos, 60 arquivos, `tsc` e `validar:paleta` limpos. Falta rodar
`build` e colar a saída. **Não existe script de `lint` e não existe Playwright** —
a §27 diz que script fora do `package.json` não existe, então isso se registra
como ausência, não como pendência.

O problema real é a §28, e está registrado como risco datado no `DECISOES.md`:
**o "antes" da Fase 0 nunca foi tirado.** Recuperável enquanto `main` estiver
parada em `165d919` — conferido hoje. Ver a seção de riscos.

### Fase 20 — documentação

`src/design-system/VERSION.md` existe. **A cópia local do `adocao.md` não
existe**, e a §25 a pede. O `VERSION.md` precisa da lista de exceções do
ChamadosHS com o *"nada além delas"* que a §33 exige. **Feito em 09/09/2026**,
junto com a decisão da ponte — a lista fechada tem cinco entradas, e a ponte é a
única nova.

### Checkpoint 4

§33, 24 itens, cada um com evidência. A maioria já tem evidência espalhada pelos
relatórios; o trabalho é **reunir com link**. Dois itens não têm evidência
nenhuma hoje: responsividade nas seis larguras, e regressão visual antes/depois.

E um item **não está cumprido**: *"não há hexadecimal cravado no JSX/TSX fora dos
arquivos de token"* — ver a seção seguinte.

---

## O defeito achado durante o levantamento, e corrigido

Conferindo aquele item da §33, a catraca da cópia de token apareceu afirmando o
contrário do que media.

O texto dela dizia, por escrito, que `CATEGORICA_*` *"não é cópia de token
nenhum"*, porque *"o que as distingue é justamente não nomearem token de
origem"*. Medido:

```
10 identico(s) a token do pacote, 24 sem par
```

`CATEGORICA_CLARA` e `CATEGORICA_ESCURA` são cópia literal de `--chart-1` a
`--chart-5`, nos dois temas, no arquivo que a catraca lia — e ela imprimia
`0 linha(s)`.

**Não era trava fraca. Era trava que afirma o contrário do que mede**, e o nome
dela era asserção forte sobre algo que nunca verificou. Não nomear o token de
origem nunca foi prova de não ser cópia; é só a cópia sem etiqueta.

**Corrigida em `faba373`**, com dois detectores que não se substituem:

| detector | pega | por que não sai |
|---|---|---|
| por **valor** | hexadecimal igual ao de um token, resolvido | a cópia fiel, que o comentário não denuncia |
| por **comentário** | hexadecimal com `--token` ao lado | **a cópia que derivou não bate mais por valor** — foi o que a E14 fez com a moldura |

Varredura de um arquivo para **96**. Quatro mutações, e a segunda conferida pelo
**texto** e não pela contagem, porque a contagem ficou em 10 nas duas pontas.
Treze casos em `src/copia.test.ts` prendem as mutações.

As dez entram como **linha de base declarada** — dívida visível que não pode
crescer —, e não como exceção.

---

## O nó tem cinco lados

| lado | onde | de onde sai a cor hoje |
|---|---|---|
| 1 | fatia do gráfico de status | tabela da E18, por classe — **já adotada** |
| 2 | cartão de KPI | `corDoStatus`, hexadecimal |
| 3 | selo (`VARIANTE_DE_STATUS`) | tintas do pacote, com `principal` usado como semântica |
| 4 | `paletaCategorica` | **cópia literal de `--chart-1..5`** |
| 5 | `corDaPrioridade` | hexadecimal próprio, certificado |

**Os cinco fecham juntos.** Fechar um sem os outros deixa o sistema com duas
verdades sobre de onde sai a cor de um status — que é o arranjo que produziu a
deriva da moldura na E14.

---

## Riscos datados

**A linha de base da Fase 0.** Nunca foi tirada; o relatório da Fase 0 registra o
adiamento para uma Fase 1 que não existe. Só é recuperável enquanto `main`
estiver em `165d919` — conferido em 09/09/2026. Se alguém empurrar em `main`, o
"antes" não some do histórico, some da facilidade: vira arqueologia de commit em
vez de `git worktree add`. **Conferir `git rev-parse main` antes de contar com a
worktree, não depois de planejar em cima dela.**

**As duas lacunas de ambiente.** A fatia da rosca com `--chart-*` e as capturas
17–18 dependem, respectivamente, de massa com chamado aberto e de uma API que se
possa derrubar. Nenhuma das duas é possível contra produção em leitura pura.

---

## A ordem aprovada

1. **A catraca da cópia de token, corrigida.** ✅ *Feita — `faba373`.* Vinha
   primeiro porque era a única coisa da lista que afirmava algo falso, e enquanto
   ela imprimisse zero qualquer inventário nasceria cego.
2. **Fase 17 — responsividade**, com sonda antes de foto.
3. **Fase 16 (mestre) — demais páginas** — e aqui entra a decisão sobre a ponte.
4. **Fase 18 — acessibilidade**, dois itens.
5. **Fase 19 — regressão visual**, com a linha de base da worktree em `main`.
6. **Fase 20 — documentação**, que consome o resto.

## Fora da migração

**`EmConstrucao` foi apagada** (`75a411c`), em commit próprio. Página sem rota e
sem import; a Fase 0 já a tinha registrado como "(sem rota)". O relatório do
Checkpoint 1 conta `EmConstrucao:20` entre os hexadecimais corrigidos — trabalho
gasto numa tela que ninguém conseguia abrir.

## Parado por decisão

- E23 e a recópia.
- O lado 4 do nó — a `paletaCategorica` — congelado como linha de base.
- **Checkpoint 4 não começa sem autorização por escrito do operador** para o
  rebase de histórico.
