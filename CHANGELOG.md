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

## [1.9.0] — 2026-11-12

Por Rickelme David. Branch `feat/distribuicao-qualidade-fe-7` (FE-7,
distribuição interna dos chamados da Qualidade, com a API-14). Publicada em
12/11/2026.

### ⚠️ Requer ação no deploy

- **API-14 antes deste front.** O corpo da abertura da Qualidade deixou de
  levar `tecnico_responsavel_id`; a API-13 o exige, e responderia 422 a toda
  abertura para a Qualidade. A ordem inversa é segura: a API-14 continua
  aceitando o corpo do front 1.8.1, com o responsável.
- Rebuild da imagem do front. Sem variável nova, sem migration.
- Rollback do front para a 1.8.1 é seguro com a API-14 no ar: a abertura
  volta a pedir o responsável, e os chamados que estiverem aguardando
  atribuição aparecem nela como "Sem atribuição", com o seletor de
  responsável da equipe funcionando. A 1.8.1 não esconde os botões de status
  desses chamados; a API-14 recusa o clique com 409 e o motivo.

### Changed

- **Quem abre para a Qualidade não escolhe mais o responsável.** O campo
  "Responsável" saiu da abertura; no lugar fica a orientação "A equipe da
  Qualidade definirá o responsável." Descrição, Solicitante (para o
  administrador humano) e Prioridade seguem como eram. O corpo enviado tem
  quatro chaves — `setor_destino`, `descricao`, `prioridade`,
  `solicitante_id` —, e `tecnico_responsavel_id` não existe nele. **A
  abertura da TI não mudou**: mesmos campos, mesmo corpo, mesmas mensagens.
- **A Qualidade sem ninguém que atenda continua desabilitada na abertura**,
  com o motivo. Se a equipe ficar vazia entre a consulta e o envio, a API-14
  recusa com 409 e a tela mostra a mensagem dela, refaz a consulta e trava o
  envio da Qualidade; o texto digitado fica, e nada é reenviado nem vira TI.

### Added

- **"Aguardando atribuição".** O chamado da Qualidade sem responsável mostra
  isso no cartão do quadro (selo), na janela do chamado e na página de
  detalhes, no lugar de "Sem atribuição". Não é um status novo: é a ausência
  de responsável num chamado da Qualidade (`aguardaAtribuicao`, em
  `lib/atendimento`). Na TI nada muda — lá "Sem atribuição" segue o estado
  comum, e o chamado pode ser atendido. O filtro "Sem responsável" do quadro
  é o mesmo, e encontra a fila da Qualidade.
- **Botão "Assumir"**, nas ações do chamado, para o técnico da Qualidade
  (quem está em `GET /chamados/atendentes-qualidade`): atribui o chamado a
  quem clicou, pelo `PUT`, com a versão do chamado na tela, sem mudar o
  status. O administrador não assume — não é elegível como responsável na
  API —, e distribui pelo campo Responsável.
- **Atribuir e redistribuir** seguem pelo campo Responsável da janela e da
  edição, só entre os atendentes da Qualidade. No chamado que aguarda
  atribuição o seletor parte de "Aguardando atribuição", opção que aparece e
  não se escolhe; no chamado atribuído ela não existe, e "Sem atribuição"
  continua fora — o atribuído não volta à fila.
- **Sem responsável, a tela não oferece início de atendimento.** As ações de
  status dão lugar ao aviso e ao "Assumir"; na edição da página, o Status
  fica travado até um responsável ser escolhido (atribuir e mudar o status
  na mesma edição vai numa escrita só). Prioridade e os demais campos seguem
  editáveis, e editar um deles não manda responsável. É cortesia da tela: a
  regra é da API-14, que recusa a mudança de status sem responsável (409)
  no `PUT` e em `PATCH /chamados/{id}/atendimento`.
- **Conflito ao assumir ou atribuir (409 de versão):** outra pessoa gravou
  antes. A tela avisa, relê o chamado e mostra quem ficou; a atribuição
  **não é repetida** — a nova tentativa, se ainda couber, é um clique novo
  com a versão nova. Sem resposta (timeout, rede, 5xx), a tela diz que não
  confirmou, relê e não reenvia.
- O solicitante e o usuário comum não ganham controle nenhum: sem "Assumir",
  sem seletor de responsável, sem ações de status.

### Fixed

- **A dica do comentário interno dizia "equipe da TI" em chamado da
  Qualidade.** O texto era um só para os dois setores, mas desde a API-13 o
  interno é da equipe do setor do chamado: na Qualidade quem lê é a equipe
  da Qualidade, e a TI não. No chamado da Qualidade a dica passa a dizer
  "Visível só para administradores e para a equipe da Qualidade."; na TI,
  segue como era. Só o texto mudou — quem vê e quem cria é regra da API.

### Tests

- Novos: a fila em `AcoesRapidas.test.tsx` (quem vê o quê, o corpo do
  "Assumir", 409/428/404/400/503/sem resposta, a TI sem mudança),
  `ChamadoDetalhes.qualidade.test.tsx` (página e edição na fila),
  `ChamadoModal.test.tsx` (seletor na fila), `KanbanColumn.test.tsx` (selo),
  `lib/atendimento.test.ts` (`aguardaAtribuicao`, `podeAssumir`,
  `rotuloSemResponsavel`).
