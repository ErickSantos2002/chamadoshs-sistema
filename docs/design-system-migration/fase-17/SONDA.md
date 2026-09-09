# A sonda da §20 — provada antes de medir

**09/09/2026.** A Fase 17 abre com a inversão decidida pelo operador: **sonda dos
quatro critérios antes de qualquer foto.**

> Não considere responsivo só porque não há scrollbar horizontal: tela cortada,
> botão inalcançável, texto sobreposto e toque menor que 40px contam como falha.
> — §20

Nenhum dos quatro aparece numa captura. Alvo de 38px parece perfeito na foto;
sobreposição de 3px também; botão sob uma camada transparente é indistinguível
de botão são. Seis larguras × quatro telas × dois temas seriam **48 imagens para
provar menos** do que `scripts/sonda-responsividade.js`.

---

## As doze provas, contra documentos controlados

Regra do `DECISOES.md`: verificação nova roda contra um defeito **conhecido**
antes de valer. Rodadas no Chrome, em documentos servidos por um estático na
porta 5199 — que **não** é porta de aplicação —, com a sonda de verdade e não com
uma versão de teste.

| # | documento | esperado | obtido |
|---|---|---|---|
| 1 | `data-app="helphs"` | ERRO | ERRO — *"e sim: helphs"* ✓ |
| 2 | sem `data-app` | ERRO | ERRO — *"(sem data-app)"* ✓ |
| 3 | página limpa | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 ✓ |
| 4 | `div` de 3000px | cortado 1 | 1 — `[0..3000] de 900` ✓ |
| 5 | **a mesma `div` em `overflow-x:auto`** | cortado 0 | 0 ✓ |
| 6 | botão 38×38 | alvo 1 | 1 ✓ |
| 7 | botão 40×40 | alvo 0 | 0 ✓ |
| 8 | botão sob camada transparente | coberto 1 | 1 — *"coberto por div"* ✓ |
| 9 | dois textos sobrepostos | sobreposto 1 | 1 ✓ |
| 10 | textos encostados, sem sobrepor | 0 | 0 ✓ |
| 11 | pai e filho | 0 | 0 ✓ |
| 12 | sobreposição de ~10% | 0 | 0 — **ponto cego** |

**Os casos 2, 5, 7, 10 e 11 são os que importam**, porque são os falsos positivos
que uma sonda ingênua produziria — e cada um deles derrubaria a confiança na
ferramenta inteira na primeira vez que gritasse à toa.

O caso 5 é o mais importante dos cinco: uma tabela dentro de `overflow-x:auto`
transborda de propósito, e é o conserto, não o defeito. Acusá-la seria a sonda
cobrando de quem já resolveu.

O caso 11 é o que impede a explosão combinatória: um pai **sempre** cobre o
filho, e parear os dois acusaria toda página que existe.

---

## Onde ela PARA — dito antes de rodar, e não depois

**Sobreposição abaixo de 25% da área do menor não é acusada.** O caso 12 é uma
sobreposição real de 2px que a sonda deixa passar. Não é acerto: é fronteira
escolhida. Abaixo desse limiar o ruído de `line-height` e de antialiasing produz
falso positivo em texto justaposto, e **catraca que grita à toa treina todo mundo
a ignorá-la** — que é um defeito pior do que o que ela pegaria.

**Mede um estado de tela por vez.** Menu fechado não é menu aberto. A gaveta do
mobile só entra na conta se estiver aberta quando a sonda roda.

**A cobertura de botão só vale para o que está no viewport.** `elementFromPoint`
não responde sobre o que está abaixo da dobra. Corte e alvo de toque são
geométricos e valem para a página inteira; cobertura, não. A sonda **declara isso
no próprio retorno**, em `cobertura_aferida_em`, em vez de deixar quem lê supor
que mediu tudo.

**Alvo de toque conta em todas as larguras**, porque a §20 não qualifica. A sonda
não decide por conta própria que 38px é aceitável no desktop — ela reporta, e a
decisão é do operador.

**Tema não é variado.** Os quatro critérios são geométricos. Se algum dia uma
regra de tema mudar caixa alta, peso ou `letter-spacing`, esta fronteira deixa de
valer e passa a ser vão.

---

## O que a sonda NÃO substitui

Ela não vê nada de aparência: cor, contraste, alinhamento, hierarquia
tipográfica, se o layout **faz sentido** na largura. Isso continua sendo captura,
e é para isso que as capturas ficam — **para o que a sonda não alcança**, e não
para repetir o que ela já provou.

A lista de capturas é apresentada ao operador **antes** de qualquer foto ser
tirada.
