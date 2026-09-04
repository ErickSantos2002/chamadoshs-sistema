# As dezesseis capturas — protocolo

Preparado em 04/09/2026. **Falta o ambiente**: as quatro telas vivem atrás do
login, e o login depende da API.

## As dezesseis

Quatro telas × dois tamanhos × dois temas.

| # | tela | rota |
|---|---|---|
| 1–4 | painel | `/dashboard` |
| 5–8 | listagem | `/cadastros` |
| 9–12 | formulário | `/chamados/novo` |
| 13–16 | detalhe | `/chamados/:id` |

Tamanhos: **1366×768** e **390×844**. Temas: **claro** e **escuro**.

O tema entra **pela URL**, e não pelo interruptor:

```
http://localhost:5173/dashboard?tema=claro
http://localhost:5173/dashboard?tema=escuro
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
eval(await (await fetch('/@fs/<raiz>/node_modules/.sondas/cap.js')).text())
```

**Não fotografe com `ok: false`.** A foto sairia parecendo certa — é esse o
ponto dos três modos de falha que a sonda cobre:

| | o que pega | por que não se vê |
|---|---|---|
| 1 | CSS servido velho | classes sem regra, elementos herdam a cor do pai |
| 2 | tema por efeito | a primeira pintura sai no tema errado |
| 3 | tabela com 1 linha | o divisor entre linhas não existe sem a segunda |

O terceiro é o mais fácil de deixar passar: uma tabela de uma linha **parece**
uma tabela normal, e a captura sai sem o elemento que a E14 mudou.

`--tabela` nas telas que têm tabela — listagem e painel. As outras duas rodam
sem ele.

## Onde a sonda já foi vista funcionando

Cinco provas negativas, no navegador, antes de o protocolo valer. É a regra do
`DECISOES.md`: verificação nova roda contra um defeito conhecido antes de o
"passou" dela contar.

| | prova | resultado |
|---|---|---|
| 1 | sonda do tema escuro numa página clara | bloqueia, com 3 motivos |
| 2 | maior tabela reduzida a 1 linha | bloqueia, nomeando a contagem |
| 3 | linhas devolvidas | libera de novo |
| 4 | página sem `?tema=` na URL | bloqueia por marcador ausente |
| 5 | `/login?tema=escuro`, página do **app** | libera: marcador `escuro`, fundo `rgb(13,27,42)`, canário ok |

A quinta é a que importa para as dezesseis: o marcador passou a existir fora de
`/dev/`, que é onde as capturas acontecem.

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
