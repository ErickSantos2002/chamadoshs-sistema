# Fase 17 — a medição das quatro telas

**09/09/2026.** Sonda da §20 contra produção, em leitura pura, autorizada pelo
operador com o número de chamadas dito antes.

---

## O custo, medido e não estimado

| tela | chamadas | o que pediu |
|---|---:|---|
| `/dashboard` | **6** | `chamados/` ×3, `usuarios/` ×2, `categorias/` ×1 |
| `/cadastros` | **10** | `usuarios/` ×4, `categorias/` ×3, `setores/` ×2, `chamados/` ×1 |
| `/chamados/novo` | **7** | `usuarios/` ×3, `sla-configs/` ×2, `chamados/` ×1, `categorias/` ×1 |
| `/chamados/6` | **14** | `categorias/` ×4, `usuarios/` ×3, `comentarios/`, `historico/`, `categorias/2` ×2 cada, `chamados/` ×1 |
| **total** | **37** | |

**Nenhum login:** o token já estava no `localStorage`.

### A estimativa estourou, e por quê

Eu havia dito **12 a 20**. Chegaram **37** — 85% acima do teto. A causa está no
padrão das contagens:

```
/chamados/6   comentarios 2   historico 2   categorias/2 2
```

`React.StrictMode` está ligado no `main.tsx` e, em desenvolvimento, **monta e
remonta** cada componente. Os efeitos disparam duas vezes.

**Isso não desconta nada.** As 37 chegaram à produção de verdade, e é esse o
número que vale para a regra do "número dito antes". O que a causa ensina é do
lado da **estimativa**: quem estima lendo código conta cada efeito uma vez, e o
navegador em desenvolvimento dispara duas. Registrado no `DECISOES.md`.

---

## O que a sonda achou, em 900×1271

A janela ficou travada nessa régua — ver a seção seguinte.

| tela | cortado | **alvo < 40px** | coberto | sobreposto | controles |
|---|---:|---:|---:|---:|---:|
| `/dashboard` | 0 | **9** | 0 | 0 | 32 |
| `/cadastros` | 0 | **26** | 0 | 0 | 38 |
| `/chamados/novo` | 0 | **9** | 0 | 0 | 18 |
| `/chamados/6` | 0 | **8** | 0 | 0 | 17 |

**Três dos quatro critérios estão limpos nas quatro telas.** Nada cortado, nada
coberto, nada sobreposto. O único que falha é o alvo de toque — e falha em
**todas**.

### O alvo de toque, que é o achado da rodada

Nenhum é marginal por largura: **todos falham pela ALTURA**, entre 16 e 38px
contra o piso de 40.

**Os dois que aparecem em todas as telas** — são da casca:

```
a.flex.items-center       36×36    o logo, na barra lateral
button.hidden.md:flex     36×36    recolher a barra
```

**`/cadastros` — 26, e é o pior caso.** A tabela multiplica: cada linha traz
quatro botões de ação de **32×32**, e os cabeçalhos ordenáveis têm **16px de
altura**:

```
button.rounded-lg.p-2         32×32    ×4 por linha (ver, editar, senha, desativar)
button "ID" / "Nome" / "Criado em"  ~16    cabeçalhos ordenáveis
button "Nova Categoria"      160×36
input.w-full.rounded-lg      256×38    busca
button.inline-flex            50×34
```

**`/dashboard` — 9.** Os quatro botões de período e os dois seletores:

```
button "Cancelados ocultos"          184×34
button "Este mês" "Mês passado"
       "Últimos 30 dias" "Tudo"        ×34
button "Todos" / "Todas"             350×38
```

**`/chamados/novo` — 9.** Campos e ações a 38px, e o "Voltar" a **16px de
altura**:

```
button "Voltar"                       54×16
input / seletores                       ×38
button "Cancelar" / "Abrir chamado"     ×38
```

**`/chamados/6` — 8.** As quatro ações do chamado a 38px, e o "Voltar" a 20px:

```
a "Voltar"                            60×20
button "Cancelar Chamado" "Arquivar"
       "Editar Detalhes" "Reabrir"      ×38
button "Enviar Comentário"           155×36
```

### O padrão, que importa mais que a contagem

Há **três famílias**, e cada uma tem um conserto diferente:

| família | altura | onde | natureza |
|---|---|---|---|
| **botão-ícone quadrado** | 32–36 | ações de tabela, casca | falta de área |
| **controle de formulário** | 38 | campos, seletores, botões de ação | falta **2px** |
| **botão que é texto** | 16–20 | "Voltar", cabeçalhos ordenáveis | sem área nenhuma; é `<button>` com aparência de link |

A terceira é a mais séria e a menos visível: um "Voltar" de **54×16** é alvo de
toque de 16px de altura. Numa captura ele parece um link normal.

A segunda é a mais barata: **dois pixels** separam 38 de 40.

---

## Pendência dimensionada: os 52 alvos, e a ordem de conserto

**Decisão do operador, 09/09/2026: registrado e NÃO corrigido nesta fase.**

**São 52 alvos em quatro telas** — 9 + 26 + 9 + 8. Mexer em altura de controle é
**mudança visual em todo o sistema**, e a comparação pede o "antes" da Fase 19.

> Corrigir agora seria corrigir **às cegas**: sem linha de base, ninguém
> distingue "o botão cresceu 2px" de "a tela inteira andou".

