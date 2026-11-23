import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  categoriasService,
  setoresService,
  usuariosService,
} from '../../services/chamadoshsapi';
import type { Usuario } from '../../types/api';
import type { CadastrosContextData } from '../../types/cadastros.types';

/**
 * A lista da aba Usuários (1.11.0), com o `CadastrosProvider` de verdade.
 *
 * Só os serviços são falsos: a carga, a ordem, o filtro, os contadores e o que
 * acontece depois de criar, editar, desativar e reativar passam pelo contexto
 * real, que é onde a lista mora. Nenhuma chamada sai para a rede.
 *
 * A regra da ordem e do filtro, caso a caso, está em
 * `lib/usuariosLista.test.ts`. Aqui se confere que a tela a aplica.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'bruna', role: 'Administrador', conta_de_servico: false },
    identidadeConfirmada: true,
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const { default: UsuariosTab } = await import('./UsuariosTab');
const { CadastrosProvider, useCadastros } = await import('../../context/CadastrosContext');

const usuario = (
  id: number,
  nome: string,
  ativo: boolean,
  extras: Partial<Usuario> = {}
): Usuario =>
  ({
    id,
    nome,
    role_id: 3,
    ativo,
    conta_de_servico: false,
    created_at: `2026-01-${String((id % 28) + 1).padStart(2, '0')}T08:00:00`,
    updated_at: '2026-01-01T08:00:00',
    ...extras,
  }) as Usuario;

/** 1 é quem está logado. Três ativos e dois inativos, fora de ordem. */
const CADASTRO: Usuario[] = [
  usuario(4, 'davi', false, { role_id: 2 }),
  usuario(1, 'bruna', true, { role_id: 1 }),
  usuario(2, 'zeca', false),
  usuario(5, 'caio', true),
  usuario(3, 'ana', true, { role_id: 2 }),
];

let host: HTMLDivElement;
let root: Root;
let cadastros: CadastrosContextData;

/** Entrega o contexto ao teste, para criar e editar sem passar pelo modal. */
const Sonda = () => {
  cadastros = useCadastros();
  return null;
};

const montar = async () => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(
      <CadastrosProvider>
        <Sonda />
        <UsuariosTab />
      </CadastrosProvider>
    );
  });
};

const desmontar = () => {
  act(() => root.unmount());
  host.remove();
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
  vi.spyOn(setoresService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue(CADASTRO);
});

afterEach(() => {
  desmontar();
});

