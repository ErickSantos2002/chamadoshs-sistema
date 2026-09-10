import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/**
 * O reset de senha, e a corrida que o duplo clique abria.
 *
 * ── O defeito ────────────────────────────────────────────────────────
 *
 * `handleResetPassword` não tinha estado em voo, e o botão não tinha
 * `carregando` nem `disabled`. Dois cliques disparavam DUAS trocas de senha
 * para o mesmo usuário, em paralelo, sem nada garantindo a ordem.
 *
 * Na maior parte das vezes isso não dá em nada visível — as duas gravam o
 * mesmo valor. Mas é uma corrida com credencial de outra pessoa em jogo, e o
 * resultado depende de qual resposta chega primeiro.
 *
 * E duplo clique não é descuido raro: é o gesto de quem acha que o primeiro
 * clique não pegou. Aqui o primeiro clique não dava **nenhum** sinal de ter
 * pego, porque o botão não mudava de estado — o gesto era, na prática,
 * convidado.
 *
 * ── Por que a guarda é uma linha E o `carregando` ────────────────────
 *
 * `setResetandoSenha(true)` só chega ao DOM no próximo render, e dois cliques
 * rápidos cabem antes disso. O botão desabilitado é o aviso visual; o
 * `if (resetandoSenha) return` no início da função é a trava. Este teste
 * verifica a trava, que é a parte que o olho não vê.
 */

// React exige esta bandeira para `act` fora de um test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const trocarSenha = vi.fn();

const USUARIO = {
  id: 7,
  nome: 'Conta de Teste',
  email: 'teste@exemplo.invalido',
  username: 'teste',
  role: 'Usuario',
  ativo: true,
  setor_id: null,
  conta_de_servico: false,
};

vi.mock('../../context/CadastrosContext', () => ({
  useCadastros: () => ({
    usuarios: [USUARIO],
    setores: [],
    desativarUsuario: vi.fn(),
    reativarUsuario: vi.fn(),
    updateUsuarioPassword: trocarSenha,
    refreshData: vi.fn(),
    loading: false,
    error: null,
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, username: 'admin', role: 'Administrador' } }),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const { default: UsuariosTab } = await import('./UsuariosTab');

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  trocarSenha.mockReset();
  // Uma promessa que NÃO resolve sozinha: é assim que se abre a janela entre
  // o primeiro clique e a resposta, que é exatamente onde o segundo clique
  // caía. Com um mock que resolve na hora, a corrida não existiria no teste e
  // ele passaria mesmo sem a guarda.
  trocarSenha.mockImplementation(() => new Promise(() => {}));

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<UsuariosTab />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

/**
 * O gatilho na linha é um `BotaoDeAcao`: só ícone, sem texto. Quem o nomeia é
 * o `aria-label` — que é justamente o que o componente existe para tornar
 * obrigatório. Procurar por texto não o acha, e foi assim que a primeira
 * versão deste teste falhou.
 */
const porRotulo = (rotulo: string) =>
  host.querySelector<HTMLButtonElement>(`[aria-label="${rotulo}"]`);

const clicar = (el: HTMLElement) => {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

/**
 * Dois cliques no MESMO tique, sem render entre eles.
 *
 * Esta função é a diferença entre um teste que prova alguma coisa e um que se
 * prova a si mesmo. Com dois `act()` separados, o React re-renderiza no meio,
 * o botão já está `disabled` no segundo clique, e o React não entrega evento a
 * elemento de formulário desabilitado — **o teste passa mesmo com a guarda
 * removida**, porque quem barrou o segundo clique foi o `disabled`.
 *
 * Conferido: com `if (resetandoSenha) return` comentado, a versão de dois
 * `act()` passava. Só esta versão reprova.
 *
 * E é a versão que descreve o gesto real: um duplo clique de mouse são dois
 * eventos em milissegundos, antes de qualquer pintura.
 */
const clicarDuasVezes = (el: HTMLElement) => {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const preencher = (campo: HTMLInputElement, valor: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )!.set!;
  act(() => {
    setter.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

/** Abre o modal de reset e preenche as duas senhas com um valor válido. */
const abrirEPreencher = () => {
  const abrir = porRotulo(`Resetar a senha de ${USUARIO.nome}`);
  expect(abrir).toBeTruthy();
  clicar(abrir!);

  const senhas = Array.from(
    host.querySelectorAll<HTMLInputElement>('input[type="password"]')
  );
  expect(senhas).toHaveLength(2);
  senhas.forEach((c) => preencher(c, 'senhaSegura123'));
};

describe('UsuariosTab — reset de senha', () => {
  it('dois cliques disparam UMA troca de senha, não duas', () => {
    abrirEPreencher();

    const confirmar = Array.from(host.querySelectorAll('button')).filter((b) =>
      b.textContent?.includes('Resetar senha')
    );
    const botao = confirmar[confirmar.length - 1];

    clicarDuasVezes(botao);

    expect(trocarSenha).toHaveBeenCalledTimes(1);
  });

  it('o botão avisa que está em voo', () => {
    abrirEPreencher();

    const confirmar = Array.from(host.querySelectorAll('button')).filter((b) =>
      b.textContent?.includes('Resetar senha')
    );
    const botao = confirmar[confirmar.length - 1];

    expect(botao.disabled).toBe(false);
    clicar(botao);

    // `carregando` no `Button` desabilita e põe `aria-busy` — o aviso para
    // quem vê e para quem usa leitor de tela.
    expect(botao.disabled).toBe(true);
    expect(botao.getAttribute('aria-busy')).toBe('true');
  });
});
