import { describe, it, expect } from 'vitest';
import { deveAbrirNovidades, temNovidadeNaoVista } from './novidades';

describe('deveAbrirNovidades', () => {
  it('abre quando a versão mudou desde a última vista', () => {
    expect(deveAbrirNovidades('1.3.0', '1.2.0')).toBe(true);
  });

  it('não abre quando a pessoa já viu esta versão', () => {
    expect(deveAbrirNovidades('1.3.0', '1.3.0')).toBe(false);
  });

  // Mostrar "o que há de novo" para quem nunca usou o sistema é apresentar
  // mudanças em relação a um passado que a pessoa não viveu.
  it('não abre para quem entra pela primeira vez', () => {
    expect(deveAbrirNovidades('1.3.0', null)).toBe(false);
  });

  // Um deploy revertido também é mudança que vale avisar, e ordenar versões
  // aqui daria peso a um caso raro.
  it('abre também quando a versão volta atrás', () => {
    expect(deveAbrirNovidades('1.2.0', '1.3.0')).toBe(true);
  });

  it('não abre sem versão definida, em vez de avisar sobre nada', () => {
    expect(deveAbrirNovidades('', '1.2.0')).toBe(false);
    expect(deveAbrirNovidades('', null)).toBe(false);
  });

  it('trata a versão como texto, sem interpretar o formato', () => {
    expect(deveAbrirNovidades('1.3.0-beta', '1.3.0')).toBe(true);
    expect(deveAbrirNovidades('1.3.0', '1.3')).toBe(true);
  });
});

describe('temNovidadeNaoVista', () => {
  it('acompanha a mesma regra do modal', () => {
    expect(temNovidadeNaoVista('1.3.0', '1.2.0')).toBe(true);
    expect(temNovidadeNaoVista('1.3.0', '1.3.0')).toBe(false);
    expect(temNovidadeNaoVista('1.3.0', null)).toBe(false);
  });
});
