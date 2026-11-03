import { useAuth } from './useAuth';
import { podeAdministrar, podeAdministrarUsuarios } from '../lib/permissoes';

/**
 * As permissões de interface de quem está logado, já com a confirmação da
 * identidade aplicada. É o que as telas usam — a regra mora em
 * `lib/permissoes`, numa função só.
 */
export function usePermissoes() {
  const { user, identidadeConfirmada, falhaAoConfirmar } = useAuth();
  const confirmada = identidadeConfirmada === true;

  return {
    /** Administrador, ou técnico da equipe da TI, com identidade confirmada. */
    podeAdministrar: podeAdministrar(user, confirmada),
    /** Só o administrador, com identidade confirmada. */
    podeAdministrarUsuarios: podeAdministrarUsuarios(user, confirmada),
    /** Há sessão, mas o `/auth/me` ainda não respondeu. */
    confirmando: Boolean(user) && !confirmada && !falhaAoConfirmar,
    /** O `/auth/me` falhou e a identidade não foi confirmada. */
    semConfirmacao: Boolean(user) && !confirmada && falhaAoConfirmar === true,
  };
}
