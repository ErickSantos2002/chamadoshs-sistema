import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AuthContext } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { AvisoDeSessaoAlterada } from './AppLayout';

/**
 * O aviso de sessão alterada, por cima dos modais (AUTH-01, D4).
 *
 * Homologado em Chromium em 25/11/2026: o aviso nascia dentro do `<main>` e,
 * com o formulário de novo chamado aberto no modal, ficava — com o botão de
 * recarregar — atrás do fundo escurecido. Quem estava no modal só sabia da
 * troca depois de tentar enviar.
 *
 * O jsdom não faz layout: o que se trava aqui é ONDE o aviso é montado (fora
 * do `<main>` e fora do modal, no `<body>`), a camada declarada, o foco e o
 * botão. A sobreposição de fato é conferida no navegador.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type Valor = React.ContextType<typeof AuthContext>;

let host: HTMLDivElement;
let root: Root;
let aoFechar: ReturnType<typeof vi.fn>;

const montar = async (sessaoAlterada: { conta: string } | null, comModal: boolean) => {
  const valor = { user: { id: 7, username: 'usuario.ficticio.a' }, sessaoAlterada } as unknown as Valor;
  await act(async () => {
    root.render(
      <AuthContext.Provider value={valor}>
        <main id="conteudo-principal">
          <AvisoDeSessaoAlterada />
          <button type="button" id="atras">Atrás do modal</button>
          <Modal aberto={comModal} aoFechar={aoFechar} titulo="Novo Chamado">
            <input id="titulo" defaultValue="Texto ficticio digitado" />
            <button type="button" onClick={aoFechar}>
              Cancelar
            </button>
            <button type="button">Abrir chamado</button>
          </Modal>
        </main>
      </AuthContext.Provider>
    );
  });
};

const faixa = () => document.querySelector<HTMLElement>('[data-aviso-de-sessao]');
const botaoRecarregar = () =>
  Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === 'Recarregar a página'
  );
/** O número da classe `z-…` do elemento. */
const camada = (el: Element | null) => {
  const classe = Array.from(el?.classList ?? []).find((c) => c.startsWith('z-'));
  return classe ? Number(classe.replace(/[^\d]/g, '')) : NaN;
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
  vi.restoreAllMocks();
});

