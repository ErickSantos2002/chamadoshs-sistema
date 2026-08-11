import { describe, it, expect } from 'vitest';
import { formatarPrazo, MINUTOS_POR_DIA_UTIL } from './prazo';

const DIA = MINUTOS_POR_DIA_UTIL;

describe('formatarPrazo', () => {
  it('mostra minutos abaixo de uma hora', () => {
    expect(formatarPrazo(30)).toBe('30 min');
    expect(formatarPrazo(59)).toBe('59 min');
  });

  it('vira horas a partir de 60 minutos', () => {
    expect(formatarPrazo(60)).toBe('1h');
    expect(formatarPrazo(240)).toBe('4h');
    expect(formatarPrazo(90)).toBe('1h 30min');
  });

  // A equipe fala em dias, não em minutos: "dois dias" comunica o prazo,
  // "960 minutos" obriga a fazer conta.
  it('vira dias úteis a partir de um dia inteiro', () => {
    expect(formatarPrazo(DIA)).toBe('1 dia útil');
    expect(formatarPrazo(DIA * 2)).toBe('2 dias úteis');
  });

  it('concorda o singular e o plural de dia útil', () => {
    expect(formatarPrazo(DIA)).toContain('1 dia útil');
    expect(formatarPrazo(DIA * 3)).toContain('3 dias úteis');
  });

  it('soma o resto ao dia quando não é exato', () => {
    expect(formatarPrazo(DIA + 120)).toBe('1 dia útil e 2h');
    expect(formatarPrazo(DIA + 30)).toBe('1 dia útil e 30min');
    expect(formatarPrazo(DIA + 90)).toBe('1 dia útil e 1h 30min');
  });

  // O dia útil tem 480 minutos e não 1440: o expediente é 08–12 e 13–17, e o
  // almoço não conta. Se alguém trocar a constante por 24h, este teste cai.
  it('usa o dia útil de 480 minutos, não o dia de relógio', () => {
    expect(MINUTOS_POR_DIA_UTIL).toBe(480);
    expect(formatarPrazo(480)).toBe('1 dia útil');
    expect(formatarPrazo(1440)).toBe('3 dias úteis');
  });

  it('não inventa prazo a partir de valor inválido', () => {
    expect(formatarPrazo(0)).toBe('—');
    expect(formatarPrazo(-10)).toBe('—');
    expect(formatarPrazo(NaN)).toBe('—');
  });
});
