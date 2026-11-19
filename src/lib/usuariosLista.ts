import type {
  OrdenacaoCampo,
  OrdenacaoDirecao,
  Usuario,
} from '../types/cadastros.types';
import { getRoleName } from '../utils/roleMapper';

/**
 * A lista da aba Usuários: quem aparece, em que ordem, e quantos são.
 *
 * Tudo aqui é função pura sobre a lista que o `CadastrosContext` já carregou
 * inteira. Nenhuma delas altera o array recebido — ele é o estado do contexto.
 *
 * ── A ordem ───────────────────────────────────────────────────────────
 *
 *   1. ativos antes de inativos, SEMPRE — a direção escolhida não inverte os
 *      grupos, só a ordem dentro de cada um;
 *   2. a coluna escolhida (ID, nome ou data de criação), na direção escolhida;
 *   3. o ID, crescente, como desempate — dois nomes iguais ou duas datas iguais
 *      não trocam de lugar entre um render e outro.
 *
 * ── Ativo ─────────────────────────────────────────────────────────────
 *
 * Só `ativo === true` é ativo. A coluna aceita nulo no banco, e a tela já
 * tratava tudo que não é verdadeiro como inativo (selo e linha esmaecida).
 */

export type FiltroDeStatus = 'todos' | 'ativos' | 'inativos';

export interface OrdenacaoDeUsuarios {
  campo: OrdenacaoCampo;
  direcao: OrdenacaoDirecao;
}

export interface ContagemDeUsuarios {
  total: number;
  ativos: number;
  inativos: number;
}

export const estaAtivo = (usuario: Pick<Usuario, 'ativo'>): boolean =>
  usuario.ativo === true;

/** Quantos são, no cadastro inteiro — não depende de busca nem de filtro. */
export function contarPorStatus(usuarios: Usuario[]): ContagemDeUsuarios {
  const ativos = usuarios.filter(estaAtivo).length;
  return { total: usuarios.length, ativos, inativos: usuarios.length - ativos };
}

/** A busca da aba: por nome e por perfil, sem diferenciar maiúsculas. */
export function buscarUsuarios(usuarios: Usuario[], busca: string): Usuario[] {
  if (!busca) return usuarios;

  const termo = busca.toLowerCase();
  return usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(termo) ||
      getRoleName(u.role_id).toLowerCase().includes(termo)
  );
}

export function filtrarPorStatus(
  usuarios: Usuario[],
  filtro: FiltroDeStatus
): Usuario[] {
  if (filtro === 'ativos') return usuarios.filter(estaAtivo);
  if (filtro === 'inativos') return usuarios.filter((u) => !estaAtivo(u));
  return usuarios;
}

const valorDaColuna = (usuario: Usuario, campo: OrdenacaoCampo): string | number => {
  if (campo === 'nome') return usuario.nome ?? '';
  if (campo === 'created_at') return usuario.created_at ?? '';
  return usuario.id;
};

const compararValores = (a: string | number, b: string | number): number => {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  return a > b ? 1 : a < b ? -1 : 0;
};

/** Devolve uma lista nova; a recebida fica como estava. */
export function ordenarUsuarios(
  usuarios: Usuario[],
  { campo, direcao }: OrdenacaoDeUsuarios
): Usuario[] {
  const sentido = direcao === 'asc' ? 1 : -1;

  return [...usuarios].sort((a, b) => {
    const porStatus = Number(estaAtivo(b)) - Number(estaAtivo(a));
    if (porStatus !== 0) return porStatus;

    const porColuna =
      compararValores(valorDaColuna(a, campo), valorDaColuna(b, campo)) * sentido;
    if (porColuna !== 0) return porColuna;

    return a.id - b.id;
  });
}

export interface ListaDeUsuarios {
  /** O que a tabela mostra, já na ordem. */
  visiveis: Usuario[];
  /** Do cadastro inteiro, para os rótulos do filtro. */
  contagem: ContagemDeUsuarios;
  /**
   * Quantos a busca encontrou e o filtro escondeu. Zero sem busca: sem ela o
   * filtro não esconde resultado nenhum, só faz o que o rótulo dele diz.
   */
  ocultosPeloFiltro: number;
  /**
   * Posição, em `visiveis`, do primeiro inativo quando há ativos antes dele.
   * É onde a tabela põe o separador. `-1` quando não há os dois grupos.
   */
  inicioDosInativos: number;
}

export function montarListaDeUsuarios(
  usuarios: Usuario[],
  opcoes: { busca: string; filtro: FiltroDeStatus; ordenacao: OrdenacaoDeUsuarios }
): ListaDeUsuarios {
  const encontrados = buscarUsuarios(usuarios, opcoes.busca);
  const visiveis = ordenarUsuarios(
    filtrarPorStatus(encontrados, opcoes.filtro),
    opcoes.ordenacao
  );

  const primeiroInativo = visiveis.findIndex((u) => !estaAtivo(u));

  return {
    visiveis,
    contagem: contarPorStatus(usuarios),
    ocultosPeloFiltro: opcoes.busca ? encontrados.length - visiveis.length : 0,
    inicioDosInativos: primeiroInativo > 0 ? primeiroInativo : -1,
  };
}

/**
 * Tira os IDs repetidos de uma lista carregada em páginas.
 *
 * A listagem da API não tem ordenação declarada, então nada garante que duas
 * páginas seguidas não se sobreponham. Um ID repetido é o sinal visível
 * disso — e, se uma linha veio duas vezes, outra pode ter ficado de fora.
 * Por isso quem chama precisa de `repetidos`: com ele acima de zero, o total
 * não pode ser apresentado como completo.
 *
 * Fica a primeira ocorrência de cada ID.
 */
export function unicosPorId<T extends { id: number }>(usuarios: T[]): {
  usuarios: T[];
  repetidos: number;
} {
  const vistos = new Set<number>();
  const unicos: T[] = [];

  for (const usuario of usuarios) {
    if (vistos.has(usuario.id)) continue;
    vistos.add(usuario.id);
    unicos.push(usuario);
  }

  return { usuarios: unicos, repetidos: usuarios.length - unicos.length };
}
