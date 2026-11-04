import { describe, it, expect } from 'vitest';
import { lerLembretes } from './lembretes';

/** O contrato do lembrete do dia (API-11, S1), lido ao pé da letra. */

const tarefa = (extra: Record<string, unknown> = {}) => ({
  id: 1,
  titulo: 'Tarefa fictícia',
  proxima_data: '2026-11-04',
  situacao: 'hoje',
  ...extra,
});

describe('lerLembretes', () => {
  it('aceita o contrato e preserva a ordem recebida', () => {
    const corpo = {
      data: '2026-11-04',
      tarefas: [
        tarefa({ id: 3, situacao: 'realizada_hoje', proxima_data: '2026-11-11' }),
        tarefa({ id: 1, situacao: 'atrasada', proxima_data: '2026-11-01' }),
        tarefa({ id: 2 }),
      ],
    };
    expect(lerLembretes(corpo)?.tarefas.map((t) => t.id)).toEqual([3, 1, 2]);
  });

  it('descarta campos fora do contrato', () => {
    const lido = lerLembretes({
      data: '2026-11-04',
      tarefas: [tarefa({ descricao: 'não é do lembrete', responsavel_id: 7 })],
      extra: true,
    });
    expect(lido).toEqual({ data: '2026-11-04', tarefas: [tarefa()] });
  });

  it('lista vazia é válida', () => {
    expect(lerLembretes({ data: '2026-11-04', tarefas: [] })).toEqual({ data: '2026-11-04', tarefas: [] });
  });

  it.each([
    ['"pendente", que não existe no contrato', { tarefas: [tarefa({ situacao: 'pendente' })] }],
    ['situação desconhecida', { tarefas: [tarefa({ situacao: 'HOJE' })] }],
    ['id ausente', { tarefas: [tarefa({ id: undefined })] }],
    ['id não inteiro', { tarefas: [tarefa({ id: '1' })] }],
    ['título vazio', { tarefas: [tarefa({ titulo: '  ' })] }],
    ['próxima data fora do formato', { tarefas: [tarefa({ proxima_data: '04/11/2026' })] }],
    ['data ausente', { data: undefined }],
    ['data fora do formato', { data: '2026-11-04T00:00:00' }],
    ['tarefas que não são lista', { tarefas: {} }],
  ])('recusa o corpo inteiro: %s', (_rotulo, troca) => {
    expect(lerLembretes({ data: '2026-11-04', tarefas: [tarefa()], ...troca })).toBeNull();
  });

  it.each([null, undefined, [], 'texto', 3])('recusa corpo que não é objeto: %s', (corpo) => {
    expect(lerLembretes(corpo)).toBeNull();
  });
});
