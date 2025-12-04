import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  chamadosService,
  comentariosService,
  historicoService,
  categoriasService,
  usuariosService,
} from '../services/chamadoshsapi';
import {
  Chamado,
  Comentario,
  Historico,
  Categoria,
  Usuario,
  ChamadoCreate,
  ChamadoUpdate,
  ComentarioCreate,
} from '../types/api';

type ChamadosContextType = {
  // Estado
  chamados: Chamado[];
  categorias: Categoria[];
  tecnicos: Usuario[];
  loading: boolean;
  error: string | null;

  // Funções de chamados
  carregarChamados: () => Promise<void>;
  buscarChamado: (id: number) => Promise<Chamado | null>;
  criarChamado: (dados: ChamadoCreate) => Promise<Chamado>;
  atualizarChamado: (id: number, dados: ChamadoUpdate, usuarioId: number) => Promise<Chamado>;
  deletarChamado: (id: number) => Promise<void>;

  // Funções de comentários
  carregarComentarios: (chamadoId: number) => Promise<Comentario[]>;
  criarComentario: (dados: ComentarioCreate) => Promise<Comentario>;

  // Funções de histórico
  carregarHistorico: (chamadoId: number) => Promise<Historico[]>;

  // Funções auxiliares
  carregarCategorias: () => Promise<void>;
  carregarTecnicos: () => Promise<void>;
  limparErro: () => void;
};

export const ChamadosContext = createContext<ChamadosContextType>({} as ChamadosContextType);

export const ChamadosProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tecnicos, setTecnicos] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache para evitar requisições duplicadas
  const [chamadosCarregados, setChamadosCarregados] = useState(false);
  const [categoriasCarregadas, setCategoriasCarregadas] = useState(false);
  const [tecnicosCarregados, setTecnicosCarregados] = useState(false);

  // Carregar chamados baseado na role do usuário
  const carregarChamados = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const params: any = {};

      // Usuários comuns só veem seus próprios chamados
      if (user.role === 'Usuario') {
        params.solicitante_id = user.id;
      }

      // Técnicos e Admins veem todos os chamados (sem filtro)

      const data = await chamadosService.listar(params);
      setChamados(data);
      setChamadosCarregados(true);
    } catch (err: any) {
      console.error('Erro ao carregar chamados:', err);
      setError('Erro ao carregar chamados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Buscar um chamado específico (verifica cache primeiro)
  const buscarChamado = useCallback(
    async (id: number): Promise<Chamado | null> => {
      try {
        // Verifica no cache primeiro
        const chamadoCache = chamados.find((c) => c.id === id);
        if (chamadoCache) {
          return chamadoCache;
        }

        // Se não estiver no cache, busca na API
        setLoading(true);
        setError(null);
        const data = await chamadosService.buscar(id);

        // Atualiza o cache
        setChamados((prev) => {
          const existe = prev.find((c) => c.id === id);
          if (existe) {
            return prev.map((c) => (c.id === id ? data : c));
          }
          return [...prev, data];
        });

        return data;
      } catch (err: any) {
        console.error('Erro ao buscar chamado:', err);
        setError('Erro ao buscar chamado.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [chamados]
  );

  // Criar novo chamado
  const criarChamado = useCallback(async (dados: ChamadoCreate): Promise<Chamado> => {
    try {
      setLoading(true);
      setError(null);

      const novoChamado = await chamadosService.criar(dados);

      // Adiciona ao cache
      setChamados((prev) => [novoChamado, ...prev]);

      return novoChamado;
    } catch (err: any) {
      console.error('Erro ao criar chamado:', err);
      setError(err.response?.data?.detail || 'Erro ao criar chamado.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar chamado
  const atualizarChamado = useCallback(
    async (id: number, dados: ChamadoUpdate, usuarioId: number): Promise<Chamado> => {
      try {
        setLoading(true);
        setError(null);

        const chamadoAtualizado = await chamadosService.atualizar(id, dados, usuarioId);

        // Atualiza o cache
        setChamados((prev) => prev.map((c) => (c.id === id ? chamadoAtualizado : c)));

        return chamadoAtualizado;
      } catch (err: any) {
        console.error('Erro ao atualizar chamado:', err);
        setError('Erro ao atualizar chamado.');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Deletar chamado
  const deletarChamado = useCallback(async (id: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await chamadosService.deletar(id);

      // Remove do cache
      setChamados((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      console.error('Erro ao deletar chamado:', err);
      setError('Erro ao deletar chamado.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar comentários de um chamado
  const carregarComentarios = useCallback(async (chamadoId: number): Promise<Comentario[]> => {
    try {
      const data = await comentariosService.listarPorChamado(chamadoId);
      return data;
    } catch (err: any) {
      console.error('Erro ao carregar comentários:', err);
      throw err;
    }
  }, []);

  // Criar comentário
  const criarComentario = useCallback(async (dados: ComentarioCreate): Promise<Comentario> => {
    try {
      const novoComentario = await comentariosService.criar(dados);
      return novoComentario;
    } catch (err: any) {
      console.error('Erro ao criar comentário:', err);
      throw err;
    }
  }, []);

  // Carregar histórico de um chamado
  const carregarHistorico = useCallback(async (chamadoId: number): Promise<Historico[]> => {
    try {
      const data = await historicoService.listarPorChamado(chamadoId);
      return data;
    } catch (err: any) {
      console.error('Erro ao carregar histórico:', err);
      throw err;
    }
  }, []);

  // Carregar categorias
  const carregarCategorias = useCallback(async () => {
    if (categoriasCarregadas) return;

    try {
      const data = await categoriasService.listar(true); // Apenas ativas
      setCategorias(data);
      setCategoriasCarregadas(true);
    } catch (err: any) {
      console.error('Erro ao carregar categorias:', err);
    }
  }, [categoriasCarregadas]);

  // Carregar técnicos
  const carregarTecnicos = useCallback(async () => {
    if (tecnicosCarregados) return;

    try {
      const data = await usuariosService.listar({ role_id: 2, ativo: true }); // Role 2 = Técnico
      setTecnicos(data);
      setTecnicosCarregados(true);
    } catch (err: any) {
      console.error('Erro ao carregar técnicos:', err);
    }
  }, [tecnicosCarregados]);

  // Limpar erro
  const limparErro = useCallback(() => {
    setError(null);
  }, []);

  // Carregar dados iniciais quando o usuário estiver autenticado
  useEffect(() => {
    if (user && !chamadosCarregados) {
      carregarChamados();
    }
  }, [user, chamadosCarregados, carregarChamados]);

  // Carregar categorias e técnicos automaticamente
  useEffect(() => {
    if (user) {
      carregarCategorias();

      // Apenas Admin e Técnico precisam da lista de técnicos
      if (user.role === 'Administrador' || user.role === 'Tecnico') {
        carregarTecnicos();
      }
    }
  }, [user, carregarCategorias, carregarTecnicos]);

  return (
    <ChamadosContext.Provider
      value={{
        chamados,
        categorias,
        tecnicos,
        loading,
        error,
        carregarChamados,
        buscarChamado,
        criarChamado,
        atualizarChamado,
        deletarChamado,
        carregarComentarios,
        criarComentario,
        carregarHistorico,
        carregarCategorias,
        carregarTecnicos,
        limparErro,
      }}
    >
      {children}
    </ChamadosContext.Provider>
  );
};
