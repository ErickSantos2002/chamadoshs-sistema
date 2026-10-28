import { describe, it, expect } from 'vitest';
import { Chamado, PrioridadeEnum, StatusEnum } from '../types/api';
import { camposEmConflito, diferencaDaEdicao, fotografar, type FotoDaEdicao } from './edicaoQualidade';

const REFERENCIA: FotoDaEdicao = {
  categoria_id: 2,
  status: StatusEnum.EM_ANDAMENTO,
  prioridade: PrioridadeEnum.MEDIA,
  tecnico_responsavel_id: 7,
  solucao: '',
};

describe('fotografar', () => {
  it('ausente e vazio viram um valor só', () => {
    expect(
      fotografar({
        status: StatusEnum.ABERTO,
        prioridade: PrioridadeEnum.ALTA,
      } as Chamado)
    ).toStrictEqual({
      categoria_id: null,
      status: StatusEnum.ABERTO,
      prioridade: PrioridadeEnum.ALTA,
      tecnico_responsavel_id: null,
      solucao: '',
    });
  });
});

describe('diferencaDaEdicao', () => {
  it('nada mudou: vazio', () => {
    expect(diferencaDaEdicao(REFERENCIA, { ...REFERENCIA })).toStrictEqual({});
  });

  it('só o que mudou', () => {
    expect(
      diferencaDaEdicao(REFERENCIA, { ...REFERENCIA, prioridade: PrioridadeEnum.ALTA })
    ).toStrictEqual({ prioridade: PrioridadeEnum.ALTA });
  });

  it('cada campo', () => {
    expect(
      diferencaDaEdicao(REFERENCIA, {
        categoria_id: null,
        status: StatusEnum.AGUARDANDO,
        prioridade: PrioridadeEnum.BAIXA,
        tecnico_responsavel_id: 3,
        solucao: 'Recalibrado e conferido.',
      })
    ).toStrictEqual({
      categoria_id: null,
      status: StatusEnum.AGUARDANDO,
      prioridade: PrioridadeEnum.BAIXA,
      tecnico_responsavel_id: 3,
      solucao: 'Recalibrado e conferido.',
    });
  });

  it('solução apagada não vai, como na TI', () => {
    expect(
      diferencaDaEdicao({ ...REFERENCIA, solucao: 'Texto antigo.' }, { ...REFERENCIA, solucao: '' })
    ).toStrictEqual({});
  });
});

describe('camposEmConflito', () => {
  it('mudança remota num campo editado: conflito', () => {
    const servidor = { ...REFERENCIA, status: StatusEnum.AGUARDANDO };
    const diferenca = { status: StatusEnum.RESOLVIDO };
    expect(camposEmConflito(REFERENCIA, servidor, diferenca)).toEqual(['status']);
  });

  it('mudança remota num campo que a pessoa não editou: sem conflito', () => {
    const servidor = { ...REFERENCIA, status: StatusEnum.AGUARDANDO };
    expect(camposEmConflito(REFERENCIA, servidor, { prioridade: PrioridadeEnum.ALTA })).toEqual([]);
  });

  it('servidor igual à referência: sem conflito', () => {
    expect(camposEmConflito(REFERENCIA, { ...REFERENCIA }, { status: StatusEnum.RESOLVIDO })).toEqual([]);
  });

  it('vários, na ordem da tela', () => {
    const servidor = {
      ...REFERENCIA,
      prioridade: PrioridadeEnum.ALTA,
      status: StatusEnum.AGUARDANDO,
      tecnico_responsavel_id: 3,
    };
    const diferenca = {
      prioridade: PrioridadeEnum.BAIXA,
      tecnico_responsavel_id: 9,
      status: StatusEnum.RESOLVIDO,
    };
    expect(camposEmConflito(REFERENCIA, servidor, diferenca)).toEqual([
      'status',
      'tecnico_responsavel_id',
      'prioridade',
    ]);
  });

  it('campo limpo (null) também conta', () => {
    const servidor = { ...REFERENCIA, categoria_id: null };
    expect(camposEmConflito(REFERENCIA, servidor, { categoria_id: 5 })).toEqual(['categoria_id']);
  });
});
