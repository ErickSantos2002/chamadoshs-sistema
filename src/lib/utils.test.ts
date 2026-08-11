import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('junta strings com espaço', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  // O bug que esta função existe para evitar: `${a && b}` imprime "false"
  // dentro do atributo class quando a condição é falsa.
  it('descarta condição falsa em vez de imprimir o valor', () => {
    expect(cn('base', false && 'ativo')).toBe('base');
    expect(cn('base', undefined, null, '')).toBe('base');
    expect(cn('base', 0 && 'zero')).toBe('base');
  });

  it('aceita objeto e mantém só as chaves verdadeiras', () => {
    expect(cn({ 'opacity-50': true, hidden: false })).toBe('opacity-50');
  });

  it('achata array aninhado', () => {
    expect(cn(['px-2', ['py-1', 'gap-2']])).toBe('px-2 py-1 gap-2');
  });

  it('preserva a ordem, que é o que permite sobrescrever no fim', () => {
    expect(cn('p-2', 'p-4')).toBe('p-2 p-4');
  });

  it('não deixa espaço sobrando quando tudo é descartado', () => {
    expect(cn(false, null, undefined)).toBe('');
    expect(cn('a', false, 'b')).toBe('a b');
  });

  // Zero é valor legítimo de classe em contexto numérico, mas como condição
  // é falso. A distinção importa: cn(0) não deve virar "0" por acidente numa
  // expressão como `contador && 'tem-item'`.
  it('trata número diferente de zero como classe', () => {
    expect(cn(1)).toBe('1');
    expect(cn(0)).toBe('');
  });
});
