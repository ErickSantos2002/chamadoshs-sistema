import { describe, it, expect } from 'vitest';
import type { Usuario } from '../types/cadastros.types';
import {
  buscarUsuarios,
  contarPorStatus,
  estaAtivo,
  filtrarPorStatus,
  montarListaDeUsuarios,
  ordenarUsuarios,
  unicosPorId,
} from './usuariosLista';

/**
 * A lista da aba Usuários (1.11.0): ativos primeiro, filtro por status,
 * contagem do cadastro inteiro e a busca que continua achando inativo.
 */

const usuario = (
  id: number,
  nome: string,
  ativo: unknown,
  extras: Partial<Usuario> = {}
): Usuario => ({
  id,
  nome,
  role_id: 3,
  ativo: ativo as boolean,
  created_at: `2026-01-${String(id).padStart(2, '0')}T08:00:00`,
  updated_at: '2026-01-01T08:00:00',
  ...extras,
});

const CADASTRO: Usuario[] = [
  usuario(1, 'bruna', true, { role_id: 1 }),
  usuario(2, 'zeca', false),
  usuario(3, 'ana', true, { role_id: 2 }),
  usuario(4, 'davi', false, { role_id: 2 }),
  usuario(5, 'caio', true),
];

const ids = (lista: Usuario[]) => lista.map((u) => u.id);
const ID_ASC = { campo: 'id', direcao: 'asc' } as const;

describe('estaAtivo', () => {
  it('só `true` é ativo; nulo, indefinido e falso são inativos', () => {
    expect(estaAtivo({ ativo: true })).toBe(true);
    for (const valor of [false, null, undefined, 0, 'true']) {
      expect(estaAtivo({ ativo: valor as unknown as boolean }), String(valor)).toBe(false);
    }
  });
});

describe('ordenarUsuarios', () => {
  it('ativos antes de inativos, por ID crescente dentro de cada grupo', () => {
    expect(ids(ordenarUsuarios(CADASTRO, ID_ASC))).toEqual([1, 3, 5, 2, 4]);
  });

  it('a direção descendente não leva os inativos para cima', () => {
    expect(ids(ordenarUsuarios(CADASTRO, { campo: 'id', direcao: 'desc' }))).toEqual([
      5, 3, 1, 4, 2,
    ]);
  });

  it('por nome, nas duas direções, dentro de cada grupo', () => {
    expect(ids(ordenarUsuarios(CADASTRO, { campo: 'nome', direcao: 'asc' }))).toEqual([
      3, 1, 5, 4, 2,
    ]);
    expect(ids(ordenarUsuarios(CADASTRO, { campo: 'nome', direcao: 'desc' }))).toEqual([
      5, 1, 3, 2, 4,
    ]);
  });

  it('por data de criação, nas duas direções, dentro de cada grupo', () => {
    const lista = [
      usuario(1, 'a', true, { created_at: '2026-03-01T08:00:00' }),
      usuario(2, 'b', true, { created_at: '2026-01-01T08:00:00' }),
      usuario(3, 'c', false, { created_at: '2025-01-01T08:00:00' }),
      usuario(4, 'd', false, { created_at: '2026-06-01T08:00:00' }),
    ];
    expect(ids(ordenarUsuarios(lista, { campo: 'created_at', direcao: 'asc' }))).toEqual([
      2, 1, 3, 4,
    ]);
    expect(ids(ordenarUsuarios(lista, { campo: 'created_at', direcao: 'desc' }))).toEqual([
      1, 2, 4, 3,
    ]);
  });

  it('empate na coluna: o ID crescente decide, nas duas direções', () => {
    const lista = [
      usuario(9, 'igual', true, { created_at: '2026-01-01T08:00:00' }),
      usuario(4, 'igual', true, { created_at: '2026-01-01T08:00:00' }),
      usuario(7, 'igual', true, { created_at: '2026-01-01T08:00:00' }),
    ];
    for (const campo of ['nome', 'created_at'] as const) {
      for (const direcao of ['asc', 'desc'] as const) {
        expect(ids(ordenarUsuarios(lista, { campo, direcao })), `${campo} ${direcao}`).toEqual([
          4, 7, 9,
        ]);
      }
    }
  });

  it('`ativo` nulo ou ausente vai com os inativos', () => {
    const lista = [usuario(1, 'a', null), usuario(2, 'b', true), usuario(3, 'c', undefined)];
    expect(ids(ordenarUsuarios(lista, ID_ASC))).toEqual([2, 1, 3]);
  });

  it('data de criação ausente não quebra a ordenação', () => {
    const lista = [
      usuario(1, 'a', true, { created_at: undefined as unknown as string }),
      usuario(2, 'b', true, { created_at: '2026-01-01T08:00:00' }),
    ];
    expect(ids(ordenarUsuarios(lista, { campo: 'created_at', direcao: 'asc' }))).toEqual([1, 2]);
  });

  it('não altera a lista recebida', () => {
    const original = [...CADASTRO];
    const ordenada = ordenarUsuarios(CADASTRO, { campo: 'nome', direcao: 'desc' });
    expect(CADASTRO).toEqual(original);
    expect(ordenada).not.toBe(CADASTRO);
  });
});

