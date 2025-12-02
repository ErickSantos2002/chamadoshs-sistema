import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  categoriasService,
  setoresService,
  usuariosService,
} from '../services/chamadoshsapi';
import type {
  Categoria,
  CategoriaCreate,
  CategoriaUpdate,
  Setor,
  SetorCreate,
  SetorUpdate,
  Usuario,
  UsuarioCreate,
  UsuarioUpdate,
  CadastrosContextData,
} from '../types/cadastros.types';

// ========================================
// CONTEXT & PROVIDER
// ========================================

const CadastrosContext = createContext<CadastrosContextData | undefined>(undefined);

export const CadastrosProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  // ========================================
  // ESTADOS PRINCIPAIS
  // ========================================

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ========================================
  // FETCH DE DADOS
  // ========================================

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Busca dados em paralelo para melhor performance
      const [categoriasData, setoresData, usuariosData] = await Promise.all([
        categoriasService.listar(),
        setoresService.listar(),
        usuariosService.listar(),
      ]);

      setCategorias(categoriasData || []);
      setSetores(setoresData || []);
      setUsuarios(usuariosData || []);
    } catch (err: any) {
      console.error('Erro ao carregar cadastros:', err);
      setError(
        err.response?.data?.detail ||
        'Não foi possível carregar os dados. Verifique sua conexão.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega dados iniciais
  useEffect(() => {
    fetchData();
  }, []);

  // ========================================
  // FUNÇÕES CRUD - CATEGORIAS
  // ========================================

  const createCategoria = useCallback(async (data: CategoriaCreate): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const novaCategoria = await categoriasService.criar(data);
      setCategorias((prev) => [...prev, novaCategoria]);

      console.log('✅ Categoria criada com sucesso!');
    } catch (err: any) {
      console.error('❌ Erro ao criar categoria:', err);
      setError(err.response?.data?.detail || 'Erro ao criar categoria');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCategoria = useCallback(async (id: number, data: CategoriaUpdate): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const categoriaAtualizada = await categoriasService.atualizar(id, data);
      setCategorias((prev) =>
        prev.map((c) => (c.id === id ? categoriaAtualizada : c))
      );

      console.log('✅ Categoria atualizada com sucesso!');
    } catch (err: any) {
      console.error('❌ Erro ao atualizar categoria:', err);
      setError(err.response?.data?.detail || 'Erro ao atualizar categoria');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCategoria = useCallback(async (id: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await categoriasService.deletar(id);
      setCategorias((prev) => prev.filter((c) => c.id !== id));

      console.log('✅ Categoria excluída com sucesso!');
    } catch (err: any) {
      console.error('❌ Erro ao excluir categoria:', err);

      // Verifica se é erro de vínculo
      if (err.response?.status === 400) {
        setError('Não é possível excluir categoria com chamados vinculados');
      } else {
        setError(err.response?.data?.detail || 'Erro ao excluir categoria');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ========================================
  // FUNÇÕES CRUD - SETORES
  // ========================================

  const createSetor = useCallback(async (data: SetorCreate): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const novoSetor = await setoresService.criar(data);
      setSetores((prev) => [...prev, novoSetor]);

      console.log('✅ Setor criado com sucesso!');
    } catch (err: any) {
      console.error('❌ Erro ao criar setor:', err);
      setError(err.response?.data?.detail || 'Erro ao criar setor');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSetor = useCallback(async (id: number, data: SetorUpdate): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const setorAtualizado = await setoresService.atualizar(id, data);
      setSetores((prev) =>
        prev.map((s) => (s.id === id ? setorAtualizado : s))
      );

      console.log('✅ Setor atualizado com sucesso!');
    } catch (err: any) {
      console.error('❌ Erro ao atualizar setor:', err);
      setError(err.response?.data?.detail || 'Erro ao atualizar setor');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSetor = useCallback(async (id: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await setoresService.deletar(id);
      setSetores((prev) => prev.filter((s) => s.id !== id));

      console.log('✅ Setor excluído com sucesso!');
    } catch (err: any) {
      console.error('❌ Erro ao excluir setor:', err);

      // Verifica se é erro de vínculo
      if (err.response?.status === 400) {
        setError('Não é possível excluir setor com usuários vinculados');
      } else {
        setError(err.response?.data?.detail || 'Erro ao excluir setor');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ========================================
  // FUNÇÕES CRUD - USUÁRIOS
  // ========================================

  const createUsuario = useCallback(async (data: UsuarioCreate): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Validação de senha
      if (!data.password || data.password.trim().length === 0) {
        throw new Error('Senha é obrigatória');
      }

      // Adapta os dados para a API do ChamadosHS
      const dadosUsuario = {
        nome: data.username,
        senha: data.password,
        setor_id: data.setor_id,
        role_id: data.role_name === 'Administrador' ? 1 : data.role_name === 'Tecnico' ? 2 : 3,
        ativo: true,
      };

      console.log('🔍 Dados sendo enviados para criar usuário:', { ...dadosUsuario, senha: '***' });

      const novoUsuario = await usuariosService.criar(dadosUsuario);
      setUsuarios((prev) => [...prev, novoUsuario]);

      console.log('✅ Usuário criado com sucesso!');
    } catch (err: any) {
      console.error('❌ Erro ao criar usuário:', err);

      // Verifica se é erro de nome duplicado
      if (err.response?.status === 400 && err.response?.data?.detail?.includes('já existe')) {
        setError('Este nome de usuário já está em uso');
      } else {
        setError(err.response?.data?.detail || 'Erro ao criar usuário');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUsuario = useCallback(async (id: number, data: UsuarioUpdate): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Adapta os dados para a API do ChamadosHS
      const dadosAtualizacao: any = {};

      if (data.username) dadosAtualizacao.nome = data.username;
      // Aceita tanto 'senha' quanto 'password' para compatibilidade
      if (data.senha) dadosAtualizacao.senha = data.senha;
      if ((data as any).password) dadosAtualizacao.senha = (data as any).password;
      if (data.setor_id !== undefined) dadosAtualizacao.setor_id = data.setor_id;
      if (data.role_name) {
        dadosAtualizacao.role_id =
          data.role_name === 'Administrador' ? 1 : data.role_name === 'Tecnico' ? 2 : 3;
      }

      const usuarioAtualizado = await usuariosService.atualizar(id, dadosAtualizacao);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === id ? usuarioAtualizado : u))
      );

      console.log('✅ Usuário atualizado com sucesso!');
    } catch (err: any) {
      console.error('❌ Erro ao atualizar usuário:', err);
      setError(err.response?.data?.detail || 'Erro ao atualizar usuário');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUsuario = useCallback(async (id: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await usuariosService.deletar(id);
      setUsuarios((prev) => prev.filter((u) => u.id !== id));

      console.log('✅ Usuário desativado com sucesso!');
    } catch (err: any) {
      console.error('❌ Erro ao desativar usuário:', err);
      setError(err.response?.data?.detail || 'Erro ao desativar usuário');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUsuarioPassword = useCallback(async (id: number, novaSenha: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await usuariosService.atualizar(id, { senha: novaSenha });
      console.log('✅ Senha atualizada com sucesso!');
    } catch (err: any) {
      console.error('❌ Erro ao atualizar senha:', err);
      setError(err.response?.data?.detail || 'Erro ao atualizar senha');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const contextValue: CadastrosContextData = {
    // Dados
    categorias,
    setores,
    usuarios,

    // Estados
    loading,
    error,

    // Funções CRUD - Categorias
    createCategoria,
    updateCategoria,
    deleteCategoria,

    // Funções CRUD - Setores
    createSetor,
    updateSetor,
    deleteSetor,

    // Funções CRUD - Usuários
    createUsuario,
    updateUsuario,
    deleteUsuario,
    updateUsuarioPassword,

    // Atualização
    refreshData: fetchData,
  };

  return (
    <CadastrosContext.Provider value={contextValue}>
      {children}
    </CadastrosContext.Provider>
  );
};

// ========================================
// HOOK CUSTOMIZADO
// ========================================

export const useCadastros = () => {
  const context = useContext(CadastrosContext);
  if (!context) {
    throw new Error('useCadastros deve ser usado dentro de CadastrosProvider');
  }
  return context;
};