- Mudaram de expectativa, por descreverem a regra antiga: os casos da
  abertura da Qualidade que escolhiam o responsável
  (`NovoChamadoForm.test.tsx`, `NovoChamadoForm.solicitante.test.tsx`,
  `lib/qualidade.test.ts` — o corpo passa de cinco para quatro chaves, e
  "Selecione o responsável." deixa de existir) e "sem responsável atual, nada
  é inventado" em `lib/atendimento.test.ts` (o seletor ganha a opção
  desabilitada "Aguardando atribuição"). Os casos da abertura da TI não
  foram tocados.

---

## [1.8.1] — 2026-11-11

Por Rickelme David. Branch `fix/cache-index-1-8-1`. Publicada em 11/11/2026.

### Fixed

- **O navegador segurava a versão anterior depois de uma publicação.** O
  `nginx.conf` não dizia nada sobre o cache do `index.html`, e o navegador
  reaproveitava a cópia antiga por conta própria — ela aponta para o bundle
  da versão anterior, que fica um ano em cache. Na publicação da 1.8.0 a tela
  antiga (sem a escolha de setor) continuou aparecendo até um Ctrl+Shift+R.
  O `location /` passa a responder `Cache-Control: no-cache`: o navegador
  revalida o HTML a cada visita (304 quando nada mudou). Vale para `/` e para
  as rotas do React Router. Os arquivos com hash em `/assets` seguem com
  cache de um ano.

### ⚠️ Requer ação no deploy

- Só o front, com rebuild da imagem (o `nginx.conf` é copiado no build). Sem
  API, banco ou variável.
- Quem ainda estiver com o `index.html` antigo em cache precisa de um último
  Ctrl+Shift+R; a partir daí o recarregamento comum basta.

---

## [1.8.0] — 2026-11-11

Por Rickelme David. Branches `feat/setor-destino-fe-1` (FE-1, exibição e
filtro), `feat/setor-destino-fe-2` (FE-2, abertura para a Qualidade),
`feat/setor-destino-fe-3` (FE-3, atendimento da Qualidade),
`feat/setor-destino-fe-4` (FE-4, controle de concorrência na Qualidade),
`feat/setor-destino-fe-5` (FE-5, permissões da equipe da TI e API-9) e
`feat/setor-destino-fe-6` (FE-6, escolha obrigatória do setor e separação
entre as equipes, com a API-13), da funcionalidade Setor de Destino.

A versão subiu para **1.8.0** no FE-6, quando a publicação passou a ligar a
TI e a Qualidade juntas: o aviso de novidades fala das duas. Publicada em
11/11/2026, depois da API-13.

### ⚠️ Requer ação no deploy (FE-6)

- **API-13 antes deste front**, com `SETORES_TI_IDS` e `SETOR_QUALIDADE_ID`
  configurados. O front manda `setor_destino` em toda abertura e só libera a
  Qualidade quando a API a oferece; a API-13 aceita a abertura sem o campo
  (como TI, com aviso no log) só para o front antigo, durante a troca.
- Sem `SETOR_QUALIDADE_ID`, o formulário mostra a Qualidade desabilitada, com
  o motivo, e a TI abre normalmente.

### ⚠️ Requer ação no deploy (FE-1 a FE-5)