const clicar = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const digitarNaBusca = async (texto: string) => {
  const campo = host.querySelector<HTMLInputElement>('input[type="search"]')!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(campo, texto);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

/** Os IDs das linhas de usuário, na ordem em que estão na tabela. */
const idsNaTela = () =>
  Array.from(host.querySelectorAll('tbody tr'))
    .map((tr) => tr.querySelector('td')?.textContent ?? '')
    .filter((texto) => texto.startsWith('#'))
    .map((texto) => Number(texto.slice(1)));

const grupoDoFiltro = () =>
  host.querySelector('[aria-label="Filtrar usuários por status"]')!;

const botoesDoFiltro = () =>
  Array.from(grupoDoFiltro().querySelectorAll('button')).map((b) => ({
    texto: b.textContent,
    marcado: b.getAttribute('aria-pressed') === 'true',
  }));

const filtrar = (rotulo: string) =>
  clicar(
    Array.from(grupoDoFiltro().querySelectorAll('button')).find((b) =>
      b.textContent?.startsWith(rotulo)
    )!
  );

const ordenarPor = (coluna: string) =>
  clicar(
    Array.from(host.querySelectorAll('thead button')).find(
      (b) => b.textContent?.trim() === coluna
    )!
  );

const separador = () =>
  Array.from(host.querySelectorAll('tbody tr')).find((tr) =>
    /^Inativos \(\d+\)$/.test(tr.textContent?.trim() ?? '')
  );

const porRotulo = (rotulo: string) =>
  host.querySelector<HTMLButtonElement>(`[aria-label="${rotulo}"]`);

const avisoDeOcultos = () => host.querySelector('p[role="status"]')?.textContent ?? null;

describe('UsuariosTab — carga', () => {
  it('carrega pelo listarTodos, e não pela chamada de uma página só', async () => {
    const umaPagina = vi.spyOn(usuariosService, 'listar');
    await montar();
    expect(usuariosService.listarTodos).toHaveBeenCalledTimes(1);
    expect(umaPagina).not.toHaveBeenCalled();
  });

  it('mais de 100 usuários: todas as páginas entram na lista e na contagem', async () => {
    vi.mocked(usuariosService.listarTodos).mockRestore();
    const todos = Array.from({ length: 150 }, (_, i) => usuario(i + 1, `u${i + 1}`, i % 3 !== 0));
    const paginas = vi
      .spyOn(usuariosService, 'listar')
      .mockImplementation(async (params) =>
        todos.slice(params!.skip!, params!.skip! + params!.limit!)
      );

    await montar();

    expect(paginas).toHaveBeenCalledTimes(2);
    expect(botoesDoFiltro().map((b) => b.texto)).toEqual([
      'Todos (150)',
      'Ativos (100)',
      'Inativos (50)',
    ]);
    expect(idsNaTela()).toHaveLength(150);
    expect(host.textContent).not.toContain('pode estar incompleta');
  });

  it('ID repetido entre páginas: aparece uma vez, e a tela avisa que pode faltar gente', async () => {
    vi.mocked(usuariosService.listarTodos).mockRestore();
    const pagina1 = Array.from({ length: 100 }, (_, i) => usuario(i + 1, `u${i + 1}`, true));
    // A segunda página recomeça no 100: a sobreposição que a falta de ordem
    // na API permite.
    const pagina2 = Array.from({ length: 20 }, (_, i) => usuario(i + 100, `u${i + 100}`, true));
    vi.spyOn(usuariosService, 'listar').mockImplementation(async (params) =>
      params!.skip === 0 ? pagina1 : pagina2
    );

    await montar();

    const naTela = idsNaTela();
    expect(naTela).toHaveLength(119);
    expect(new Set(naTela).size).toBe(119);
    expect(botoesDoFiltro()[0].texto).toBe('Todos (119)');
    expect(host.textContent).toContain('A lista pode estar incompleta');
    expect(host.textContent).toContain('Os totais podem não ser exatos');
  });

  it('falha numa página do meio: erro na tela, nenhuma lista pela metade, nenhum total', async () => {
    vi.mocked(usuariosService.listarTodos).mockRestore();
    const pagina1 = Array.from({ length: 100 }, (_, i) => usuario(i + 1, `u${i + 1}`, true));
    vi.spyOn(usuariosService, 'listar').mockImplementation(async (params) => {
      if (params!.skip === 0) return pagina1;
      throw new Error('rede');
    });

    await montar();

    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível carregar os dados'
    );
    expect(idsNaTela()).toEqual([]);
    expect(botoesDoFiltro().map((b) => b.texto)).toEqual(['Todos', 'Ativos', 'Inativos']);
  });

  it('Atualizar recarrega e mostra a lista nova', async () => {
    await montar();
    expect(idsNaTela()).toEqual([1, 3, 5, 2, 4]);

    vi.mocked(usuariosService.listarTodos).mockResolvedValue([
      ...CADASTRO,
      usuario(6, 'edu', true),
      usuario(7, 'fabi', false),
    ]);
    await clicar(porRotulo('Atualizar dados')!);

    expect(usuariosService.listarTodos).toHaveBeenCalledTimes(2);
    expect(idsNaTela()).toEqual([1, 3, 5, 6, 2, 4, 7]);
    expect(botoesDoFiltro().map((b) => b.texto)).toEqual([
      'Todos (7)',
      'Ativos (4)',
      'Inativos (3)',
    ]);
  });
});

