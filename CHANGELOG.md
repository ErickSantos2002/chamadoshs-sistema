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

_Nada pendente. O ciclo de modificações de agosto fechou na 1.6.13._

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
