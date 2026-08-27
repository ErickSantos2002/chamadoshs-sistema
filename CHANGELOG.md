# Changelog

Mudanças relevantes do front-end do ChamadosHS, no formato
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

O projeto não usa tags de versão: as datas abaixo vêm do histórico do Git, e os
números são marcos de entrega, não releases publicadas.

A seção **⚠️ Requer ação no deploy** não faz parte do formato padrão. Existe
porque o deploy é manual e algumas mudanças só têm efeito depois de configurar
variável ou aplicar migration no repositório da API — sem esse aviso, a
informação se perde entre quem escreve o código e quem sobe.

---

## [Não publicado]

_Nada pendente._

---

## [1.7.0] — 2026-08-27

O front inteiro passou a usar a linguagem visual do **HelpHS**. Funcionalidade
do ChamadosHS, design do HelpHS — nenhuma rota, contrato de API, regra de
permissão ou dado de domínio mudou.

Doze fases, na ordem: tokens → casca → componentes → Dashboard → telas de
chamado → demais telas → Login → responsividade → revisão. Cada tela foi
migrada contra uma especificação escrita e auditada em seguida por um segundo
leitor, com uma pergunta só: mudou alguma coisa além de aparência? Foram 16
auditorias; nenhum campo, coluna, filtro, botão, estado vazio ou mensagem saiu.

### ⚠️ Requer ação no deploy

Nada além do rebuild do front. Sem migration, sem variável nova, sem alteração
no repositório da API.

### Changed

- **Paleta.** Os dez tokens semânticos (`--superficie`, `--borda`,
  `--conteudo`, `--sinal`) mantêm os nomes e recebem os valores do HelpHS —
  navy `#0D1B2A` no escuro, slate no claro.
- **Duas cores NÃO foram copiadas ao pé da letra**, porque
  `npm run validar:paleta` roda no build e exige 4,5:1: o `primary` do HelpHS
  (`#0EA5E9`) dá 2,77:1 sobre branco, então `--sinal` no tema claro é o
  `primary-700` `#0369A1`; e o `slate-500` que o HelpHS usa para texto apagado
  no escuro dá 3,36:1, então `--conteudo-tenue` é `#818FA3`.
- **Tipografia.** Plus Jakarta Sans, a fonte do HelpHS — hospedada no próprio
  bundle por `@fontsource`, e **não** no CDN do Google. O sistema roda na rede
  interna, e `src/recursos-externos.test.ts` existe porque já houve 12 ícones
  vindos do `img.icons8.com`. São 76 KB, zero requisição externa.
- **Cantos.** O bloco `borderRadius` zerado saiu do `tailwind.config.js`. As
  112 classes `rounded-*` já escritas em 25 arquivos voltaram a arredondar de
  uma vez, com `rounded-lg` = 8px e `rounded-xl` = 12px.
- **Ícones.** A base `Traco` passou de `1.5 / square / miter` para
  `1.75 / round / round` — uma linha virou os ~50.
- **Casca.** `Header` + `Sidebar` viraram `AppLayout` + `Sidebar` + `Topbar`.
  A barra lateral é uma só em todas as larguras: 256px no desktop, 72px
  recolhida com o rótulo em tooltip, gaveta sobre fundo escuro abaixo de `md`.
  Antes eram dois componentes lendo a mesma lista — e eles já tinham divergido
  uma vez, deixando o técnico sem metade do sistema numa janela estreita.
- **Nome, perfil, sair e o modo escuro** foram para o menu do usuário, no canto
  superior direito. O interruptor de tema morava no rodapé da barra lateral e
  sumia abaixo de `lg`; agora existe em qualquer largura.
- **O aviso de novidades** deixou de ser item na lista de áreas — não é uma
  área — e virou o número da versão no rodapé do menu, com o ponto de não-lido.
