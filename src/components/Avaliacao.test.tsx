import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/**
 * A nota de satisfação, e a corrida que o duplo clique abria.
 *
 * ── O defeito ────────────────────────────────────────────────────────
 *
 * `salvar` guardava por `useState`: `setSalvando(true)` e `disabled={salvando}`.
 * Nenhum dos dois chega ao DOM no mesmo tique, e dois cliques cabem antes do
 * render — os dois liam `salvando === false` e os dois passavam.
 *
 * É o mesmo defeito do reset de senha da `UsuariosTab`, e aqui a consequência
 * é pior. Lá as duas chamadas gravam o mesmo valor. Aqui podem gravar valores
 * DIFERENTES — clicar 5 e mudar para 4 são dois cliques em estrelas distintas
 * —, as duas partem em paralelo, e **quem vence é a última resposta a chegar,
 * não o último clique**. A nota registrada deixa de ser a que a pessoa deu, e
 * nada na tela avisa.
 *
 * ── O segundo caso, que não é sobre clique ───────────────────────────
 *
 * A avaliação vive dentro do `ChamadoModal`. Fechar a janela com a gravação em
 * voo é trivial, e a resposta chegava numa tela que já não existia: `aoAvaliar`
 * do pai e um `toast` para quem já saiu.
 */

// React exige esta bandeira para `act` fora de um test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const avaliar = vi.fn();

const CHAMADO = {
  id: 42,
  protocolo: 'HS-0042',
  titulo: 'Chamado de teste',
  descricao: 'x',
  status: 'Resolvido',
  prioridade: 'Media',
  solicitante_id: 7,
  tecnico_responsavel_id: null,
  categoria_id: null,
  arquivado: false,
  cancelado: false,
  avaliacao: null,
  data_abertura: '2026-09-01T10:00:00',
};

vi.mock('../services/chamadoshsapi', () => ({
  chamadosService: {
    avaliar: (...args: unknown[]) => avaliar(...args),
  },
}));

// Só o SOLICITANTE avalia — o id tem de bater com `solicitante_id`.
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 7, nome: 'Quem Abriu', role: 'Usuario' } }),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import Avaliacao from './Avaliacao';

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  avaliar.mockReset();
  // Promessa que NÃO resolve sozinha: é o que mantém a gravação "em voo"
  // enquanto o teste dispara o segundo clique.
  avaliar.mockImplementation(() => new Promise(() => {}));

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const montar = (aoAvaliar?: (c: unknown) => void) => {
  act(() => {
    root.render(
      <Avaliacao chamado={CHAMADO as never} aoAvaliar={aoAvaliar} />
    );
  });
};

const estrela = (n: number) =>
  host.querySelector<HTMLButtonElement>(`[aria-label="Avaliar com ${n} de 5"]`);

/**
 * Dois cliques no MESMO tique, sem render entre eles.
 *
 * Esta função é a diferença entre um teste que prova alguma coisa e um que se
 * prova a si mesmo. Com dois `act()` separados, o React re-renderiza no meio,
 * a estrela já está `disabled` no segundo clique, e o React não entrega evento
 * a elemento de formulário desabilitado — **o teste passaria mesmo com a
 * guarda removida**, porque quem barrou o segundo clique foi o `disabled`.
 *
 * Foi exatamente o que aconteceu na primeira versão do teste equivalente da
 * `UsuariosTab`, e por isso esta função existe aqui igual.
 */
const clicarDuasVezes = (...botoes: HTMLElement[]) => {
  act(() => {
    for (const b of botoes) {
      b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
};

describe('Avaliacao — a corrida do duplo clique', () => {
  it('dois cliques na MESMA estrela gravam uma nota, não duas', () => {
    montar();
    const cinco = estrela(5);
    expect(cinco).toBeTruthy();

    clicarDuasVezes(cinco!, cinco!);

    expect(avaliar).toHaveBeenCalledTimes(1);
  });

  /**
   * O caso que dói: duas estrelas DIFERENTES no mesmo tique.
   *
   * Sem a trava, saem duas gravações com valores distintos e o resultado
   * depende de qual resposta chega primeiro. Com ela, só a primeira parte —
   * e a nota fica sendo uma das duas que a pessoa clicou, sempre a mesma,
   * em vez de sorteada pela rede.
   */
  it('cliques em estrelas diferentes no mesmo tique não abrem duas gravações', () => {
    montar();

    clicarDuasVezes(estrela(5)!, estrela(4)!);

    expect(avaliar).toHaveBeenCalledTimes(1);
    expect(avaliar).toHaveBeenCalledWith(42, 5);
  });

  it('a estrela avisa que a gravação está em voo', () => {
    montar();
    clicarDuasVezes(estrela(3)!);

    expect(estrela(3)!.disabled).toBe(true);
  });
});

describe('Avaliacao — resposta que chega depois da tela sair', () => {
  it('não avisa o pai quando a gravação termina com o componente desmontado', async () => {
    const aoAvaliar = vi.fn();

    // Desta vez a promessa resolve, e o teste controla QUANDO.
    let concluir!: (c: unknown) => void;
    avaliar.mockImplementation(
      () => new Promise((resolve) => { concluir = resolve; })
    );

    montar(aoAvaliar);
    clicarDuasVezes(estrela(5)!);
    expect(avaliar).toHaveBeenCalledTimes(1);

    // A pessoa fecha o modal com a gravação em voo.
    act(() => root.unmount());

    await act(async () => {
      concluir({ ...CHAMADO, avaliacao: 5 });
    });

    // O pai já seguiu adiante: chamá-lo agora mexeria numa tela que não existe.
    expect(aoAvaliar).not.toHaveBeenCalled();

    // O `afterEach` desmonta de novo; um segundo unmount é inofensivo.
    root = createRoot(document.createElement('div'));
  });
});
