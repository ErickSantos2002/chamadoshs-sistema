import api from './api';
import {
  LoginRequest,
  TokenResponse,
  UsuarioCreate,
  UsuarioLogado,
  AlterarSenhaRequest,
  Chamado,
  ChamadoCreate,
  ChamadoUpdate,
  ChamadosQueryParams,
  Comentario,
  ComentarioCreate,
  Historico,
  Usuario,
  UsuarioUpdate,
  UsuariosQueryParams,
  Setor,
  SetorCreate,
  Categoria,
  CategoriaCreate,
} from '../types/api';

// ============================================
// SERVIÇO DE AUTENTICAÇÃO
// ============================================

export const authService = {
  /**
   * Faz login e armazena o token
   */
  async login(credentials: LoginRequest): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/auth/login', credentials);
    const { access_token, user_id, nome, role } = response.data;

    // Armazenar token e dados do usuário
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify({ id: user_id, nome, role }));

    return response.data;
  },

  /**
   * Registra um novo usuário
   */
  async registro(userData: UsuarioCreate): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/auth/registro', userData);
    const { access_token, user_id, nome, role } = response.data;

    // Armazenar token e dados do usuário
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify({ id: user_id, nome, role }));

    return response.data;
  },

  /**
   * Obtém dados do usuário logado
   */
  async me(): Promise<UsuarioLogado> {
    const response = await api.get<UsuarioLogado>('/auth/me');
    return response.data;
  },

  /**
   * Altera a senha do usuário logado
   */
  async alterarSenha(dados: AlterarSenhaRequest): Promise<void> {
    await api.post('/auth/alterar-senha', dados);
  },

  /**
   * Renova o token JWT
   */
  async refresh(): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/auth/refresh');
    const { access_token, user_id, nome, role } = response.data;

    // Atualizar token
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify({ id: user_id, nome, role }));

    return response.data;
  },

  /**
   * Faz logout removendo token e dados
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Verifica se o usuário está logado
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },

  /**
   * Obtém dados do usuário do localStorage
   */
  getCurrentUser(): { id: number; nome: string; role: string } | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// ============================================
// SERVIÇO DE CHAMADOS
// ============================================

export const chamadosService = {
  /**
   * Lista todos os chamados com filtros opcionais
   */
  async listar(params?: ChamadosQueryParams): Promise<Chamado[]> {
    const response = await api.get<Chamado[]>('/chamados/', { params });
    return response.data;
  },

  /**
   * Busca um chamado por ID
   */
  async buscar(id: number): Promise<Chamado> {
    const response = await api.get<Chamado>(`/chamados/${id}`);
    return response.data;
  },

  /**
   * Cria um novo chamado
   */
  async criar(dados: ChamadoCreate): Promise<Chamado> {
    const response = await api.post<Chamado>('/chamados/', dados);
    return response.data;
  },

  /**
   * Atualiza um chamado existente
   */
  async atualizar(id: number, dados: ChamadoUpdate, usuarioId: number): Promise<Chamado> {
    const response = await api.put<Chamado>(`/chamados/${id}?usuario_id=${usuarioId}`, dados);
    return response.data;
  },

  /**
   * Deleta um chamado
   */
  async deletar(id: number): Promise<void> {
    await api.delete(`/chamados/${id}`);
  },

  /**
   * Cancela um chamado
   */
  async cancelar(id: number, usuarioId: number): Promise<Chamado> {
    const response = await api.patch<Chamado>(`/chamados/${id}/cancelar?usuario_id=${usuarioId}`);
    return response.data;
  },

  /**
   * Arquiva um chamado
   */
  async arquivar(id: number, usuarioId: number): Promise<Chamado> {
    const response = await api.patch<Chamado>(`/chamados/${id}/arquivar?usuario_id=${usuarioId}`);
    return response.data;
  },

  /**
   * Desarquiva um chamado
   */
  async desarquivar(id: number, usuarioId: number): Promise<Chamado> {
    const response = await api.patch<Chamado>(`/chamados/${id}/desarquivar?usuario_id=${usuarioId}`);
    return response.data;
  },
};

// ============================================
// SERVIÇO DE COMENTÁRIOS
// ============================================

export const comentariosService = {
  /**
   * Lista comentários de um chamado
   */
  async listarPorChamado(chamadoId: number): Promise<Comentario[]> {
    const response = await api.get<Comentario[]>(`/comentarios/chamado/${chamadoId}`);
    return response.data;
  },

  /**
   * Busca um comentário por ID
   */
  async buscar(id: number): Promise<Comentario> {
    const response = await api.get<Comentario>(`/comentarios/${id}`);
    return response.data;
  },

  /**
   * Cria um novo comentário
   */
  async criar(dados: ComentarioCreate): Promise<Comentario> {
    const response = await api.post<Comentario>('/comentarios/', dados);
    return response.data;
  },

  /**
   * Deleta um comentário
   */
  async deletar(id: number): Promise<void> {
    await api.delete(`/comentarios/${id}`);
  },
};

