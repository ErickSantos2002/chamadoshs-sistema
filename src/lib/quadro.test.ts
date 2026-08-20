import { describe, it, expect } from 'vitest';
import { agruparPorColuna, estaNoFluxo } from './quadro';
import { Chamado, StatusEnum } from '../types/api';

/**
 * A regressão que este arquivo existe para impedir: arquivar ou cancelar um
 * chamado só liga uma marca — o status dele continua sendo o que era, quase
 * sempre "Aberto". Se o agrupamento olhar o status antes das marcas, o chamado
 * arquivado ou cancelado volta a aparecer na coluna Aberto, que é o defeito
 * relatado.
 */
const chamadoDe = (
  id: number,
  status: StatusEnum,
  arquivado = false,
  cancelado = false
): Chamado =>
  ({ id, status, arquivado, cancelado, titulo: `Chamado ${id}` }) as Chamado;

describe('agruparPorColuna', () => {
  it('manda o arquivado para a coluna dele, não para a do status', () => {
    const grupos = agruparPorColuna([chamadoDe(1, StatusEnum.ABERTO, true)]);

    expect(grupos.arquivado.map((c) => c.id)).toEqual([1]);
    expect(grupos['Aberto']).toEqual([]);
  });

  // A marca ganha de QUALQUER status, não só de Aberto.
  it('manda o arquivado resolvido para a coluna do arquivado', () => {
    const grupos = agruparPorColuna([chamadoDe(2, StatusEnum.RESOLVIDO, true)]);

    expect(grupos.arquivado.map((c) => c.id)).toEqual([2]);
    expect(grupos['Resolvido']).toEqual([]);
  });

  // Fechado não tem coluna própria no quadro: é o mesmo fim de linha que
  // Resolvido, e duas colunas dizendo a mesma coisa só dividem a atenção.
  it('junta Fechado com Resolvido', () => {
    const grupos = agruparPorColuna([
      chamadoDe(3, StatusEnum.FECHADO),
      chamadoDe(4, StatusEnum.RESOLVIDO),
    ]);

    expect(grupos['Resolvido'].map((c) => c.id)).toEqual([4, 3]);
  });

  it('põe cada chamado ativo na coluna do próprio status', () => {
    const grupos = agruparPorColuna([
      chamadoDe(5, StatusEnum.ABERTO),
      chamadoDe(6, StatusEnum.EM_ANDAMENTO),
      chamadoDe(7, StatusEnum.AGUARDANDO),
    ]);

    expect(grupos['Aberto'].map((c) => c.id)).toEqual([5]);
    expect(grupos['Em Andamento'].map((c) => c.id)).toEqual([6]);
    expect(grupos['Aguardando'].map((c) => c.id)).toEqual([7]);
  });

  // Mais recente em cima: o id é crescente e serve de relógio.
  it('ordena cada coluna do id maior para o menor', () => {
    const grupos = agruparPorColuna([
      chamadoDe(10, StatusEnum.ABERTO),
      chamadoDe(30, StatusEnum.ABERTO),
      chamadoDe(20, StatusEnum.ABERTO),
    ]);

    expect(grupos['Aberto'].map((c) => c.id)).toEqual([30, 20, 10]);
  });

  it('devolve toda coluna, mesmo vazia, para a tela não quebrar', () => {
    const grupos = agruparPorColuna([]);

    expect(Object.keys(grupos).sort()).toEqual(
      [
        'Aberto',
        'Aguardando',
        'Em Andamento',
        'Resolvido',
        'arquivado',
        'cancelado',
      ].sort()
    );
  });

  /**
   * Cancelar tem exatamente a mesma forma que arquivar: liga uma marca e não
   * toca no status. Foi assim que CHAM-2026-0127 ficou cancelado com status
   * "Aberto", sumiu do quadro e ainda por cima entrou na contagem de abertos
   * do painel.
   */
  it('manda o cancelado para a coluna dele, não para a do status', () => {
    const grupos = agruparPorColuna([
      chamadoDe(40, StatusEnum.ABERTO, false, true),
    ]);

    expect(grupos.cancelado.map((c) => c.id)).toEqual([40]);
    expect(grupos['Aberto']).toEqual([]);
  });

  it('manda o cancelado em andamento para a coluna do cancelado', () => {
    const grupos = agruparPorColuna([
      chamadoDe(41, StatusEnum.EM_ANDAMENTO, false, true),
    ]);

    expect(grupos.cancelado.map((c) => c.id)).toEqual([41]);
    expect(grupos['Em Andamento']).toEqual([]);
  });

  /**
   * A combinação existe: a tela de detalhe esconde o botão "Cancelar" de quem
   * já está cancelado, mas deixa o "Arquivar" à mão — dá para cancelar e
   * depois arquivar o mesmo chamado.
   *
   * Arquivado ganha. Arquivar é o ato deliberado de guardar, e vem por último;
   * quem foi ao arquivo procurar algo antigo espera encontrá-lo lá. O card
   * carrega os dois selos, então o cancelamento não fica escondido.
   */
  /**
   * O status vem da API. Um valor que este código não conhece — status novo no
   * back, ou `null` num registro antigo — daria `undefined.push` e derrubaria
   * o render inteiro: o quadro sairia branco por causa de um chamado.
   */
  it('não quebra com status que não conhece', () => {
    const estranho = { id: 50, status: 'Em Triagem', arquivado: false, cancelado: false } as unknown as Chamado;
    const semStatus = { id: 51, status: null, arquivado: false, cancelado: false } as unknown as Chamado;

    const grupos = agruparPorColuna([estranho, semStatus, chamadoDe(52, StatusEnum.ABERTO)]);

    // Nenhum chamado se perde, e a tela continua de pé.
    const total = Object.values(grupos).reduce((soma, col) => soma + col.length, 0);
    expect(total).toBe(3);
    expect(grupos['Aberto'].map((c) => c.id)).toEqual([52, 51, 50]);
  });

  it('põe no arquivo o que está cancelado E arquivado', () => {
    const grupos = agruparPorColuna([
      chamadoDe(42, StatusEnum.ABERTO, true, true),
    ]);

    expect(grupos.arquivado.map((c) => c.id)).toEqual([42]);
    expect(grupos.cancelado).toEqual([]);
  });
});

