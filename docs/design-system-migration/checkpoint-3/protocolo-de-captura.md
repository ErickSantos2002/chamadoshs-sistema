# As dezesseis capturas — protocolo

Preparado em 04/09/2026. **Falta o ambiente**: as quatro telas vivem atrás do
login, e o login depende da API.

## As dezesseis

Quatro telas × dois tamanhos × dois temas. **São dezesseis, e só dezesseis** —
ver a pendência do estado de erro no fim.

| # | tela | rota | viewport | tema | sonda |
|---|---|---|---|---|---|
| 1 | painel | `/dashboard` | 1366×768 | claro | `--tabela` |
| 2 | painel | `/dashboard` | 1366×768 | escuro | `--tabela` |
| 3 | painel | `/dashboard` | 390×844 | claro | `--tabela` |
| 4 | painel | `/dashboard` | 390×844 | escuro | `--tabela` |
| 5 | listagem | `/cadastros` | 1366×768 | claro | `--tabela` |
| 6 | listagem | `/cadastros` | 1366×768 | escuro | `--tabela` |
| 7 | listagem | `/cadastros` | 390×844 | claro | `--tabela` |
| 8 | listagem | `/cadastros` | 390×844 | escuro | `--tabela` |
| 9 | formulário | `/chamados/novo` | 1366×768 | claro | sem |
| 10 | formulário | `/chamados/novo` | 1366×768 | escuro | sem |
| 11 | formulário | `/chamados/novo` | 390×844 | claro | sem |
| 12 | formulário | `/chamados/novo` | 390×844 | escuro | sem |
| 13 | detalhe | `/chamados/:id` | 1366×768 | claro | sem |
| 14 | detalhe | `/chamados/:id` | 1366×768 | escuro | sem |
| 15 | detalhe | `/chamados/:id` | 390×844 | claro | sem |
| 16 | detalhe | `/chamados/:id` | 390×844 | escuro | sem |

A **listagem** é a aba **Categorias**, que é a que abre por padrão.

Em **390×844** a barra lateral vira gaveta, e ela fica **fechada** — é o estado
padrão, e a gaveta aberta já foi fotografada na galeria da casca no
Checkpoint 1.

### O que cada bloco consome da massa

| capturas | precisa de |
|---|---|
| 1–4 | chamados espalhados por status e prioridade, e **2+ linhas** na tabela de recentes |
| 5–8 | **2+ categorias ativas** |
| 9–12 | categorias e solicitantes, para os seletores não saírem vazios |
| 13–16 | o chamado resolvido **aberto pela conta que loga**, com 2 comentários e histórico |

O perfil do login é **Administrador**: é o único em que tudo que a migração
tocou está em cena. Como `Usuario`, `podeEditar` fecha a barra de ações inteira
do detalhe, o painel filtra para os próprios chamados, e a aba Usuários some.

E a avaliação só aparece para o SOLICITANTE (`solicitante_id === user.id`) —
por isso o chamado resolvido precisa ter sido aberto pela mesma conta que loga,
senão o painel mostra "Aguardando avaliação do solicitante" em vez das
estrelas.

O tema entra **pela URL**, e não pelo interruptor:

```
http://localhost:5191/dashboard?tema=claro
http://localhost:5191/dashboard?tema=escuro
```

Isso aplica o tema **antes da primeira pintura**. Pelo interruptor, a primeira
pintura sai no tema errado e troca um quadro depois — e uma foto tirada nesse
intervalo mostra a cor errada com a legenda certa. Já aconteceu aqui: o DOM
dizia `dark`, a tela estava clara, e o painel dizia "claro".

> **`?tema=` reescreve `localStorage.theme`.** A última captura deixa o sistema
> no tema dela para a próxima visita — inclusive fora das capturas. Só no build
> de desenvolvimento.

## Antes de cada foto, a sonda

```bash
node scripts/sonda-captura.js --tema=claro --tabela > node_modules/.sondas/cap.js
```

No console da página:

```js
eval(await (await fetch('/@fs/<raiz>/node_modules/.sondas/cap.js?v=' + Date.now(),
  { cache: 'no-store' })).text())
```

O `?v=` e o `no-store` **não são zelo**: sem eles o navegador serve a sonda do
cache, e já aconteceu — a sonda voltou `ok: true` sem os campos novos porque era
a versão anterior. Uma sonda de frescor servida velha é a piada que ela conta
sobre si mesma, e o modo de falha é o mesmo de sempre: parece que passou.

**Não fotografe com `ok: false`.** A foto sairia parecendo certa — é esse o
ponto dos cinco modos de falha que a sonda cobre:

| | o que pega | por que não se vê |
|---|---|---|
| −1 | **outro produto na porta** | a tela funciona — e é bonita |
| 0 | API de produção | a tela funciona — e é a real |
| 1 | CSS servido velho | classes sem regra, elementos herdam a cor do pai |
| 2 | tema por efeito | a primeira pintura sai no tema errado |
| 3 | tabela com 1 linha | o divisor entre linhas não existe sem a segunda |

O menos um já custou caro, e do outro lado: duas aplicações Vite convivem nesta
máquina e as duas nasciam na 5173. Sem `strictPort` o Vite escorrega calado para
a 5174, e quem cravou o endereço abraça o servidor do outro produto — a suíte
e2e do HelpHS rodou contra **este** sistema. Agora cada um tem porta própria
(ChamadosHS 5191, HelpHS 5190) com `strictPort`, e a sonda ainda confere o
`data-app` do `<html>` antes de liberar: **porta exclusiva protege por acordo,
identidade protege quando o acordo falha.**

