/**
 * O que aparece no aviso "O que há de novo?".
 *
 * Isto é DIFERENTE do CHANGELOG.md, de propósito. O CHANGELOG é escrito para
 * quem mexe no código e fala de coisas como normalização de erro e ordem de
 * deploy. Aqui o público é quem abre chamado: só entra o que muda o que a
 * pessoa vê ou faz, e no vocabulário dela.
 *
 * Regra prática para saber se uma entrada pertence a este arquivo: se o
 * colaborador não perceberia a diferença sem ler o texto, ela não entra.
 *
 * A versão precisa bater com a do `package.json` — é ela que decide quando o
 * aviso abre sozinho.
 */

export type TipoNovidade = 'novidade' | 'melhoria' | 'corrigido';

export interface ItemNovidade {
  tipo: TipoNovidade;
  texto: string;
}

export interface VersaoNovidade {
  versao: string;
  /** Data no formato ISO, convertida na tela. */
  data: string;
  itens: ItemNovidade[];
}

export const NOVIDADES: VersaoNovidade[] = [
  {
    versao: '1.7.4',
    data: '2026-09-01',
    itens: [
      {
        tipo: 'corrigido',
        texto:
          'As janelas do sistema pararam de fechar quando você clica fora delas — todas, do chamado ao cadastro. Antes, escorregar o mouse para o lado no meio de um formulário fechava tudo e o que você tinha digitado se perdia sem aviso. Agora elas saem pelo X, no canto, ou pela tecla Esc.',
      },
    ],
  },
  {
    versao: '1.7.3',
    data: '2026-08-31',
    itens: [
      {
        tipo: 'novidade',
        texto:
          'O quadro ganhou filtro por pessoa, ao lado dos de prioridade e categoria: escolha um nome e ficam só os chamados sob responsabilidade dele. Tem também "Sem responsável", para ver de uma vez o que ainda não está com ninguém. O filtro aparece para técnicos e administradores.',
      },
    ],
  },
  {
    versao: '1.7.2',
    data: '2026-08-27',
    itens: [
      {
        tipo: 'melhoria',
        texto:
          'O menu lateral agora começa recolhido, mostrando só os ícones. Sobra largura para o quadro de chamados, que é o que fica na TV da sala — com o menu aberto, uma das colunas ficava para fora da tela. Um clique na seta abre o menu por inteiro quando você precisar.',
      },
    ],
  },
  {
    versao: '1.7.1',
    data: '2026-08-27',
    itens: [
      {
        tipo: 'corrigido',
        texto:
          'O quadro de chamados voltou a mostrar todas as colunas. Com o visual novo ele abria com uma coluna só ocupando a tela inteira, e as outras ficavam escondidas atrás da barra de rolagem — era preciso arrastar para o lado para achar o resto do quadro.',
      },
    ],
  },
  {
    versao: '1.7.0',
    data: '2026-08-27',
    itens: [
      {
        tipo: 'novidade',
        texto:
          'O sistema está com a cara nova — a mesma do HelpHS. O menu foi para uma barra lateral que dá para recolher, e no celular ele vira uma gaveta; o seu nome, o perfil, o modo escuro e o botão de sair ficam agora num menu só, no canto superior direito, que existe em qualquer tamanho de tela.',
      },
      {
        tipo: 'melhoria',
        texto:
          'O aviso de novidades saiu da lista de áreas e virou o número da versão, no rodapé do menu. Um pontinho azul ao lado dele indica que há novidade que você ainda não leu.',
      },
      {
        tipo: 'corrigido',
        texto:
          'No celular, a tela de Chamados podia abrir sem mostrar chamado nenhum, e o botão redondo da Central HS ficava por cima do botão de salvar das janelas. Os dois foram corrigidos.',
      },
      {
        tipo: 'corrigido',
        texto:
          'As listas de escolha (categoria, prioridade, responsável) abriam para fora da tela quando o campo estava na parte de baixo, e não dava para alcançar as últimas opções. Agora elas abrem para cima quando não há espaço embaixo.',
      },
    ],
  },
  {
    versao: '1.6.20',
    data: '2026-08-20',
    itens: [
      {
        tipo: 'novidade',
        texto:
          'Agora dá para excluir um chamado de vez, pela página dele. O botão só aparece para administrador e só em chamado já cancelado ou arquivado, e a confirmação pede que você digite o número do protocolo — é a única ação do sistema que não tem como desfazer.',
      },
    ],
  },
  {
    versao: '1.6.19',
    data: '2026-08-20',
    itens: [
      {
        tipo: 'melhoria',
        texto:
          'A busca do quadro agora encontra também os chamados arquivados e cancelados, sem precisar ligar nada antes. Digitou o protocolo, a coluna dele aparece com o chamado dentro — antes a busca respondia com o quadro vazio, como se aquele chamado não existisse.',
      },
      {
        tipo: 'corrigido',
        texto:
          'No painel, os cancelados ganharam cartão próprio e saíram das contas de trabalho pendente. O total, os gráficos de prioridade e categoria e o tempo médio agora falam todos dos mesmos chamados — antes ligar "Exibindo cancelados" mexia em uns e não em outros.',
      },
      {
        tipo: 'corrigido',
        texto:
          'Chamado arquivado parou de pedir avaliação. Ele já tinha sido guardado, então o pedido chegava para um atendimento que a pessoa provavelmente nem lembrava mais.',
      },
    ],
  },
  {
    versao: '1.6.18',
    data: '2026-08-20',
    itens: [
      {
        tipo: 'corrigido',
        texto:
          'O total de chamados no alto do quadro passou a contar só o que está no fluxo. Abrir as colunas de arquivados e cancelados não muda mais esse número — antes ele pulava de 141 para 150 e dava a impressão de que tinham entrado nove chamados novos. Quantos ficaram fora do fluxo continua no contador de cada uma das duas colunas.',
      },
    ],
  },
  {
    versao: '1.6.17',
    data: '2026-08-20',
    itens: [
      {
        tipo: 'corrigido',
        texto:
          'A página do chamado agora avisa, logo abaixo do título, quando ele está cancelado ou arquivado. Antes essa era a única tela que não avisava — dava para marcar como resolvido um chamado cancelado sem perceber que ele estava cancelado.',
      },
    ],
  },
  {
    versao: '1.6.16',
    data: '2026-08-20',
    itens: [
      {
        tipo: 'novidade',
        texto:
          'Chamado cancelado também ganhou coluna no quadro, ao lado da de arquivados. O botão no alto da tela agora se chama "Mostrar arquivados e cancelados" e abre as duas de uma vez — é onde procurar quando um chamado sumiu e você não sabe por quê.',
      },
      {
        tipo: 'corrigido',
        texto:
          'O painel parou de contar chamado cancelado como chamado aberto. Cancelar nunca mexeu no status, então um chamado cancelado continuava marcado como "Aberto" por dentro e inflava o número de pendências na tela inicial.',
      },
    ],
  },
  {
    versao: '1.6.15',
    data: '2026-08-20',
    itens: [
      {
        tipo: 'novidade',
        texto:
          'Chamado arquivado agora tem coluna própria no quadro. O botão "Mostrar arquivados", no alto da tela, abre a coluna quando você precisa consultar algo antigo — e ela some de novo quando você fecha. Antes o arquivado simplesmente desaparecia do quadro, sem jeito de encontrar de volta.',
      },
    ],
  },
  {
    versao: '1.6.14',
    data: '2026-08-17',
    itens: [
      {
        tipo: 'corrigido',
        texto:
          'O card agora muda de coluna na hora em que o chamado avança pela janela — resolver, iniciar ou atribuir alguém aparece no quadro sem recarregar a página. Antes o quadro só ficava sabendo no F5.',
      },
    ],
  },
  {
    versao: '1.6.13',
    data: '2026-08-17',
    itens: [
      {
        tipo: 'novidade',
        texto:
          'A janela do chamado agora permite atribuir o responsável, ali mesmo: o campo vira uma lista para a equipe, e escolher já salva. Antes era preciso abrir a página inteira só para dizer de quem é o chamado.',
      },
      {
        tipo: 'corrigido',
        texto:
          'Na edição do chamado, escolher "Sem atribuição" ou "Sem categoria" agora limpa o campo de verdade — antes o salvar dizia que sim e o chamado continuava como estava.',
      },
    ],
  },
  {
    versao: '1.6.12',
    data: '2026-08-17',
    itens: [
      {
        tipo: 'corrigido',
        texto:
          'No tema escuro, o cartão de comentário do chamado aparecia claro, com o nome de quem escreveu quase invisível por cima. Agora ele segue o tema, como o resto da tela.',
      },
    ],
  },
  {
    versao: '1.6.11',
    data: '2026-08-14',
    itens: [
      {
        tipo: 'corrigido',
        texto:
          'No menu de telas pequenas, agora dá para rolar: numa tela baixa, o botão Sair e o modo noturno ficavam para fora e não havia como alcançá-los.',
      },
    ],
  },
  // A entrada era da 1.6.9, que nunca chegou a produção: antes do deploy, o
  // teste de bancada achou o seletor fechando quando se rolava a própria
  // lista. A correção subiu a versão, e a entrada acompanha — o que o usuário
  // recebe é uma coisa só. Consertar o que ninguém recebeu não é novidade.
  {
    versao: '1.6.10',
    data: '2026-08-14',
    itens: [
      {
        tipo: 'melhoria',
        texto:
          'Todas as listas de escolha do sistema — inclusive as dos formulários, como a de solicitante do novo chamado — agora abrem com a aparência do sistema, em vez da lista branca do Windows.',
      },
      {
        tipo: 'melhoria',
        texto:
          'Nessas listas dá para digitar as primeiras letras para pular direto ao nome — útil na lista de solicitantes, que passa de trinta pessoas.',
      },
    ],
  },
  {
    versao: '1.6.8',
    data: '2026-08-14',
    itens: [
      {
        tipo: 'melhoria',
        texto:
          'Nas janelas de cadastro, os botões Salvar e Cancelar ficam fixos embaixo. No cadastro de usuário, que é o formulário mais longo, era preciso rolar até o fim para achar o Salvar.',
      },
      {
        tipo: 'melhoria',
        texto:
          'As janelas passam a ter a altura do que mostram. Uma janela com dois campos ocupava meia tela, com o resto em branco.',
      },
    ],
  },
  {
    versao: '1.6.7',
    data: '2026-08-14',
    itens: [
      {
        tipo: 'melhoria',
        texto:
          'Os ícones do sistema foram redesenhados. Agora terminam em ponta reta, como as bordas e os cantos de todo o resto da interface — antes eram arredondados e destoavam.',
      },
    ],
  },
  {
    versao: '1.6.6',
    data: '2026-08-14',
    itens: [
      {
        tipo: 'melhoria',
        texto:
          'As listas dos filtros passaram a ter a aparência do sistema. Antes quem desenhava a lista aberta era o Windows, e ela aparecia branca no meio da tela escura.',
      },
      {
        tipo: 'melhoria',
        texto:
          'Nos filtros de status e prioridade, cada opção agora mostra a cor que aquele status tem nos gráficos — a mesma cor nos dois lugares.',
      },
    ],
  },
  {
    versao: '1.6.5',
    data: '2026-08-14',
    itens: [
      {
        tipo: 'corrigido',
        texto:
          'Em telas menores, o menu passa a mostrar as mesmas áreas do menu lateral. Antes ele parava em Dashboard e Chamados, e escondia Cadastros, Auditoria e Tarefas Recorrentes de quem não fosse administrador — inclusive dos técnicos.',
      },
    ],
  },
  {
    versao: '1.6.4',
    data: '2026-08-14',
    itens: [
      {
        tipo: 'corrigido',
        texto:
          'Quando o histórico de uma conta não consegue carregar, a tela agora avisa que não foi possível consultar — antes o erro aparecia seco, e parecia que a conta não tinha nenhum registro.',
      },
    ],
  },
  {
    versao: '1.6.3',
    data: '2026-08-14',
    itens: [
      {
        tipo: 'corrigido',
        texto:
          'No celular, a faixa embaixo do login deixou de embolar: a hora desce para uma linha só dela em vez de subir por cima do "verificado".',
      },
      {
        tipo: 'corrigido',
        texto:
          'O relógio do login não pula mais um segundo de vez em quando — ele acerta o passo com o relógio do computador a cada tique.',
      },
    ],
  },
  {
    versao: '1.6.2',
    data: '2026-08-13',
    itens: [
      {
        tipo: 'melhoria',
        texto:
          'A tela de login ganhou um relógio, andando de segundo em segundo ao lado da versão e do estado do sistema.',
      },
    ],
  },
  {
    versao: '1.6.1',
    data: '2026-08-13',
    itens: [
      {
        tipo: 'melhoria',
        texto:
          'O menu passa a mostrar todas as áreas do sistema para todo mundo. Ao abrir uma que não é do seu perfil, a tela explica qual é, de quem é e a quem pedir acesso — antes a opção simplesmente não existia, e não dava para pedir o que não se sabe que há.',
      },
      {
        tipo: 'melhoria',
        texto:
          'A tela de acesso restrito deixou de piscar "ACESSO NEGADO" em vermelho. Quem chega ali não errou nada — só abriu uma porta que não é dele.',
      },
    ],
  },
  {
    versao: '1.6.0',
    data: '2026-08-13',
    itens: [
      {
        tipo: 'novidade',
        texto:
          'A janela do chamado ganhou as ações de atendimento: iniciar, marcar como aguardando, resolver e reabrir — sem precisar abrir a página inteira.',
      },
      {
        tipo: 'novidade',
        texto:
          'Ao resolver pela janela, o campo da solução aparece ali mesmo, no lugar dos botões. Você não sai de onde estava.',
      },
    ],
  },
  {
    versao: '1.5.2',
    data: '2026-08-13',
    itens: [
      {
        tipo: 'corrigido',
        texto:
          'Na tela de Auditoria, quando a consulta falhava a tela mostrava o erro e, logo abaixo, dizia que nada tinha sido registrado. Numa tela de auditoria isso é grave: "não consegui perguntar" virava "nada aconteceu".',
      },
      {
        tipo: 'corrigido',
        texto:
          'Ainda na Auditoria, ao avançar para uma página sem resultados a tela afirmava que a trilha estava vazia — depois de você ter acabado de ler 50 linhas dela.',
      },
    ],
  },
  {
    versao: '1.5.1',
    data: '2026-08-13',
    itens: [
      {
        tipo: 'novidade',
        texto:
          'Técnicos passam a ver Cadastros e Auditoria no menu. Em Cadastros, a aba de Usuários continua só para administradores — é ali que se define o perfil de cada pessoa.',
      },
    ],
  },
  {
    versao: '1.5.0',
    data: '2026-08-13',
    itens: [
      {
        tipo: 'novidade',
        texto:
          'Nova tela de Auditoria, no menu lateral: mostra quem alterou usuários e setores, o quê e quando, com filtros por tipo de cadastro, pessoa e período. Visível para administradores.',
      },
    ],
  },
  {
    versao: '1.4.8',
    data: '2026-08-13',
    itens: [
      {
        tipo: 'melhoria',
        texto:
          'Em Cadastros, desativar um usuário ou setor deixou de usar o ícone de lixeira, que prometia apagar. A lixeira ficou só em Categorias, que é o único lugar onde a exclusão é definitiva.',
      },
    ],
  },
  {
    versao: '1.4.7',
    data: '2026-08-13',
    itens: [
      {
        tipo: 'novidade',
        texto:
          'Agora dá para avaliar o atendimento sem sair do quadro: as estrelas aparecem na janela do chamado, ao lado dos dados. Antes só existiam na página inteira, e quase ninguém chegava lá depois que o problema acabava.',
      },
      {
        tipo: 'melhoria',
        texto:
          'Na tela de login, o campo ao lado do indicador passou a mostrar há quanto tempo o sistema foi verificado — "há 12s" — em vez de uma hora que ficava parada quase um minuto inteiro.',
      },
    ],
  },
  {
    versao: '1.4.6',
    data: '2026-08-13',
    itens: [
      {
        tipo: 'corrigido',
        texto:
          'Em janelas com formulário longo, o botão de salvar podia ficar fora da área visível, sem jeito de alcançá-lo. Agora o rodapé fica fixo e o formulário rola por dentro.',
      },
      {
        tipo: 'corrigido',
        texto:
          'No quadro de chamados, em telas de pouca altura as colunas apareciam quase sem espaço para os cards — em alguns tamanhos, sem espaço nenhum.',
      },
    ],
  },
  {
    versao: '1.4.5',
    data: '2026-08-13',
    itens: [
      {
        tipo: 'corrigido',
        texto:
          'Em telas baixas — a TV da sala, por exemplo — a tela de login aparecia cortada em cima e embaixo, e não dava para rolar. Agora ela se ajusta à altura disponível.',
      },
    ],
  },
  {
    versao: '1.4.4',
    data: '2026-08-13',
    itens: [
      {
        tipo: 'melhoria',
        texto:
          'O painel e as Tarefas Recorrentes ganharam o visual novo. Agora o sistema inteiro está na mesma linguagem.',
      },
      {
        tipo: 'corrigido',
        texto:
          'No painel, os cartões e a tabela mostravam cores de status diferentes das do quadro de chamados — o mesmo chamado aparecia de uma cor em cada tela. E a fatia da pizza discordava do cartão logo acima dela.',
      },
      {
        tipo: 'corrigido',
        texto:
          'Títulos de página e cabeçalhos de tabela apareciam em azul por engano, em vez da cor de texto do tema.',
      },
    ],
  },
  {
    versao: '1.4.3',
    data: '2026-08-13',
    itens: [
      {
        tipo: 'novidade',
        texto:
          'O cadastro de um usuário passou a mostrar o histórico da conta: quem alterou o quê e quando, incluindo troca de setor, de perfil e de senha. Visível para administradores.',
      },
      {
        tipo: 'novidade',
        texto:
          'O histórico distingue quem trocou a própria senha de quem teve a senha redefinida por um administrador.',
      },
    ],
  },
  {
    versao: '1.4.2',
    data: '2026-08-13',
    itens: [
      {
        tipo: 'corrigido',
        texto:
          'Ao desativar um usuário ou setor, a linha agora fica na lista marcada como inativa, em vez de sumir e reaparecer no próximo carregamento. O botão passou a se chamar "Desativar", que é o que ele sempre fez.',
      },
      {
        tipo: 'melhoria',
        texto:
          'Quando não dá para desativar um setor, o sistema diz quantos usuários ativos ainda estão nele — antes só dizia que não era possível.',
      },
      {
        tipo: 'melhoria',
        texto:
          'As telas de Cadastros ganharam o visual novo do sistema.',
      },
      {
        tipo: 'corrigido',
        texto:
          'Em qualquer janela do sistema, digitar no primeiro campo fazia o cursor pular para o botão de fechar. Aparecia ao trocar a senha de alguém.',
      },
    ],
  },
  {
    versao: '1.4.1',
    data: '2026-08-13',
    itens: [
      {
        tipo: 'novidade',
        texto:
          'A tela de login passou a mostrar se o sistema está no ar, antes de você tentar entrar. Se o problema for do nosso lado, agora dá para saber sem gastar uma tentativa.',
      },
      {
        tipo: 'melhoria',
        texto:
          'O login ganhou o visual novo do sistema, com o nome do que você está acessando e a versão em que ele está.',
      },
      {
        tipo: 'melhoria',
        texto:
          'Os campos de formulário passaram a ter fundo próprio, em vez de se distinguirem só pela borda — ficavam difíceis de achar em telas com muitos campos.',
      },
    ],
  },
  {
    versao: '1.4.0',
    data: '2026-08-12',
    itens: [
      {
        tipo: 'melhoria',
        texto:
          'O sistema ganhou visual novo, com cantos retos e traço fino no lugar das bordas arredondadas. As telas ainda estão no mesmo lugar — o que mudou foi a aparência.',
      },
      {
        tipo: 'corrigido',
        texto:
          'As cores dos gráficos e dos status foram refeitas para quem não distingue certas cores. Havia pares que ficavam idênticos: vermelho com âmbar, rosa com laranja e rosa com verde.',
      },
      {
        tipo: 'corrigido',
        texto:
          'A tela de detalhe do chamado mostrava cores diferentes das do quadro para o mesmo chamado — "Aberto" aparecia azul em uma e rosa na outra. Agora as duas concordam.',
      },
      {
        tipo: 'melhoria',
        texto:
          'Quem pediu menos animação nas preferências do computador passa a ser atendido: as transições da interface ficam desligadas.',
      },
    ],
  },
  {
    versao: '1.3.2',
    data: '2026-08-12',
    itens: [
      {
        tipo: 'corrigido',
        texto:
          'O tema escolhido passa a valer depois de sair e entrar de novo. Quem preferia o modo claro voltava para o escuro a cada login, sem entender por quê.',
      },
      {
        tipo: 'melhoria',
        texto:
          'As barras dos gráficos do painel ficaram distinguíveis. As cores anteriores eram três tons do mesmo azul, e barras vizinhas se confundiam.',
      },
      {
        tipo: 'melhoria',
        texto:
          'A tela de login foi redesenhada, com os campos identificados por rótulo e não só por texto de exemplo — que sumia assim que você começava a digitar.',
      },
      {
        tipo: 'corrigido',
        texto:
          'No quadro de chamados, as colunas "Aberto" e "Aguardando" tinham o mesmo ponto colorido e não dava para distingui-las de relance.',
      },
    ],
  },
  {
    versao: '1.3.1',
    data: '2026-08-12',
    itens: [
      {
        tipo: 'melhoria',
        texto:
          'Os avisos do sistema deixaram de ser aquelas caixinhas do navegador que travam a página até você clicar em OK. Agora aparecem no canto e sozinhas somem.',
      },
      {
        tipo: 'melhoria',
        texto:
          'Quando algo dá errado ao salvar, a mensagem passa a dizer o motivo que o sistema devolveu, em vez de um texto genérico.',
      },
    ],
  },
  {
    versao: '1.3.0',
    data: '2026-08-12',
    itens: [
      {
        tipo: 'novidade',
        texto:
          'Ao abrir um chamado, agora aparece o prazo que a prioridade escolhida compromete — em quanto tempo alguém assume e em quanto tempo resolve.',
      },
      {
        tipo: 'novidade',
        texto:
          'Clicar num chamado abre os detalhes por cima do quadro, sem trocar de tela. Dá para ler e comentar ali mesmo.',
      },
      {
        tipo: 'novidade',
        texto:
          'Abrir chamado virou uma janela sobre o quadro. Ao salvar, o card já aparece na coluna Aberto.',
      },
      {
        tipo: 'novidade',
        texto:
          'Os cards do quadro passam a mostrar a categoria, quem é o responsável e quanto do prazo já foi consumido.',
      },
      {
        tipo: 'corrigido',
        texto:
          'O solicitante voltou a conseguir avaliar o atendimento. Desde o começo de agosto o clique nas estrelas dava erro de permissão.',
      },
      {
        tipo: 'corrigido',
        texto:
          'Em Cadastros, excluir um usuário ou setor agora mostra que ele foi desativado, e permite reativar. Antes a linha voltava igual e parecia que nada tinha acontecido.',
      },
      {
        tipo: 'melhoria',
        texto:
          'Título, descrição e solução passaram a exigir um mínimo de texto. Chamado que chega como "não funciona" custa duas idas e vindas até alguém descobrir o que não funciona.',
      },
      {
        tipo: 'melhoria',
        texto:
          'A busca do quadro passou a procurar também pelo título, não só pelo número do protocolo.',
      },
      {
        tipo: 'melhoria',
        texto:
          'O sistema inteiro ganhou visual novo, com modo claro e escuro consistentes em todas as telas.',
      },
    ],
  },
];
