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
