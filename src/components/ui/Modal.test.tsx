import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Modal } from './Modal';

/**
 * Como o modal fecha, montado de verdade no jsdom.
 *
 * O defeito que motivou o arquivo: a janela do chamado fechava com um clique
 * fora dela. Quem estava escrevendo um comentário e escorregava o mouse para o
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
  it('fecha ao clicar no fundo, por padrão', () => {
    montar();
    clicar(fundo());

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  /**
   * A regressão que este caso existe para impedir. Sem a prop, todo modal
   * fecha no clique de fora — e a janela do chamado, que carrega campo de
   * comentário e ações de atendimento, perdia o que estava digitado.
   */
  it('NÃO fecha ao clicar no fundo quando `fecharAoClicarFora` é falso', () => {
    montar({ fecharAoClicarFora: false });
    clicar(fundo());

    expect(aoFechar).not.toHaveBeenCalled();
  });

  it('o X continua fechando com a prop desligada — é a saída que sobra', () => {
    montar({ fecharAoClicarFora: false });
    clicar(botaoFechar());

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  // Clique DENTRO do painel nunca fechou, e não é isso que a prop muda.
  it('clicar dentro do painel não fecha, com a prop ligada ou desligada', () => {
    montar();
    clicar(painel());
    expect(aoFechar).not.toHaveBeenCalled();

    montar({ fecharAoClicarFora: false });
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

  it('Esc fecha', () => {
    montar();
    apertarEsc();

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  /**
   * Esc continua fechando MESMO com o fundo bloqueado, e é deliberado.
   *
   * Bloquear o fundo protege contra o clique acidental; tirar o Esc junto
   * deixaria quem usa teclado sem saída nenhuma a não ser caçar o X com o
   * mouse — que é o oposto do que o componente promete no próprio cabeçalho.
   * Um é gesto que se faz sem querer, o outro é intenção declarada.
   */
  it('Esc fecha mesmo com o fundo bloqueado', () => {
    montar({ fecharAoClicarFora: false });
    apertarEsc();

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });
});
