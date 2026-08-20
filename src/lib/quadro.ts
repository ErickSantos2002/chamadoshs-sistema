import { Chamado, StatusEnum } from '../types/api';

/**
 * As colunas do quadro de chamados.
 *
 * Não é o mesmo conjunto que `StatusEnum`, e a diferença é o ponto deste
 * arquivo. Duas divergências, cada uma por um motivo:
 *
 *   Fechado não tem coluna. É o mesmo fim de linha que Resolvido, e duas
 *   colunas dizendo a mesma coisa só dividem a atenção de quem olha o quadro.
 *
 *   `arquivado` tem coluna e não é status nenhum. Arquivar liga uma marca no
 *   chamado; o status dele continua o que era, quase sempre "Aberto". Sem uma
 *   coluna própria, o chamado arquivado ou some da tela ou reaparece como
 *   aberto — foram os dois defeitos que esta divisão veio consertar.
 *
 * Em minúscula justamente porque não é status: as outras quatro chaves são o
 * valor literal de `StatusEnum` e esta não tem par lá.
 */
export type ColunaDoQuadro =
  | 'Aberto'
  | 'Em Andamento'
  | 'Aguardando'
  | 'Resolvido'
  | 'arquivado';

/** A ordem em que as colunas aparecem, da entrada até a saída do fluxo. */
export const COLUNAS_DO_QUADRO: ColunaDoQuadro[] = [
  'Aberto',
  'Em Andamento',
  'Aguardando',
  'Resolvido',
  'arquivado',
];

/**
 * Separa os chamados nas colunas do quadro.
 *
 * A ordem das checagens é a regra, não detalhe de escrita: a marca `arquivado`
 * é consultada ANTES do status. Invertendo as duas linhas, todo chamado
 * arquivado volta a cair na coluna do status que ele tinha quando foi
 * arquivado — o defeito original, de volta, sem nada quebrar visivelmente.
 *
 * Devolve todas as colunas mesmo vazias: a tela desenha uma coluna por chave e
 * uma chave ausente viraria `undefined.length`.
 */
export function agruparPorColuna(
  chamados: Chamado[]
): Record<ColunaDoQuadro, Chamado[]> {
  const grupos = {
    'Aberto': [],
    'Em Andamento': [],
    'Aguardando': [],
    'Resolvido': [],
    'arquivado': [],
  } as Record<ColunaDoQuadro, Chamado[]>;

  for (const chamado of chamados) {
    if (chamado.arquivado) {
      grupos.arquivado.push(chamado);
    } else if (chamado.status === StatusEnum.FECHADO) {
      grupos['Resolvido'].push(chamado);
    } else {
      grupos[chamado.status as ColunaDoQuadro].push(chamado);
    }
  }

  // Mais recente em cima. O id é crescente e serve de relógio.
  for (const coluna of COLUNAS_DO_QUADRO) {
    grupos[coluna].sort((a, b) => b.id - a.id);
  }

  return grupos;
}
