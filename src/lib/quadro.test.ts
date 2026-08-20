import { describe, it, expect } from 'vitest';
import { agruparPorColuna } from './quadro';
import { Chamado, StatusEnum } from '../types/api';

/**
 * A regressão que este arquivo existe para impedir: arquivar um chamado só
 * liga a marca `arquivado` — o status dele continua sendo o que era, quase
 * sempre "Aberto". Se o agrupamento olhar o status antes da marca, o chamado
 * arquivado volta a aparecer na coluna Aberto, que é o defeito relatado.
 */
const chamadoDe = (
  id: number,
  status: StatusEnum,
  arquivado = false
): Chamado => ({ id, status, arquivado, titulo: `Chamado ${id}` }) as Chamado;

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
      ['Aberto', 'Aguardando', 'Em Andamento', 'Resolvido', 'arquivado'].sort()
    );
  });
});
