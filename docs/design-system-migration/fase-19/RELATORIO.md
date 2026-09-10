# Fase 19 — **a regressão visual NÃO foi feita**

> ### As 32 capturas não existem
>
> A comparação antes/depois exigida pela §28 **não foi realizada**. À mão custa
> uma sessão inteira de operador; por automação exigiria montar Playwright, que
> o projeto não tem.
>
> **Decisão do operador, 10/09/2026.** Não é corte de escopo por prazo apertado:
> é o reconhecimento de que o caminho manual custa mais do que entrega, e de que
> o caminho barato ainda não foi construído.

**Este relatório existe para que ninguém leia a Fase 19 como cumprida.**

---

## 1. O que a fase entrega, de fato

| entrega | estado |
|---|---|
| `npm run build` com os três passos encadeados | ✅ **primeira execução da migração**, verde em 14,93s |
| os três vazios da `Auditoria` presos em teste | ✅ 5 casos, com **mutação** provando que pegam |
| ausência de `lint` | ✅ **declarada** — §27: script fora do `package.json` não existe |
| ausência de Playwright / e2e | ✅ **declarada** desde a Fase 0 |
| levantamento do que a comparação mediria | ✅ `LINHA-DE-BASE.md` |
| **as 32 capturas** | ❌ **não feitas** |

### O build

```
> chamadoshs-sistema@1.7.7 build
> npm run validar:paleta && tsc --noEmit && vite build
  Paleta validada.
✓ built in 14.93s
```

Nunca havia rodado nesta migração — só `tsc` e o validador, que são dois dos três
passos que ele encadeia.

### Os três vazios

Cinco casos novos em `auditoria-vazios.test.tsx`. O que os faz valer é a
mutação: **colapsar o ternário de três ramos para dois derruba exatamente os dois
casos do defeito**, e os outros três continuam passando.

O defeito que eles prendem já estava corrigido — e *defeito já corrigido volta
calado se ninguém o prender*.

---

## 2. A última verificação visual deste sistema é de 08/09

**As dezesseis capturas do Checkpoint 3.** Depois delas vieram três fases:

| fase | o que mudou na tela |
|---|---|
| **16-H** | cor cheia como texto (13 usos), `--chart-*` no gráfico de status, preenchimento nu, moldura e dica do gráfico |
| **16-mestre** | quatro cartões passando ao primitivo, com respiro mudando de `p-5`/`px-8 py-10` para `md`/`lg` |
| **18** | `tabIndex` no gráfico, e a regra de movimento reduzido saindo do CSS local |

> **Nenhuma tela foi olhada depois dessas três fases.**

O que existe no lugar de olhar: `tsc`, o validador com nove catracas, 647 casos
de teste, e as medições da sonda. Nada disso vê **aparência** — vê token, classe,
geometria e contraste calculado.

A mudança de respiro dos quatro cartões, em particular, **mudou pixels e não foi
fotografada por ninguém**.

---

## 3. A linha de base continua recuperável — e o risco é datado

Conferido em 10/09/2026, nos dois lados:

```
main LOCAL : 165d9198fc60e0887a025653a5a2898bc042b6cc
main REMOTO: 165d9198fc60e0887a025653a5a2898bc042b6cc
```

A worktree e o servidor da 5173 **foram derrubados** — deliberadamente, porque
servidor parado de pé já mediu o produto errado neste projeto duas vezes. A
receita completa para remontar está em `LINHA-DE-BASE.md`, com as quatro
diferenças declaradas e o passo do `.env`, sem o qual a comparação não vale.

> ### Risco datado
>
> **Enquanto `main` estiver em `165d9198…`, a comparação é possível. Depois de um
> push nela, deixa de ser — e para sempre**, porque o estado que se queria
> fotografar é exatamente *"o que havia antes deste ramo"*.
>
> Não é perda de conveniência: é perda do objeto.

---

## 4. Pendência nomeada: **32 capturas por Playwright**

É o único caminho que não custa uma sessão de operador.

**Se e quando for retomada, o script é a primeira coisa** — não as capturas. Um
roteiro que carrega as quatro telas nas duas portas, escreve o tema em
`localStorage` antes de cada carga, espera as transições drenarem e fotografa
resolve em minutos o que à mão consome uma tarde, e resolve **sempre**, e não
uma vez.

O que ele precisa saber, e está tudo escrito:

- as quatro diferenças da worktree e a receita de montagem — `LINHA-DE-BASE.md`;
- as sete checagens antes de cada foto — `protocolo-de-captura.md`;
- a **sétima**, que é a nova: `visibilityState === 'visible'` e
  `getAnimations()` vazio. Num roteiro Playwright ela é trivial e **confiável**,
  ao contrário do arranjo manual, onde o portão teve de mudar de dono.

---

## 5. O que a fase encontrou, mesmo sem as capturas

### O `.env` ausente quase produziu 32 imagens incomparáveis

A worktree nasceu sem `.env` — ele é gitignored — e `api.ts` recua para
`http://localhost:8000`. **As duas metades apontavam para APIs diferentes.**

> **O recuo não dá erro. Dá uma URL.**

A tela renderizaria a casca com zero dado, exatamente como renderizaria uma base
vazia. O que pegou foi **ler o `baseURL` no navegador em vez de supor**.

### Aba oculta congela transição — e quase virou achado falso

`body` e `main` carregam `transition-colors` de 150ms. Em aba oculta o Chrome não
faz as animações andarem: as transições ficam em `currentTime: 0` e
`getComputedStyle` devolve a **cor de partida**, indefinidamente.

Isso foi lido, por alguns minutos, como defeito de produção — texto quase preto
sobre fundo navy, contraste perto de 1:1. **Não existe.**

E o mais forte não é o do toggle: **numa carga limpa, sem ninguém trocar tema**,
`main` sai correto e `body` fica congelado. A sétima checagem não é sobre trocar
de tema — é sobre **medir em aba não pintada**, e alcança qualquer medição de
estilo computado.

### O portão mudou de dono

A sétima checagem **não é executável pelo agente**: a extensão reporta `hidden`
mesmo com a janela à frente. Três medições, com 8 segundos de atraso, todas
`hidden`.

> Trava que o autor não consegue passar travaria as 32 por construção. **O portão
> é do operador, e não da sessão.**

### E três erros meus, todos pegos antes de virarem afirmação

Provar se trocar tema sem recarregar dá o mesmo DOM custou **~72 chamadas contra
24 estimadas**, e a diferença foi inteiramente de instrumento: **seletor
instável**, **funções de impressão diferentes nas duas pontas**, **aba oculta**.

Nenhum entrou em relatório, ficha ou commit como achado. O terceiro foi pego pela
regra que o `DECISOES.md` já continha.

---

## Estado ao fechar

- **647 casos, 62 arquivos.** `tsc`, `validar-paleta` e `build` verdes.
- **A §28 não está cumprida**, e o Checkpoint 4 precisa saber disso.
