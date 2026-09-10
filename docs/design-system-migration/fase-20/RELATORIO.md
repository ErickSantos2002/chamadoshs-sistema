# Fase 20 — documentação, e o estado para o Checkpoint 4

**10/09/2026.** Última fase antes do Checkpoint 4.

A §25 pede: *"VERSION.md, atualização de `guidelines/adocao.md` (cópia local) com
o que foi feito, divergências restantes"*.

---

## O que a fase entrega

| entrega | onde |
|---|---|
| cópia local do `adocao.md`, com status item a item | `src/design-system/adocao-chamadoshs.md` — **não existia** |
| §28 não cumprida, em **dois** lugares | `VERSION.md` e `adocao-chamadoshs.md` |
| lista da §33 com **cinco** exceções | `VERSION.md` |
| divergências restantes, medidas | `adocao-chamadoshs.md` |

### Por que a §28 vai nos dois

Os dois arquivos têm **leitores diferentes**. O `VERSION.md` responde *"o que
este repositório fez com o pacote"*; o `adocao-chamadoshs.md` responde *"como se
adota, e onde estamos"*.

**Quem chega em três meses lê um dos dois, não os dois.** Escrever a §28 só num
deles deixaria metade dos leitores com uma documentação que **afirma
conformidade que não houve** — que é exatamente o erro da §33 pego ontem, e
seria a segunda vez em dois dias.

---

## O checklist do `adocao.md`, medido item a item

| # | item | estado |
|---|---|---|
| 1 | hexadecimal cravado no JSX | ✅ zero |
| 2 | `dark:` por classe | ✅ zero real |
| 3 | azul de ação é `--action` | ✅ pela catraca da ponte |
| 4 | um primário por bloco | ✅ **conferido por leitura, alcance: 4 telas** |
| 5 | texto abaixo de 12px | ✅ **8 subidos, 0 exceções** |
| 6 | estado vazio com frase | ✅ |
| 7 | ícone é componente | ✅ zero emoji |
| 8 | contagem de paginação em frase | ❌ **exceção declarada, com data de queda** |
| 9 | `focus-visible` com anel de 2px | ✅ **com 1 exceção declarada**, e 2 correções |
| 10 | nada animando em laço | ✅ **corrigido** |

Três itens produziram trabalho, e cada um de um tipo diferente.

### Item 10 — um defeito, e o código o confessava

`animate-ping` de 2s, em laço, no `CentralButton` — que o `App.tsx` renderiza em
**todas as telas**. A §22 é literal: *"nada pisca em laço numa tela aberta o dia
inteiro — exceções: `Spinner` e `hs-logo-pulse` no login"*.

O próprio comentário o chamava de *"Efeito de pulso (opcional)"*. **Opcional é a
confissão de que não carregava função.** Removido.

### Item 9 — a ressalva virou divergência ao ser escrita

Eu havia marcado ✅ *"com ressalva"*. O operador exigiu a ressalva **antes** de
aceitar o ✅ — e ao escrevê-la, ela se partiu em três vereditos diferentes:

| onde | elemento | veredito |
|---|---|---|
| `AppLayout:116` | link de pular conteúdo | ✅ **`focus:` é o correto** — e agora com o porquê escrito ao lado |
| `Campo.tsx:73` | `<input>`, `<textarea>` | ⚠️ divergência **literal, sem efeito** — corrigida mesmo assim |
| `Seletor.tsx:419` | **`<button>`** | ❌ **defeito real** — o anel acendia no clique de mouse |

> **Ressalva não declarada num checklist de conformidade é a mesma coisa que a
> exceção do login**: uma frase que passa por conformidade e não é.

O `Campo` foi corrigido mesmo sem efeito hoje, porque **divergência sem efeito
hoje é divergência com efeito no dia em que o navegador mudar de critério**.

### Item 5 — a medição derrubou a minha intuição

Oito textos abaixo de 12px. Seis subiram direto; **dois foram medidos antes**,
por decisão do operador — *"com o número que prova, não com adjetivo"*.

```
ROTULO DE GRUPO   "Principal"  10px = 60,8  →  12px = 72,9
                  "Gestão"     10px = 46,8  →  12px = 56,2
                  disponível = 233px        →  o maior ocupa 31%

AVATAR            "AD"  10px = 17 × 15   →  12px = 20,4 × 18
                  caixa de 24px          →  folga de 3,6 × 6
```

Eu suspeitava que caixa alta com `tracking-widest` estouraria a barra. **Não
chega perto.**

> **É o oposto do padrão da semana.** Em vez de afirmar mais do que se mediu,
> mediu-se antes de afirmar — e o resultado contrariou a intuição. **Intuição
> sobre layout tipográfico erra com frequência, e a medição custou 10 chamadas.**

A do `Avatar` é **projeção medida, não medida direta**, e isso está escrito no
código: a variante de 24px não estava na tela onde se mediu. É sólida porque o
glifo não depende da caixa. E a condição do operador foi cumprida antes de
aplicar — `iniciais()` **não tem ramo que produza três letras**, que ocupariam
~30px e estourariam os 24.

### Item 8 — exceção com data de queda

*"Mostrando X a Y de N"* não existe. A `Auditoria` mostra *"Página N"*, e o
código explica: a API não dá contagem total, e pedi-la custaria **uma segunda
varredura das duas tabelas por página**.

Entrou como **quinta exceção da §33**, com o custo e com a saída escrita: no dia
em que houver contagem barata, a frase entra e a exceção sai. **Ela existe pelo
custo, não pelo desenho.**

---

## Estado para o Checkpoint 4

### O que está pronto

- **647 casos, 62 arquivos.** `tsc`, `validar-paleta` e `build` verdes.
- **Nove catracas**, com a tabela de fronteiras e a seção de vãos conhecidos.
- **Cinco exceções** declaradas, sob *"nada além delas"*, uma delas revogada em
  09/09 e uma acrescentada hoje.
- **Seis fichas da §29** escritas lendo o código.
- Documentação de adoção com status item a item.

### O que o Checkpoint 4 precisa saber, e não é pouco

**1. A §28 não está cumprida.** A última verificação de tela é de **08/09**,
anterior a três fases que mudaram pixels. A mudança de respiro dos quatro
cartões mudou pixels e **ninguém olhou**.

**2. A linha de base é perecível.** Enquanto `main` estiver em `165d9198…` a
comparação é possível. Depois de um push nela, **deixa de ser, para sempre**.

**3. O nó de seis lados continua aberto** — de onde sai a cor de um status, visto
do gráfico, do cartão, do selo, da paleta categórica, da prioridade e das
pastilhas. Fecham juntos.

**4. Uma pendência de produto:** `TarefasRecorrentes` perde os nomes de usuário
em silêncio quando a carga falha, e falha de rede fica indistinguível de dado
ausente.

**5. Duas lacunas de ambiente**, que não são de esforço: a fatia da rosca com
massa aberta, e as capturas 17–18 do estado de erro. Dependem de um ambiente que
não existe.

**6. Os 52 alvos de toque abaixo de 40px**, na ordem já decidida — controle de
formulário, botão-ícone, botão-que-é-texto por último.

---

## O que esta fase custou

**10 chamadas**, todas na medição dos dois candidatos do item 5 — exatamente o
autorizado.

E um erro meu, pequeno e corrigido antes de sair: pus um comentário JSX dentro de
um ramo de ternário na `Sidebar` e quebrei doze linhas de compilação. O `tsc`
pegou na hora. **É a terceira vez nesta migração que ponho comentário onde o JSX
não aceita** — e as três foram pegas pelo mesmo instrumento, no mesmo minuto.
