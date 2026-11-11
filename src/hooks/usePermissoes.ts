import { useAuth } from './useAuth';
import {
  podeAdministrar,
  podeAdministrarUsuarios,
  podeAlterarComoEquipe,
  podeEscolherSolicitante,
} from '../lib/permissoes';

/**
 * As permissões de interface de quem está logado, já com a confirmação da
 * identidade aplicada. É o que as telas usam — a regra mora em
 * `lib/permissoes`, numa função só.
 *
 * ── Revalidação que falhou ────────────────────────────────────────────
 *
 * Uma confirmação vale enquanto a última revalidação dela não falhou. Se o
 * `/auth/me` da renovação do token (ou do "Tentar de novo") cair por rede ou
 * 5xx, a confirmação anterior NÃO autoriza nada novo: a permissão pode ter
 * sido revogada justamente nesse intervalo. Ficam suspensas as funções de
 * quem administra — gestão, troca do responsável da TI, comentário interno
 * —, e só elas: o resto da sessão segue, sem logout. Volta com a próxima
 * revalidação que der certo, pedida por um clique. Quem decide de verdade é
 * a API; isto é o que a tela deixa de oferecer.
 *
 * A escrita de equipe num chamado (`podeAlterarComoEquipe`) também é dessas:
 * suspensa junto. O que é do solicitante — cancelar o que abriu, avaliar,
 * comentar em público — não depende da confirmação, e segue.
 */
export function usePermissoes() {
  const { user, identidadeConfirmada, falhaAoConfirmar, confirmacaoRecusada, revalidando } =
    useAuth();
  const confirmada = identidadeConfirmada === true;
  const vigente = confirmada && falhaAoConfirmar !== true;

  return {
    /** Administrador, ou técnico da equipe da TI, com identidade confirmada e vigente. */
    podeAdministrar: podeAdministrar(user, vigente),
    /** Só o administrador humano, com identidade confirmada e vigente. */
    podeAdministrarUsuarios: podeAdministrarUsuarios(user, vigente),
    /** Abrir chamado em nome de outra pessoa: o administrador humano, confirmado e vigente. */
    podeEscolherSolicitante: podeEscolherSolicitante(user, vigente),
    /**
     * Pode alterar este chamado pelas rotas da equipe (editar, arquivar,
     * desarquivar, cancelar alheio). `atendentes` é a lista da Qualidade, ou
     * `null` se ainda não se sabe.
     */
    podeAlterarComoEquipe: (
      chamado: { setor_destino?: unknown } | null | undefined,
      atendentes: ReadonlyArray<{ id: number }> | null
    ) => podeAlterarComoEquipe(user, vigente, chamado, atendentes),
    /** Há sessão, mas o `/auth/me` ainda não respondeu. */
    confirmando: Boolean(user) && !confirmada && !falhaAoConfirmar,
    /**
     * O `/auth/me` falhou (rede, servidor) — na restauração, ou numa
     * revalidação depois de confirmado. As funções de administração ficam
     * suspensas até uma revalidação dar certo.
     */
    semConfirmacao: Boolean(user) && falhaAoConfirmar === true,
    /** Dentro de `semConfirmacao`: foi um 403 do `/auth/me`, não rede. */
    confirmacaoRecusada: Boolean(user) && falhaAoConfirmar === true && confirmacaoRecusada === true,
    /** Uma nova confirmação está em andamento. */
    revalidando: revalidando === true,
  };
}
