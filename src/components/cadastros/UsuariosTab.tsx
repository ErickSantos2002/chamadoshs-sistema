import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  RefreshCw,
  Users,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Key,
  Building,
} from 'lucide-react';
import { useCadastros } from '../../context/CadastrosContext';
import { useAuth } from '../../hooks/useAuth';
import { getRoleName } from '../../utils/roleMapper';
import UsuarioModal from './UsuarioModal';
import type {
  Usuario,
  ModalMode,
  OrdenacaoCampo,
  OrdenacaoDirecao,
  ROLE_COLORS,
} from '../../types/cadastros.types';

// ========================================
// COMPONENTE USUARIOS TAB
// ========================================

const UsuariosTab: React.FC = () => {
  const { usuarios, setores, deleteUsuario, updateUsuarioPassword, refreshData, loading, error } = useCadastros();
  const { user } = useAuth();

  // ========================================
  // ESTADOS LOCAIS
  // ========================================

  const [busca, setBusca] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [resetPasswordFor, setResetPasswordFor] = useState<Usuario | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [senhaError, setSenhaError] = useState('');
  const [ordenacao, setOrdenacao] = useState<{
    campo: OrdenacaoCampo;
    direcao: OrdenacaoDirecao;
  }>({ campo: 'id', direcao: 'asc' });

  // ========================================
  // VERIFICAÇÃO DE PERMISSÕES
  // ========================================

  const isAdmin = user?.role === 'Administrador' || user?.role === 'Tecnico';

  // ========================================
  // FILTRAGEM E ORDENAÇÃO
  // ========================================

  const usuariosFiltrados = useMemo(() => {
    if (!busca) return usuarios;

    const termo = busca.toLowerCase();
    return usuarios.filter(
      (u) =>
        u.username.toLowerCase().includes(termo) ||
        u.role_name?.toLowerCase().includes(termo) ||
        (u.role?.name && u.role.name.toLowerCase().includes(termo))
    );
  }, [usuarios, busca]);

  const usuariosOrdenados = useMemo(() => {
    return [...usuariosFiltrados].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (ordenacao.campo) {
        case 'username':
          aVal = a.username;
          bVal = b.username;
          break;
        case 'created_at':
          aVal = a.created_at || '';
          bVal = b.created_at || '';
          break;
        default:
          aVal = a[ordenacao.campo as keyof Usuario];
          bVal = b[ordenacao.campo as keyof Usuario];
      }

      // Tratar valores nulos/undefined
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      // Comparação
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return ordenacao.direcao === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (ordenacao.direcao === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  }, [usuariosFiltrados, ordenacao]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleOrdenar = (campo: OrdenacaoCampo) => {
    setOrdenacao((prev) => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleNovoUsuario = () => {
    setUsuarioEditando(null);
    setModalMode('create');
  };

  const handleEditarUsuario = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setModalMode('edit');
  };

  const handleVisualizarUsuario = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setModalMode('view');
  };

  const handleExcluirUsuario = async (id: number) => {
    if (!confirmDelete) {
      setConfirmDelete(id);
      return;
    }

    try {
      await deleteUsuario(id);
      setConfirmDelete(null);
    } catch (err: any) {
      // Erro já tratado no context
      alert(err.response?.data?.detail || 'Erro ao excluir usuário');
    }
    setConfirmDelete(null);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordFor) return;

    // Validações
    if (!novaSenha || novaSenha.length < 6) {
      setSenhaError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setSenhaError('As senhas não coincidem');
      return;
    }

    try {
      await updateUsuarioPassword(resetPasswordFor.id, novaSenha);
      alert(`Senha do usuário ${resetPasswordFor.username} atualizada com sucesso!`);
      setResetPasswordFor(null);
      setNovaSenha('');
      setConfirmarSenha('');
      setSenhaError('');
    } catch (err: any) {
      setSenhaError(err.response?.data?.detail || 'Erro ao resetar senha');
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getUserRole = (usuario: Usuario): string => {
    return getRoleName(usuario.role_id);
  };

  const getSetorNome = (setorId?: number): string => {
    if (!setorId) return '-';
    const setor = setores.find(s => s.id === setorId);
    return setor?.nome || '-';
  };

  const getRoleColor = (role: string): string => {
    const roleColors: Record<string, string> = {
      'Administrador': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400',
      'Tecnico': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400',
      'Usuario': 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400',
    };
    return roleColors[role] || roleColors['Usuario'];
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header com ações */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Usuários
          </h2>
          <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400 rounded-full">
            Admin
          </span>
        </div>

        <div className="flex gap-3">
          {/* Busca */}
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuários..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botão Atualizar */}
          <button
            onClick={refreshData}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            aria-label="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Botão Novo Usuário */}
          {isAdmin && (
            <button
              onClick={handleNovoUsuario}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Usuário</span>
            </button>
          )}
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="flex-1 overflow-auto bg-white dark:bg-[#1e1e1e] rounded-lg shadow">
        {loading && !usuarios.length ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              Carregando usuários...
            </div>
          </div>
        ) : usuariosOrdenados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-center">
              {busca 
                ? 'Nenhum usuário encontrado com os critérios de busca'
                : 'Nenhum usuário cadastrado ainda'}
            </p>
            {isAdmin && !busca && (
              <button
                onClick={handleNovoUsuario}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar primeiro usuário
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleOrdenar('id')}
                    className="flex items-center gap-1 font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ID
                    {ordenacao.campo === 'id' && (
                      ordenacao.direcao === 'asc' ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleOrdenar('username')}
                    className="flex items-center gap-1 font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Usuário
                    {ordenacao.campo === 'username' && (
                      ordenacao.direcao === 'asc' ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Perfil
                  </span>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Setor
                  </span>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleOrdenar('created_at')}
                    className="flex items-center gap-1 font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Criado em
                    {ordenacao.campo === 'created_at' && (
                      ordenacao.direcao === 'asc' ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-right">
                  <span className="font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Ações
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {usuariosOrdenados.map((usuario) => (
                <tr
                  key={usuario.id}
                  className="hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    #{usuario.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {usuario.nome}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getRoleColor(getUserRole(usuario))}`}>
                      {getUserRole(usuario)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {getSetorNome(usuario.setor_id)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(usuario.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Visualizar sempre disponível */}
                      <button
                        onClick={() => handleVisualizarUsuario(usuario)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        aria-label="Visualizar usuário"
                      >
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>

                      {/* Editar - apenas admin */}
                      {isAdmin && (
                        <button
                          onClick={() => handleEditarUsuario(usuario)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          aria-label="Editar usuário"
                        >
                          <Edit className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        </button>
                      )}

                      {/* Reset senha - apenas admin */}
                      {isAdmin && (
                        <button
                          onClick={() => setResetPasswordFor(usuario)}
                          className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                          aria-label="Resetar senha"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                      )}

                      {/* Excluir - apenas admin e não pode excluir a si mesmo */}
                      {isAdmin && usuario.id !== Number(user?.id) && (
                        confirmDelete === usuario.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleExcluirUsuario(usuario.id)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-xs rounded transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleExcluirUsuario(usuario.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            aria-label="Excluir usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer com informações */}
      <div className="mt-4 flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
        <div>
          Total: {usuariosOrdenados.length} usuário(s)
        </div>
        {busca && (
          <div>
            Exibindo resultados para: "{busca}"
          </div>
        )}
      </div>

      {/* Modal de Usuário */}
      <UsuarioModal
        isOpen={modalMode !== null}
        onClose={() => {
          setModalMode(null);
          setUsuarioEditando(null);
        }}
        mode={modalMode}
        usuario={usuarioEditando}
      />

      {/* Modal de Reset de Senha */}
      {resetPasswordFor && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setResetPasswordFor(null);
              setNovaSenha('');
              setConfirmarSenha('');
              setSenhaError('');
            }}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Resetar Senha - {resetPasswordFor.username}
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={novaSenha}
                    onChange={(e) => {
                      setNovaSenha(e.target.value);
                      setSenhaError('');
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirmar Senha
                  </label>
                  <input
                    type="password"
                    value={confirmarSenha}
                    onChange={(e) => {
                      setConfirmarSenha(e.target.value);
                      setSenhaError('');
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100"
                    placeholder="Digite a senha novamente"
                  />
                </div>

                {senhaError && (
                  <div className="mb-4 text-red-500 text-sm">{senhaError}</div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setResetPasswordFor(null);
                      setNovaSenha('');
                      setConfirmarSenha('');
                      setSenhaError('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#2a2a2a] border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-[#333333]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleResetPassword}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-lg flex items-center gap-2"
                  >
                    <Key className="w-4 h-4" />
                    Resetar Senha
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosTab;
