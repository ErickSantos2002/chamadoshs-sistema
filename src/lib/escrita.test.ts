import { describe, it, expect } from 'vitest';
import {
  MENSAGEM_INCERTA,
  MENSAGEM_OUTRA,
  MENSAGEM_RECUSA,
  MENSAGEM_VALIDACAO,
  classificarFalhaDeEscrita,
} from './escrita';

/** A classe de cada falha de escrita (C3). */

const resposta = (status: number, detail?: unknown) => ({
  response: { status, data: detail === undefined ? {} : { detail } },
});

describe('classificarFalhaDeEscrita', () => {
  it.each([400, 422])('%i é validação, com o detail da API quando houver', (status) => {
    expect(classificarFalhaDeEscrita(resposta(status, 'Campo inválido'))).toEqual({
      tipo: 'validacao',
      mensagem: 'Campo inválido Nada foi salvo.',
    });
    expect(classificarFalhaDeEscrita(resposta(status))).toEqual({
      tipo: 'validacao',
      mensagem: MENSAGEM_VALIDACAO,
    });
  });

  it('403 é recusa da operação — e a mensagem não repete o detail', () => {
    expect(classificarFalhaDeEscrita(resposta(403, 'qualquer coisa'))).toEqual({
      tipo: 'recusa',
      mensagem: MENSAGEM_RECUSA,
    });
  });

  it.each([
    ['500', resposta(500, 'Erro interno')],
    ['502', resposta(502)],
    ['503', resposta(503)],
    ['rede', { request: {}, message: 'Network Error' }],
    ['timeout', { request: {}, code: 'ECONNABORTED' }],
    ['erro sem resposta nenhuma', new Error('x')],
  ])('%s é incerta: o resultado não se sabe', (_rotulo, erro) => {
    expect(classificarFalhaDeEscrita(erro)).toEqual({ tipo: 'incerta', mensagem: MENSAGEM_INCERTA });
  });

  it('o resto é "outra", com o detail quando houver', () => {
    expect(classificarFalhaDeEscrita(resposta(404, 'Not Found'))).toEqual({ tipo: 'outra', mensagem: 'Not Found' });
    expect(classificarFalhaDeEscrita(resposta(409))).toEqual({ tipo: 'outra', mensagem: MENSAGEM_OUTRA });
  });

  it('detail que não é texto não vira mensagem', () => {
    expect(classificarFalhaDeEscrita(resposta(422, [{ loc: ['x'] }])).mensagem).toBe(MENSAGEM_VALIDACAO);
  });
});
