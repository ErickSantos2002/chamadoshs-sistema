# Varredura de indicadores de carregamento — Fase 7

Levantamento exaustivo de tudo que sinaliza espera no ChamadosHS, com auditoria
do que um leitor de tela ouve em cada ponto. Feito em 03/09/2026, antes e
depois da criação do `Spinner`.

## Método

Quatro varreduras **independentes**, cada uma cega para o que as outras
achariam, mais um crítico de completude:

| modalidade | o que procurou |
|---|---|
| animação | `animate-spin`, `animate-pulse`, `animate-ping`, `@keyframes`, `animation:` em CSS e em `style` |
| semântica | `aria-busy`, `role="status"`, `aria-live`, e texto visível de espera |
| componente | `IconeCarregando`, `IconeRecarregar`, `Spinner`, `Loader`, `Skeleton`, `Shimmer` |
| estado | toda variável booleana de espera (`loading`, `carregando`, `salvando`, `enviando`…), seguida até o sítio de **render** |

123 sítios únicos depois da deduplicação por arquivo+linha. Cada um auditado
por uma pergunta só: *uma pessoa usando leitor de tela aprende que algo está
carregando?*

**Por que quatro e não uma.** Cada modalidade é cega para um tipo de defeito.
A prova saiu na própria varredura: a minha busca inicial foi por `animate-spin`,
e o defeito de `ProtectedRoute.tsx` era exatamente a **ausência** de animação.
Procurar pelo sintoma não acha quem não o tem.

## O que foi consertado nesta fase

**Os três blocos mudos.** `SlaTab`, `ChamadoModal` e `TarefasRecorrentes`
tinham `aria-hidden="true"` no anel e nenhum texto ao lado. Silêncio total
durante a espera — sem sinal nenhum, não há como distinguir sistema trabalhando
de sistema travado. Passam a `BlocoCarregando`, que carrega o `role="status"`.

**A espera sem anel.** `ProtectedRoute.tsx` mostrava só a palavra
"Carregando..." parada. É a **primeira** espera que qualquer pessoa encontra —
acontece enquanto a sessão é lida, antes de qualquer rota — e era a única do
sistema sem indicador de movimento. Achada pelo crítico de completude, não por
mim.

**Os dois botões divergentes.** `TarefasRecorrentes:762` e `:791` usavam
`disabled={salvando}` com o ícone trocado à mão, em vez de `carregando`. Não
ganhavam o `aria-busy` que o `Button` dá de graça.

**Dezoito anéis em três formas viram um primitivo.** Ver a mensagem de
`284f247`.

## O que a varredura achou e NÃO entra nesta fase

Registrado para não se perder. Nenhum destes é primitivo, e a §25 põe código de
tela nas Fases 11–16.

### 1. Sete botões cujo rótulo não muda durante a espera

`NovoChamadoForm:258`, `CategoriaModal:174`, `SetorModal:171`,
`UsuarioModal:247`, `SlaTab:308`, `ChamadoModal:330`, `AcoesRapidas:136`.

Todos usam `carregando` corretamente, então o botão fica `disabled` e
`aria-busy="true"`. O que falta é o anúncio: `aria-busy` **não é região viva**,
então nada é dito no instante do clique. Quem usa leitor de tela só descobre se
navegar de volta ao botão.

`Login.tsx:254` é o único sítio do sistema que faz certo: o rótulo vira
"Entrando…", e aí o nome acessível do botão muda e o leitor anuncia.

**Encaminhamento:** adotar o padrão do `Login` nas Fases 11–16. Não é do
`Button`: o rótulo é conteúdo, e só a tela sabe se o certo é "Salvando…",
"Enviando…" ou "Confirmando…".

### 2. `CentralButton.tsx:28` — animação em laço infinito

Um `animate-ping` de 2s, sem fim, num botão flutuante presente em toda tela.

Contraria uma regra explícita do pacote (`readme.md` → ANIMAÇÃO): *"Nada pisca
em laço numa tela aberta o dia inteiro — as duas animações contínuas dos
repositórios são o spinner e o pulso do logo na tela de login, que dura cinco
segundos."* E o item de `guidelines/adocao.md`: *"Nada animando em laço fora
spinner."*

O próprio código o chama de "Efeito de pulso (opcional)".

**Não consertado aqui de propósito:** é componente de tela, não primitivo, e
consertá-lo agora seria alargar a Fase 7 por conveniência — o mesmo argumento
que deixou os seis botões de cor cheia de `ChamadoDetalhes` para as Fases 11–16.
O incômodo de movimento contínuo já está coberto pelo bloco
`prefers-reduced-motion: reduce`, que zera a repetição.

### 3. `motion.css` — `hs-spin` definido e nunca usado

O keyframe do pacote está em `src/design-system/tokens/motion.css` e **nenhum**
arquivo `.tsx` o referencia: todos usam o `animate-spin` do Tailwind, que é 1s
linear contra os 0,7s do pacote.

Foi decisão consciente ao escrever o `Spinner` — não vale um keyframe próprio
por 0,3s de diferença numa animação sem fim. Fica registrado para o número não
reaparecer como descoberta.

### 4. `aria-hidden` inconsistente nos ícones de recarga

`Auditoria.tsx:164` tem; `CategoriasTab:163`, `SetoresTab:175` e
`UsuariosTab:255` não. Sem efeito prático — o `aria-label` do botão já
sobrepõe o nome acessível dos filhos — mas é a mesma linha escrita quatro vezes
com uma diferença que ninguém decidiu.

### 5. Não existe esqueleto no sistema

Zero ocorrências de `Skeleton`, `Shimmer`, `Esqueleto` ou `Placeholder` como
componente. A palavra só aparece como atributo de `<input>`. É a decisão
registrada em `design-system/VERSION.md`, não uma lacuna.

## Falsos positivos confirmados

- `CentralButton:29,43` e `index.css:202-214` — `animate-fadeIn` é o tooltip do
  botão flutuante, não espera.
- `SlaProgresso.tsx:29` — "progresso" aqui é consumo de SLA, tempo útil
  decorrido. Não é indicador de carregamento.
- `Login.tsx:277` — o `animate-pulse` do ponto de saúde da API é espera de
  verdade (sondagem do `/health`), mas tem texto de estado ao lado e não bloqueia
  região nenhuma. Fica como está.
