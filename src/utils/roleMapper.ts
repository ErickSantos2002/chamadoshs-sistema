/**
 * Utilitário para mapeamento de Roles
 * Sistema ChamadosHS
 */

import { simplificar } from '../lib/texto';

// Mapeamento de Role IDs para Nomes
export const ROLE_MAP: Record<number, string> = {
  1: 'Administrador',
  2: 'Tecnico',
  3: 'Usuario',
};

// Mapeamento reverso: Nome para ID
export const ROLE_ID_MAP: Record<string, number> = {
  'Administrador': 1,
  'Tecnico': 2,
  'Usuario': 3,
};

/**
 * Converte role_id para nome da role
 */
export function getRoleName(roleId: number): string {
  return ROLE_MAP[roleId] || 'Usuario';
}

/**
 * O nome que a API mandou, reduzido ao nome que o front compara.
 *
 * O front inteiro compara `user.role` com os literais `'Administrador'`,
 * `'Tecnico'` e `'Usuario'` — e ao recarregar a página esse valor vem cru do
 * `localStorage`, que guardou a string do banco (`roles.nome`). A própria API
 * se recusa a confiar nessa coluna: o `_normalizar_role` de lá existe porque
 * "se a tabela um dia gravar 'Técnico', a comparação literal rejeitaria todos
 * os técnicos com um 403 que parece bug". O front tinha exatamente esse bug em
 * potencial, com um sintoma pior — funcionava ao entrar (o login deriva do
 * `role_id`) e quebrava depois do F5.
 *
 * Devolve `null` para nome que não reconhece, e quem chama decide o fallback.
 * Inventar 'Usuario' aqui esconderia um perfil novo da API como rebaixamento
 * silencioso.
 */
export function nomeCanonicoDaRole(nome?: string | null): string | null {
  if (!nome) return null;

  const alvo = simplificar(nome).trim();
  for (const canonico of Object.values(ROLE_MAP)) {
    if (simplificar(canonico) === alvo) return canonico;
  }
  return null;
}

/**
 * Converte nome da role para role_id
 */
export function getRoleId(roleName: string): number {
  return ROLE_ID_MAP[roleName] || 3;
}

/**
 * Verifica se o usuário é administrador
 */
export function isAdmin(roleId: number): boolean {
  return roleId === 1;
}

/**
 * Verifica se o usuário é técnico
 */
export function isTecnico(roleId: number): boolean {
  return roleId === 2;
}

/**
 * Verifica se o usuário é usuário comum
 */
export function isUsuario(roleId: number): boolean {
  return roleId === 3;
}

/**
 * Quem pode ser responsável por um chamado.
 *
 * Administrador entra junto com técnico: na HS as mesmas pessoas administram o
 * sistema e atendem chamado. O cadastro guarda um perfil só por usuário, mas o
 * papel no dia a dia é duplo — filtrar apenas por técnico deixaria metade da
 * equipe fora da lista de atribuição.
 *
 * A API aceita qualquer usuário como responsável: `tecnico_responsavel_id` é
 * uma FK simples, sem restrição de perfil.
 */
export function podeAtenderChamado(roleId: number): boolean {
  return isAdmin(roleId) || isTecnico(roleId);
}

/**
 * Quem pode ser escolhido como responsável no seletor de técnico.
 *
 * Além do perfil, exclui contas que não representam pessoas — o painel de TV
 * da sala e o login usado pelo FortiPAM. Elas precisam existir e fazer login
 * (desativar as impediria de entrar), mas atribuir um chamado a elas não diz
 * quem é o responsável de verdade.
 *
 * `conta_de_servico` ausente conta como `false`: mantém o comportamento atual
 * enquanto a API não expõe o campo, sem exigir ordem de deploy entre os dois
 * repositórios.
 */
export function podeSerResponsavel(usuario: {
  role_id: number;
  conta_de_servico?: boolean;
}): boolean {
  return podeAtenderChamado(usuario.role_id) && !usuario.conta_de_servico;
}
