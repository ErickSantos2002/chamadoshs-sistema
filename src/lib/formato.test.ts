import { describe, it, expect } from 'vitest';
import { formatarDuracao, iniciais } from './formato';

describe('formatarDuracao', () => {
  it('mostra minutos quando é menos de uma hora', () => {
    expect(formatarDuracao(7)).toBe('7m');
    expect(formatarDuracao(59)).toBe('59m');
  });

  it('vira horas a partir de 60 minutos', () => {
    expect(formatarDuracao(60)).toBe('1h');
    expect(formatarDuracao(135)).toBe('2h 15m');
  });

  it('vira dias a partir de 24 horas', () => {
    expect(formatarDuracao(1440)).toBe('1d');
    expect(formatarDuracao(1440 + 60 * 20)).toBe('1d 20h');
  });

  // Num card, "33d 0h" ocupa espaço para dizer o mesmo que "33d".
  it('omite a unidade menor quando ela é zero', () => {
    expect(formatarDuracao(120)).toBe('2h');
    expect(formatarDuracao(33 * 1440)).toBe('33d');
  });

  it('nunca mostra mais de duas unidades', () => {
    // 13d 20h 45m — o resto de minutos não aparece.
    expect(formatarDuracao(13 * 1440 + 20 * 60 + 45)).toBe('13d 20h');
  });

  it('trata ausência de valor sem quebrar o layout', () => {
    expect(formatarDuracao(null)).toBe('—');
    expect(formatarDuracao(undefined)).toBe('—');
  });

  // Chamado resolvido no mesmo minuto da abertura devolve 0, e "0m" é a
  // resposta certa — diferente de "sem medição", que é o traço.
  it('distingue zero de ausência', () => {
    expect(formatarDuracao(0)).toBe('0m');
  });

  it('não produz duração negativa se a API mandar lixo', () => {
    expect(formatarDuracao(-5)).toBe('0m');
  });
});

describe('iniciais', () => {
  it('usa primeiro e último nome', () => {
    expect(iniciais('Rickelme David')).toBe('RD');
    expect(iniciais('Welton Gomes Martins')).toBe('WM');
  });

  // Assumir que todo mundo tem sobrenome produz avatar de uma letra só.
  it('usa duas letras quando o nome é único', () => {
    expect(iniciais('Suporte')).toBe('SU');
    expect(iniciais('televisao')).toBe('TE');
  });

  it('ignora partículas do meio do nome', () => {
    expect(iniciais('Erick dos Santos')).toBe('ES');
    expect(iniciais('Maria de Souza')).toBe('MS');
  });

  it('não quebra com nome ausente ou vazio', () => {
    expect(iniciais(null)).toBe('?');
    expect(iniciais(undefined)).toBe('?');
    expect(iniciais('   ')).toBe('?');
  });

  // Nome que é só partícula não deve virar string vazia dentro do círculo.
  it('devolve interrogação quando sobra nada depois de filtrar', () => {
    expect(iniciais('de')).toBe('?');
  });

  it('normaliza para maiúscula', () => {
    expect(iniciais('rickelme david')).toBe('RD');
  });
});
