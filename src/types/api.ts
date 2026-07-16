// ============================================
// TIPOS DE RESPOSTA DA API
// ============================================

// Enums
export enum PrioridadeEnum {
  BAIXA = 'Baixa',
  MEDIA = 'Média',
  ALTA = 'Alta',
  CRITICA = 'Crítica',
}

export enum UrgenciaEnum {
  NAO_URGENTE = 'Não Urgente',
  NORMAL = 'Normal',
  URGENTE = 'Urgente',
  MUITO_URGENTE = 'Muito Urgente',
}

export enum StatusEnum {
  ABERTO = 'Aberto',
  EM_ANDAMENTO = 'Em Andamento',
  AGUARDANDO = 'Aguardando',
  RESOLVIDO = 'Resolvido',
  FECHADO = 'Fechado',
}

// Autenticação
export interface LoginRequest {
  nome: string;
  senha: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  nome: string;
  role: string;
}

export interface UsuarioCreate {
  nome: string;
  senha: string;
  setor_id?: number;
  role_id: number;
  ativo?: boolean;
}

export interface AlterarSenhaRequest {
  senha_atual: string;
  senha_nova: string;
}

export interface UsuarioLogado {
  id: number;
  nome: string;
  setor_id?: number;
  role_id: number;
  ativo: boolean;
}

// Setores
export interface Setor {
  id: number;
  nome: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
}

export interface SetorCreate {
  nome: string;
  descricao?: string;
  ativo?: boolean;
}

// Roles
export interface Role {
  id: number;
  nome: string;
  descricao?: string;
  created_at: string;
}

// Categorias
export interface Categoria {
  id: number;
  nome: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
}

export interface CategoriaCreate {
  nome: string;
  descricao?: string;
  ativo?: boolean;
}

// Usuários
export interface Usuario {
  id: number;
  nome: string;
  setor_id?: number;
  role_id: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsuarioUpdate {
  nome?: string;
  senha?: string;
  setor_id?: number;
  role_id?: number;
  ativo?: boolean;
}

// SLA
export type SLASituacao = 'No prazo' | 'Atenção' | 'Estourado';

export interface SLAInfo {
  prazo_resposta: string | null;
  prazo_resolucao: string | null;
  minutos_resposta_consumidos: number;
  minutos_resolucao_consumidos: number;
  minutos_pausados: number;
  percentual_resolucao: number;
  situacao: SLASituacao;
  resposta_cumprida: boolean;
}

export interface SLAConfig {
  prioridade: PrioridadeEnum;
  minutos_resposta: number;
  minutos_resolucao: number;
}

// Chamados
export interface Chamado {
  id: number;
  protocolo: string;
  solicitante_id: number;
  categoria_id?: number;
  titulo: string;
  descricao: string;
  prioridade: PrioridadeEnum;
  urgencia?: UrgenciaEnum;
  status: StatusEnum;
  tecnico_responsavel_id?: number;
  solucao?: string;
  tempo_resolucao_minutos?: number;
  observacoes?: string;
  avaliacao?: number;
  cancelado: boolean;
  arquivado: boolean;
  data_abertura: string;
  data_atualizacao: string;
  data_resolucao?: string;
  created_at: string;
  updated_at: string;
  sla?: SLAInfo;
}

export interface ChamadoCreate {
  solicitante_id: number;
  categoria_id?: number;
  titulo: string;
  descricao: string;
  prioridade?: PrioridadeEnum;
  tecnico_responsavel_id?: number;
}

export interface ChamadoUpdate {
  titulo?: string;
  descricao?: string;
  categoria_id?: number;
  prioridade?: PrioridadeEnum;
  urgencia?: UrgenciaEnum;
  status?: StatusEnum;
  tecnico_responsavel_id?: number;
  solucao?: string;
  observacoes?: string;
  avaliacao?: number;
}

// Comentários
export interface Comentario {
  id: number;
  chamado_id: number;
  usuario_id: number;
  comentario: string;
  is_interno: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComentarioCreate {
  chamado_id: number;
  usuario_id: number;
  comentario: string;
  is_interno?: boolean;
}

// Histórico
export interface Historico {
  id: number;
  chamado_id: number;
  usuario_id: number;
  acao: string;
  descricao?: string;
  status_anterior?: string;
  status_novo?: string;
  created_at: string;
}

// Anexos
export interface Anexo {
  id: number;
  chamado_id: number;
  nome_arquivo: string;
  caminho: string;
  tamanho_kb?: number;
  tipo_mime?: string;
  uploaded_by?: number;
  created_at: string;
}

export interface AnexoCreate {
  chamado_id: number;
  nome_arquivo: string;
  caminho: string;
  tamanho_kb?: number;
  tipo_mime?: string;
  uploaded_by?: number;
}

// Filtros e Queries
export interface ChamadosQueryParams {
  skip?: number;
  limit?: number;
  status?: StatusEnum;
  solicitante_id?: number;
  tecnico_id?: number;
  incluir_cancelados?: boolean;
  incluir_arquivados?: boolean;
}

export interface UsuariosQueryParams {
  skip?: number;
  limit?: number;
  setor_id?: number;
  role_id?: number;
  ativo?: boolean;
}

// ============================================
// TAREFAS RECORRENTES
// ============================================

export type TipoRecorrencia = 'diaria' | 'semanal' | 'mensal';

export interface TarefaRecorrente {
  id: number;
  titulo: string;
  descricao?: string | null;
  instrucoes?: string | null;
  categoria_id?: number | null;
  categoria_nome?: string | null;
  responsavel_id?: number | null;
  responsavel_nome?: string | null;
  prioridade: PrioridadeEnum;
  tipo_recorrencia: TipoRecorrencia;
  intervalo: number;
  dia_semana?: number | null; // 0=Dom..6=Sáb
  dia_mes?: number | null; // 1..31
  proxima_data: string; // YYYY-MM-DD
  ativo: boolean;
  total_execucoes: number;
  ultima_execucao?: string | null;
  created_at: string;
}

export interface TarefaRecorrenteExecucao {
  id: number;
  tarefa_id: number;
  usuario_id: number;
  usuario_nome?: string | null;
  data_prevista?: string | null;
  realizada_em: string;
  observacao?: string | null;
}

export interface TarefaRecorrenteCreate {
  titulo: string;
  descricao?: string | null;
  instrucoes?: string | null;
  categoria_id?: number | null;
  responsavel_id?: number | null;
  prioridade?: PrioridadeEnum;
  tipo_recorrencia: TipoRecorrencia;
  intervalo?: number;
  dia_semana?: number | null;
  dia_mes?: number | null;
  proxima_data?: string | null;
}

export type TarefaRecorrenteUpdate = Partial<TarefaRecorrenteCreate> & {
  ativo?: boolean;
};

export interface RealizarTarefaRequest {
  usuario_id: number;
  observacao?: string | null;
}
