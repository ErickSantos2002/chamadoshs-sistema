import { describe, it, expect } from 'vitest';
import {
  faltamCaracteres,
  validarMinimo,
  MINIMO_TITULO,
  MINIMO_DESCRICAO,
  MINIMO_SOLUCAO,
} from './validacao';

describe('faltamCaracteres', () => {
  it('conta quanto falta para atingir o mínimo', () => {
    expect(faltamCaracteres('abc', 10)).toBe(7);
  });

  it('devolve zero quando já atingiu ou passou', () => {
    expect(faltamCaracteres('1234567890', 10)).toBe(0);
    expect(faltamCaracteres('12345678901234', 10)).toBe(0);
  });

  // Dez espaços não são dez caracteres — sem o trim, a barra de espaço
  // satisfaz qualquer mínimo.
  it('não conta espaço das pontas', () => {
    expect(faltamCaracteres('          ', 10)).toBe(10);
    expect(faltamCaracteres('  abc  ', 10)).toBe(7);
  });

  it('conta espaço do meio, que é texto de verdade', () => {
    expect(faltamCaracteres('a b c d e', 9)).toBe(0);
  });
});

describe('validarMinimo', () => {
  it('aceita texto que atinge o mínimo', () => {
    expect(validarMinimo('Impressora sem tinta', 10, 'Título')).toBeNull();
  });

  // Dizer "faltam 20 caracteres" para quem não escreveu nada é confuso: o
  // problema dele não é o tamanho, é que não escreveu.
  it('trata campo vazio como obrigatório, não como curto', () => {
    expect(validarMinimo('', 10, 'Título')).toBe('Título é obrigatório.');
    expect(validarMinimo('   ', 10, 'Título')).toBe('Título é obrigatório.');
  });

  it('diz exatamente quantos caracteres faltam', () => {
    expect(validarMinimo('abc', 10, 'Título')).toBe('Título precisa de mais 7 caracteres.');
  });

  it('concorda no singular quando falta só um', () => {
    expect(validarMinimo('123456789', 10, 'Título')).toBe('Título precisa de mais 1 caractere.');
  });

  it('usa o rótulo recebido na mensagem', () => {
    expect(validarMinimo('a', 10, 'Solução')).toContain('Solução');
  });

  it('mantém os mínimos combinados', () => {
    expect(MINIMO_TITULO).toBe(10);
    expect(MINIMO_DESCRICAO).toBe(20);
    expect(MINIMO_SOLUCAO).toBe(10);
  });
});