describe('filtrarPorStatus e contarPorStatus', () => {
  it('cada filtro devolve o seu conjunto, sem mexer na lista', () => {
    const original = [...CADASTRO];
    expect(ids(filtrarPorStatus(CADASTRO, 'todos'))).toEqual([1, 2, 3, 4, 5]);
    expect(ids(filtrarPorStatus(CADASTRO, 'ativos'))).toEqual([1, 3, 5]);
    expect(ids(filtrarPorStatus(CADASTRO, 'inativos'))).toEqual([2, 4]);
    expect(CADASTRO).toEqual(original);
  });

  it('conta o cadastro inteiro', () => {
    expect(contarPorStatus(CADASTRO)).toEqual({ total: 5, ativos: 3, inativos: 2 });
    expect(contarPorStatus([])).toEqual({ total: 0, ativos: 0, inativos: 0 });
  });
});

describe('buscarUsuarios', () => {
  it('por nome, sem diferenciar maiúsculas, inclusive inativo', () => {
    expect(ids(buscarUsuarios(CADASTRO, 'ZEC'))).toEqual([2]);
  });

  it('por perfil', () => {
    expect(ids(buscarUsuarios(CADASTRO, 'tecnico'))).toEqual([3, 4]);
    expect(ids(buscarUsuarios(CADASTRO, 'administrador'))).toEqual([1]);
  });

  it('busca vazia devolve a mesma lista', () => {
    expect(buscarUsuarios(CADASTRO, '')).toBe(CADASTRO);
  });
});

describe('montarListaDeUsuarios', () => {
  const montar = (busca: string, filtro: 'todos' | 'ativos' | 'inativos') =>
    montarListaDeUsuarios(CADASTRO, { busca, filtro, ordenacao: ID_ASC });

  it('Todos, sem busca: tudo, com o separador no primeiro inativo', () => {
    const lista = montar('', 'todos');
    expect(ids(lista.visiveis)).toEqual([1, 3, 5, 2, 4]);
    expect(lista.inicioDosInativos).toBe(3);
    expect(lista.ocultosPeloFiltro).toBe(0);
  });

  it('a contagem é do cadastro inteiro, com qualquer busca e filtro', () => {
    for (const [busca, filtro] of [
      ['', 'todos'],
      ['zeca', 'ativos'],
      ['nada disso', 'inativos'],
    ] as const) {
      expect(montar(busca, filtro).contagem, `${busca}/${filtro}`).toEqual({
        total: 5,
        ativos: 3,
        inativos: 2,
      });
    }
  });

  it('um grupo só na tela: sem separador', () => {
    expect(montar('', 'ativos').inicioDosInativos).toBe(-1);
    expect(montar('', 'inativos').inicioDosInativos).toBe(-1);
    expect(montar('zeca', 'todos').inicioDosInativos).toBe(-1);
    expect(montar('ana', 'todos').inicioDosInativos).toBe(-1);
  });

  it('a busca acha inativo no filtro Todos', () => {
    expect(ids(montar('zeca', 'todos').visiveis)).toEqual([2]);
  });

  it('resultado fora do filtro é contado, e não aparece', () => {
    const lista = montar('zeca', 'ativos');
    expect(lista.visiveis).toEqual([]);
    expect(lista.ocultosPeloFiltro).toBe(1);

    // "tecnico" acha um ativo (3) e um inativo (4).
    const parcial = montar('tecnico', 'inativos');
    expect(ids(parcial.visiveis)).toEqual([4]);
    expect(parcial.ocultosPeloFiltro).toBe(1);
  });

  it('sem busca, o filtro não "esconde" ninguém', () => {
    expect(montar('', 'ativos').ocultosPeloFiltro).toBe(0);
    expect(montar('', 'inativos').ocultosPeloFiltro).toBe(0);
  });

  it('no filtro Todos nada fica de fora', () => {
    expect(montar('tecnico', 'todos').ocultosPeloFiltro).toBe(0);
  });

  it('não altera a lista recebida', () => {
    const original = [...CADASTRO];
    montarListaDeUsuarios(CADASTRO, {
      busca: 'a',
      filtro: 'todos',
      ordenacao: { campo: 'nome', direcao: 'desc' },
    });
    expect(CADASTRO).toEqual(original);
  });
});

describe('unicosPorId', () => {
  it('lista sem repetição passa inteira', () => {
    const { usuarios, repetidos } = unicosPorId(CADASTRO);
    expect(ids(usuarios)).toEqual([1, 2, 3, 4, 5]);
    expect(repetidos).toBe(0);
  });

  it('ID repetido sai, fica a primeira ocorrência, e a repetição é contada', () => {
    const primeira = usuario(2, 'zeca', false);
    const segunda = usuario(2, 'zeca de novo', true);
    const { usuarios, repetidos } = unicosPorId([usuario(1, 'a', true), primeira, segunda]);
    expect(ids(usuarios)).toEqual([1, 2]);
    expect(usuarios[1]).toBe(primeira);
    expect(repetidos).toBe(1);
  });

  it('lista vazia', () => {
    expect(unicosPorId([])).toEqual({ usuarios: [], repetidos: 0 });
  });
});
