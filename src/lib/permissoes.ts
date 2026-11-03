/**
 * Quem a TELA trata como capaz de administrar — numa regra só.
 *
 * ── O que isto é, e o que não é ───────────────────────────────────────
 *
 * Não é segurança. Quem protege é a API: `require_equipe_ti` recusa com 403
 * quem não é administrador nem da equipe da TI, em cadastros, tarefas
 * recorrentes, auditoria, reatribuição de chamado da TI e comentário interno.
 * Esta regra só decide o que a tela OFERECE, para ela não oferecer um 403 —
 * nem disparar, sozinha, uma requisição que só sabe dar 403.
 *
 * ── A regra ───────────────────────────────────────────────────────────
 *
 * Administrador pelo PERFIL, ou técnico que o backend diz ser da equipe da
 * TI (`integra_equipe_ti`, calculado a cada `GET /auth/me`). Ser técnico não
 * basta: o técnico da Qualidade, o de outro setor e o sem setor também têm o
 * perfil Técnico, e a API recusa os três.
 *
 * O campo é lido ao pé da letra: só o booleano `true` vale. Ausente (API
 * anterior à 7), `null`, `false`, `"true"`, `1` — nada disso reconhece a TI.
 * Ler com folga seria dar poder a um valor que a API não mandou.
 *
 * O administrador fora de um setor da TI recebe `integra_equipe_ti: false` e
 * administra assim mesmo: o campo diz de que equipe a pessoa é, e não o que
 * ela pode.
 *
 * ── Antes da confirmação, ninguém administra ──────────────────────────
 *
 * A identidade guardada no navegador não é fonte de permissão: ao recarregar
 * a página ela vem do `localStorage`, que qualquer um edita e que guarda o
 * que valia na última vez. Por isso a regra pede a identidade CONFIRMADA pelo
 * `/auth/me` desta sessão (`AuthContext.identidadeConfirmada`). Enquanto ela
 * não chega, nem o administrador vê os controles — e nenhuma tela de gestão
 * pede nada à API.
 */

/** O mínimo que a regra lê do usuário. */
export interface IdentidadeParaPermissao {
  role?: string;
  role_id?: number;
  integra_equipe_ti?: unknown;
}

/** Administrador pelo perfil — o nome canônico ou o id. */
export function ehAdministrador(usuario: IdentidadeParaPermissao | null | undefined): boolean {
  return usuario?.role === 'Administrador' || usuario?.role_id === 1;
}

/** Da equipe da TI segundo o backend. Só o booleano `true`. */
export function integraEquipeTI(usuario: IdentidadeParaPermissao | null | undefined): boolean {
  return usuario?.integra_equipe_ti === true;
}

/**
 * Pode administrar: cadastros (menos usuários), tarefas recorrentes,
 * auditoria, responsável de chamado da TI e comentário interno.
 *
 * `confirmada` é se o `/auth/me` desta sessão já respondeu. Sem ela, `false`.
 */
export function podeAdministrar(
  usuario: IdentidadeParaPermissao | null | undefined,
  confirmada: boolean
): boolean {
  if (confirmada !== true || !usuario) return false;
  return ehAdministrador(usuario) || integraEquipeTI(usuario);
}

/**
 * A aba de Usuários e o que mexe em conta de gente: só o administrador, e só
 * depois da confirmação. A TI não entra — editar usuário inclui editar perfil.
 */
export function podeAdministrarUsuarios(
  usuario: IdentidadeParaPermissao | null | undefined,
  confirmada: boolean
): boolean {
  return confirmada === true && ehAdministrador(usuario);
}