O zero é o mais grave e o menos visível dos cinco: contra produção **tudo
funciona**, e é justamente esse o problema. A captura leva dado real para
dentro de `docs/`, e o passo "derrube a API" da 17–18 vira uma
indisponibilidade. Regra no `DECISOES.md`; a sonda confere o `.env` e também
para onde a página de fato falou.

O terceiro é o mais fácil de deixar passar: uma tabela de uma linha **parece**
uma tabela normal, e a captura sai sem o elemento que a E14 mudou.

`--tabela` nas telas que têm tabela — listagem e painel. As outras duas rodam
sem ele.

## Onde a sonda já foi vista funcionando

Oito provas negativas antes de o protocolo valer — as cinco primeiras no
navegador, as três últimas (6–8) rodando a sonda de verdade contra documentos
controlados, porque a extensão do Chrome caiu no meio. É a regra do
`DECISOES.md`: verificação nova roda contra um defeito conhecido antes de o
"passou" dela contar.

| | prova | resultado |
|---|---|---|
| 1 | sonda do tema escuro numa página clara | bloqueia, com 3 motivos |
| 2 | maior tabela reduzida a 1 linha | bloqueia, nomeando a contagem |
| 3 | linhas devolvidas | libera de novo |
| 4 | página sem `?tema=` na URL | bloqueia por marcador ausente |
| 5 | `/login?tema=escuro`, página do **app** | libera: marcador `escuro`, fundo `rgb(13,27,42)`, canário ok |
| 6 | `.env` apontando para a API de produção | bloqueia, nomeando o endereço |
| 7 | página com `data-app="helphs"` | bloqueia: "é do produto helphs, e não do chamadoshs" |
| 8 | página sem `data-app` nenhum | bloqueia — falha **fechada**, não libera por omissão |

A quinta é a que importa para as dezesseis: o marcador de TEMA passou a existir
fora de `/dev/`, que é onde as capturas acontecem. A sétima e a oitava são a
identidade do PRODUTO, e vivem em `src/identidade.test.ts` — rodam a cada
`npm test`, e não só no dia em que foram feitas.

## O que o operador precisa fornecer

1. **A API de pé, e você logado no Chrome.** A sessão do navegador usa o seu
   Chrome, então o login vale para mim.
2. **Um chamado com dados** para a tela de detalhe — de preferência resolvido,
   para a avaliação aparecer.
3. **Pelo menos duas linhas** na listagem e na tabela de recentes do painel.
   A sonda bloqueia se não houver, mas é melhor saber antes.

## O andaime, e quando ele sai

O gancho de tema por URL é o **item 3 da lista de remoção da Fase 20**, que
mora em `src/router.tsx`, ao lado das duas rotas de `/dev/`. Este protocolo, o
`canario-css.js` e o `sonda-captura.js` dependem dele e saem junto.

Vale só no build de desenvolvimento: o bloco está dentro de
`import.meta.env.DEV`, e foi conferido no bundle de produção — zero ocorrências
de `temaPronto`.

A alternativa a reescrever o `localStorage` seria a captura aplicar o tema por
efeito, depois de montar — e aí a primeira pintura sairia no tema errado, que é
o defeito que este gancho existe para não ter. O preço é o tema ficar trocado
depois; o benefício é a foto não mentir.

---

## Pendência registrada: o estado de erro do Dashboard

**Cortado das capturas por decisão do operador, 04/09/2026.** Seriam as 17–18.

### O que fica sem registro visual

O `Aviso` que o Dashboard passou a mostrar quando a carga falha — desvio
funcional aprovado na Fase 13, item da §29 que estava falhando.

Antes dele o `catch` só escrevia no console: `chamados` ficava em `[]`, o
`loading` caía, e **o painel renderizava zeros**. Uma falha de rede ficava
idêntica a "não há chamados", e um painel que responde "0 abertos, 0 resolvidos,
0% no prazo" quando não conseguiu perguntar se lê como afirmação sobre a
operação da empresa.

O conserto está no código e coberto pela ficha da §29. O que falta é a foto.

### Por que foi cortado: PRAZO, e não risco

**Derrubar a API local é `docker stop`.** Não é um passo destrutivo, não é
perigoso, e o ambiente local está sendo montado de qualquer forma para as
dezesseis. Reconstruí-lo custa um `docker start`.

O que faltou foi **tempo dentro desta sessão de captura**, e a decisão foi do
operador: fechar as dezesseis primeiro, e não pendurar o checkpoint numa
captura a mais.

Não confunda com a regra do `DECISOES.md` que proíbe captura apontada para
produção. Ali o "derrube a API" seria mesmo uma indisponibilidade, e por isso a
regra existe. **Contra o banco local, nada disso se aplica** — e é contra o
banco local que estas duas serão feitas.

### Quando será capturado

**Na próxima sessão com o ambiente local de pé** — ou em homologação, quando
houver. Não depende de nada que ainda não exista: depende de meia hora e de
alguém rodar a receita.

A receita está escrita e continua válida:

1. abrir `/dashboard?tema=claro` com a API de pé e deixar carregar;
2. derrubar a API — `docker stop` no contêiner do `chamadoshs-api`;
3. clicar em **"Exibir cancelados"** — o efeito depende de
   `[user, incluirCancelados]`, então refaz a carga, ela falha, e o aviso
   aparece **sobre os números que já estavam lá**.

O passo 3 importa: com a API já derrubada na abertura, o painel mostra zeros com
o aviso por cima. O desenho aprovado é o aviso ACIMA de dados de uma carga
anterior, que ainda podem valer — e é esse estado que a foto precisa mostrar.

Duas capturas bastam: os dois temas em 1366×768. O que muda com o tema é a
tinta do `Aviso`, não o layout.
