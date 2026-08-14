import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Seletor } from './Seletor';

/**
 * Testes de interação, montados de verdade no jsdom.
 *
 * Existem por causa de um defeito que nenhuma checagem estática pegaria: o
 * fechamento ao rolar usava captura na janela inteira e apanhava também a
 * rolagem DA PRÓPRIA LISTA. Com trinta solicitantes, tentar rolar fechava o
 * seletor no primeiro tique — e como todo modal passou a usar o componente, o
 * sintoma relatado foi "nenhuma modal rola". O tipo estava certo, o build
 * passava; só o evento de verdade revela.
 */

// React exige esta bandeira para `act` fora de um test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const OPCOES = [
  { valor: '', rotulo: 'Selecione' },
  { valor: '1', rotulo: 'Lidisay' },
  { valor: '2', rotulo: 'Gabriel' },
];

let host: HTMLDivElement;
let root: Root;
let aoMudar: ReturnType<typeof vi.fn>;

const montar = (props: Partial<React.ComponentProps<typeof Seletor>> = {}) => {
  act(() => {
    root.render(
      <Seletor
        rotulo="Solicitante"
        valor=""
        aoMudar={aoMudar}
        opcoes={OPCOES}
        {...props}
      />
    );
  });
};

const gatilho = () => host.querySelector('button')!;
const lista = () => document.querySelector('[role="listbox"]');

const abrir = () => {
  act(() => {
    gatilho().dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

beforeEach(() => {
  aoMudar = vi.fn();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('Seletor', () => {
  it('abre a lista ao clicar no gatilho', () => {
    montar();
    expect(lista()).toBeNull();

    abrir();
    expect(lista()).not.toBeNull();
  });

  it('rolar DENTRO da lista não a fecha', () => {
    montar();
    abrir();

    // O scroll não borbulha, mas a captura na janela o vê mesmo assim — é
    // exatamente o caminho do defeito.
    act(() => {
      lista()!.dispatchEvent(new Event('scroll'));
    });

    expect(lista()).not.toBeNull();
  });

  it('rolar a página fecha a lista', () => {
    montar();
    abrir();

    act(() => {
      document.dispatchEvent(new Event('scroll'));
    });

    expect(lista()).toBeNull();
  });

  it('escolher uma opção entrega o valor e fecha', () => {
    montar();
    abrir();

    // `Array.from` em vez de spread: o `target: es2017` do projeto não itera
    // NodeList por spread sem `downlevelIteration`.
    const opcao = Array.from(document.querySelectorAll('[role="option"]')).find(
      (o) => o.textContent === 'Gabriel'
    )!;
    act(() => {
      opcao.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(aoMudar).toHaveBeenCalledWith('2');
    expect(lista()).toBeNull();
  });

  it('Escape fecha e devolve o foco ao gatilho', () => {
    montar();
    abrir();

    act(() => {
      lista()!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });

    expect(lista()).toBeNull();
    expect(document.activeElement).toBe(gatilho());
  });

  it('desabilitado não abre', () => {
    montar({ disabled: true });
    abrir();

    expect(lista()).toBeNull();
  });
});
