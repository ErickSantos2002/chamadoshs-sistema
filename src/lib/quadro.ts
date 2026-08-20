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
 *   `arquivado` e `cancelado` têm coluna e não são status nenhum. As duas ações
 *   ligam uma marca no chamado e não tocam no status, que continua o que era —
 *   quase sempre "Aberto". Sem coluna própria, esses chamados ou somem da tela
 *   ou reaparecem como abertos. Foi o que aconteceu com CHAM-2026-0127:
 *   cancelado, status "Aberto", invisível no quadro e contado como aberto no
 *   painel.
 *
 * Em minúscula justamente porque não são status: as outras quatro chaves são o
 * valor literal de `StatusEnum` e estas duas não têm par lá.
 */
export type ColunaDoQuadro =
  | 'Aberto'
  | 'Em Andamento'
  | 'Aguardando'
  | 'Resolvido'
  | 'arquivado'
  | 'cancelado';

/** A ordem em que as colunas aparecem, da entrada até a saída do fluxo. */
export const COLUNAS_DO_QUADRO: ColunaDoQuadro[] = [
  'Aberto',
  'Em Andamento',
  'Aguardando',
  'Resolvido',
  'arquivado',
  'cancelado',
];

/**
 * Separa os chamados nas colunas do quadro.
 *
 * A ordem das checagens é a regra, não detalhe de escrita: as marcas são
 * consultadas ANTES do status. Movendo qualquer uma delas para depois, o
 * chamado marcado volta a cair na coluna do status que ele tinha na hora em
 * que foi arquivado ou cancelado — o defeito original, de volta, sem nada
 * quebrar visivelmente.
 *
 * Entre as duas marcas, `arquivado` ganha. A combinação é alcançável: a tela
 * de detalhe esconde o "Cancelar" de quem já está cancelado, mas deixa o
 * "Arquivar" à mão. Arquivar é o ato deliberado de guardar e vem por último,
 * e quem foi ao arquivo procurar algo antigo espera encontrá-lo lá. O card
 * carrega os dois selos, então o cancelamento não fica escondido.
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
    'cancelado': [],
  } as Record<ColunaDoQuadro, Chamado[]>;

  for (const chamado of chamados) {
    if (chamado.arquivado) {
      grupos.arquivado.push(chamado);
    } else if (chamado.cancelado) {
      grupos.cancelado.push(chamado);
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