describe('aviso de sessão alterada', () => {
  it('sem troca de sessão não monta nada, e o modal fica como sempre', async () => {
    await montar(null, true);

    expect(faixa()).toBeNull();
    expect(botaoRecarregar()).toBeUndefined();
    // O foco do modal foi para o primeiro campo dele, como sempre.
    expect(document.activeElement?.id).toBe('titulo');
  });

  it('com o modal aberto: fica fora do `<main>` e do modal, numa camada acima dele', async () => {
    await montar({ conta: 'admin.ficticio.b' }, true);

    const aviso = faixa();
    const dialogo = document.querySelector('[role="dialog"]');
    const fundoDoModal = dialogo?.parentElement ?? null;
    expect(aviso).not.toBeNull();
    expect(dialogo).not.toBeNull();

    expect(aviso!.parentElement).toBe(document.body);
    expect(document.getElementById('conteudo-principal')!.contains(aviso)).toBe(false);
    expect(fundoDoModal!.contains(aviso)).toBe(false);

    expect(aviso!.classList.contains('fixed')).toBe(true);
    expect(camada(aviso)).toBeGreaterThan(camada(fundoDoModal));
  });

  it('diz qual conta entrou e o que fazer, como alerta', async () => {
    await montar({ conta: 'admin.ficticio.b' }, true);

    const alerta = faixa()!.querySelector('[role="alert"]');
    expect(alerta).not.toBeNull();
    expect(alerta!.textContent).toContain('admin.ficticio.b');
    expect(alerta!.textContent).toContain('nada do que está aqui será enviado');
    expect(alerta!.textContent).toContain('recarregue a página');
  });

  it('o foco vai para a faixa, não para o botão — digitar não recarrega a página', async () => {
    // O modal já estava aberto, com o foco num campo; a troca vem depois.
    await montar(null, true);
    expect(document.activeElement?.id).toBe('titulo');
    await montar({ conta: 'admin.ficticio.b' }, true);

    expect(document.activeElement).toBe(faixa());
    expect(document.activeElement).not.toBe(botaoRecarregar());
    // E o botão é alcançável: está dentro da faixa e não está desabilitado.
    expect(faixa()!.contains(botaoRecarregar()!)).toBe(true);
    expect(botaoRecarregar()!.disabled).toBe(false);
  });

  it('o que foi digitado no modal continua lá', async () => {
    await montar(null, true);
    await montar({ conta: 'admin.ficticio.b' }, true);

    expect((document.getElementById('titulo') as HTMLInputElement).value).toBe(
      'Texto ficticio digitado'
    );
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('o Tab dentro da faixa não é capturado pela armadilha de foco do modal', async () => {
    await montar(null, true);
    await montar({ conta: 'admin.ficticio.b' }, true);

    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    act(() => {
      faixa()!.dispatchEvent(evento);
    });

    // A armadilha só age com o foco dentro do painel do modal.
    expect(evento.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(faixa());
  });

  it('o botão recarrega a página', async () => {
    const recarregar = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...original, reload: recarregar },
    });
    await montar({ conta: 'admin.ficticio.b' }, false);

    act(() => {
      botaoRecarregar()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: original });

    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it('a troca desfeita (a mesma conta voltou): o aviso some', async () => {
    await montar({ conta: 'admin.ficticio.b' }, false);
    expect(faixa()).not.toBeNull();

    await montar(null, false);

    expect(faixa()).toBeNull();
  });
});

/**
 * A faixa por cima do modal cobria o cabeçalho dele, com o X de fechar
 * (reteste em Chromium, 25/11/2026). A altura dela vai para uma variável CSS
 * e o `Modal` desce essa medida. O jsdom não mede altura: aqui se trava o
 * contrato entre os dois — a variável existe só com a faixa, e o modal a lê.
 */
describe('a faixa não cobre o cabeçalho do modal', () => {
  const VARIAVEL = '--altura-aviso-de-sessao';
  const altura = () => document.documentElement.style.getPropertyValue(VARIAVEL);
  const fundoDoModal = () => document.querySelector('[role="dialog"]')?.parentElement ?? null;

  it('com a faixa na tela, a altura dela fica publicada para o modal', async () => {
    await montar({ conta: 'admin.ficticio.b' }, true);

    expect(altura()).toMatch(/^\d+px$/);
  });

  it('o modal desce e encolhe por essa medida, e por zero quando ela não existe', async () => {
    await montar({ conta: 'admin.ficticio.b' }, true);

    expect(fundoDoModal()!.className).toContain(`pt-[calc(1rem+var(${VARIAVEL},0px))]`);
    expect(document.querySelector('[role="dialog"]')!.className).toContain(
      `max-h-[calc(92vh-var(${VARIAVEL},0px))]`
    );
  });

  it('sem sessão alterada a variável não existe: nenhum modal muda de lugar', async () => {
    await montar(null, true);

    expect(altura()).toBe('');
  });

  it('a faixa some (a mesma conta voltou): a variável sai junto', async () => {
    await montar({ conta: 'admin.ficticio.b' }, true);
    expect(altura()).not.toBe('');

    await montar(null, true);

    expect(altura()).toBe('');
  });

  it('o X do modal continua funcionando com a faixa na tela', async () => {
    await montar(null, true);
    await montar({ conta: 'admin.ficticio.b' }, true);

    const x = document.querySelector<HTMLButtonElement>('[role="dialog"] button[aria-label="Fechar"]');
    expect(x).not.toBeNull();
    act(() => {
      x!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  it('o Esc continua fechando o modal, com o foco na faixa', async () => {
    await montar(null, true);
    await montar({ conta: 'admin.ficticio.b' }, true);
    expect(document.activeElement).toBe(faixa());

    act(() => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });

    expect(aoFechar).toHaveBeenCalledTimes(1);
  });
});

/**
 * O teclado entre a faixa e o modal (A1, Fase 10).
 *
 * Medido em Chromium em 25/11/2026: o Shift+Tab a partir do botão da faixa,
 * ou do painel do modal, caía na página atrás do véu, e de dentro do modal o
 * Tab não voltava à faixa. Havia dois donos do Tab — a faixa empurrava o foco
 * para o modal, e a armadilha do modal só conhecia o próprio painel.
 *
 * Agora o ciclo é um só, da armadilha do `Modal`: faixa → modal → faixa.
 *
 * O jsdom não anda com o Tab sozinho. O que se prova aqui é a COSTURA: nas
 * pontas a tecla é tratada (`defaultPrevented`) e o foco pousa do outro lado;
 * no meio ela não é tocada, e quem anda é o navegador. A volta inteira, com o
 * navegador de verdade, é conferida no laboratório.
 */
describe('teclado: a faixa e o modal num ciclo só', () => {
  const tecla = (alvo: Element, shiftKey = false) => {
    const evento = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      alvo.dispatchEvent(evento);
    });
    return evento;
  };
  const dialogo = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
  const x = () => dialogo().querySelector<HTMLButtonElement>('button[aria-label="Fechar"]')!;
  const botaoDoModal = (texto: string) =>
    Array.from(dialogo().querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!;
  const atras = () => document.getElementById('atras')!;

  const comFaixaEModal = async () => {
    await montar(null, true);
    await montar({ conta: 'admin.ficticio.b' }, true);
  };

  it('Tab do botão de recarregar: entra no modal pelo X, o primeiro controle dele', async () => {
    await comFaixaEModal();
    botaoRecarregar()!.focus();

    const evento = tecla(botaoRecarregar()!);

    expect(evento.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(x());
  });

  it('Tab do último controle do modal: volta ao botão de recarregar', async () => {
    await comFaixaEModal();
    botaoDoModal('Abrir chamado').focus();

    const evento = tecla(botaoDoModal('Abrir chamado'));

    expect(evento.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(botaoRecarregar());
  });

  it('Shift+Tab do botão de recarregar: vai ao último controle do modal, não à página atrás', async () => {
    await comFaixaEModal();
    botaoRecarregar()!.focus();

    const evento = tecla(botaoRecarregar()!, true);

    expect(evento.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(botaoDoModal('Abrir chamado'));
  });

  it('Shift+Tab do X: volta ao botão de recarregar', async () => {
    await comFaixaEModal();
    x().focus();

    const evento = tecla(x(), true);

    expect(evento.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(botaoRecarregar());
  });

  it('Shift+Tab da própria faixa (o foco inicial): último controle do modal', async () => {
    await comFaixaEModal();
    expect(document.activeElement).toBe(faixa());

    const evento = tecla(faixa()!, true);

    expect(evento.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(botaoDoModal('Abrir chamado'));
  });

  it('Shift+Tab do painel do modal: botão de recarregar, não a página atrás', async () => {
    await comFaixaEModal();
    dialogo().focus();

    const evento = tecla(dialogo(), true);

    expect(evento.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(botaoRecarregar());
  });

  it('a volta inteira, nos dois sentidos, nunca pousa no que está atrás do modal', async () => {
    await comFaixaEModal();
    // A ordem do ciclo: recarregar → X → título → Cancelar → Abrir chamado.
    const ciclo = [
      botaoRecarregar()!,
      x(),
      document.getElementById('titulo')!,
      botaoDoModal('Cancelar'),
      botaoDoModal('Abrir chamado'),
    ];

    for (const shift of [false, true]) {
      for (const [i, controle] of ciclo.entries()) {
        controle.focus();
        const evento = tecla(controle, shift);
        const vizinho = ciclo[(i + (shift ? -1 : 1) + ciclo.length) % ciclo.length];
        // Na costura entre as regiões a tecla é tratada e o foco pousa no
        // vizinho; no meio de uma região o navegador anda, e nada é tocado.
        const mudaDeRegiao = (controle === ciclo[0]) !== (vizinho === ciclo[0]);
        expect(evento.defaultPrevented, `${shift ? 'Shift+' : ''}Tab em ${i}`).toBe(mudaDeRegiao);
        expect(document.activeElement).toBe(mudaDeRegiao ? vizinho : controle);
        expect(document.activeElement).not.toBe(atras());
      }
    }
  });

  it('o botão de recarregar e o X continuam alcançáveis e ativos', async () => {
    await comFaixaEModal();

    expect(botaoRecarregar()!.disabled).toBe(false);
    expect(botaoRecarregar()!.tabIndex).toBe(0);
    expect(x().disabled).toBe(false);
    expect(x().tabIndex).toBe(0);
  });

  it('o Cancelar do modal continua fechando, com a faixa na tela', async () => {
    await comFaixaEModal();

    act(() => {
      botaoDoModal('Cancelar').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(aoFechar).toHaveBeenCalledTimes(1);
    expect(faixa()).not.toBeNull();
  });

  it('o Esc fecha de qualquer ponto do ciclo', async () => {
    await comFaixaEModal();

    for (const controle of [botaoRecarregar()!, x(), botaoDoModal('Abrir chamado')]) {
      controle.focus();
      act(() => {
        controle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
    }

    expect(aoFechar).toHaveBeenCalledTimes(3);
  });

  it('sem faixa, o modal fica como sempre: o ciclo é só dele', async () => {
    await montar(null, true);

    // Último → primeiro, e primeiro → último.
    botaoDoModal('Abrir chamado').focus();
    expect(tecla(botaoDoModal('Abrir chamado')).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(x());
    expect(tecla(x(), true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(botaoDoModal('Abrir chamado'));

    // No meio, e com o foco no próprio painel, a tecla não é tocada.
    document.getElementById('titulo')!.focus();
    expect(tecla(document.getElementById('titulo')!).defaultPrevented).toBe(false);
    dialogo().focus();
    expect(tecla(dialogo(), true).defaultPrevented).toBe(false);
    expect(tecla(dialogo()).defaultPrevented).toBe(false);
  });

  it('sem modal, a faixa não prende nada: o Tab segue o caminho normal da página', async () => {
    await montar({ conta: 'admin.ficticio.b' }, false);
    expect(document.activeElement).toBe(faixa());

    expect(tecla(faixa()!).defaultPrevented).toBe(false);
    expect(tecla(faixa()!, true).defaultPrevented).toBe(false);
    botaoRecarregar()!.focus();
    expect(tecla(botaoRecarregar()!).defaultPrevented).toBe(false);
    expect(tecla(botaoRecarregar()!, true).defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(botaoRecarregar());
  });

  it('com o foco fora da faixa e do modal, nada é puxado de volta', async () => {
    await comFaixaEModal();
    atras().focus();

    expect(tecla(atras()).defaultPrevented).toBe(false);
    expect(tecla(atras(), true).defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(atras());
  });

  it('dois modais empilhados: a faixa faz ciclo com o de cima', async () => {
    await act(async () => {
      root.render(
        <AuthContext.Provider
          value={{ user: { id: 7 }, sessaoAlterada: { conta: 'admin.ficticio.b' } } as unknown as Valor}
        >
          <AvisoDeSessaoAlterada />
          <Modal aberto aoFechar={() => {}} titulo="De baixo">
            <button type="button">Ação de baixo</button>
          </Modal>
          <Modal aberto aoFechar={() => {}} titulo="De cima">
            <button type="button">Ação de cima</button>
          </Modal>
        </AuthContext.Provider>
      );
    });
    const deCima = document.querySelector<HTMLElement>('[role="dialog"][aria-label="De cima"]')!;
    botaoRecarregar()!.focus();

    tecla(botaoRecarregar()!);
    expect(deCima.contains(document.activeElement)).toBe(true);

    botaoRecarregar()!.focus();
    tecla(botaoRecarregar()!, true);
    expect(document.activeElement?.textContent).toBe('Ação de cima');
  });
});