- **O espaçamento e o fundo do conteúdo** passaram a ser da casca (`p-4 md:p-6`
  no `<main>`). Eram dez cópias do mesmo `p-6`, uma por tela.
- **Larguras do `Modal`** desceram um degrau na direção do HelpHS.

### Added

- `src/components/layout/casca.test.tsx` e `src/components/ui/kit.test.tsx`:
  24 casos travando as medidas que definem "mesma família" — 256px, 72px,
  64px, os raios, o anel de foco — e que exista **um** `<nav>` na casca.
- Quatro casos novos em `src/lib/seletor.test.ts`, para a lista que passou a
  caber na altura da tela.

### Fixed

- **No celular, a tela de Chamados podia abrir sem mostrar chamado nenhum.** O
  quadro é o único `flex-1` entre irmãos que não encolhem: numa tela de 667px o
  cabeçalho empilhado e o card de tarefas comiam tudo, e as colunas ficavam com
  altura perto de zero — sem barra de rolagem e sem aviso, porque o quadro é
  `overflow-hidden`.
- **O botão flutuante da Central HS cobria o "Salvar"** das janelas no celular,
  e ficava por cima da gaveta lateral: o toque que deveria fechar o menu abria
  um site externo. Era `z-50`, o mesmo do modal, e vinha depois no DOM.
- **As listas de escolha abriam para fora da tela** quando o campo estava na
  metade de baixo, e as últimas opções eram inalcançáveis no toque — rolar
  fecha a lista, de propósito. Agora elas abrem para cima quando não cabem
  embaixo, e sempre recebem um teto igual ao espaço que existe de fato.
- **Rolagem aninhada** em três lugares: comentários e histórico da tela de
  detalhe, e o carregador de rota. Os tetos vinham de quando a página inteira
  rolava; com o `<main>` rolando, davam duas barras verticais coladas.
- **Quatro janelas da tela de detalhe rolavam por inteiro**, então o título
  subia e sumia e a barra de ações saía da tela em formulário longo. Passaram a
  usar o `Modal` do kit, com cabeçalho e rodapé fixos.
- **`bg-superficie-base` usado dentro de componente** (coluna do quadro, ficha
  do ChamadoModal, item do NovidadesModal, card da SlaTab). É o fundo do
  `<main>`: num card ele repete a cor da página e o bloco some.
- **`border-borda-suave` como divisor de card** em cinco lugares. No tema
  escuro esse token vale o mesmo que `--superficie` — a régua existia no CSS e
  não na tela.
- **Sete rótulos de campo** usavam o rótulo de painel: "Usuário", "Senha",
  "Quem fez", "De", "Até" e mais dois apareciam em caixa alta monoespaçada, que
  é a forma de dado de máquina.
- **`estiloDoGrafico` estava com os hexadecimais da paleta antiga.** O Recharts
  recebe cor como string em JS e não enxerga classe do Tailwind, então aquela
  cópia manual não acompanhou a troca — a grade dos gráficos ficou no
  cinza-azulado antigo dentro de cards já slate.
- **O tooltip do botão da Central HS** era texto branco sobre superfície clara
  no tema claro, e o pulso da animação cobria a logo a cada ciclo.
- `estilos.test.ts` acusava os dois lados de um ternário como conflito de
  fundo — eles nunca chegam juntos ao elemento — e, pelo mesmo descuido,
  **escondia** o caso real de um fundo fixo com outro condicional por cima.

### Removed

- **A linguagem de console, inteira.** Ela foi construída da 1.3 à 1.6.13 e é
  incompatível com o alvo: `Colchetes` (12 painéis + o componente), o `Rotulo`
  monoespaçado, as camadas `.malha` / `.vinheta` / `.varredura` do login, os
  keyframes `subir` / `acender` / `varrer`, o breakpoint `alto:` e o token
  `fontSize.rotulo`.
- `src/components/Header.tsx` (223 linhas) e `src/components/Sidebar.tsx`
  (116 linhas), absorvidos pela casca nova.