Nada além do rebuild do front, e **sem ordem obrigatória com a API**: o campo
é opcional. Contra a API no ar hoje — que não manda `setor_destino` — o quadro
sai igual ao de antes, e a janela e a página passam a mostrar "Setor de
destino: TI". O filtro e o selo "Qualidade" só aparecem com a API-1
(`chamadoshs-api`, PR #3, em Draft) e chamados de Qualidade na base, que só a
API-2 cria.

O FE-2 também **não tem ordem obrigatória com a API**: quem decide se a
Qualidade aparece é a própria API, pela consulta de atendentes. Contra a API no
ar hoje (rota ausente) e contra a API-2 sem `SETOR_QUALIDADE_ID` (503), o
formulário de abertura é exatamente o de antes. **Não configurar
`SETOR_QUALIDADE_ID` antes do API-3 e do FE-3**: é essa variável que liga a
abertura para todo mundo, sem rebuild do front.

O FE-3 também **não tem ordem obrigatória com a API**, mas só funciona com o
API-3 (`chamadoshs-api`, `d5e327f`) no ar. O front pergunta à API se ela tem o
atendimento da Qualidade, sem token e sem escrever nada; contra a API de hoje,
a API-1 e a API-2 a resposta é "não", e nada muda na tela. Para quem não é da
equipe, o quadro passa a fazer uma segunda listagem (a dos atribuídos), que
contra a API de hoje volta vazia.

O FE-4 **tem ordem: a API-4 (`chamadoshs-api`, `feat/setor-destino-api-4c`,
`dcb57e1`) sobe antes**. É ela que manda a `versao` do chamado e aceita a
`versao_esperada`. Na TI nada depende disso: as escritas da TI saem sem
versão contra qualquer API. Na Qualidade, contra a API-3 — que não manda a
versão —, o FE-4 não escreve: mostra "O servidor não informou a versão deste
chamado…" e guarda o que foi digitado. É a falha segura, sem cair para o `PUT`
nem para a TI; e é por isso que a ordem importa. **`SETOR_QUALIDADE_ID` segue
desligado** até a homologação integrada da API-4 com o FE-4.

O FE-5 **tem ordem: `SETORES_TI_IDS` configurada, depois a API com as etapas
5 a 9 (`chamadoshs-api`, `feat/setor-destino-api-9`, `0ac2571`), depois o
front.** É a API-7 que manda `integra_equipe_ti` no `/auth/me`, e a API-9 que
responde a lista de responsáveis da TI. Contra API anterior, a falha é segura:
sem `integra_equipe_ti` só o Administrador administra; contra a API-8 a lista
responde 422 e a troca de responsável da TI fica travada, sem cair para outra
lista. O rollback é coordenado: ver `docs/fe-5-permissoes-e-api9.md`, §11 e
§12. **`SETOR_QUALIDADE_ID` segue desligado.**

O fechamento complementar do FE-5 **tem ordem: a API-11 (`chamadoshs-api`,
`feat/setor-destino-api-11`, `5547893`) sobe antes do front.** É ela que
recusa a conta de serviço como equipe e como administração, e que responde
`GET /tarefas-recorrentes/lembretes-do-dia`. Antes de subir a API-11, contar
os administradores humanos ativos em produção: com zero, a administração
trava. O lembrete da TV só volta com `PAINEL_CONTAS_IDS` preenchida com o id
real da conta do painel — que ainda depende do inventário das contas; vazia,
a TV mostra o quadro sem o lembrete, sem aviso e sem erro. Contra API
anterior à API-11 o quadro segue, mas o lembrete não some em silêncio para
todo mundo: a rota não existe, o pedido cai em `/tarefas-recorrentes/{id}`, a
resposta não é 403, e quem recebe esse erro vê a caixa discreta "Não foi
possível carregar as tarefas do dia agora…", repetida a cada atualização
automática (lido no código; não homologado contra a API antiga). Mais um
motivo para a ordem. Detalhes em `docs/fe-5-permissoes-e-api9.md`, §14 e §15.

O fechamento final do FE-5 (T-1 e T-2) **não acrescenta ordem nem
variável**: nada muda na API. O seletor de solicitante e a edição da TI usam
o que a API-11 já responde; contra API anterior à API-4, que não manda a
versão, a edição da TI manda só a diferença, sem versão.

A integração do FE-5 com a API-12 (concorrência da TI) **tem ordem: a API-12
(`chamadoshs-api`, `feat/setor-destino-api-12`, `e12ce6d`) sobe antes do
front, ou junto.** Contra a API-11 o front funciona igual — ela já aceita
`versao_esperada` na TI e responde 409 à versão velha —, mas sem a trava da
linha: duas escritas com a mesma versão no mesmo instante ainda passam as
duas. Nenhuma variável nova, nenhuma migration. Rollback do front sozinho
volta as ações da TI ao "vale a última"; rollback da API sozinha mantém o
front funcionando, sem a trava. Detalhes em `docs/fe-5-permissoes-e-api9.md`,
§16.

### Added

- **Setor de atendimento obrigatório na abertura (FE-6).** O formulário
  "Novo Chamado" pergunta primeiro "Setor de atendimento", TI ou Qualidade,
  sem nenhum marcado — nem pelo perfil de quem abre, nem pela categoria — e os
  campos só aparecem depois da escolha. A escolha aparece sempre: sem a
  Qualidade na API, ela fica desabilitada com o motivo, e a TI abre. O envio
  sem setor é barrado pelo navegador e, se passar, pela tela ("Escolha o
  setor de atendimento."). A abertura da TI passa a mandar `setor_destino`
  explícito.
- **Cada equipe no seu setor (FE-6 + API-13).** O técnico da TI deixa de ver,
  editar e comentar em interno os chamados da Qualidade; o da Qualidade vê os
  da Qualidade, e ganha o comentário interno neles. O vínculo continua: quem
  abriu ou é o responsável segue lendo o chamado, de qualquer setor. O
  administrador humano segue com os dois.
- **Setor de destino do chamado — TI ou Qualidade — na janela e na página do
  chamado**, sempre, inclusive TI. Na página é um campo de leitura da ficha;
  nesta fase não se muda o setor de um chamado.
- **Selo "Qualidade" no cartão do quadro.** Chamado de TI não ganha selo: é o
  caso de quase todos, e o selo repetido em todo cartão viraria ruído.
- **Filtro por setor no quadro**, ao lado de prioridade, categoria e
  responsável, e incluído no "Limpar". Aparece só quando há chamados de mais de
  um setor, ou quando já está ligado. Filtra o que já foi carregado — não manda
  o setor para a API, que hoje ignoraria o parâmetro.
- **Setor que o sistema não reconhece não vira TI.** Aparece como "Setor não
  reconhecido: …" com o valor que chegou, só em "Todos os setores", e avisa no
  console uma vez por chamado. Chamado sem o campo, da API antiga, é TI.
- **Abertura de chamado para a Qualidade (FE-2).** Quando a API confirma que a
  Qualidade está ligada, o formulário de abertura oferece "Setor de destino:
  TI ou Qualidade", com TI marcado. Na Qualidade não há título nem categoria —
  o título é gerado da descrição — e o responsável é obrigatório, escolhido
  entre os atendentes que a API devolve, sem escolha automática. Descrição e
  prioridade atravessam a troca de setor; título, categoria e responsável
  ficam guardados para quem voltar.
- **Qualidade sem atendentes aparece desabilitada, com o motivo** ("Nenhum
  atendente da Qualidade cadastrado"). Qualidade desligada (503) não aparece, e
  não diz que faltam atendentes — são problemas diferentes, de pessoas
  diferentes.
- **A Qualidade nunca vira TI.** Se ela for desligada entre a abertura do
  formulário e o envio, aparece "A abertura para a Qualidade ficou
  indisponível. Abra para a TI ou tente mais tarde.", o texto digitado fica, e
  o envio só volta a sair se a pessoa escolher TI. Responsável que deixou de
  ser elegível (400) recarrega a lista, e a escolha que saiu dela é refeita.
- **Quem atende a Qualidade vê os chamados que atende (FE-3).** Além dos
  chamados que abriu, quem não é da equipe passa a ver no quadro os da
  Qualidade em que é o responsável — e só esses: chamado da TI não entra. O
  botão **"Atribuídos a mim"** mostra só eles; aparece quando há algum, fica
  enquanto ligado e entra no "Limpar". Técnico e Administrador continuam vendo
  o quadro de sempre.
- **Atendimento da Qualidade pelo responsável (FE-3).** Quem é o responsável
  por um chamado da Qualidade e está entre os atendentes muda o status —
  iniciar, aguardando, resolver, retomar, reabrir — pelos mesmos botões de
  sempre, na janela e na página, qualquer que seja o perfil. Resolver continua
  pedindo a solução, com o mesmo mínimo. As ações não aparecem em chamado
  cancelado ou arquivado. Se a API não tiver o atendimento, aparece "O
  atendimento da Qualidade não está disponível nesta versão do sistema." e as
  ações somem; o pedido nunca é refeito por outro caminho.
- **Comentário interno (FE-5).** Administrador e técnico da equipe da TI veem
  a opção "Comentário interno" ao comentar, na janela e na página, sempre
  desmarcada. Na lista, o interno traz o selo "Interno", em texto, e uma marca
  na borda. Se a API recusar o interno (a permissão mudou), nada é salvo, o
  texto fica e o envio trava até a pessoa escolher "Tornar público" — o
  comentário nunca vira público sozinho.
- **Chamado que deixou de ser seu (FE-5).** Quem perde o acesso a um chamado
  que estava vendo — saiu do setor, foi tirado da atribuição ou passou o
  chamado a outra pessoa — vê "Este chamado não está mais disponível para
  você." no lugar do chamado, na página e na janela. Ao trocar o responsável e
  perder o acesso por isso, a mensagem diz que a atribuição foi salva. O que a
  pessoa tinha digitado fica para copiar, nada é reenviado, e o card sai do
  quadro sem recarregá-lo.

### Changed

- **As escritas da TI levam a versão do chamado (FE-5 + API-12).** Mudar
  status pelas ações rápidas, resolver, cancelar com motivo, arquivar,
  desarquivar e trocar o responsável no modal mandam a versão do chamado que
  está na tela. Se outra pessoa mudou o chamado depois que ele foi mostrado,
  nada é gravado: a tela avisa "Este chamado foi alterado por outra pessoa",
  relê o chamado e espera um clique novo — nunca repete sozinha. A solução e
  o motivo digitados ficam. Sem resposta do servidor (queda, tempo esgotado,
  5xx), a tela diz que não conseguiu confirmar se salvou, relê e não reenvia.
- **O motivo do cancelamento não vai mais por cima do cancelamento de outra
  pessoa.** Se o chamado foi cancelado por outra pessoa enquanto o motivo era
  digitado, "Confirmar" não grava nada e o motivo fica no campo.
- **Dois cliques seguidos em arquivar ou cancelar mandam uma marca só.**
- **No modal do quadro, a resposta atrasada de um chamado não toma o lugar do
  chamado aberto depois**, nem o encerra por um 404 que era do anterior.
- **Ações de equipe pela regra da API-11 (FE-5).** Editar, arquivar,
  desarquivar, mudar status e prioridade, resolver, atribuir e comentar como
  interno aparecem só para quem a API deixa alterar o chamado como equipe: o
  Administrador humano em qualquer chamado; o técnico da equipe da TI nos da
  TI e da Qualidade; o técnico da Qualidade nos da Qualidade, se for
  atendente. Ser o responsável ou o solicitante não dá essas ações — o
  solicitante segue cancelando o que abriu e avaliando. Conta de serviço não
  recebe nenhuma, nem a Gestão, mesmo com perfil de Administrador. Excluir
  fica com o Administrador humano.
- **Lembrete das tarefas do dia pela rota nova da API-11 (FE-5).** O quadro
  lê `GET /tarefas-recorrentes/lembretes-do-dia`: a data e a situação
  (atrasada, hoje, realizada hoje) vêm da API, e não do relógio do
  navegador. Quem a API não deixa ler (403) não vê o bloco, sem aviso e sem
  nova tentativa; uma atualização que falha mantém a lista anterior e diz
  que ela ficou velha. Uma atualização a cada 10 minutos, junto com a do
  quadro. O título só leva às Tarefas Recorrentes para quem administra.
- **Trocar o responsável de um chamado da Qualidade (FE-3).** Na janela e na
  edição da página, a lista é a dos atendentes da Qualidade, sem "Sem
  atribuição". Quem já está no chamado sem estar na lista continua marcado
  "(fora dos atendentes)" até alguém trocar de propósito. Sem o API-3 o campo
  fica só leitura. Na TI nada muda.
- **Gestão só para quem administra (FE-5).** Cadastros, Tarefas Recorrentes e
  Auditoria aparecem para o Administrador e para o técnico da equipe da TI. A
  aba Usuários continua só do Administrador. Os outros perfis não veem os
  menus, e a URL digitada mostra o bloqueio, sem 403. Enquanto as permissões
  são confirmadas — ao abrir o sistema e a cada renovação de sessão —, nada
  administrativo aparece. O lembrete de tarefas do dia, no quadro, só é pedido
  por quem administra. *Fechamento complementar: o lembrete passou à rota da
  API-11, ver acima.*
- **Responsável da TI vem da lista da API (FE-5).** O seletor oferece só quem
  a API aceita como novo responsável — sem inativos, sem gente de fora da
  equipe da TI, sem conta de serviço. Quem já está no chamado sem estar na
  lista aparece "(fora da equipe)", sem poder ser escolhido de novo. Sem a
  lista, o seletor trava e diz o motivo, com "Tentar de novo". Trocar o
  responsável da TI passa a ser do Administrador e da equipe da TI.

### Fixed

- **A edição de um chamado da Qualidade não desfaz mais o trabalho de outra
  pessoa (FE-3).** Antes, salvar a página mandava todos os campos, e quem
  estava com ela aberta desde antes devolvia o status antigo ao trocar só a
  prioridade. Agora vai só o que mudou, e o chamado é relido antes de salvar:
  se alguém mexeu num campo que a pessoa também editou, nada é salvo, o que ela
  digitou fica e um aviso diz o que mudou. Na TI a edição segue como era.
- **Comentar durante a edição de um chamado da Qualidade não apaga mais o que
  foi editado (FE-3, M-2, `a1bb2a8`).** Antes, enviar um comentário recarregava
  a página e repunha todos os campos com o que estava no servidor: o que a
  pessoa tinha escolhido ou digitado e ainda não salvara se perdia. Agora os
  campos editados ficam como estão, e comentários e histórico continuam sendo
  atualizados. A referência de quando a edição abriu não é trocada, então a
  conferência de conflito antes de salvar segue funcionando. Ao cancelar ou
  salvar, a página volta a carregar como sempre. Na TI o comportamento anterior
  foi mantido: ali o comentário ainda repõe os campos.
- **Duas pessoas no mesmo chamado da Qualidade não se sobrescrevem mais
  (FE-4).** Toda escrita da Qualidade leva a versão do chamado que a pessoa
  está vendo: a edição da página, o atendimento pelo responsável, a troca de
  responsável na janela, e as ações da equipe — status, resolver, cancelar,
  arquivar, desarquivar. Se outra pessoa gravou antes, a API recusa, a tela
  avisa "Este chamado foi alterado por outra pessoa. Os dados foram
  atualizados: confira antes de tentar de novo.", relê o chamado e refaz os
  botões pelo estado novo. Nada é repetido sozinho: tentar de novo é um clique
  novo. O que foi digitado fica — os campos da edição, a solução de uma
  resolução recusada (volta ao reabrir), o motivo do cancelamento. Na edição,
  a versão é a da releitura feita logo antes de salvar, e a conferência de
  campos do FE-3 continua valendo. Fecha a janela curta que o FE-3 deixava
  aberta e trata o M-1, pendentes de homologação integrada.
- **Ações administrativas na Qualidade sem versão não saem.** Se o chamado
  chegou sem versão — API desatualizada —, nada é enviado e a pessoa é avisada.
  A versão não é inventada nem tirada de outro chamado.
- **Uma resposta atrasada não desfaz mais uma mais nova** no quadro: entre
  duas leituras do mesmo chamado, fica a de versão maior.
- **As ações não ficam mais em "Atualizando os dados…" para sempre (FE-5).**
  Se a releitura depois de um conflito falha, as ações ficam travadas com o
  motivo e "Tentar de novo", em vez de esperar uma versão que não vem.
- **Comentário recusado não troca mais a janela por um erro (FE-5).** O texto
  fica, o aviso é um só (o do sistema, no 403), e nada é reenviado.
- **Rascunho do modal não some mais quando o quadro muda (FE-5).** Mudar o
  status, recarregar o quadro ou outro cartão mudar não apaga mais o
  comentário digitado nem relê os comentários.
- **Revalidação que falha suspende a administração (FE-5).** Se a confirmação
  das permissões cai por rede ou servidor, a Gestão, a troca do responsável da
  TI e o comentário interno saem até a próxima confirmação, pedida em
  "Confirmar de novo"; a sessão continua. Vale também no F5 do técnico.
- **Seletor e ações rápidas mais legíveis (FE-5).** A opção escolhida passa a
  ter contraste de texto adequado no tema claro, e as ações rápidas ficam do
  tamanho dos outros botões.
- **Erro ao salvar não derruba mais a página do chamado (FE-5).** Antes, uma
  escrita recusada trocava a página inteira por um erro, e o que a pessoa
  tinha digitado se perdia. Agora a página, o formulário e o rascunho ficam:
  erro de validação mostra a mensagem da API junto do formulário; recusa
  (403) desliga a operação, confere as permissões de novo e deixa o texto
  para copiar; servidor fora ou sem resposta diz que o resultado não foi
  confirmado, não reenvia nada e oferece "Conferir o chamado". Só o "Chamado
  não encontrado" da API conta como perda de acesso.
- **A confirmação recusada não trava mais em "Confirmando suas
  permissões…" (FE-5).** Um 403 do servidor ao confirmar a conta termina
  dizendo que a API recusou, mantém a sessão e oferece nova tentativa; o
  botão fica desligado enquanto a confirmação anda, e uma resposta antiga
  não restaura permissão. Se a confirmação volta a dar certo, a página do
  chamado que não tinha carregado é relida.
- **Permissão administrativa não vem mais do navegador (FE-5).** Ela é
  confirmada no servidor a cada abertura e renovação de sessão; uma resposta
  atrasada de outra sessão é descartada.
- **Só o Administrador humano escolhe o solicitante ao abrir um chamado
  (FE-5, T-2).** Antes o seletor aparecia para técnico e para conta de serviço
  Administradora, e a API abria o chamado no nome de quem abriu, em silêncio.
  Agora ele aparece só quando o servidor confirmou que a pessoa é
  Administrador e não é conta de serviço — a mesma regra que a API usa.
  Enquanto a confirmação anda, ou se ela falhar, o chamado é aberto no nome de
  quem abre, e uma nota diz isso; uma escolha feita antes de a permissão cair
  não vai junto. A dica "Você fica como técnico responsável.", que não era
  verdade, saiu.
- **Editar um chamado da TI não desfaz mais o que outra pessoa salvou
  (FE-5, T-1).** Antes a edição mandava os quatro campos — categoria, status,
  prioridade e responsável — do jeito que estavam quando a página abriu: trocar
  só o status devolvia, sem aviso, a prioridade que outra pessoa tinha mudado
  depois. Agora vai só o que a pessoa mudou, o chamado é relido antes de
  salvar, e o pedido leva a versão relida. Se a outra pessoa mexeu no mesmo
  campo, nada é salvo, o que foi editado fica nos campos e a tela diz o que
  mudou; se ela salvou entre a releitura e o envio, a API recusa e a tela
  avisa. Salvar sem mudar nada não envia nada. Comentar durante a edição não
  repõe mais os campos (a correção do M-2, agora também na TI). As ações
  rápidas da TI não mudaram.

### Pendências conhecidas

- **Teste manual pendente.** Não há ambiente isolado: o `.env` local aponta
  para a API de produção. O FE-2 foi validado só pelos testes automatizados,
  contra o contrato do API-2 (`chamadoshs-api`, PR #4).
- **Validar a política de SLA da Qualidade antes de ligar.** O quadro de prazos
  por prioridade aparece nos dois setores, com os prazos de hoje, que são os da
  TI.
- **Técnico vê um seletor de solicitante que a API ignora** — ela só honra o
  solicitante escolhido quando quem abre é Administrador. Vale para os dois
  setores; mantido como está, para não mudar a TI nesta etapa. *FE-5, T-2:
  corrigido; o seletor é só do Administrador humano confirmado.*
- **A dica "Você fica como técnico responsável." não é verdade na TI**: a API
  descarta o `tecnico_responsavel_id` na abertura. Na Qualidade a dica não
  aparece. *FE-5, T-2: a dica saiu. O campo segue indo no corpo da abertura
  da TI para quem é da equipe, e a API segue o descartando.*
- **FE-3 validado só por testes automatizados**, contra o contrato do API-3
  (`d5e327f`) e as respostas reais das quatro versões da API à sonda. Teste
  manual e visual pendentes, pelo mesmo motivo do FE-2.
- **Edição simultânea: resta uma janela curta.** Entre a releitura e o
  salvamento outra escrita ainda passa sem ser vista. Fechar de vez pede
  controle de versão na API (409 quando o chamado mudou), fora desta etapa.
  *FE-4: tratado com a versão da API-4, pendente de homologação integrada.*
- **Ações rápidas da equipe na Qualidade sem releitura (M-1).** Técnico e
  Administrador que não são o responsável mudam o status pelo `PUT` de sempre,
  sem reler o chamado: numa tela aberta desde antes, isso pode desfazer o
  status gravado pelo atendente. Decisão pendente antes de ligar a Qualidade;
  a recomendação é o controle de versão na API (API-4). *FE-4: as ações levam
  a versão; o M-1 e o B-1 só contam como resolvidos depois da homologação
  integrada com a API-4.*
- **Cancelar com motivo, na Qualidade, não é atômico (FE-4).** São duas
  escritas: o cancelamento e depois o motivo, com a versão que o cancelamento
  devolveu. Se a segunda falhar — ou o cancelamento não devolver versão —, o
  chamado fica cancelado sem motivo, aparece "O chamado foi cancelado, mas o
  motivo não foi registrado…", o motivo fica no campo e confirmar de novo só
  registra o motivo. Juntar as duas numa escrita pede mudança na API, fora
  desta etapa.
- **Depois de um conflito, a página relê o chamado, mas a lista do quadro só
  se atualiza na próxima carga dela (FE-4).**
- **FE-4 validado só por testes automatizados**, contra o contrato da API-4c
  (`dcb57e1`): 409 com `codigo="versao_desatualizada"` e `versao_atual`, 428
  sem versão, e a API-3 rejeitando `versao_esperada` no atendimento. Falta a
  homologação integrada, com as duas pontas no ar e duas sessões no mesmo
  chamado.
- **Correção do M-2 sem teste manual**, pelo mesmo motivo do resto do FE-3.
- **Ações da equipe em cancelado e arquivado na página do chamado** continuam
  como estavam (D-12): o atendimento novo não aparece nesses chamados, mas os
  botões de sempre da equipe sim.
- **FE-5 validado só por testes automatizados**, contra os contratos das APIs
  5 a 9. Faltam a homologação integrada e a revisão visual; registrados sem
  correção: o contraste da opção escolhida no seletor e o tamanho dos botões
  das ações rápidas. Riscos residuais em `docs/fe-5-permissoes-e-api9.md`, §9.
- **O comentário digitado na janela some quando o quadro muda** (anterior ao
  FE-5): mudar o status pela janela relê os comentários e limpa o campo.
  Encontrado no FE-5, fora do escopo dele.
- **Fechamento complementar do FE-5 homologado só localmente**, contra a
  API-11 (`5547893`) num PostgreSQL 15 descartável, com contas e ids
  fictícios. Para publicar faltam: o inventário das contas reais (quem é
  conta de serviço, qual é a TV), `PAINEL_CONTAS_IDS` e `SETORES_TI_IDS` com
  ids reais, ao menos um Administrador humano ativo, e a ordem API-11 antes
  do front. Riscos residuais em `docs/fe-5-permissoes-e-api9.md`, §14.
- **Edição simultânea na TI: o T-1 fecha a perda em campo diferente, não a
  concorrência inteira.** Quem resta: duas gravações da TI que chegam à API
  no mesmo instante, com a mesma versão, passam as duas — o `PUT` da TI
  confere a versão sem travar a linha (na homologação local, 12 de 20
  rodadas simultâneas gravaram as duas); as ações rápidas da TI, o resolver e
  o motivo do cancelamento seguem sem versão (vale a última, e a troca de
  status fica no histórico); prioridade, responsável e solução não entram no
  histórico; e, depois de um erro de servidor sem resposta, salvar de novo
  pode acusar conflito com a própria gravação. Fechar de vez pede a trava na
  API (proposta, não feita). Detalhes em `docs/fe-5-permissoes-e-api9.md`,
  §15.

---

## [1.7.8] — 2026-09-10

Por Rickelme David.

### ⚠️ Requer ação no deploy

Nada além do rebuild do front.

### Fixed

- **O interruptor do "Modo escuro" vazava do trilho.** A bolinha é `absolute`
  e não declarava `left`, então caía na posição estática — que herda o
  `text-align: center` que o navegador dá a todo `<button>` e o preflight do
  Tailwind não desfaz. Desligada ficava à direita; ligada, 14px para fora do
  trilho, até a borda do painel. `left-0.5` declarado no `Topbar` e no `Switch`
  do kit, de onde o desenho foi copiado. `interruptor.test.tsx` trava a conta.
- **Tentativa, não verificada:** trocar o tema com o menu do usuário aberto
  deixava o painel na pintura anterior. O `ThemeContext` passou a forçar uma
  leitura de layout a cada troca. É hipótese: qualquer observação — captura,
  DevTools — força a repintura que o defeito consiste em não ter, então a
  verificação é humana, pela receita em
  `docs/design-system-migration/fase-16/TABELA-DAS-CATRACAS.md`, em vãos
  conhecidos.

---

## [1.7.7] — 2026-09-10

Por Rickelme David.

A adoção do design system compartilhado com o HelpHS: o PR #4
(`chore/design-system-adoption`), 173 commits de 02/09 a 10/09, em 20 fases,
com merge em `1831fd2`. A versão subiu em 09/09 dentro do ramo e foi ao ar com
o merge. O relatório de fechamento, com o que foi e o que não foi entregue, é
`docs/design-system-migration/checkpoint-4/RELATORIO.md`.

### ⚠️ Requer ação no deploy

Nada além do rebuild do front. `@fontsource` saiu das dependências — a fonte
passou a vir do pacote, e o `npm install` do build resolve sozinho. Sem
migration, sem variável nova, sem alteração no repositório da API.

### Changed

- **Tokens do pacote** em `src/design-system/`, copiados com hash conferido. O
  tema claro e escuro passou a ser só por token: nenhum `dark:` residual.
- **30 primitivos em `src/components/ui/`**, e as telas sobre eles — Dashboard,
  Cadastros, detalhe do chamado e as demais. Todo botão é `Button`, e botão que
  navegava virou link.
- **Contorno dos campos** em `--border-control`: de ~1,2:1 para 4,3–6,8:1,
  acima dos 3:1 que a WCAG pede para limite de componente.
- **Piso de 12px** para texto, e o anel de foco passou a `focus-visible`.
- **Fonte servida pelo pacote**, no próprio bundle.
- **Avatar** com a paleta do pacote, sem emprestar cor de gráfico.
- **O gráfico de status** adota a E18, exceto `resolved` e `closed`.
- **Porta de desenvolvimento 5174, com `strictPort`**: o `npm run dev` morre em
  vez de subir em outra porta, porque é a lista de origens da API que decide a
  porta.

### Added

- **Travas no `validar-paleta`**, encadeadas ao build: contraste de texto e de
  gráfico, separação ΔE entre séries, a ponte do D3-a contra o pacote,
  modificador de opacidade em token com alfa, nome acessível que apaga o
  conteúdo visível, botão sem nome abaixo de `sm`, cópia de token, cor cheia
  usada como texto e `<Tooltip>` sem dica própria.
- **Galerias de dev** da casca e dos componentes, com contraste medido ao vivo,
  para fotografar a interface sem a API.
- **647 casos de teste em 62 arquivos** no fechamento da migração.

### Fixed

- **A dica dos gráficos** trazia o texto na cor da série: 12 pares abaixo de
  4,5:1.
- **O histórico de tarefa recorrente mostrava `{selecionada.titulo}` ao pé da
  letra** — atributo JSX com string literal não interpola. Estava em produção.
- **Duplo clique na avaliação** podia gravar a nota da última resposta a
  chegar, e não a do último clique. Trava por `useRef`.
- **Duplo clique no reset de senha** disparava duas trocas em paralelo.
- **O `UsuarioModal` não tinha `autoComplete="new-password"`**, e o navegador
  oferecia a senha salva do administrador para a conta nova.
- **Esc numa lista do `Seletor` fechava o modal** junto: `preventDefault` sem
  `stopPropagation`.
- **O modal passou a prender o foco** de verdade.
- **Acessibilidade:** o cartão do quadro virou `article` com título; o
  `Seletor` parou de apagar o valor escolhido do próprio nome; o landmark de
  navegação ganhou nome; três botões perdiam o nome abaixo de `sm`; um gráfico
  `aria-hidden` estava na ordem de tabulação; a regra de movimento reduzido
  copiada do pacote vencia a nossa por ordem; o link de pular conteúdo era
  branco sobre azul-claro no escuro; dois controles do Dashboard diziam estado
  só pela cor.
- **A confirmação de exclusão dos cadastros** era da tabela, e não da linha.

### Removed

- O pulso perpétuo do botão flutuante.
- A linha de tabela clicável só por mouse, no primitivo de tabela.
- `EmConstrucao`, página sem rota e sem import.
- `@fontsource`.

### Não entregue

Está no relatório, com custo. Os três que mais pesam:

- **A regressão visual não foi feita.** As 32 capturas antes/depois não
  existem, e a última verificação de tela é de 08/09 — três fases mudaram
  pixels depois dela. Com o merge, o "antes" deixou de ser reconstruível a
  baixo custo; as tags `linha-de-base-165d919` e `antes-do-rebase` mantêm os
  pontos endereçáveis.
- **O `pageTitle` da §9 não foi cumprido** em nenhuma das dez páginas, e exige
  encanamento que não existe: as páginas são filhas da casca.
- **52 alvos de toque abaixo de 40px.**

---

## [1.7.1 – 1.7.6] — 2026-08-27 a 2026-09-02

Por Rickelme David.

### ⚠️ Requer ação no deploy

Nada além do rebuild do front.

### Added

- **Filtro por pessoa no quadro** (1.7.3), ao lado dos de prioridade e
  categoria, com a opção "Sem responsável". Aparece para técnicos e
  administradores.

### Changed

- **A barra lateral começa recolhida** (1.7.2). Sobra largura para o quadro na
  TV da sala, onde uma coluna ficava para fora da tela.
- **O aviso de novidades parou de abrir sozinho** (1.7.5). O número da versão,
  no rodapé do menu, ganha um ponto quando há novidade não lida.
- **Os ícones de ação dos cadastros ganharam nome** no hover (1.7.6):
  "Visualizar", "Editar", "Resetar senha", "Desativar".

### Fixed

- **O quadro voltou a mostrar as seis colunas** (1.7.1). Com o visual da 1.7.0
  ele abria com uma coluna ocupando a tela inteira, e as outras ficavam atrás
  da barra de rolagem.
- **Nenhuma janela fecha mais no clique de fora** (1.7.4) — o que estava
  digitado se perdia sem aviso. Elas saem pelo X ou pela tecla Esc.

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
