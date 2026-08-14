import { describe, it, expect } from 'vitest';
import {
  acharPorDigitacao,
  acumularBusca,
  JANELA_DA_BUSCA_MS,
  LARGURA_MINIMA,
  posicionarLista,
} from './seletor';

const area = (left: number, width: number, bottom = 100) => ({
  left,
  width,
  bottom,
  right: left + width,
});

describe('posicionarLista', () => {
  it('ancora pela esquerda quando cabe', () => {
    const p = posicionarLista(area(20, 200), 1200);

    expect(p.left).toBe(20);
    expect(p.right).toBeUndefined();
  });

  // O caso do print: os filtros de Chamados ficam colados no botão "Novo
  // Chamado", no canto direito. Ancorada à esquerda, a lista sairia da tela.
  it('ancora pela direita quando não cabe pela esquerda', () => {
    const p = posicionarLista(area(1050, 140), 1200);

    expect(p.left).toBeUndefined();
    expect(p.right).toBe(10);
  });

  // A virada exata. Numa janela de 1200 com a folga de 8, uma lista de 176
  // ainda cabe pela esquerda a partir de 1016 — e não cabe em 1017. Sem fixar
  // os dois lados, mexer na folga não quebraria teste nenhum.
  it('vira de lado no ponto certo', () => {
    expect(posicionarLista(area(1016, 100), 1200).left).toBe(1016);
    expect(posicionarLista(area(1017, 100), 1200).left).toBeUndefined();
  });

  it('a lista nunca é mais estreita que o campo', () => {
    expect(posicionarLista(area(20, 300), 1200).minWidth).toBe(300);
  });

  it('campo estreito ainda abre uma lista legível', () => {
    expect(posicionarLista(area(20, 60), 1200).minWidth).toBe(LARGURA_MINIMA);
  });

  it('abre abaixo do campo, com respiro', () => {
    expect(posicionarLista(area(20, 200, 100), 1200).top).toBeGreaterThan(100);
  });
});

describe('acumularBusca', () => {
  it('soma letras digitadas em seguida', () => {
    expect(acumularBusca('c', 'r', 100)).toBe('cr');
  });

  it('recomeça depois de uma pausa', () => {
    expect(acumularBusca('c', 'r', JANELA_DA_BUSCA_MS + 1)).toBe('r');
  });

  // Na borda exata ainda é a mesma busca. Sem isto, quem digita no ritmo do
  // limite perde letra sim, letra não.
  it('a borda da janela ainda conta como a mesma busca', () => {
    expect(acumularBusca('c', 'r', JANELA_DA_BUSCA_MS)).toBe('cr');
  });
});

describe('acharPorDigitacao', () => {
  const rotulos = ['Todas prioridades', 'Baixa', 'Média', 'Alta', 'Crítica'];

  it('acha pelo começo do rótulo', () => {
    expect(acharPorDigitacao(rotulos, 'b')).toBe(1);
  });

  it('duas letras passam da opção que só combina com a primeira', () => {
    // "c" pararia em "Crítica" já; o caso real é distinguir rótulos que
    // dividem a inicial.
    expect(acharPorDigitacao(['Categoria', 'Crítica'], 'cr')).toBe(1);
  });

  it('ignora acento — quem digita "me" quer Média', () => {
    expect(acharPorDigitacao(rotulos, 'me')).toBe(2);
  });

  it('ignora caixa', () => {
    expect(acharPorDigitacao(rotulos, 'ALT')).toBe(3);
  });

  // Devolver -1 mantém o destaque onde está. Devolver 0 pularia para a
  // primeira opção, fingindo ter achado o que não existe.
  it('devolve -1 quando nada começa com o texto', () => {
    expect(acharPorDigitacao(rotulos, 'zz')).toBe(-1);
  });

  it('devolve -1 para busca vazia', () => {
    expect(acharPorDigitacao(rotulos, '')).toBe(-1);
  });
});
