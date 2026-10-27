import { Chamado, ChamadoUpdate, PrioridadeEnum, StatusEnum } from '../types/api';

/**
 * A edição de um chamado da Qualidade na página, contra a edição de outra
 * pessoa ao mesmo tempo.
 *
 * ── O defeito que isto evita ──────────────────────────────────────────
 *
 * A edição da TI manda os quatro campos sempre, inclusive os que a pessoa
 * nem tocou. Na Qualidade isso apaga trabalho alheio: o atendente muda o
 * status pela rota restrita, o coordenador — com a página aberta desde
 * antes — troca só a prioridade e salva, e o PUT devolve o status antigo.
 *
 * Por isso, só na Qualidade:
 *
 * 1. ao entrar na edição, o chamado é relido e vira a REFERÊNCIA;
 * 2. ao salvar, vai só o que difere da referência;
 * 3. antes do PUT o chamado é relido de novo; se algum campo que a pessoa
 *    editou mudou no servidor desde a referência, o salvamento para, o que
 *    ela digitou fica, e a tela mostra o que mudou.
 *
 * Mudança remota em campo que a pessoa NÃO editou não para nada: o PUT nem
 * leva esse campo.
 *
 * ── O que continua aberto ─────────────────────────────────────────────
 *
 * Entre a releitura e o PUT há uma janela, curta, em que outra escrita
 * passa sem ser vista. Fechá-la é trabalho da API — uma versão ou
 * `atualizado_em` conferidos no PUT, com 409 —, e não daqui.
 */

export type CampoEditavel =
  | 'categoria_id'
  | 'status'
  | 'prioridade'
  | 'tecnico_responsavel_id'
  | 'solucao';

/** Os campos da edição, com vazio e ausente escritos de um jeito só. */
export interface FotoDaEdicao {
  categoria_id: number | null;
  status: StatusEnum;
  prioridade: PrioridadeEnum;
  tecnico_responsavel_id: number | null;
  solucao: string;
}

export const ROTULOS_DOS_CAMPOS: Record<CampoEditavel, string> = {
  categoria_id: 'Categoria',
  status: 'Status',
  prioridade: 'Prioridade',
  tecnico_responsavel_id: 'Técnico responsável',
  solucao: 'Solução',
};

const ORDEM: CampoEditavel[] = [
  'status',
  'categoria_id',
  'tecnico_responsavel_id',
  'prioridade',
  'solucao',
];

export function fotografar(
  chamado: Pick<
    Chamado,
    'categoria_id' | 'status' | 'prioridade' | 'tecnico_responsavel_id' | 'solucao'
  >
): FotoDaEdicao {
  return {
    categoria_id: chamado.categoria_id ?? null,
    status: chamado.status,
    prioridade: chamado.prioridade,
    tecnico_responsavel_id: chamado.tecnico_responsavel_id ?? null,
    solucao: chamado.solucao ?? '',
  };
}

/**
 * O que mudou, pronto para o PUT. Solução apagada não vai — a mesma regra da
 * edição da TI, que manda `solucao` só quando há texto.
 */
export function diferencaDaEdicao(
  referencia: FotoDaEdicao,
  editado: FotoDaEdicao
): ChamadoUpdate {
  const diferenca: ChamadoUpdate = {};
  if (editado.categoria_id !== referencia.categoria_id) diferenca.categoria_id = editado.categoria_id;
  if (editado.status !== referencia.status) diferenca.status = editado.status;
  if (editado.prioridade !== referencia.prioridade) diferenca.prioridade = editado.prioridade;
  if (editado.tecnico_responsavel_id !== referencia.tecnico_responsavel_id) {
    diferenca.tecnico_responsavel_id = editado.tecnico_responsavel_id;
  }
  if (editado.solucao !== referencia.solucao && editado.solucao) {
    diferenca.solucao = editado.solucao;
  }
  return diferenca;
}

/** Os campos da diferença que mudaram no servidor desde a referência. */
export function camposEmConflito(
  referencia: FotoDaEdicao,
  servidor: FotoDaEdicao,
  diferenca: ChamadoUpdate
): CampoEditavel[] {
  return ORDEM.filter((campo) => campo in diferenca && servidor[campo] !== referencia[campo]);
}