Monoespaçada continua no sistema onde ela informa: protocolo, data, contador,
versão.

---

## [1.6.13] — 2026-08-17

### Added

- **Atribuir o responsável direto na janela do chamado.** Para a equipe, o
  campo Responsável da ficha vira uma lista — escolher já salva, como as ações
  de status. Contas de serviço e contas desativadas não aparecem. Antes era
  preciso abrir a página inteira só para dizer de quem é o chamado.

### Fixed

- No tema escuro, o cartão de comentário do chamado aparecia claro, com o nome
  do autor ilegível por cima. Duas classes de fundo disputavam o elemento — a
  antiga e a que veio substituí-la — e vencia a errada.
- Na edição do chamado, escolher **"Sem atribuição"** ou **"Sem categoria"**
  não limpava nada: o salvar confirmava e o chamado continuava como estava. A
  limpeza era descartada em silêncio antes de chegar à API.

---

## [1.6.3 – 1.6.11] — 2026-08-14

Um dia inteiro de acabamento sobre o redesenho, guiado por prints de uso real.

### Added

- **Listas de escolha próprias em todo o sistema** — filtros e formulários. A
  lista aberta de um `<select>` é desenhada pelo Windows e aparecia branca no
  meio do tema escuro. As novas seguem o tema, aceitam teclado completo e
  busca por digitação ("cr" pula para Crítica, "ga" para Gabriel), e as opções
  de status e prioridade mostram a mesma cor que têm nos gráficos.
- **Conjunto próprio de ícones**, desenhado na linguagem do sistema: traço
  fino, ponta reta e canto vivo, como as bordas de todo o resto. Sai a
  biblioteca de catálogo, saem também os caracteres (☰, ×, ✅) que faziam
  papel de ícone.

### Changed

- Nas janelas de cadastro, **Salvar e Cancelar ficam fixos embaixo** — no
  cadastro de usuário, o mais longo, era preciso rolar até o fim para salvar.
  As janelas passam a ter a altura do que mostram.
- Os estados de carregando, falha e vazio da trilha de auditoria viraram um
  componente só, compartilhado entre a tela de Auditoria e o histórico da
  conta — as duas cópias já tinham divergido, e uma falha de rede no painel
  parecia "esta conta não tem nada".
- O build passa a recusar código morto (`noUnusedLocals`), depois de uma
  varredura que zerou os 15 pontos acumulados.

### Fixed

- **O menu de telas estreitas mostrava só Dashboard e Chamados** — escondia
  Cadastros, Auditoria e Tarefas Recorrentes de todo mundo que não fosse
  administrador, inclusive dos técnicos. Era uma segunda lista de menu que
  ficou para trás quando a primeira mudou; agora as duas leem a mesma fonte.
  A gaveta também ganhou rolagem, para o Sair não cair para fora em tela baixa.
- O perfil deixou de depender de acento e caixa: se a tabela de roles um dia
  gravar "Técnico", o técnico continua entrando depois do F5 — a mesma
  tolerância que a API já tinha.
- O relógio do login não pula mais segundos, e a faixa de estado não transborda
  no estreito. A 1.6.3 restabeleceu a regra de que **cada build tem um número
  só dele** — dois consertos tinham subido sem passar pela versão.
- O seletor fechava quando se rolava a própria lista — com trinta nomes,
  parecia que nenhum modal rolava.

---

## [1.6.0 – 1.6.2] — 2026-08-13

### Added

- **Ações de atendimento na janela do chamado**: iniciar, marcar como
  aguardando, resolver e reabrir, sem abrir a página inteira. Ao resolver, o
  campo da solução aparece ali mesmo, no lugar dos botões — a solução continua
  obrigatória.
- Relógio na tela de login, ao lado da versão e do estado do sistema.

### Changed

