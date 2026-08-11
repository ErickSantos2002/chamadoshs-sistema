import { describe, it, expect } from 'vitest';
import { normalizarDetalhe } from './erroApi';

describe('normalizarDetalhe', () => {
  it('devolve a string do HTTPException sem mexer', () => {
    expect(normalizarDetalhe('Chamado não encontrado')).toBe('Chamado não encontrado');
  });

  // O caso que motivou a função: sem isso, o array vai para o estado e o React
  // quebra ao renderizar, deixando a tela branca em vez de mostrar o erro.
  it('transforma a lista de validação do Pydantic em texto', () => {
    const detail = [
      {
        loc: ['body', 'titulo'],
        msg: 'String should have at least 10 characters',
        type: 'string_too_short',
      },
    ];

    expect(normalizarDetalhe(detail)).toBe(
      'titulo: String should have at least 10 characters'
    );
  });

  it('junta vários erros numa linha só', () => {
    const detail = [
      { loc: ['body', 'titulo'], msg: 'muito curto' },
      { loc: ['body', 'descricao'], msg: 'muito curta' },
    ];

    expect(normalizarDetalhe(detail)).toBe('titulo: muito curto; descricao: muito curta');
  });

  // "body" e "query" são detalhe de transporte e não dizem nada a quem olha a
  // tela.
  it('descarta o prefixo de localização quando não há campo', () => {
    expect(normalizarDetalhe([{ loc: ['body'], msg: 'inválido' }])).toBe('inválido');
  });

  it('ignora item sem mensagem em vez de imprimir vazio', () => {
    expect(normalizarDetalhe([{ loc: ['body', 'x'] }, { msg: 'vale essa' }])).toBe('vale essa');
  });

  // Devolver undefined faz o chamador cair no texto padrão dele, que é melhor
  // que mostrar "[object Object]".
  it('devolve undefined quando não sobra mensagem utilizável', () => {
    expect(normalizarDetalhe([])).toBeUndefined();
    expect(normalizarDetalhe([{ loc: ['body', 'x'] }])).toBeUndefined();
    expect(normalizarDetalhe({ inesperado: true })).toBeUndefined();
    expect(normalizarDetalhe(null)).toBeUndefined();
    expect(normalizarDetalhe(undefined)).toBeUndefined();
  });

  it('nunca devolve algo que não seja texto', () => {
    const entradas: unknown[] = [
      'texto',
      [{ loc: ['body', 'a'], msg: 'm' }],
      [],
      {},
      null,
      undefined,
      42,
    ];

    for (const entrada of entradas) {
      const saida = normalizarDetalhe(entrada);
      expect(saida === undefined || typeof saida === 'string').toBe(true);
    }
  });
});
