# As dezesseis — fichas da §29

As **imagens** ficam fora do repositório, em
`docs/design-system-migration/capturas-locais/`, ignorada inteira no
`.gitignore`. Estas fichas ficam **dentro**: são elas que dizem o que a imagem
mostra, sob que condições e com que ressalvas.

Cada linha traz a saída da sonda e o tamanho em pixels da imagem devolvida — as
duas provas, uma da página e outra do quadro. O protocolo está em
`protocolo-de-captura.md`.

## As duas provas de cada captura

**A sonda**, antes da foto: identidade da página, `.env`, canário do CSS
servido, marcador de tema com o fundo computado, e contagem de linhas nas telas
que têm tabela. Sem `ok: true`, não se fotografa.

**A régua**, na foto: a imagem devolvida é 1:1 com o viewport CSS, então as
dimensões dela *são* a medida do viewport. Só valem **1366×768** e **390×844**
exatos.

A régua já foi vista reprovando, que é o que a faz valer: a captura 1 saiu em
**672×448** — uma foto de aparência perfeitamente normal, tirada num estado de
zoom que ninguém pediu — e foi descartada. O viewport é fixado pelo operador na
barra de dispositivo do DevTools, porque `resize_window` responde
"Successfully resized" sem redimensionar nada.

## Ressalvas que valem para o bloco 13–16

O chamado é o **CHAM-2025-0006** (id 6): resolvido, nota 5, 3 comentários com
autor e papel, 6 entradas de histórico, prioridade **Alta**.

**1. A avaliação sai no estado de leitura, e não no de edição.** `Avaliacao.tsx`
só desenha os cinco `<button>` clicáveis quando `solicitante_id === user.id`, e
**nenhum dos 159 chamados resolvidos foi aberto pela conta admin** — a única com
que se pode logar para ver o resto da tela. Então o painel sai com as cinco
estrelas preenchidas e o selo `5 de 5`, que é o estado mais rico disponível
nesta massa. O estado de edição — com foco visível e hover nas estrelas — **não
é capturável aqui**, e fica registrado como lacuna de evidência, não como
defeito. É verificado por leitura de código e pela suíte.

**2. A ressalva do selo `discreto` caiu.** Ela existia enquanto o escolhido era
o CHAM-2026-0086, de prioridade **Baixa**, que puxava o selo para o tom mais
fraco do mapa. O id 6 é **Alta**, então o selo sai em tom cheio. A troca custou
o painel de Solução: 75 letras contra as 979 do 0086. Foi escolha consciente —
dois painéis cheios (comentários e histórico) contra um painel gordo e dois
vazios.

## As dezesseis

| # | tela | rota | viewport | tema | arquivo | sonda | régua |
|---|---|---|---|---|---|---|---|
| 1 | painel | `/dashboard` | 1366×768 | claro | `01-painel-claro-dpr2-2732x1535.png` | ok | **pendente** (DPR) |
| 2 | painel | `/dashboard` | 1366×768 | escuro | | | |
| 3 | painel | `/dashboard` | 390×844 | claro | | | |
| 4 | painel | `/dashboard` | 390×844 | escuro | | | |
| 5 | listagem | `/cadastros` | 1366×768 | claro | | | |
| 6 | listagem | `/cadastros` | 1366×768 | escuro | | | |
| 7 | listagem | `/cadastros` | 390×844 | claro | | | |
| 8 | listagem | `/cadastros` | 390×844 | escuro | | | |
| 9 | formulário | `/chamados/novo` | 1366×768 | claro | | | |
| 10 | formulário | `/chamados/novo` | 1366×768 | escuro | | | |
| 11 | formulário | `/chamados/novo` | 390×844 | claro | | | |
| 12 | formulário | `/chamados/novo` | 390×844 | escuro | | | |
| 13 | detalhe | `/chamados/6` | 1366×768 | claro | | | |
| 14 | detalhe | `/chamados/6` | 1366×768 | escuro | | | |
| 15 | detalhe | `/chamados/6` | 390×844 | claro | | | |
| 16 | detalhe | `/chamados/6` | 390×844 | escuro | | | |

*(preenchida à medida que cada captura sai)*

---

## 1 — painel, 1366×768, claro

**Vista, e o tema da legenda confere com o pixel.** Fundo `rgb(248, 250, 252)`,
cartões brancos, texto escuro. Não há divergência entre a legenda e a tela.

```
SONDA  ok true   vp [1366, 768]   problemas []
       marcador claro   fundo rgb(248, 250, 252)   canário ok   linhas [10]
```

Canário: os seis tokens e as sete classes conferidos, disco e servido idênticos.

**Régua: pendente.** O arquivo entregue é PNG válido de **2732×1535** — o dobro
exato na largura (1366×2) e 1535 na altura, um pixel abaixo de 1536, porque a
altura real do quadro é 767,5 e `innerHeight` arredonda para 768 ao reportar.
É captura em DPR 2. A decisão entre DPR 1 (arquivo em 1366×768, régua por
igualdade estrita) e DPR 2 está aberta no protocolo.

**Estado da tela:** filtro de período em "Tudo", campos De/Até vazios — que é o
estado correto de "Tudo", conforme o `Dashboard.tsx`: sem início e sem fim não
filtra. 159 chamados.

### Duas ressalvas do que esta captura NÃO prova

**A massa de produção tem um status só.** Os cartões saem 159 total, 159
resolvidos, e **zero** em abertos, em andamento, arquivados e cancelados. Já
estava medido antes das capturas: `porStatus` devolve `{Resolvido: 159}` para os
159. As cores semânticas dos seis cartões aparecem — as barras à esquerda e os
ícones —, então a paleta está registrada; o que não se registra é
**distribuição**. Qualquer gráfico por status sai com uma categoria só.

Não é defeito do design system nem da migração: é limite da massa. A condição
que o operador pediu lá atrás — "chamados espalhados por status e prioridade" —
não existe em produção, e não existia como opção porque não houve ambiente
local.

**Os gráficos ficam abaixo da dobra.** Com 768 de altura a captura alcança
cabeçalho, filtros e a fileira de cartões, e corta no começo do bloco SLA —
"RESOLVIDOS DENTRO DO PRAZO", "ESTOURADOS EM ABERTO" e "EM ATENÇÃO" aparecem
apenas encostando na borda inferior. Nenhum gráfico entra no quadro.

É consequência de fotografar o **viewport**, e não a página rolável. Fica
registrado para que ninguém leia estas quatro capturas do painel como evidência
visual dos gráficos.

**Pendente:** `backgroundColor` computado do elemento que pinta, medido em
sessão, para o tema claro.