describe('UsuariosTab — ordem, filtro e contadores', () => {
  it('abre em Todos, com ativos em cima e inativos no fim', async () => {
    await montar();
    expect(botoesDoFiltro()).toEqual([
      { texto: 'Todos (5)', marcado: true },
      { texto: 'Ativos (3)', marcado: false },
      { texto: 'Inativos (2)', marcado: false },
    ]);
    expect(idsNaTela()).toEqual([1, 3, 5, 2, 4]);
    expect(host.textContent).toContain('Exibindo 5 de 5 usuário(s)');
  });

  it('o separador fica antes do primeiro inativo, com a quantidade', async () => {
    await montar();
    const linhas = Array.from(host.querySelectorAll('tbody tr'));
    const linha = separador()!;
    expect(linha.textContent?.trim()).toBe('Inativos (2)');
    expect(linhas.indexOf(linha)).toBe(3);
    expect(linha.querySelector('td')?.getAttribute('colspan')).toBe('6');
  });

  // Até a 1.11.0 este caso exigia `opacity-60` na linha inativa. A FE-12 mediu
  // o que a opacidade fazia com o contraste do que está dentro da linha (selo
  // a 2,73:1) e a tirou: o inativo passa a ser marcado pelo selo e pelo nome
  // em tom tênue. O detalhe das três abas está em `linhasInativas.test.tsx`.
  it('inativo segue com o selo e o nome em tom tênue, sem esmaecer a linha', async () => {
    await montar();
    const linhas = Array.from(host.querySelectorAll('tbody tr')).filter((tr) =>
      tr.querySelector('td')?.textContent?.startsWith('#')
    );
    const nome = (tr: Element) => tr.querySelectorAll('td')[1].querySelector('span')!;

    expect(linhas[0].className).not.toContain('opacity');
    expect(linhas[0].textContent).not.toContain('Inativo');
    expect(nome(linhas[0]).className).toBe('text-sm font-medium text-conteudo');

    expect(linhas[3].className).not.toContain('opacity');
    expect(linhas[3].className).toBe(linhas[0].className);
    expect(linhas[3].textContent).toContain('Inativo');
    expect(nome(linhas[3]).className).toBe('text-sm font-medium text-conteudo-tenue');
  });

  it('Ativos e Inativos mostram só o seu grupo, sem separador', async () => {
    await montar();

    await filtrar('Ativos');
    expect(idsNaTela()).toEqual([1, 3, 5]);
    expect(separador()).toBeUndefined();
    expect(botoesDoFiltro().map((b) => b.marcado)).toEqual([false, true, false]);
    expect(host.textContent).toContain('Exibindo 3 de 5 usuário(s)');

    await filtrar('Inativos');
    expect(idsNaTela()).toEqual([2, 4]);
    expect(separador()).toBeUndefined();

    await filtrar('Todos');
    expect(idsNaTela()).toEqual([1, 3, 5, 2, 4]);
    expect(separador()).toBeDefined();
  });

  it('ordenar por nome e por data não mistura os grupos, em nenhuma direção', async () => {
    await montar();

    await ordenarPor('Usuário');
    expect(idsNaTela()).toEqual([3, 1, 5, 4, 2]);
    await ordenarPor('Usuário');
    expect(idsNaTela()).toEqual([5, 1, 3, 2, 4]);

    await ordenarPor('Criado em');
    expect(idsNaTela()).toEqual([1, 3, 5, 2, 4]);
    await ordenarPor('Criado em');
    expect(idsNaTela()).toEqual([5, 3, 1, 4, 2]);

    await ordenarPor('ID');
    expect(idsNaTela()).toEqual([1, 3, 5, 2, 4]);
    await ordenarPor('ID');
    expect(idsNaTela()).toEqual([5, 3, 1, 4, 2]);
  });

  it('os contadores não mudam com a busca', async () => {
    await montar();
    await digitarNaBusca('zeca');
    expect(idsNaTela()).toEqual([2]);
    expect(botoesDoFiltro().map((b) => b.texto)).toEqual([
      'Todos (5)',
      'Ativos (3)',
      'Inativos (2)',
    ]);
    expect(host.textContent).toContain('Exibindo 1 de 5 usuário(s)');
  });

  it('a busca acha por nome e por perfil, inclusive inativo', async () => {
    await montar();
    await digitarNaBusca('ZEC');
    expect(idsNaTela()).toEqual([2]);
    await digitarNaBusca('tecnico');
    expect(idsNaTela()).toEqual([3, 4]);
    expect(avisoDeOcultos()).toBeNull();
  });

  it('resultado fora do filtro: a tela avisa e o filtro fica onde estava', async () => {
    await montar();
    await filtrar('Ativos');
    await digitarNaBusca('zeca');

    expect(idsNaTela()).toEqual([]);
    expect(avisoDeOcultos()).toBe('A busca encontrou mais 1 usuário fora do filtro Ativos.');
    expect(botoesDoFiltro().map((b) => b.marcado)).toEqual([false, true, false]);
    expect(host.textContent).toContain('Nenhum usuário encontrado com os critérios de busca');

    await filtrar('Inativos');
    await digitarNaBusca('a');
    // "a" acha bruna, ana, caio (ativos) e davi, zeca (inativos).
    expect(idsNaTela()).toEqual([2, 4]);
    expect(avisoDeOcultos()).toBe('A busca encontrou mais 3 usuários fora do filtro Inativos.');
  });
});

describe('UsuariosTab — estados vazios', () => {
  it('cadastro vazio: convida a criar o primeiro usuário', async () => {
    vi.mocked(usuariosService.listarTodos).mockResolvedValue([]);
    await montar();
    expect(host.textContent).toContain('Nenhum usuário cadastrado ainda');
    expect(host.textContent).toContain('Criar primeiro usuário');
    expect(botoesDoFiltro().map((b) => b.texto)).toEqual([
      'Todos (0)',
      'Ativos (0)',
      'Inativos (0)',
    ]);
  });

  it('filtro sem ninguém: diz qual grupo está vazio, sem convidar a criar', async () => {
    vi.mocked(usuariosService.listarTodos).mockResolvedValue(
      CADASTRO.filter((u) => u.ativo)
    );
    await montar();
    expect(separador()).toBeUndefined();

    await filtrar('Inativos');
    expect(host.textContent).toContain('Nenhum usuário inativo');
    expect(host.textContent).not.toContain('Criar primeiro usuário');
  });

  it('só inativos: Ativos fica vazio e Todos não tem separador', async () => {
    vi.mocked(usuariosService.listarTodos).mockResolvedValue(
      CADASTRO.filter((u) => !u.ativo)
    );
    await montar();
    expect(idsNaTela()).toEqual([2, 4]);
    expect(separador()).toBeUndefined();

    await filtrar('Ativos');
    expect(host.textContent).toContain('Nenhum usuário ativo');
  });
});

