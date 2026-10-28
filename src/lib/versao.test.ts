import { describe, it, expect } from 'vitest';
import { Chamado, SetorDestinoEnum } from '../types/api';
import {
  ehConflitoDeVersao,
  ehVersaoAusente,
  escreveSemVersao,
  lerVersao,
  maisRecente,
  precondicaoDaEscrita,
  versaoAtualDoConflito,
  versaoValida,
} from './versao';

const QUALIDADE = SetorDestinoEnum.QUALIDADE;
const TI = SetorDestinoEnum.TI;

const erro = (status: number, data: unknown) => ({ response: { status, data } });

const CONFLITO = erro(409, {
  detail: 'Este chamado foi alterado por outra pessoa. Atualize e tente de novo.',
  codigo: 'versao_desatualizada',
  versao_atual: 8,
});

describe('versaoValida / lerVersao', () => {
  it.each([1, 2, 8, 2 ** 40])('aceita %s', (v) => {
    expect(versaoValida(v)).toBe(true);
    expect(lerVersao({ versao: v })).toBe(v);
  });

  // Ausente não é zero nem um: uma API anterior à 4 não manda a versão, e
  // inventá-la faria a pré-condição dizer algo falso.
  it.each([
    ['ausente', undefined],
    ['nula', null],
    ['zero', 0],
    ['negativa', -1],
    ['fracionária', 1.5],
    ['texto', '3'],
    ['booleana', true],
    ['NaN', NaN],
    ['infinita', Infinity],
    ['acima do inteiro seguro', 2 ** 60],
  ])('versão %s é null, nunca um número inventado', (_, v) => {
    expect(versaoValida(v)).toBe(false);
    expect(lerVersao({ versao: v } as unknown as Chamado)).toBeNull();
  });

  it('chamado nulo não tem versão', () => {
    expect(lerVersao(null)).toBeNull();
    expect(lerVersao(undefined)).toBeNull();
  });
});

describe('precondicaoDaEscrita', () => {
  it('TI: nada — o corpo segue o de antes, mesmo com versão no chamado', () => {
    expect(precondicaoDaEscrita({ setor_destino: TI, versao: 4 })).toEqual({});
    expect(escreveSemVersao({ setor_destino: TI })).toBe(true);
  });

  it('setor ausente (API anterior ao setor) é TI', () => {
    expect(precondicaoDaEscrita({ versao: 4 })).toEqual({});
  });

  it('Qualidade com versão: a versão do próprio chamado', () => {
    expect(precondicaoDaEscrita({ setor_destino: QUALIDADE, versao: 4 })).toEqual({ versao_esperada: 4 });
  });

  it.each([undefined, 0, '4', 1.5])('Qualidade com versão %s: não escreve', (v) => {
    expect(
      precondicaoDaEscrita({ setor_destino: QUALIDADE, versao: v } as unknown as Chamado)
    ).toBeNull();
  });

  // Na dúvida sobre o setor, a escrita é tratada como protegida.
  it('setor inesperado exige versão como a Qualidade', () => {
    const inesperado = 'FINANCEIRO' as unknown as SetorDestinoEnum;
    expect(escreveSemVersao({ setor_destino: inesperado })).toBe(false);
    expect(precondicaoDaEscrita({ setor_destino: inesperado, versao: 2 })).toEqual({ versao_esperada: 2 });
    expect(precondicaoDaEscrita({ setor_destino: inesperado })).toBeNull();
  });
});

describe('ehConflitoDeVersao', () => {
  it('reconhece o 409 de versão e lê a versão atual', () => {
    expect(ehConflitoDeVersao(CONFLITO)).toBe(true);
    expect(versaoAtualDoConflito(CONFLITO)).toBe(8);
  });

  // Os outros 409 do sistema — transição que não vale, chamado cancelado —
  // não podem virar "outra pessoa alterou".
  it.each([
    ['transição', erro(409, { detail: 'Transição de Aberto para Resolvido não permitida' })],
    ['cancelado', erro(409, { detail: 'Chamado cancelado não pode ser atendido' })],
    ['outro código', erro(409, { detail: 'x', codigo: 'outra_coisa', versao_atual: 3 })],
    ['corpo em lista', erro(409, [{ codigo: 'versao_desatualizada' }])],
    ['sem corpo', erro(409, undefined)],
    ['mesmo código em outro status', erro(400, { codigo: 'versao_desatualizada' })],
    ['rede', new Error('Network Error')],
    ['nada', undefined],
  ])('não confunde com %s', (_, e) => {
    expect(ehConflitoDeVersao(e)).toBe(false);
    expect(versaoAtualDoConflito(e)).toBeNull();
  });

  it('versao_atual inválida no 409 é null', () => {
    const e = erro(409, { codigo: 'versao_desatualizada', versao_atual: '8' });
    expect(ehConflitoDeVersao(e)).toBe(true);
    expect(versaoAtualDoConflito(e)).toBeNull();
  });
});

describe('ehVersaoAusente', () => {
  it('é o 428, e só ele', () => {
    expect(ehVersaoAusente(erro(428, { detail: 'Informe a versão do chamado' }))).toBe(true);
    expect(ehVersaoAusente(CONFLITO)).toBe(false);
    expect(ehVersaoAusente(erro(422, {}))).toBe(false);
  });
});

describe('maisRecente', () => {
  const c = (id: number, versao?: number) => ({ id, versao }) as Chamado;

  it('a de versão maior fica, chegue em que ordem chegar', () => {
    expect(maisRecente(c(1, 5), c(1, 4))).toEqual(c(1, 5));
    expect(maisRecente(c(1, 4), c(1, 5))).toEqual(c(1, 5));
  });

  it('mesma versão: vale a que chegou', () => {
    const chegou = { ...c(1, 5), titulo: 'novo' } as Chamado;
    expect(maisRecente(c(1, 5), chegou)).toBe(chegou);
  });

  it('sem versão de um dos lados (API anterior): vale a que chegou, como antes', () => {
    expect(maisRecente(c(1, 5), c(1))).toEqual(c(1));
    expect(maisRecente(c(1), c(1, 2))).toEqual(c(1, 2));
  });

  it('outro chamado não é comparado', () => {
    expect(maisRecente(c(1, 9), c(2, 1))).toEqual(c(2, 1));
  });
});
