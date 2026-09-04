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

/**
 * O nome acessivel do gatilho, que e onde o valor escolhido estava sumindo.
 *
 * `aria-label` nao SOMA ao conteudo do elemento: substitui. Com
 * `aria-label="Solicitante"` o gatilho mostrava "Gabriel" na tela e anunciava
 * so "Solicitante, caixa de combinacao" -- a escolha atual, que e a unica
 * informacao que este controle carrega, nao existia no canal nao visual.
 *
 * Estes casos travam o RESULTADO -- o nome do gatilho contem o rotulo E o
 * valor --, e nao a costura que o produz. Se um dia o padrao do APG mudar de
 * `aria-labelledby` duplo para outra coisa, os casos continuam valendo.
 */
describe('Seletor — o nome diz o campo E a escolha', () => {
  /** O nome acessivel, montado como o navegador monta: na ordem dos ids. */
  const nomeDoGatilho = () => {
    const ids = gatilho().getAttribute('aria-labelledby');
    if (!ids) return null;
    return ids
      .split(/\s+/)
      .map((i) => document.getElementById(i)?.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
  };

  it('o nome traz o rotulo e a opcao escolhida', () => {
    montar({ valor: '2' });

    const nome = nomeDoGatilho();
    expect(nome).toContain('Solicitante');
    expect(nome).toContain('Gabriel');
  });

  it('nao ha aria-label apagando o conteudo do gatilho', () => {
    montar({ valor: '2' });
    expect(gatilho().hasAttribute('aria-label')).toBe(false);
  });

  it('o nome acompanha a troca de escolha', () => {
    montar({ valor: '1' });
    expect(nomeDoGatilho()).toContain('Lidisay');

    montar({ valor: '2' });
    expect(nomeDoGatilho()).toContain('Gabriel');
    expect(nomeDoGatilho()).not.toContain('Lidisay');
  });

  /**
   * `aria-controls` so quando a lista existe.
   *
   * Ela vive num portal e so e montada aberta. Apontar para ela o tempo todo
   * seria ponteiro quebrado -- o mesmo defeito que o `Campo` ja trava por
   * teste, e que a lista de definicoes do ChamadoDetalhes existe para evitar.
   */
  it('aponta para a lista so enquanto ela existe, e para a lista certa', () => {
    montar();
    expect(gatilho().getAttribute('aria-controls')).toBeNull();

    abrir();
    const alvo = gatilho().getAttribute('aria-controls');
    expect(alvo).toBeTruthy();
    expect(document.getElementById(alvo!)).toBe(lista());
  });

  /**
   * NENHUM dos ids pode ser o do proprio gatilho.
   *
   * ── Por que este caso e o mais importante dos cinco ──────────────────
   *
   * A primeira versao seguia o padrao de combobox do APG ao pe da letra:
   * `aria-labelledby` com o id do rotulo e o do PROPRIO elemento
   * (auto-referencia). A sessao do HelpHS mediu o nome COMPUTADO das duas
   * variantes e achou que ele nao e estavel:
   *
   *     sem `<label for>` associado   ->  "Situacao Aberto"   ok
   *     com `<label for>` associado   ->  "Situacao"          o valor some
   *
   * A auto-referencia e ambigua no algoritmo do nome acessivel, e ele a
   * resolve de um jeito quando existe um `<label for>` apontando para o
   * elemento e de outro quando nao existe.
   *
   * E aqui esse caso EXISTE em quatro lugares -- `role_name` e `setor_id` no
   * UsuarioModal, `categoria` e `solicitante` no NovoChamadoForm --, todos com
   * `RotuloDeCampo htmlFor` apontando para o gatilho. A auto-referencia
   * reintroduziria em quatro formularios o defeito que esta correcao fecha.
   *
   * ── E por que os outros casos NAO pegavam isso ───────────────────────
   *
   * Porque `nomeDoGatilho`, ali em cima, resolve os ids CONCATENANDO o texto
   * de cada um. Isso e a minha suposicao de como o navegador monta o nome, e
   * nao o algoritmo dele. Com auto-referencia a funcao devolvia
   * "Solicitante Gabriel" alegremente, e o navegador devolveria "Solicitante".
   *
   * Ou seja: os outros quatro casos mediam a marcacao contra a minha propria
   * expectativa. Este mede a PROPRIEDADE que torna a ambiguidade impossivel --
   * apontar para um filho, e nunca para si mesmo -- e e verificavel sem
   * depender de quem monta o nome.
   */
  it('nenhum id do rotulo aponta para o proprio gatilho', () => {
    montar({ valor: '2', id: 'campo-externo' });

    const ids = gatilho().getAttribute('aria-labelledby')!.split(/\s+/);
    expect(ids).not.toContain(gatilho().id);

    // E o segundo id aponta para um elemento DENTRO do gatilho: o valor.
    const alvo = document.getElementById(ids[1])!;
    expect(alvo).toBeTruthy();
    expect(gatilho().contains(alvo)).toBe(true);
    expect(alvo).not.toBe(gatilho());
  });

  it('a lista usa o MESMO rotulo do gatilho, e nao um proprio', () => {
    montar();
    abrir();

    const doGatilho = gatilho().getAttribute('aria-labelledby')!.split(/\s+/);
    const daLista = lista()!.getAttribute('aria-labelledby');

    expect(daLista).toBeTruthy();
    expect(doGatilho).toContain(daLista);
    // Nome proprio na lista poderia divergir do nome do gatilho.
    expect(lista()!.hasAttribute('aria-label')).toBe(false);
  });
});
