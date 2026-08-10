import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from './api';
import { usuariosService } from './chamadoshsapi';
import { indexarPorId } from '../hooks/useUsuariosPorId';
import type { Usuario } from '../types/api';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

const buscar = vi.mocked(api.get);

function usuario(id: number, nome = `Usuário ${id}`): Usuario {
  return { id, nome, ativo: true } as Usuario;
}

/** Simula a API devolvendo `total` usuários, respeitando skip/limit. */
function apiCom(total: number) {
  buscar.mockImplementation(((_url: string, config?: { params?: Record<string, number> }) => {
    const skip = config?.params?.skip ?? 0;
    const limit = config?.params?.limit ?? 100;

    const pagina = Array.from({ length: Math.max(0, Math.min(limit, total - skip)) }, (_, i) =>
      usuario(skip + i + 1)
    );

    return Promise.resolve({ data: pagina });
  }) as never);
}

describe('usuariosService.listarTodos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('faz uma única chamada quando tudo cabe na primeira página', async () => {
    apiCom(30);

    const todos = await usuariosService.listarTodos();

    expect(todos).toHaveLength(30);
    expect(buscar).toHaveBeenCalledTimes(1);
  });

  // O endpoint tem limit padrão 100: sem paginar, a lista seria truncada em
  // silêncio quando a empresa passar desse número, e nomes sumiriam da tela.
  it('busca as páginas seguintes quando a primeira vem cheia', async () => {
    apiCom(250);

    const todos = await usuariosService.listarTodos();

    expect(todos).toHaveLength(250);
    expect(buscar).toHaveBeenCalledTimes(3);
  });

  it('para exatamente na virada quando o total é múltiplo do tamanho da página', async () => {
    apiCom(200);

    const todos = await usuariosService.listarTodos();

    expect(todos).toHaveLength(200);
    // 100 + 100 + uma terceira que volta vazia e encerra o laço
    expect(buscar).toHaveBeenCalledTimes(3);
  });

  it('avança o skip a cada página', async () => {
    apiCom(150);

    await usuariosService.listarTodos();

    expect(buscar.mock.calls[0][1]).toMatchObject({ params: { skip: 0, limit: 100 } });
    expect(buscar.mock.calls[1][1]).toMatchObject({ params: { skip: 100, limit: 100 } });
  });

  it('devolve lista vazia quando não há usuário nenhum', async () => {
    apiCom(0);

    expect(await usuariosService.listarTodos()).toEqual([]);
  });

  it('preserva filtros extras em todas as páginas', async () => {
    apiCom(150);

    await usuariosService.listarTodos({ ativo: true });

    expect(buscar.mock.calls[0][1]).toMatchObject({ params: { ativo: true, skip: 0 } });
    expect(buscar.mock.calls[1][1]).toMatchObject({ params: { ativo: true, skip: 100 } });
  });
});

describe('indexarPorId', () => {
  it('monta o índice id -> usuário', () => {
    const indice = indexarPorId([usuario(3, 'Erick'), usuario(7, 'Welton')]);

    expect(indice[3].nome).toBe('Erick');
    expect(indice[7].nome).toBe('Welton');
  });

  it('devolve objeto vazio para lista vazia', () => {
    expect(indexarPorId([])).toEqual({});
  });

  it('não deixa buraco quando um id não existe na lista', () => {
    const indice = indexarPorId([usuario(1)]);

    expect(indice[999]).toBeUndefined();
  });
});
