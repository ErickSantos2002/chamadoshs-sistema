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
 *
 * ── Conta de serviço não administra (API-11, S2/S3) ───────────────────
 *
 * A API-11 nega administração e escrita de equipe a toda conta de serviço,
 * qualquer que seja o perfil — inclusive a administradora compartilhada. O
 * perfil sozinho não diz isso: o `/auth/me` não traz `conta_de_servico`, e o
 * `AuthContext` o lê de `GET /usuarios/{id}` quando o perfil é de
 * administrador. Só o booleano `false` conta como pessoa, como na API:
 * ausente (ainda não lido, ou a leitura falhou) é tratado como serviço, e a
 * administração não aparece.
 *
 * ── Ver, alterar como equipe, agir como solicitante ───────────────────
 *
 * Ler um chamado não é poder alterá-lo. A API-6 separou: o técnico que lê
 * um chamado só pelo vínculo (é o responsável, ou o abriu) lê, comenta em
 * público, cancela o que abriu e avalia o que abriu — mas não o edita, não
 * arquiva e não troca status pela rota da equipe. `podeAlterarComoEquipe`
 * é a cópia da regra `pode_alterar_como_equipe` da API, para a tela não
 * oferecer um 403. O que é do solicitante não passa por ela.
 */

import { SetorDestinoEnum } from '../types/api';
import { lerSetor } from './setor';

/** O mínimo que a regra lê do usuário. */
export interface IdentidadeParaPermissao {
  id?: number;
  role?: string;
  role_id?: number;
  integra_equipe_ti?: unknown;
  /** Só do `GET /usuarios/{id}` desta sessão. Só `false` é pessoa. */
  conta_de_servico?: unknown;
}

/** Administrador pelo perfil — o nome canônico ou o id. */
export function ehAdministrador(usuario: IdentidadeParaPermissao | null | undefined): boolean {
  return usuario?.role === 'Administrador' || usuario?.role_id === 1;
}

/**
 * Administrador que é pessoa: o perfil, e `conta_de_servico === false` lido
 * nesta sessão. É o `is_admin_humano` da API — o que administra, apaga
 * chamado e altera como equipe sem limite de setor.
 */
export function ehAdministradorHumano(usuario: IdentidadeParaPermissao | null | undefined): boolean {
  return ehAdministrador(usuario) && usuario?.conta_de_servico === false;
}

/** Técnico pelo perfil — o nome canônico ou o id. */
export function ehTecnico(usuario: IdentidadeParaPermissao | null | undefined): boolean {
  return usuario?.role === 'Tecnico' || usuario?.role_id === 2;
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
  return ehAdministradorHumano(usuario) || integraEquipeTI(usuario);
}

/**
 * A aba de Usuários e o que mexe em conta de gente: só o administrador, e só
 * depois da confirmação. A TI não entra — editar usuário inclui editar perfil.
 */
export function podeAdministrarUsuarios(
  usuario: IdentidadeParaPermissao | null | undefined,
  confirmada: boolean
): boolean {
  return confirmada === true && ehAdministradorHumano(usuario);
}

/**
 * Abrir chamado em nome de outra pessoa (escolher o solicitante): só o
 * administrador humano, e só depois da confirmação. É a regra da criação na
 * API (`is_admin_humano` em `criar_chamado`, API-11, S3): para qualquer outra
 * conta ela grava quem abriu, e ignora o `solicitante_id` do corpo em
 * silêncio. Oferecer a escolha a quem a API ignora daria o chamado por aberto
 * em nome de alguém e o gravaria no nome de quem abriu.
 */
export function podeEscolherSolicitante(
  usuario: IdentidadeParaPermissao | null | undefined,
  confirmada: boolean
): boolean {
  return confirmada === true && ehAdministradorHumano(usuario);
}

/**
 * Pode alterar `chamado` pelas rotas da equipe: editar (status, prioridade,
 * categoria, solução, responsável), arquivar, desarquivar e cancelar chamado
 * alheio. A regra `pode_alterar_como_equipe` da API (API-6, D8; API-11, S2):
 *
 * - conta de serviço, nunca;
 * - administrador humano, todos;
 * - técnico da equipe da TI (`integra_equipe_ti`), os da TI e os da
 *   Qualidade — o alcance de leitura do setor dele;
 * - técnico da Qualidade, só os da Qualidade. Quem é do setor a tela sabe
 *   pela lista de atendentes da API (`/chamados/atendentes-qualidade`: ativos,
 *   de pessoa, no setor da Qualidade); sem a lista, ninguém é;
 * - qualquer outro — o técnico de outro setor, o sem setor, o usuário comum
 *   — não. Ser o responsável ou o solicitante não entra: é vínculo, e o
 *   vínculo dá leitura, não edição.
 *
 * Desconhecido é não: sem identidade confirmada, sem a marca de pessoa, ou
 * com a lista da Qualidade ainda não lida, a tela não oferece.
 */
export function podeAlterarComoEquipe(
  usuario: IdentidadeParaPermissao | null | undefined,
  confirmada: boolean,
  chamado: { setor_destino?: unknown } | null | undefined,
  atendentesDaQualidade: ReadonlyArray<{ id: number }> | null
): boolean {
  if (confirmada !== true || !usuario || !chamado) return false;
  if (usuario.conta_de_servico === true) return false;
  if (ehAdministradorHumano(usuario)) return true;
  if (!ehTecnico(usuario)) return false;
  // Ausente é TI, como na API; um setor que a tela não reconhece não está
  // no alcance de ninguém além do administrador.
  const { setor } = lerSetor(chamado.setor_destino);
  if (setor === null) return false;
  if (integraEquipeTI(usuario)) return true;
  return (
    setor === SetorDestinoEnum.QUALIDADE &&
    usuario.id !== undefined &&
    (atendentesDaQualidade ?? []).some((a) => a.id === usuario.id)
  );
}
