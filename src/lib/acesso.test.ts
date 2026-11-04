import { describe, it, expect } from 'vitest';
import { ehPerdaDeAcesso, rascunhosComConteudo } from './acesso';

describe('ehPerdaDeAcesso', () => {
  it('404 de um chamado que estava na tela', () => {
    expect(ehPerdaDeAcesso({ response: { status: 404, data: { detail: 'Chamado não encontrado' } } })).toBe(true);
  });

  it.each([403, 401, 409, 422, 500])('%i não é', (status) => {
    expect(ehPerdaDeAcesso({ response: { status } })).toBe(false);
  });

  // Nem todo 404 é perda de acesso (C3): o corpo do 404 do chamado é a
  // evidência. Sem corpo, na dúvida, conta.
  it('404 sem corpo continua contando', () => {
    expect(ehPerdaDeAcesso({ response: { status: 404 } })).toBe(true);
    expect(ehPerdaDeAcesso({ response: { status: 404, data: {} } })).toBe(true);
  });

  it.each(['Not Found', 'Comentário não encontrado', 'Categoria não encontrada'])(
    '404 com outro detail (%s) não é',
    (detail) => {
      expect(ehPerdaDeAcesso({ response: { status: 404, data: { detail } } })).toBe(false);
    }
  );

  it('sem resposta (rede) não é', () => {
    expect(ehPerdaDeAcesso({ request: {}, message: 'Network Error' })).toBe(false);
    expect(ehPerdaDeAcesso(undefined)).toBe(false);
    expect(ehPerdaDeAcesso('404')).toBe(false);
  });
});

describe('rascunhosComConteudo', () => {
  it('fica só com o que tem texto, na ordem, sem repetir', () => {
    expect(
      rascunhosComConteudo([
        { rotulo: 'Comentário', texto: 'Segue o laudo' },
        { rotulo: 'Solução', texto: '   ' },
        { rotulo: 'Edição', texto: null },
        { rotulo: 'Atendimento', texto: 'Segue o laudo' },
        { rotulo: 'Motivo', texto: 'Duplicado do 88' },
      ])
    ).toEqual([
      { rotulo: 'Comentário', texto: 'Segue o laudo' },
      { rotulo: 'Motivo', texto: 'Duplicado do 88' },
    ]);
  });

  it('mantém o texto como foi digitado, sem aparar', () => {
    expect(rascunhosComConteudo([{ rotulo: 'x', texto: '  linha 1\nlinha 2 ' }])).toEqual([
      { rotulo: 'x', texto: '  linha 1\nlinha 2 ' },
    ]);
  });
});
