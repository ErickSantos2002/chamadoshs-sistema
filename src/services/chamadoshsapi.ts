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
  SLAConfig,
  TarefaRecorrente,
  TarefaRecorrenteExecucao,
  TarefaRecorrenteCreate,
  TarefaRecorrenteUpdate,
  RealizarTarefaRequest,
  EventoDeAuditoria,
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

  // `registro` foi removido: chamava POST /auth/registro, que exige perfil de
  // administrador, e nunca teve call site. Usuário é criado pela tela de
  // Cadastros, por POST /usuarios. Além de morto, o método trocava o token
  // guardado pelo do usuário recém-criado — quem o chamasse por engano
  // deslogaria a si mesmo e assumiria a sessão do outro.

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
   * Lista todos os chamados, buscando página a página até o fim.
   * A API limita cada resposta a um número fixo de registros, então uma única
   * chamada devolve apenas o começo da lista.
   */
  async listarTodos(params?: ChamadosQueryParams): Promise<Chamado[]> {
    const tamanhoPagina = 200;
    const maxPaginas = 100; // trava de segurança contra loop infinito
    const todos: Chamado[] = [];

    for (let pagina = 0; pagina < maxPaginas; pagina++) {
      const lote = await this.listar({
        ...params,
        skip: pagina * tamanhoPagina,
        limit: tamanhoPagina,
      });

      todos.push(...lote);

      if (lote.length < tamanhoPagina) return todos;
    }

    console.warn(
      `listarTodos: parou em ${maxPaginas} páginas (${todos.length} chamados). Pode haver registros não carregados.`
    );
    return todos;
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
  async atualizar(id: number, dados: ChamadoUpdate): Promise<Chamado> {
    const response = await api.put<Chamado>(`/chamados/${id}`, dados);
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
  async cancelar(id: number): Promise<Chamado> {
    const response = await api.patch<Chamado>(`/chamados/${id}/cancelar`);
    return response.data;
  },

  /**
   * Arquiva um chamado
   */
  async arquivar(id: number): Promise<Chamado> {
    const response = await api.patch<Chamado>(`/chamados/${id}/arquivar`);
    return response.data;
  },

  /**
   * Desarquiva um chamado
   */
  async desarquivar(id: number): Promise<Chamado> {
    const response = await api.patch<Chamado>(`/chamados/${id}/desarquivar`);
    return response.data;
  },

  /**
   * Registra a nota de satisfação do solicitante.
   *
   * Endpoint próprio em vez do `atualizar`: o PUT exige perfil de técnico ou
   * administrador, então o solicitante comum levava 403 e não conseguia
   * avaliar. Abrir o PUT para ele resolveria a avaliação e de quebra deixaria
   * qualquer um mudar status, prioridade e responsável do próprio chamado.
   *
   * Reavaliar é permitido: a segunda chamada sobrescreve a nota.
   */
  async avaliar(id: number, nota: number): Promise<Chamado> {
    const response = await api.patch<Chamado>(`/chamados/${id}/avaliar`, {
      avaliacao: nota,
    });
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
   * Lista todos os usuários, buscando página a página até o fim.
   *
   * O endpoint tem `limit` com padrão 100. Uma chamada só funciona hoje, mas
   * truncaria em silêncio quando a empresa passar de 100 cadastros — e o
   * sintoma seria nome de usuário sumindo da tela, difícil de associar à causa.
   */
  async listarTodos(
    params?: Omit<UsuariosQueryParams, 'skip' | 'limit'>
  ): Promise<Usuario[]> {
    const tamanhoPagina = 100;
    const maxPaginas = 50; // trava de segurança contra loop infinito
    const todos: Usuario[] = [];

    for (let pagina = 0; pagina < maxPaginas; pagina++) {
      const lote = await this.listar({
        ...params,
        skip: pagina * tamanhoPagina,
        limit: tamanhoPagina,
      });

      todos.push(...lote);

      if (lote.length < tamanhoPagina) return todos;
    }

    console.warn(
      `listarTodos: parou em ${maxPaginas} páginas (${todos.length} usuários). Pode haver registros não carregados.`
    );
    return todos;
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
   * Desativa um usuário.
   *
   * O `DELETE /usuarios/{id}` que ficava aqui nunca apagou nada — desativava,
   * e devolvia 204 vazio. A tela então removia a linha da lista, e no refresh
   * seguinte ela voltava: era daí que vinha o "eu deleto e ele volta".
   *
   * O PATCH diz no verbo o que sempre fez, e devolve o registro atualizado.
   * Com ele a tela troca a linha pelo estado que o servidor gravou, em vez de
   * apostar no que acha que aconteceu.
   *
   * Pode responder 400 — o último administrador não pode ser desativado.
   */
  async desativar(id: number): Promise<Usuario> {
    const response = await api.patch<Usuario>(`/usuarios/${id}/desativar`);
    return response.data;
  },

  /**
   * Reativa um usuário.
   *
   * Antes era `PUT {ativo: true}`, que passava pelo mesmo caminho de uma
   * edição de cadastro. Idempotente e sem travas do lado da API, de
   * propósito: as travas existem para o sistema não ficar sem administrador,
   * e reativar é o caminho de VOLTA desse estado.
   */
  async reativar(id: number): Promise<Usuario> {
    const response = await api.patch<Usuario>(`/usuarios/${id}/reativar`);
    return response.data;
  },

  /**
   * Trilha de auditoria de UMA conta, do mais recente para o mais antigo.
   * Restrito a administrador na API.
   *
   * Devolve o que aconteceu COM esta conta, não o que ela fez com outras.
   *
   * O `limit` da API aceita de 1 a 500. Não mandamos o valor cru de lugar
   * nenhum da interface: `LIMIT -1` é erro no PostgreSQL, e a rota passou a
   * recusar por isso.
   */
  async eventos(id: number, limite = 50): Promise<EventoDeAuditoria[]> {
    const response = await api.get<EventoDeAuditoria[]>(`/usuarios/${id}/eventos`, {
      params: { limit: limite },
    });
    return response.data;
  },
};

// ============================================
// SERVIÇO DE AUDITORIA
// ============================================

export interface FiltroDeAuditoria {
  /** `usuario` ou `setor`. Omitido, traz os dois mesclados por data. */
  alvo?: 'usuario' | 'setor';
  ator_id?: number;
  /** Primeiro dia do período, inclusivo. Formato AAAA-MM-DD. */
  de?: string;
  /** Último dia do período, inclusivo — o dia inteiro, não a meia-noite. */
  ate?: string;
  skip?: number;
  limit?: number;
}

export const auditoriaService = {
  /**
   * Trilha de auditoria dos cadastros, do mais recente para o mais antigo.
   * Restrito a administrador na API.
   *
   * A barra final não é descuido: o router é montado em `/api/v1/eventos` e a
   * rota é `/`. Sem ela, o FastAPI responde 307 e o navegador refaz a
   * requisição — funciona, e gasta uma ida à rede em toda troca de filtro.
   *
   * Os limites da API são `skip` de 0 a 10.000 e `limit` de 1 a 500. Quem
   * precisa passar disso quer filtro, não página 200 — e é o que a tela
   * oferece.
   */
  async listar(filtro: FiltroDeAuditoria = {}): Promise<EventoDeAuditoria[]> {
    const response = await api.get<EventoDeAuditoria[]>('/eventos/', {
      // O axios já omite `undefined`, então só precisa de tratamento o que
      // pode chegar como string VAZIA — e isso é decidido pelo tipo, não pelo
      // hábito:
      //
      //   `alvo` e `ator_id` não passam por `|| undefined` porque os tipos
      //   deles não admitem vazio; a guarda nunca dispararia. Quem converte o
      //   "" do <select> é a tela, antes de chamar.
      //
      //   `de` e `ate` são `string` e chegam vazios de um <input type="date">
      //   que nunca foi preenchido. Ali a guarda é a que impede `?de=` de
      //   virar 400.
      params: {
        alvo: filtro.alvo,
        ator_id: filtro.ator_id,
        de: filtro.de || undefined,
        ate: filtro.ate || undefined,
        // `skip` NÃO passa por `|| undefined`: zero é falso em JavaScript, e a
        // primeira página deixaria de mandá-lo.
        skip: filtro.skip,
        limit: filtro.limit,
      },
    });
    return response.data;
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
   * Desativa um setor.
   *
   * Mesma troca feita em usuários, pelo mesmo motivo. Responde 400 quando o
   * setor ainda tem usuários ativos vinculados, e a mensagem da API diz
   * quantos são — vale repassá-la em vez de escrever uma genérica por cima.
   */
  async desativar(id: number): Promise<Setor> {
    const response = await api.patch<Setor>(`/setores/${id}/desativar`);
    return response.data;
  },

  /**
   * Reativa um setor.
   */
  async reativar(id: number): Promise<Setor> {
    const response = await api.patch<Setor>(`/setores/${id}/reativar`);
    return response.data;
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
// SERVIÇO DE CONFIGURAÇÃO DE SLA
// ============================================

export const slaConfigsService = {
  /**
   * Lista os prazos de SLA de todas as prioridades
   */
  async listar(): Promise<SLAConfig[]> {
    const response = await api.get<SLAConfig[]>('/sla-configs/');
    return response.data;
  },

  /**
   * Atualiza os prazos de uma prioridade
   */
  async atualizar(
    prioridade: string,
    dados: { minutos_resposta: number; minutos_resolucao: number }
  ): Promise<SLAConfig> {
    const response = await api.put<SLAConfig>(
      `/sla-configs/${encodeURIComponent(prioridade)}`,
      dados
    );
    return response.data;
  },
};

// ============================================
// SERVIÇO DE TAREFAS RECORRENTES
// ============================================

export const tarefasRecorrentesService = {
  /**
   * Lista tarefas recorrentes (ordenadas pela próxima data)
   */
  async listar(params?: {
    ativo?: boolean;
    apenas_atrasadas?: boolean;
  }): Promise<TarefaRecorrente[]> {
    const response = await api.get<TarefaRecorrente[]>('/tarefas-recorrentes/', {
      params,
    });
    return response.data;
  },

  /**
   * Busca uma tarefa recorrente por ID
   */
  async buscar(id: number): Promise<TarefaRecorrente> {
    const response = await api.get<TarefaRecorrente>(`/tarefas-recorrentes/${id}`);
    return response.data;
  },

  /**
   * Cria uma tarefa recorrente
   */
  async criar(dados: TarefaRecorrenteCreate): Promise<TarefaRecorrente> {
    const response = await api.post<TarefaRecorrente>('/tarefas-recorrentes/', dados);
    return response.data;
  },

  /**
   * Atualiza uma tarefa recorrente
   */
  async atualizar(
    id: number,
    dados: TarefaRecorrenteUpdate
  ): Promise<TarefaRecorrente> {
    const response = await api.put<TarefaRecorrente>(
      `/tarefas-recorrentes/${id}`,
      dados
    );
    return response.data;
  },

  /**
   * Exclui uma tarefa recorrente (a API bloqueia com 409 se já houver execuções)
   */
  async excluir(id: number): Promise<void> {
    await api.delete(`/tarefas-recorrentes/${id}`);
  },

  /**
   * Lista o histórico de execuções de uma tarefa
   */
  async listarExecucoes(id: number): Promise<TarefaRecorrenteExecucao[]> {
    const response = await api.get<TarefaRecorrenteExecucao[]>(
      `/tarefas-recorrentes/${id}/execucoes`
    );
    return response.data;
  },

  /**
   * Registra uma execução e avança a próxima data
   */
  async realizar(
    id: number,
    dados: RealizarTarefaRequest
  ): Promise<TarefaRecorrente> {
    const response = await api.post<TarefaRecorrente>(
      `/tarefas-recorrentes/${id}/realizar`,
      dados
    );
    return response.data;
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
  slaConfigs: slaConfigsService,
  tarefasRecorrentes: tarefasRecorrentesService,
};

export default chamadosHSApi;