- **O menu mostra todas as áreas para todo mundo.** Quem abre uma área que não
  é do seu perfil encontra uma explicação — qual é, de quem é, a quem pedir
  acesso — em vez de a opção simplesmente não existir. Quem protege é a API.
  A tela de acesso restrito deixou de piscar "ACESSO NEGADO" em vermelho.

---

## [1.5.0 – 1.5.2] — 2026-08-13

### Added

- **Tela de Auditoria**: a trilha dos cadastros com filtros por tipo, autor e
  período, incluindo a coluna Origem — a rota que gravou cada evento, capaz de
  revelar um cliente da API que ninguém lembrava.

### Changed

- O técnico ganha Cadastros (menos a aba de Usuários, que é controle de
  acesso) e a Auditoria de setores. Acompanha a mudança de permissões da API.

### Fixed

- Quando a consulta da trilha falha, a tela diz que **não conseguiu
  perguntar** — antes afirmava "nada foi registrado" por cima do erro, uma
  conclusão falsa sobre o passado feita por quem acabou de admitir que não
  sabe.

---

## [1.4.2 – 1.4.8] — 2026-08-13

A linguagem de console aplicada ao sistema inteiro, e os cadastros alinhados ao
novo contrato da API.

### Added

- **Histórico da conta** no cadastro de usuário: quem criou, quem alterou o
  quê, quando — lado a lado com o formulário.
- Avaliação por estrelas na janela do chamado, onde o solicitante de fato
  volta — na página de detalhe, 12 de 144 chamados foram avaliados em nove
  meses.

### Changed

- **Excluir vira desativar/reativar, com o nome certo.** A lixeira prometia
  apagar onde o sistema desativa; agora os cadastros usam
  `PATCH /desativar` e `/reativar`, registro fica, e dá para desfazer.
- Tema aplicado a todas as telas restantes; as últimas cores cruas saíram e o
  status tem uma fonte única de cor, do painel ao gráfico.

### Fixed

- O login era cortado em cima e embaixo na TV da sala (paisagem, tela baixa),
  sem rolagem possível — e mais três alturas quebradas no mesmo cenário.

### ⚠️ Requer ação no deploy

- Exigiu a API com as rotas `PATCH` de desativar/reativar — os dois
  repositórios subiram juntos em 13/08.

---

## [1.3.0 – 1.3.2] — 2026-08-11/12

A fundação do redesenho, entregue junto com o que estava pendente de publicação.

### Added

- **Fundação de tema**: tokens de cor por papel (superfície, borda, conteúdo,
  sinal), modo claro e escuro da mesma linguagem, e o kit de componentes.
- Quadro de chamados redesenhado; abrir e consultar chamado **sem sair do
  quadro**.
- Aviso **"O que há de novo?"**, aberto sozinho a cada versão nova.
- Ao escolher a prioridade de um chamado novo, o formulário mostra o prazo que
  ela compromete.
- Selo **Avaliar** na lista, nos chamados resolvidos do próprio usuário ainda
  sem nota.

### Changed

- Modais unificados num componente só; prazos de SLA redesenhados.
- Avisos bloqueantes (`alert`) viraram toast.
- Ícones deixam de vir do `img.icons8.com` e entram no bundle — some a
  dependência de servidor de terceiro e o host interno deixa de ser anunciado
  a um domínio externo.

### Fixed

- **O solicitante volta a conseguir avaliar o atendimento** — a nota ia pelo
  endpoint de edição, restrito à equipe, e quem abriu o chamado recebia "sem
  permissão". Agora vai por endpoint próprio (`PATCH /chamados/{id}/avaliar`),
  que aceita só a nota.
- Login redesenhado, e as cores dos gráficos validadas para daltonismo — as
  quatro colisões de deuteranopia da paleta anterior foram refeitas.
- O detalhe de erro da API é normalizado antes de chegar às telas.

---

## [1.2.0] — 2026-08-10

Entrega concentrada em segurança, confiabilidade e as primeiras garantias
automatizadas. Acompanha o fechamento da API, que até então respondia sem
exigir autenticação.