E é a mesma ordem que a Fase 16-H estabeleceu para a tabela de cores: **mostrar
antes de virar código**, quando a mudança carrega mais do que parece carregar.

### A ordem quando chegar a vez

| # | família | altura | conserto | por que nesta posição |
|---|---|---|---|---|
| **1** | controle de formulário | 38 | **38 → 40** | dois pixels, o mais barato e o mais espalhado — campos, seletores, `Cancelar`, `Abrir chamado`, as quatro ações do chamado |
| **2** | botão-ícone quadrado | 32–36 | área, com o ícone no tamanho | quatro por linha de tabela; muda densidade, e aí já se vê contra a linha de base |
| **3** | botão que é texto | 16–20 | área de toque sem virar botão desenhado | **por último, porque é o que muda a aparência de verdade** — `Voltar` e os cabeçalhos ordenáveis parecem link, e têm de continuar parecendo |

A terceira é a mais séria em risco de uso e a mais delicada em desenho: dar 40px
de altura a um "Voltar" de 54×16 sem transformá-lo num botão é o trabalho, e não
o número.

---

## As seis larguras, medidas — e por que meio

**Medidas pelo operador em 09/09/2026**, todas em `/chamados/6`, **sem
recarregar**: nenhuma das seis custou chamada nova.

### O meio importa, e muda o que eu havia escrito

**Modo dispositivo do DevTools (Responsivo, DPR 1)** — e não janela real. Foi
isso que tornou **1920 e 2560 alcançáveis** nesta máquina, cuja tela não comporta
nenhuma das duas.

Eu havia registrado as seis como **"não medidas — a janela não redimensiona por
automação"**. A frase estava certa sobre o **`resize_window`**, que relatou
sucesso falso cinco vezes, e **errada sobre a conclusão**: eu tratei o limite de
uma ferramenta como limite do ambiente.

> **"Não consegui" não é "não dá".** O caminho existia, era o mesmo que o
> Checkpoint 3 já tinha usado para as dezesseis capturas, e não passava pela
> ferramenta que falhou.

Fica no registro porque a diferença é prática: **as seis foram medidas**, e a
§20 está coberta nas seis larguras que ela pede.

### A série

Todas em `/chamados/6`, tema único, DPR 1.

| largura | cortado | coberto | sobreposto | **alvo < 40px** | cobertura aferida |
|---|---:|---:|---:|---:|---|
| 360×740 | 0 | 0 | 0 | **8** | 8 de 17 |
| 390×844 | 0 | 0 | 0 | **8** | 8 de 17 |
| 768×1024 | 0 | 0 | 0 | **8** | 14 de 17 |
| 1366×768 | 0 | 0 | 0 | **8** | 14 de 17 |
| 1920×1080 | 0 | 0 | 0 | **8** | 14 de 17 |
| 2560×1440 | 0 | 0 | 0 | **8** | 16 de 17 |
| *900×1271* | *0* | *0* | *0* | *8* | *sétima largura, não planejada* |

`sr_only_ignorados: 1` nas seis — o link de pular conteúdo, no balde próprio.

### 1. O alvo de toque não depende da largura

**Oito em todas as seis, com as mesmas dimensões, nome por nome:**

```
a.flex.items-center                    36×36
button.md:hidden.rounded-lg            36×36   (vira button.hidden.md:flex de 768 para cima)
a.mb-2.inline-flex "Voltar"            60×20
button "Cancelar Chamado"             187×38
button "Arquivar"                     113×38
button "Editar Detalhes"              160×38
button "Reabrir"                      106×38
button "Enviar Comentário"            155×36
```

**É falha de altura FIXA, e não de layout responsivo.** Isso confirma as três
famílias e **desqualifica qualquer conserto por breakpoint** — não há largura em
que o defeito melhore, então não há largura em que valha remendar.

O segundo item é o mais eloquente: o botão de recolher a barra **troca de
elemento** no `md` — `button.md:hidden` abaixo, `button.hidden.md:flex` acima — e
os dois têm 36×36. **A troca responsível preserva o defeito**, o que é a prova
mais direta de que ele não mora no layout.

### 2. Os três critérios geométricos passam nas seis

Cortado, coberto e sobreposto: **zero de 360 a 2560**. A §20 está cumprida nos
três, e não por uma medição única — por seis.

### 3. O que varia é o MÉTODO, e isso é limite declarado

A única coluna que se mexe é a cobertura aferida: **8 de 17** nas estreitas, **14
de 17** nas médias, **16 de 17** em 2560.

Não é o defeito mudando: é a **janela vertical**. `elementFromPoint` só responde
sobre o viewport, então em tela curta menos controles entram no teste de
cobertura.

> **Limite do método, registrado:** em viewport pequeno o critério "coberto" mede
> **menos controles**. O número de aferidos tem de ir na ficha **ao lado do
> resultado** — senão `"coberto 0"` em 360 parece a mesma afirmação que
> `"coberto 0"` em 2560, **e não é**.

**Consertado na sonda, e não só anotado.** O campo `coberto_resumo` passou a
grudar numerador e denominador:

```
coberto_resumo: "0 em 8 aferidos, de 17 controles"
```

Ao lado se perde na transcrição; grudado, não se perde. É a mesma família do
balde próprio do `sr-only`: **o que a checagem dispensa ou não alcança fica
visível no próprio resultado**, em vez de virar cegueira de quem lê.
