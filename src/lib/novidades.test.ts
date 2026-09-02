import { describe, it, expect } from 'vitest';
import { temNovidadeNaoVista } from './novidades';

/**
 * Estes casos vinham de `deveAbrirNovidades`, que decidia se o modal abria
 * sozinho. A função saiu — o aviso não interrompe mais ninguém —, mas a regra
 * sobreviveu inteira: é a mesma comparação, agora decidindo se o ponto ao
 * lado da versão acende.
 */
describe('temNovidadeNaoVista', () => {
  it('acende quando a versão mudou desde a última vista', () => {
    expect(temNovidadeNaoVista('1.3.0', '1.2.0')).toBe(true);
  });

  it('não acende quando a pessoa já viu esta versão', () => {
    expect(temNovidadeNaoVista('1.3.0', '1.3.0')).toBe(false);
  });

  // Apontar "o que há de novo" para quem nunca usou o sistema é apresentar
  // mudanças em relação a um passado que a pessoa não viveu.
  it('não acende para quem entra pela primeira vez', () => {
    expect(temNovidadeNaoVista('1.3.0', null)).toBe(false);
  });

  // Um deploy revertido também é mudança que vale avisar, e ordenar versões
  // aqui daria peso a um caso raro.
  it('acende também quando a versão volta atrás', () => {
    expect(temNovidadeNaoVista('1.2.0', '1.3.0')).toBe(true);
  });

  it('não acende sem versão definida, em vez de avisar sobre nada', () => {
    expect(temNovidadeNaoVista('', '1.2.0')).toBe(false);
    expect(temNovidadeNaoVista('', null)).toBe(false);
  });

  it('trata a versão como texto, sem interpretar o formato', () => {
    expect(temNovidadeNaoVista('1.3.0-beta', '1.3.0')).toBe(true);
    expect(temNovidadeNaoVista('1.3.0', '1.3')).toBe(true);
  });
});