describe('UsuariosTab — depois de uma ação', () => {
  it('desativar leva a linha para os inativos e acerta os contadores', async () => {
    const desativar = vi
      .spyOn(usuariosService, 'desativar')
      .mockResolvedValue(usuario(3, 'ana', false, { role_id: 2 }));
    await montar();

    // Dois cliques: o primeiro pede a confirmação.
    await clicar(porRotulo('Desativar ana')!);
    expect(desativar).not.toHaveBeenCalled();
    await clicar(
      Array.from(host.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Desativar'
      )!
    );

    expect(desativar).toHaveBeenCalledWith(3);
    expect(idsNaTela()).toEqual([1, 5, 2, 3, 4]);
    expect(botoesDoFiltro().map((b) => b.texto)).toEqual([
      'Todos (5)',
      'Ativos (2)',
      'Inativos (3)',
    ]);
    expect(separador()!.textContent?.trim()).toBe('Inativos (3)');
  });

  it('no filtro Ativos, quem é desativado sai da lista', async () => {
    vi.spyOn(usuariosService, 'desativar').mockResolvedValue(usuario(5, 'caio', false));
    await montar();
    await filtrar('Ativos');

    await clicar(porRotulo('Desativar caio')!);
    await clicar(
      Array.from(host.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Desativar'
      )!
    );

    expect(idsNaTela()).toEqual([1, 3]);
    expect(botoesDoFiltro()[1]).toEqual({ texto: 'Ativos (2)', marcado: true });
  });

  it('reativar devolve a linha aos ativos', async () => {
    const reativar = vi
      .spyOn(usuariosService, 'reativar')
      .mockResolvedValue(usuario(2, 'zeca', true));
    await montar();

    await clicar(porRotulo('Reativar zeca')!);

    expect(reativar).toHaveBeenCalledWith(2);
    expect(idsNaTela()).toEqual([1, 2, 3, 5, 4]);
    expect(botoesDoFiltro().map((b) => b.texto)).toEqual([
      'Todos (5)',
      'Ativos (4)',
      'Inativos (1)',
    ]);
  });

  it('usuário criado entra nos ativos, na ordem, e conta', async () => {
    vi.spyOn(usuariosService, 'criar').mockResolvedValue(usuario(6, 'edu', true));
    await montar();

    await act(async () => {
      await cadastros.createUsuario({ username: 'edu', password: 'senhaSegura123' });
    });

    expect(idsNaTela()).toEqual([1, 3, 5, 6, 2, 4]);
    expect(botoesDoFiltro().map((b) => b.texto)).toEqual([
      'Todos (6)',
      'Ativos (4)',
      'Inativos (2)',
    ]);
  });

  it('editar mantém o filtro e a ordenação escolhidos', async () => {
    vi.spyOn(usuariosService, 'atualizar').mockResolvedValue(
      usuario(5, 'aaron', true)
    );
    await montar();
    await filtrar('Ativos');
    await ordenarPor('Usuário');
    expect(idsNaTela()).toEqual([3, 1, 5]);

    await act(async () => {
      await cadastros.updateUsuario(5, { username: 'aaron' });
    });

    // "aaron" passa à frente de "ana"; o filtro e a coluna continuam.
    expect(idsNaTela()).toEqual([5, 3, 1]);
    expect(botoesDoFiltro().map((b) => b.marcado)).toEqual([false, true, false]);
    expect(
      host.querySelector('th[aria-sort="ascending"]')?.textContent?.trim()
    ).toBe('Usuário');
  });

  it('as ações da linha continuam as mesmas: nada de novo para quem administra', async () => {
    await montar();
    const rotulos = Array.from(host.querySelectorAll('tbody button[aria-label]')).map((b) =>
      b.getAttribute('aria-label')!.split(' ')[0]
    );
    expect(new Set(rotulos)).toEqual(
      new Set(['Visualizar', 'Editar', 'Resetar', 'Desativar', 'Reativar'])
    );
    // Quem está logado (1) não tem o botão de se desativar.
    expect(porRotulo('Desativar bruna')).toBeNull();
  });
});
