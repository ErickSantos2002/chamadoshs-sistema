## E8 — os três pares `on-tint` que a E2 não mediu

| | |
|---|---|
| Data | 03/09/2026 |
| Arquivo | `tokens/colors.css` |
| Hash **antes** | `539388386F7D92789A8F036AAAED638AE43FC3EA3ECE38D64629E29676B520F1` |
| Hash **depois** | `73550E08F6F951571068EEC741278FC2A7EDB5CEEC9CDDFC997111BC0F741139` |
| Tamanho | 9.012 → 9.347 bytes · UTF-8 sem BOM · LF · 0 CR antes e depois |
| Escrita por | ChamadosHS |

### O que mudou

No `:root` — dois degraus novos na rampa, e uma reatribuição:

```css
--color-danger-300: #fca5a5;
--color-info-300:   #93c5fd;
--on-tint-success:  var(--color-success-800);
```

No `.dark` — duas reatribuições:

```css
--on-tint-danger: var(--color-danger-300);
--on-tint-info:   var(--color-info-300);
```

Os degraus ficam no `:root` porque **rampa não tem tema**: o `.dark` troca qual
degrau um alias aponta, nunca o valor do degrau.

### As medições, nas três superfícies e nos dois temas

Texto sobre a tinta a 15% composta sobre cada superfície. Composição em ponto
flutuante, sem arredondar por canal.

| | | elevada | surface | base | |
|---|---|---|---|---|---|
| **claro** | `on-tint-success` 700 | 4,39 | 4,76 | 4,57 | **reprovava** |
| | `on-tint-success` **800** | **6,15** | **6,67** | **6,41** | passa |
| | `on-tint-danger` 700 | 4,89 | 5,32 | 5,10 | já passava |
| | `on-tint-info` 700 | 5,20 | 5,64 | 5,42 | já passava |
| **escuro** | `on-tint-danger` 400 | 4,38 | 5,07 | 5,51 | **reprovava** |
| | `on-tint-danger` **300** | **6,38** | **7,39** | **8,02** | passa |
| | `on-tint-info` 400 | 4,40 | 5,16 | 5,65 | **reprovava** |
| | `on-tint-info` **300** | **6,21** | **7,28** | **7,96** | passa |
| | `on-tint-success` 400 | 5,51 | 6,48 | 7,09 | já passava |

`warning` passa nos dois temas desde a E2 e não é tocado.

### A previsão da E9 estava metade certa, e a metade errada importa

A nota de numeração dentro da E9 diz que "a correção é levá-los ao **degrau
800**". Isso vale para o **tema claro**, e é o oposto do que o escuro precisa.

No claro os `on-tint` são degraus **700**, texto escuro sobre tinta clara: subir
para o 800 escurece o texto e afasta os dois. No escuro os `on-tint` são degraus
**400**, texto claro sobre tinta escura: ali o 800 seria quase preto sobre um
fundo quase preto. A direção certa é **descer** para o 300, clareando.

É o mesmo raciocínio que a E1 fixou para `--action` — o degrau que carrega um
papel inverte com o tema — aplicado agora ao texto sobre tinta. Fica escrito
porque a previsão em prosa era plausível o suficiente para alguém aplicá-la nos
dois temas sem medir.

### Por que estes três ficaram para trás

É a mesma lacuna da **E2**, no mesmo lugar. Ela mediu `--on-tint-warning` nas
três superfícies, achou 4,47 e levou-o ao 800 — e **não** repetiu a medição para
`success`, `info` e `danger`. Os três seguiram no degrau original por mais oito
emendas.

A regra que a **E5** escreveu existe exatamente para isto: contraste de token de
texto se mede contra `--surface`, `--bg-base` **e** `--surface-elevated`. A E2 a
seguiu para um token e não para os vizinhos dele.

### Como foi achado

Por três caminhos independentes, que chegaram aos mesmos números:

1. **Varredura estática** dos arquivos do ChamadosHS, resolvendo os `var()` na
   unha, durante a Fase 7.
2. **Medição no navegador**, a partir de `getComputedStyle`, na galeria de
   componentes — 96 amostras × 2 temas no Checkpoint 2. Ela reproduziu os três
   sozinha, sem ninguém procurá-los.
3. **Cálculo direto** sobre os valores da rampa, ao preparar esta emenda.

Nenhum deles compartilha uma linha de código com os outros.

O caso é real e não teórico: `ChamadoModal.tsx:356` põe os selos de status, de
prioridade e o de "Cancelado" dentro de um `<aside>` com `--surface-elevated` —
a tela mais usada do sistema.

---

