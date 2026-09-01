import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Modal } from './Modal';

/**
 * Como o modal fecha, montado de verdade no jsdom.
 *
 * O defeito que motivou o arquivo: as janelas fechavam com um clique fora
 * delas. Quem estava escrevendo um comentário e escorregava o mouse para o
 * lado perdia o texto sem nenhum aviso — e o clique no fundo é o gesto mais
 * fácil de fazer sem querer que existe numa tela.
 *
 * `renderToStaticMarkup`, que o `kit.test.tsx` usa, não serve aqui: ele
 * congela a FORMA e não dispara evento nenhum. Fechamento é comportamento.
 */

// React exige esta bandeira para `act` fora de um test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLDivElement;
let root: Root;
let aoFechar: ReturnType<typeof vi.fn>;

const montar = (props: Partial<React.ComponentProps<typeof Modal>> = {}) => {
  act(() => {
    root.render(
      <Modal aberto aoFechar={aoFechar} titulo="Chamado" {...props}>
        <input aria-label="Comentário" />
      </Modal>
    );
  });
};

/** O fundo escuro: o elemento que recebe o clique de fora do painel. */
const fundo = () => host.querySelector('.fixed.inset-0') as HTMLElement;
const painel = () => host.querySelector('[role="dialog"]') as HTMLElement;
const botaoFechar = () =>
  host.querySelector('[aria-label="Fechar"]') as HTMLButtonElement;

const clicar = (elemento: HTMLElement) => {
  act(() => {
    elemento.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

beforeEach(() => {
  aoFechar = vi.fn();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('Modal — fechar pelo fundo', () => {
  /**
   * A regressão que este caso existe para impedir, e a razão de o padrão ser
   * FECHADO: todo modal do sistema é formulário ou carrega trabalho em
   * andamento. Um clique escapado no fundo apagava o que a pessoa tinha
   * digitado, sem aviso e sem como recuperar.
   */
  it('NÃO fecha ao clicar no fundo, por padrão', () => {
    montar();
    clicar(fundo());

    expect(aoFechar).not.toHaveBeenCalled();
  });

  it('o X fecha — é a saída principal', () => {
    montar();
    clicar(botaoFechar());

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  // A prop continua existindo para quem quiser o comportamento antigo. Hoje
  // ninguém pede, e é de propósito que o padrão não dependa disso.
  it('fecha no fundo quando `fecharAoClicarFora` é pedido explicitamente', () => {
    montar({ fecharAoClicarFora: true });
    clicar(fundo());

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  // Clique DENTRO do painel nunca fechou, nos dois modos.
  it('clicar dentro do painel não fecha, nos dois modos', () => {
    montar();
    clicar(painel());
    expect(aoFechar).not.toHaveBeenCalled();

    montar({ fecharAoClicarFora: true });
    clicar(painel());
    expect(aoFechar).not.toHaveBeenCalled();
  });
});

describe('Modal — fechar pelo teclado', () => {
  const apertarEsc = () => {
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
  };

  /**
   * Esc fecha, e é deliberado que ele tenha sobrevivido ao bloqueio do fundo.
   *
   * Bloquear o fundo protege contra o clique acidental; tirar o Esc junto
   * deixaria quem usa teclado sem saída nenhuma a não ser caçar o X com o
   * mouse — que é o oposto do que o componente promete no próprio cabeçalho.
   * Um é gesto que se faz sem querer, o outro é intenção declarada.
   */
  it('Esc fecha, com o fundo bloqueado por padrão', () => {
    montar();
    apertarEsc();

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });
});
