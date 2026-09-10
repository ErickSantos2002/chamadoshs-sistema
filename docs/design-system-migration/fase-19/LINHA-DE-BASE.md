# A linha de base do "antes" — o que ela é, e o que ela NÃO é

**10/09/2026.** A §28 pede comparação antes/depois, com o "antes" tirado na Fase 0
antes de qualquer alteração. **Ele nunca foi tirado** — o relatório da Fase 0
registra a intenção e o adiamento para uma Fase 1 que não existe.

Ele só é recuperável porque `main` não se moveu. Conferido antes de montar:

```
main LOCAL : 165d9198fc60e0887a025653a5a2898bc042b6cc
main REMOTO: 165d9198fc60e0887a025653a5a2898bc042b6cc
```

Os dois lados, e não só o local — um push de terceiro apareceria só no remoto.

---

## A worktree NÃO é o `165d919` exato

**Duas linhas foram acrescentadas, autorizadas pelo operador.** Declaradas aqui
porque:

> **Linha de base com alteração não declarada é pior que linha de base
> assimétrica.**

| # | arquivo | o que mudou | por que não afeta a foto |
|---|---|---|---|
| 1 | `index.html` | `<html lang="pt-BR">` → `<html lang="pt-BR" data-app="chamadoshs">` | atributo em `<html>`; não é seletor de nenhuma regra CSS e não renderiza |
| 2 | `vite.config.ts` | `server: { port: 5173, strictPort: true }` | configuração do servidor; não entra no bundle nem na página |
| 3 | `.env` | **copiado** do repositório principal | é gitignored e nunca esteve em commit nenhum; sem ele o "antes" apontava para `http://localhost:8000` |
| 4 | `package-lock.json` | reescrito pelo `npm install` | arquivo de trava de dependência; não é lido em tempo de execução |

As duas primeiras foram autorizadas antes. **As duas últimas apareceram durante a
montagem**, e estão aqui pelo mesmo motivo que as outras.

### A 3 quase arruinou a comparação em silêncio

O `.env` é **gitignored**, então a worktree nasceu sem ele. E
`src/services/api.ts` tem recuo:

```ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

Medido no navegador, antes de copiar:

```
baseURL_que_o_ANTES_usa: "http://localhost:8000/api/v1"
```

**As duas metades estavam apontando para APIs diferentes** — uma para produção,
outra para um serviço que não existe nesta máquina. A condição (a) — *mesma
massa* — estava quebrada na raiz, e a tela do "antes" renderizava a casca com
zero dado.

E ela falharia **calada**: sem `.env`, o recuo não dá erro, dá uma URL. A foto
sairia com o painel vazio, e alguém concluiria que o "antes" mostrava zeros.

> **Recuo silencioso numa variável de ambiente é a mesma família de sempre**, e
> aqui ele quase produziu 32 imagens comparando duas coisas que não eram
> comparáveis. O que pegou foi ler `baseURL` no navegador em vez de supor.

O original **não foi tocado**: os dois arquivos têm o mesmo `sha256`
(`07c0f835f0f061da…`), e a cópia foi só de leitura.

### A 4 é consequência da instalação, e não de escolha

O `npm install` reescreveu o `package-lock.json` da worktree. Nenhum efeito no
que a tela desenha — lockfile não é lido em tempo de execução —, e está aqui
porque a ficha vale pelo que **não** omite.

### A sessão de login é separada, e isso é do protocolo

`localStorage` é **por origem**. `localhost:5173` e `localhost:5174` são origens
diferentes, então o "antes" **não herda a sessão do "depois"** e cai no
`/login`.

**Quem entra é o operador.** Credencial não passa por aqui.

### Por que cada uma foi necessária

**`strictPort` é o decisivo.** O `vite.config.ts` do `165d919` **não declara porta
nem `strictPort`** — é o código de antes da decisão da porta. Sem `strictPort`, o
Vite **escorrega calado** para a 5174, a 5175, até achar uma livre.

E a 5174 está com o servidor do "depois". Sem esta linha, o servidor do "antes"
poderia subir na porta do "depois" ou noutra qualquer, e **as duas metades da
comparação seriam o mesmo código sem ninguém perceber**. É o defeito exato que já
mordeu este projeto uma vez, quando a suíte e2e do HelpHS abraçou o servidor do
ChamadosHS e mediu o produto errado.

**`data-app` restaura o portão.** As dezesseis capturas do Checkpoint 3 rodaram
sob a regra de que **toda medição confere a identidade da página antes de valer**.
O `165d919` é anterior a essa regra e não tem o marcador.

Sem ele, o "antes" seria fotografado **sem a trava que o "depois" tem** — e a
comparação ficaria assimétrica justamente nas garantias. A sonda não precisa
existir na worktree, porque é colada no console; o que ela exige é o marcador.

---

## O que distingue os dois servidores

| | **antes** | **depois** |
|---|---|---|
| commit | `165d919` + 2 linhas | ramo `chore/design-system-adoption` |
| porta | **5173** | **5174** |
| versão | **1.7.6** | **1.7.7** |
| `strictPort` | ligado (acrescentado) | ligado |
| `data-app` | `chamadoshs` (acrescentado) | `chamadoshs` |

**Três sinais independentes** separam um do outro: porta, versão e commit. O
`data-app` é igual nos dois de propósito — ele responde *"é o ChamadosHS?"*, e
não *"é qual metade?"*.

> **Consequência para o protocolo:** o `data-app` sozinho **não** distingue as
> metades. A ficha de cada captura registra **porta e versão**, que são o que
> separa.

### A 5173, e por que ela

O `ALLOWED_ORIGINS` da API admite `5173`, `5174` e produção — **só esses três**. A
5174 está ocupada pelo "depois", então sobra a 5173.

É a porta que o `vite.config.ts` do "depois" evita **de propósito**, por ser o
padrão do Vite e o ponto de colisão histórico. Aqui ela é usada **por esta sessão
apenas**, com `strictPort` ligado — que é exatamente a proteção que faltava
quando a colisão aconteceu.

---

## As dependências: a worktree instala as DELAS

O `package.json` do `165d919` pede `@fontsource/plus-jakarta-sans`, que o "depois"
**removeu** (a auto-hospedagem passou a ser do pacote, pela emenda E3). O
`node_modules` atual não o tem.

E o `index.css` do `165d919` tem seis `@import` de `@fontsource`. Sem o pacote, o
Vite não resolve e o servidor não sobe.

**Remover os imports estava fora de questão: mudaria a fonte, que é visual.** A
worktree roda `npm install` próprio, com as dependências que ela tinha — o que é o
certo para uma linha de base fiel.

---

## As condições da sessão

Fixadas pelo operador:

1. **Mesma sessão, mesmas quatro telas, mesmos dois viewports e temas, mesma
   massa.** A comparação vale pelo que muda entre as metades; tudo o que não é o
   código tem de ser igual.
2. **Alternando por TELA, e não em bloco** — painel antes, painel depois,
   listagem antes, listagem depois. Se algo mudar no meio da sessão (massa,
   servidor, estado), muda **para os dois lados do mesmo par**, em vez de
   contaminar um lado inteiro.
3. **Leitura pura nos dois.** Nada submetido, nenhum status trocado.

A ordem alternada **não custa nada a mais**: são oito carregamentos nos dois
arranjos, e os dois servidores ficam de pé ao mesmo tempo, cada um na sua porta.

---

## O que fica no registro sobre o "antes"

Ele é o estado de `main` em 10/09/2026, que é o mesmo de quando o ramo nasceu.
**Não é o estado da Fase 0** — aquele nunca foi fotografado, e as fases 1 a 6 já
tinham acontecido quando o ramo se separou.

> A comparação que estas 32 capturas produzem é **"o que o ramo
> `chore/design-system-adoption` mudou"**, e não *"o que a migração inteira
> mudou"*. A diferença é real e precisa estar escrita: a fundação — tokens,
> fontes, tema, casca — já estava em `main` antes do ramo.
