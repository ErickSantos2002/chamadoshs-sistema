/**
 * Utilitário para mapeamento de Roles
 * Sistema ChamadosHS
 */

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