### Added

- Renovação automática da sessão. O token era válido por algumas horas e nada o
  renovava: ao vencer, o usuário era jogado na tela de login no meio do
  atendimento. Agora a renovação acontece sozinha, antes de expirar.
- Aviso na tela quando a API recusa uma ação por falta de permissão. Antes o
  botão simplesmente não fazia nada.
- Marcação de **conta de serviço** no cadastro de usuários, com caixa no modal.
  Contas que não representam pessoas — painel de parede, login de integração —
  deixam de aparecer no seletor de Técnico Responsável, mas continuam
  acessando o sistema normalmente.
- Suíte de testes automatizados (46 casos) e checagem de tipos no build.

### Changed

- Administradores voltam a aparecer como técnicos atribuíveis. Quem administra
  o sistema também atende chamado, e o seletor listava só quem tinha perfil de
  técnico.
- **Cadastros** passa a ser exclusivo de administrador. Para o técnico a tela
  inteira era botão que respondia "sem permissão" — a API restringiu essas
  operações.
- Telas de chamados carregam mais rápido: os nomes dos envolvidos vinham de uma
  requisição por pessoa, e agora vêm de uma listagem só.
- Mensagens de erro ao atualizar chamado passam a mostrar o motivo devolvido
  pela API, em vez de um texto fixo.

### Security

- O front-end deixa de informar quem praticou cada ação. Esse dado era enviado
  pelo navegador e podia ser adulterado, o que tornava a trilha de auditoria
  falsificável. A autoria passa a vir do token de autenticação, no servidor.
- Arquivos `.env` deixam de entrar na imagem Docker. Podiam sobrescrever a
  configuração de build e publicar o sistema apontando para o ambiente errado.

### Fixed

- Leitura de campos de cadastros alinhada ao contrato real da API.
- `EXPOSE` do Dockerfile alinhado à porta que o nginx realmente escuta.
- Dependências não utilizadas removidas, com correção de vulnerabilidades
  reportadas pelo `npm audit`.

### ⚠️ Requer ação no deploy

- **Rebuild da imagem** do front — `VITE_API_URL` é embutida no bundle em tempo
  de build e precisa ser passada como *build arg*, não como variável de runtime.
- A marcação de conta de serviço depende do campo `conta_de_servico`, entregue
  pela API. Sem ele, o comportamento é o anterior — nenhuma tela quebra.

---

## [1.1.0] — 2026-07-16

### Added

- **Tarefas recorrentes**: cadastro, registro de execução, histórico e exclusão,
  com confirmação reforçada quando a tarefa já tem execuções registradas.
- Lembrete das tarefas do dia na tela de chamados, mantendo visíveis as que já
  foram realizadas.
- **SLA de atendimento**: selo nos cards e no detalhe do chamado, métricas no
  dashboard e aba de configuração dos prazos por prioridade.
- Filtro por categoria na lista de chamados e filtro por período no dashboard.
- Tempo em aberto exibido nos detalhes do chamado.

### Fixed

- A listagem de chamados carregava só a primeira página; passa a buscar todas.
- O dashboard mostrava 0% quando não havia dados de SLA, sugerindo desempenho
  ruim onde na verdade não havia medição.
- Os prazos de SLA não eram recarregados ao reabrir a aba.
- Ao falhar a exclusão de uma categoria, a tela passa a informar quantos
  chamados estão vinculados a ela.

---

## [1.0.0] — 2026-01-06

Primeira versão em operação.

### Added

- Abertura, listagem, detalhamento e acompanhamento de chamados.
- Comentários e histórico de ações por chamado.
- Cadastros básicos: usuários, setores e categorias.
- Dashboard com indicadores.
- Autenticação com perfis de Administrador, Técnico e Usuário.
- Arquivamento e cancelamento de chamados.
- Modo escuro e layout responsivo.