// ============================================
// SERVIÇO DE HISTÓRICO
// ============================================

export const historicoService = {
  /**
   * Lista histórico de um chamado
   */
  async listarPorChamado(chamadoId: number): Promise<Historico[]> {
    const response = await api.get<Historico[]>(`/historico/chamado/${chamadoId}`);
    return response.data;
  },

  /**
   * Busca um registro de histórico por ID
   */
  async buscar(id: number): Promise<Historico> {
    const response = await api.get<Historico>(`/historico/${id}`);
    return response.data;
  },
};

// ============================================
// SERVIÇO DE USUÁRIOS
// ============================================

export const usuariosService = {
  /**
   * Lista todos os usuários com filtros opcionais
   */
  async listar(params?: UsuariosQueryParams): Promise<Usuario[]> {
    const response = await api.get<Usuario[]>('/usuarios/', { params });
    return response.data;
  },

  /**
   * Busca um usuário por ID
   */
  async buscar(id: number): Promise<Usuario> {
    const response = await api.get<Usuario>(`/usuarios/${id}`);
    return response.data;
  },

  /**
   * Cria um novo usuário
   */
  async criar(dados: UsuarioCreate): Promise<Usuario> {
    const response = await api.post<Usuario>('/usuarios/', dados);
    return response.data;
  },

  /**
   * Atualiza um usuário existente
   */
  async atualizar(id: number, dados: UsuarioUpdate): Promise<Usuario> {
    const response = await api.put<Usuario>(`/usuarios/${id}`, dados);
    return response.data;
  },

  /**
   * Desativa um usuário
   */
  async deletar(id: number): Promise<void> {
    await api.delete(`/usuarios/${id}`);
  },
};

// ============================================
// SERVIÇO DE SETORES
// ============================================

export const setoresService = {
  /**
   * Lista todos os setores
   */
  async listar(ativo?: boolean): Promise<Setor[]> {
    const response = await api.get<Setor[]>('/setores/', { params: { ativo } });
    return response.data;
  },

  /**
   * Busca um setor por ID
   */
  async buscar(id: number): Promise<Setor> {
    const response = await api.get<Setor>(`/setores/${id}`);
    return response.data;
  },

  /**
   * Cria um novo setor
   */
  async criar(dados: SetorCreate): Promise<Setor> {
    const response = await api.post<Setor>('/setores/', dados);
    return response.data;
  },

  /**
   * Atualiza um setor existente
   */
  async atualizar(id: number, dados: Partial<SetorCreate>): Promise<Setor> {
    const response = await api.put<Setor>(`/setores/${id}`, dados);
    return response.data;
  },

  /**
   * Desativa um setor
   */
  async deletar(id: number): Promise<void> {
    await api.delete(`/setores/${id}`);
  },
};

// ============================================
// SERVIÇO DE CATEGORIAS
// ============================================

export const categoriasService = {
  /**
   * Lista todas as categorias
   */
  async listar(ativo?: boolean): Promise<Categoria[]> {
    const response = await api.get<Categoria[]>('/categorias/', { params: { ativo } });
    return response.data;
  },

  /**
   * Busca uma categoria por ID
   */
  async buscar(id: number): Promise<Categoria> {
    const response = await api.get<Categoria>(`/categorias/${id}`);
    return response.data;
  },

  /**
   * Cria uma nova categoria
   */
  async criar(dados: CategoriaCreate): Promise<Categoria> {
    const response = await api.post<Categoria>('/categorias/', dados);
    return response.data;
  },

  /**
   * Atualiza uma categoria existente
   */
  async atualizar(id: number, dados: Partial<CategoriaCreate>): Promise<Categoria> {
    const response = await api.put<Categoria>(`/categorias/${id}`, dados);
    return response.data;
  },

  /**
   * Desativa uma categoria
   */
  async deletar(id: number): Promise<void> {
    await api.delete(`/categorias/${id}`);
  },
};

// ============================================
// EXPORTAÇÃO DEFAULT
// ============================================

const chamadosHSApi = {
  auth: authService,
  chamados: chamadosService,
  comentarios: comentariosService,
  historico: historicoService,
  usuarios: usuariosService,
  setores: setoresService,
  categorias: categoriasService,
};

export default chamadosHSApi;
