# Screenshots da casca — Checkpoint 1

As oito imagens que a §26 exige e que o relatório do Checkpoint 1 registrou como
**não feitas** (decisão 2). Tiradas em 02/09/2026, depois que o operador
autorizou a galeria de desenvolvimento.

## Por que faltavam

A casca só existe depois do login, o login depende da API, e o front rodando
sozinho não passa da tela de login — que não usa casca. O relatório deu duas
saídas: subir o ambiente e dirigir o navegador, ou registrar como limitação
(que foi o que a sessão do HelpHS fez, no D6). O operador escolheu uma terceira:
uma galeria de desenvolvimento.

## Como foram tiradas

`/dev/galeria` (`src/pages/dev/GaleriaDaCasca.tsx`) monta a casca **de verdade**
— o mesmo `AppLayout`, a mesma `Sidebar`, a mesma `Topbar` — sem token, sem API
e sem rede, com o estado escolhido pela URL. Não é uma segunda casca: se a
`Sidebar` mudar, a foto muda junto. É o que faz o screenshot valer como prova.

A rota só existe sob `import.meta.env.DEV`. Depois do build, nenhum arquivo de
`dist/` contém a palavra "galeria".

Cada imagem tem um endereço, e é só abri-lo para refazê-la:

| Arquivo | URL (com `npm run dev`) |
|---|---|
| `chamadoshs-casca-barra-expandida-claro-1366.png` | `/dev/galeria?estado=expandida&tema=claro&largura=1366&altura=768` |
| `chamadoshs-casca-barra-expandida-escuro-1366.png` | `/dev/galeria?estado=expandida&tema=escuro&largura=1366&altura=768` |
| `chamadoshs-casca-barra-recolhida-claro-1366.png` | `/dev/galeria?estado=recolhida&tema=claro&largura=1366&altura=768` |
| `chamadoshs-casca-barra-recolhida-escuro-1366.png` | `/dev/galeria?estado=recolhida&tema=escuro&largura=1366&altura=768` |
| `chamadoshs-casca-gaveta-claro-390.png` | `/dev/galeria?estado=gaveta&tema=claro&largura=390&altura=844` |
| `chamadoshs-casca-gaveta-escuro-390.png` | `/dev/galeria?estado=gaveta&tema=escuro&largura=390&altura=844` |
| `chamadoshs-casca-topbar-menu-claro-1366.png` | `/dev/galeria?estado=recolhida&tema=claro&titulo=Chamados&…` + clique no avatar |
| `chamadoshs-casca-topbar-menu-escuro-1366.png` | `/dev/galeria?estado=recolhida&tema=escuro&titulo=Chamados&…` + clique no avatar |

As resoluções são as que a §28 pede: **1366×768** e **390×844**, e os arquivos
têm exatamente essas dimensões em pixel. Quem garante isso é a moldura da
galeria — um iframe de tamanho exato, colado em (0,0). A janela do navegador
estava maximizada em 1920×1080 e ignorou o pedido de redimensionamento **em
silêncio**; dentro do iframe, o `h-screen` da casca e as media queries valem
contra o tamanho do iframe, então a 390px a barra vira gaveta de verdade, no
mesmo `md` de sempre.

## O que cada imagem mostra

**Barra expandida (256px)** — os cinco itens com rótulo, os dois grupos
(`PRINCIPAL`, `GESTÃO`) em `--text-muted` e não em `--text-faint` (decisão
D4-a), o logo de 28px, o rodapé com a versão e o ponto de novidade.

**Barra recolhida (72px)** — é o estado em que a casca NASCE, e não por
preferência: o quadro de chamados numa TV em paisagem tem seis colunas de 268px,
e a barra aberta come quase uma delas. O monograma no topo usa `--action-tint`.

**Gaveta (390px)** — abaixo de `md` a barra vira gaveta de 256px sobre o
`--overlay` (preto a 60%, valor do pacote; era `bg-black/50` escrito à mão).

**Topbar com o menu aberto** — mostra de uma vez o `<h1>` da §9 que este
checkpoint acabou de abrir (aqui preenchido com "Chamados", pela prop
`pageTitle`), o avatar, nome em `--text-body` e papel em `--text-xs` /
`--text-muted`, e o menu com **Modo escuro** e **Sair** — os dois itens que o
checklist de preservação funcional (§29) exige que continuem existindo.

## O que conferir nelas (§28)

Fonte Plus Jakarta Sans nas duas telas; canto **reto** em tudo, menos avatar e
ponto de status (decisão D2-a); traço de 1px embaixo da topbar e à direita da
barra; topbar de 64px; barra de 256/72px; escuro em **navy** (`#0D1B2A` de
fundo, `#132238` de superfície) e não em cinza-carvão; grade de 4px, com 24px de
respiro no `<main>`.

## Limitações, para não passarem por cumpridas

- **Não há antes/depois.** A §28 pede a linha de base da Fase 0, e ela não
  existe para telas autenticadas, pelo mesmo motivo que estas faltavam. Estas
  imagens são o **depois**; o antes está só no código, em `git show 165d919`.
- **A pessoa é falsa.** "Galeria DEV / Administrador" é um objeto fixo no
  código da galeria. Nenhuma conta real aparece nestas imagens.
- **O `<main>` é da galeria, não de uma tela do sistema.** O que está sendo
  fotografado é a casca. As telas migram nas Fases 11–16 e são fotografadas lá.
