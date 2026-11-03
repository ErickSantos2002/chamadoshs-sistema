import { useAuth } from './useAuth';
import { podeAdministrar, podeAdministrarUsuarios } from '../lib/permissoes';

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
 */
export function usePermissoes() {
  const { user, identidadeConfirmada, falhaAoConfirmar } = useAuth();
  const confirmada = identidadeConfirmada === true;
  const vigente = confirmada && falhaAoConfirmar !== true;

  return {
    /** Administrador, ou técnico da equipe da TI, com identidade confirmada e vigente. */
    podeAdministrar: podeAdministrar(user, vigente),
    /** Só o administrador, com identidade confirmada e vigente. */
    podeAdministrarUsuarios: podeAdministrarUsuarios(user, vigente),
    /** Há sessão, mas o `/auth/me` ainda não respondeu. */
    confirmando: Boolean(user) && !confirmada && !falhaAoConfirmar,
    /**
     * O `/auth/me` falhou (rede, servidor) — na restauração, ou numa
     * revalidação depois de confirmado. As funções de administração ficam
     * suspensas até uma revalidação dar certo.
     */
    semConfirmacao: Boolean(user) && falhaAoConfirmar === true,
  };
}
