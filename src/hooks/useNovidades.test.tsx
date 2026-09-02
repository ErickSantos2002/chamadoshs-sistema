import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CHAVE_VERSAO_VISTA } from '../lib/novidades';

/**
 * O aviso "O que há de novo?" NÃO abre sozinho.
 *
 * Ele abria, a cada versão nova, na frente de quem tinha entrado para atender
 * um chamado. Aviso que interrompe é aviso que se aprende a fechar sem ler —
 * e o custo recai justo em quem usa o sistema todo dia, que é quem mais
 * receberia esses avisos.
 *
 * O convite agora é o ponto ao lado da versão, no rodapé do menu: fica lá,
 * não atrapalha, e quem quiser ler clica. Este arquivo existe para que
 * "abrir sozinho" não volte por engano — é uma linha de código, e reaparece
 * fácil.
 *
 * `__VERSAO_APP__` é trocado pelo Vite no build e não existe em teste; daí o
 * `stubGlobal` antes do import dinâmico. O hook lê a versão na carga do
 * módulo, então importar depois é o que faz o valor chegar nele.
 */
vi.stubGlobal('__VERSAO_APP__', '9.9.9');
const { useNovidades } = await import('./useNovidades');

// React exige esta bandeira para `act` fora de um test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLDivElement;
let root: Root;
let visto: ReturnType<typeof useNovidades>;

const Sonda: React.FC = () => {
  visto = useNovidades();
  return null;
};

const montar = () => {
  act(() => {
    root.render(<Sonda />);
  });
};

beforeEach(() => {
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  localStorage.clear();
});

describe('useNovidades', () => {
  /**
   * A regressão que este arquivo existe para impedir. Antes, versão diferente
   * da vista abria o modal na cara de quem entrava.
   */
  it('não abre sozinho quando a versão mudou', () => {
    localStorage.setItem(CHAVE_VERSAO_VISTA, '1.0.0');
    montar();

    expect(visto.aberto).toBe(false);
  });

  it('não abre sozinho nem na primeira visita', () => {
    montar();

    expect(visto.aberto).toBe(false);
  });

  // O ponto é o que substituiu o modal automático: ele é o convite.
  it('acende o ponto quando a versão mudou', () => {
    localStorage.setItem(CHAVE_VERSAO_VISTA, '1.0.0');
    montar();

    expect(visto.temNovidade).toBe(true);
  });

  it('não acende o ponto para quem já viu esta versão', () => {
    localStorage.setItem(CHAVE_VERSAO_VISTA, '9.9.9');
    montar();

    expect(visto.temNovidade).toBe(false);
  });

  /**
   * Quem entra pela primeira vez não tem passado para comparar. A versão é
   * registrada em silêncio, e o próximo lançamento é o primeiro aviso dela.
   */
  it('registra a versão em silêncio na primeira visita, sem acender o ponto', () => {
    montar();

    expect(visto.temNovidade).toBe(false);
    expect(localStorage.getItem(CHAVE_VERSAO_VISTA)).toBe('9.9.9');
  });

  it('abre quando a pessoa pede, e o ponto some ao fechar', () => {
    localStorage.setItem(CHAVE_VERSAO_VISTA, '1.0.0');
    montar();

    act(() => visto.abrir());
    expect(visto.aberto).toBe(true);

    act(() => visto.fechar());
    expect(visto.aberto).toBe(false);
    expect(visto.temNovidade).toBe(false);
    expect(localStorage.getItem(CHAVE_VERSAO_VISTA)).toBe('9.9.9');
  });
});
