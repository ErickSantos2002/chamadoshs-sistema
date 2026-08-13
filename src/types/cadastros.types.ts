/**
 * Tipos TypeScript para o módulo de Cadastros Básicos
 * Sistema ControlHS
 */

// ========================================
// INTERFACES PRINCIPAIS
// ========================================

/**
 * Interface da Categoria (ChamadosHS API)
 */
export interface Categoria {
  id: number;
  nome: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
}

/**
 * Interface para criação de nova categoria
 */
export interface CategoriaCreate {
  nome: string;
  descricao?: string;
}

/**
 * Interface para atualização de categoria
 */
export interface CategoriaUpdate {
  nome?: string;
  descricao?: string;
}

/**
 * Interface do Setor (ChamadosHS API)
 */
export interface Setor {
  id: number;
  nome: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
}

/**
 * Interface para criação de novo setor
 */
export interface SetorCreate {
  nome: string;
  descricao?: string;
}

/**
 * Interface para atualização de setor
 */
export interface SetorUpdate {
  nome?: string;
  descricao?: string;
  /**
   * Quem liga e desliga é `PATCH /setores/{id}/desativar` e `/reativar`.
   *
   * Não confundir com `DELETE /setores/{id}`, que **apaga o setor de vez** —
   * antes ele desativava, e mudou na API. O front não chama essa rota em lugar
   * nenhum, e não deve passar a chamar: exclusão de setor não tem volta.
   */
  ativo?: boolean;
}

/**
 * Interface do Usuário (ChamadosHS API)
 */
export interface Usuario {
  id: number;
  nome: string;
  setor_id?: number;
  role_id: number;
  ativo: boolean;
  /** Conta que não representa uma pessoa (painel de TV, login de integração). */
  conta_de_servico?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Interface para criação de novo usuário
 */
export interface UsuarioCreate {
  username: string;
  password: string;
  senha?: string;  // Campo para manter compatibilidade
  role_name?: string;
  setor_id?: number;
  conta_de_servico?: boolean;
}

/**
 * Interface para atualização de usuário
 */
export interface UsuarioUpdate {
  username?: string;
  password?: string;
  senha?: string;  // Campo para manter compatibilidade
  role_name?: string;
  setor_id?: number;
  conta_de_servico?: boolean;
  /**
   * A API desativa em vez de apagar (`DELETE` faz `ativo = false`), então
   * reativar é um update com `ativo: true`. Sem este campo aqui, não havia
   * como desfazer uma desativação pela interface.
   */
  ativo?: boolean;
}

// ========================================
// INTERFACES DO CONTEXT
// ========================================

/**
 * Interface do CadastrosContext
 */
export interface CadastrosContextData {
  // Dados
  categorias: Categoria[];
  setores: Setor[];
  usuarios: Usuario[];

  // Estados
  loading: boolean;
  error: string | null;

  // Funções CRUD - Categorias
  createCategoria: (data: CategoriaCreate) => Promise<void>;
  updateCategoria: (id: number, data: CategoriaUpdate) => Promise<void>;
  deleteCategoria: (id: number) => Promise<void>;

  // Funções CRUD - Setores
  //
  // `desativar` e `reativar` no lugar de `delete`: a API nunca apagou estes
  // cadastros, e o nome antigo prometia o que o sistema não fazia.
  createSetor: (data: SetorCreate) => Promise<void>;
  updateSetor: (id: number, data: SetorUpdate) => Promise<void>;
  desativarSetor: (id: number) => Promise<void>;
  reativarSetor: (id: number) => Promise<void>;

  // Funções CRUD - Usuários
  createUsuario: (data: UsuarioCreate) => Promise<void>;
  updateUsuario: (id: number, data: UsuarioUpdate) => Promise<void>;
  desativarUsuario: (id: number) => Promise<void>;
  reativarUsuario: (id: number) => Promise<void>;
  updateUsuarioPassword: (id: number, novaSenha: string) => Promise<void>;

  // Atualização
  refreshData: () => Promise<void>;
}

// ========================================
// TYPES AUXILIARES
// ========================================

/**
 * Type para modo do modal
 */
export type ModalMode = 'create' | 'edit' | 'view' | null;

/**
 * Type para identificar a aba ativa
 */
export type TipoAba = 'categorias' | 'setores' | 'usuarios' | 'sla';

/**
 * Interface para filtros de busca
 */
export interface FiltrosCadastros {
  busca: string;
}

/**
 * Type para campo de ordenação
 */
export type OrdenacaoCampo = 'id' | 'nome' | 'created_at';

/**
 * Type para direção de ordenação
 */
export type OrdenacaoDirecao = 'asc' | 'desc';

/**
 * Interface para ordenação
 */
export interface Ordenacao {
  campo: OrdenacaoCampo;
  direcao: OrdenacaoDirecao;
}

// ========================================
// ENUMS E CONSTANTES
// ========================================

/**
 * Roles disponíveis no sistema ChamadosHS
 */
export const ROLES = [
  'Administrador',
  'Tecnico',
  'Usuario'
] as const;

/**
 * Type para nome de role
 */
export type RoleName = typeof ROLES[number];

// `ROLE_COLORS` saiu daqui. Era uma constante importada dentro de um bloco
// `import type` na UsuariosTab — apagada na compilação, portanto impossível de
// usar como valor — e nenhuma tela a lia. A aba tem o próprio mapa de cor de
// perfil. Além de morta, guardava as três últimas classes de paleta crua do
// projeto, que é como ela apareceu.

/**
 * Type para erros de validação
 */
export type ValidationErrors = Partial<Record<string, string>>;