/**
 * A contagem do cabeçalho do quadro sai daqui. A regressão que estes casos
 * impedem: contar pelo status. Cancelar e arquivar não mexem no status — o
 * chamado cancelado continua "Aberto" por dentro —, então qualquer contagem
 * feita por status devolve o cancelado junto com o trabalho de verdade.
 */
describe('estaNoFluxo', () => {
  it('deixa passar o chamado ativo, em qualquer status', () => {
    expect(estaNoFluxo(chamadoDe(1, StatusEnum.ABERTO))).toBe(true);
    expect(estaNoFluxo(chamadoDe(2, StatusEnum.EM_ANDAMENTO))).toBe(true);
    expect(estaNoFluxo(chamadoDe(3, StatusEnum.AGUARDANDO))).toBe(true);
    expect(estaNoFluxo(chamadoDe(4, StatusEnum.RESOLVIDO))).toBe(true);
    expect(estaNoFluxo(chamadoDe(5, StatusEnum.FECHADO))).toBe(true);
  });

  it('barra o arquivado e o cancelado, mesmo com status Aberto', () => {
    expect(estaNoFluxo(chamadoDe(6, StatusEnum.ABERTO, true))).toBe(false);
    expect(estaNoFluxo(chamadoDe(7, StatusEnum.ABERTO, false, true))).toBe(false);
    expect(estaNoFluxo(chamadoDe(8, StatusEnum.ABERTO, true, true))).toBe(false);
  });

  it('serve de filtro de contagem: 3 de 5 no fluxo', () => {
    const todos = [
      chamadoDe(9, StatusEnum.ABERTO),
      chamadoDe(10, StatusEnum.RESOLVIDO),
      chamadoDe(11, StatusEnum.AGUARDANDO),
      chamadoDe(12, StatusEnum.ABERTO, true),
      chamadoDe(13, StatusEnum.ABERTO, false, true),
    ];

    expect(todos.filter(estaNoFluxo).map((c) => c.id)).toEqual([9, 10, 11]);
  });
});
