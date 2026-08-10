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

Nada pendente.

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
