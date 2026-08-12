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
