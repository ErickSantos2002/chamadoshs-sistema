import { describe, it, expect } from 'vitest';
import {
  DICA_DO_INTERNO,
  dicaDoInterno,
  ehRecusaDoInterno,
  ordenarComentarios,
} from './comentarios';
import type { Comentario } from '../types/api';

const c = (id: number, created_at: string) => ({ id, created_at }) as Comentario;

describe('ordenarComentarios', () => {
  it('do mais antigo ao mais novo', () => {
    const ordem = ordenarComentarios([
      c(3, '2026-09-01T12:00:00'),
      c(1, '2026-09-01T10:00:00'),
      c(2, '2026-09-01T11:00:00'),
    ]).map((x) => x.id);
    expect(ordem).toEqual([1, 2, 3]);
  });

  it('empate no instante: o id decide, e não a posição na resposta', () => {
    const mesmo = '2026-09-01T10:00:00';
    expect(ordenarComentarios([c(9, mesmo), c(4, mesmo), c(7, mesmo)]).map((x) => x.id)).toEqual([4, 7, 9]);
    expect(ordenarComentarios([c(7, mesmo), c(9, mesmo), c(4, mesmo)]).map((x) => x.id)).toEqual([4, 7, 9]);
  });

  it('data inválida vai para o fim, em ordem de id', () => {
    const ordem = ordenarComentarios([
      c(5, 'não é data'),
      c(2, '2026-09-01T10:00:00'),
      c(3, ''),
    ]).map((x) => x.id);
    expect(ordem).toEqual([2, 3, 5]);
  });

  it('não altera a lista recebida', () => {
    const entrada = [c(2, '2026-09-02T00:00:00'), c(1, '2026-09-01T00:00:00')];
    ordenarComentarios(entrada);
    expect(entrada.map((x) => x.id)).toEqual([2, 1]);
  });
});

describe('ehRecusaDoInterno', () => {
  it('403', () => {
    expect(ehRecusaDoInterno({ response: { status: 403 } })).toBe(true);
  });

  it.each([400, 401, 404, 422, 500])('%i não', (status) => {
    expect(ehRecusaDoInterno({ response: { status } })).toBe(false);
  });

  it('sem resposta não', () => {
    expect(ehRecusaDoInterno(new Error('Network Error'))).toBe(false);
    expect(ehRecusaDoInterno(null)).toBe(false);
  });
});

describe('dicaDoInterno — quem lê o comentário interno', () => {
  it('chamado da TI: a dica de sempre', () => {
    expect(dicaDoInterno(false)).toBe('Visível só para administradores e para a equipe da TI.');
    expect(dicaDoInterno(false)).toBe(DICA_DO_INTERNO);
  });

  /** O interno é da equipe do setor do chamado (API-13): na Qualidade, a TI não lê. */
  it('chamado da Qualidade: a equipe da Qualidade, e não a da TI', () => {
    expect(dicaDoInterno(true)).toBe('Visível só para administradores e para a equipe da Qualidade.');
    expect(dicaDoInterno(true)).not.toContain('TI');
  });
});
