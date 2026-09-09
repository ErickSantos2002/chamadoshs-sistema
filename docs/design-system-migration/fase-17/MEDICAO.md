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

**Não corrigido nesta rodada, por decisão do operador** — a medição completa das
quatro telas vem antes de decidir escopo de correção.

---

## O que NÃO foi medido, e a razão

**As seis larguras da §20 não foram medidas.** A janela do Chrome sob controle
remoto não redimensiona: `resize_window` **relatou sucesso e não mudou nada**,
três vezes seguidas, e mais duas numa aba recém-criada contra documento
sintético.

```
inner 900x1271 | outer 0x0 | screen 900x1440 | dpr 1
```

`outer 0x0` com `screen` de 900×1440 é janela sob automação, não janela do
sistema operacional.

**Quem pegou foi a régua da própria sonda** — o antídoto adotado depois da régua
que oscilava no Checkpoint 3. Sem ela, três medições idênticas teriam entrado no
registro como três larguras diferentes.

| largura | estado |
|---|---|
| 360×740 | **não medida** — a janela não redimensiona por automação |
| 390×844 | **não medida** — idem |
| 768×1024 | **não medida** — idem |
| 1366×768 | **não medida** — idem |
| 1920×1080 | **não medida** — idem |
| 2560×1440 | **não medida** — idem |
| **900×1271** | medida — é a régua em que a janela ficou presa |

A 900×1271 **não é uma das seis** e não substitui nenhuma. Fica no registro como
o que é: uma sétima largura, não planejada, que veio de graça.

O operador redimensiona à mão e roda `LINHA-DA-SONDA.txt` em cada largura. Como a
página já está carregada, **nenhuma das seis custa chamada nova**.
