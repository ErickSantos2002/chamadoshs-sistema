import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
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
  RotateCcw,
} from 'lucide-react';
import { useCadastros } from '../../context/CadastrosContext';
import { Button, Colchetes, Input, Modal } from '../ui';
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

const ROTULO = 'mb-1.5 block text-sm font-medium text-conteudo-suave';

const UsuariosTab: React.FC = () => {
  const {
    usuarios,
    setores,
    desativarUsuario,
    reativarUsuario,
    updateUsuario,
    updateUsuarioPassword,
    refreshData,
    loading,
    error,
  } = useCadastros();
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

  // Criar, editar e excluir usuário exigem administrador na API. O nome antigo
  // (`isAdmin`) incluía o técnico e liberava botões que respondiam 403.
  const isAdmin = user?.role === 'Administrador';

  // ========================================
  // FILTRAGEM E ORDENAÇÃO
  // ========================================

  const usuariosFiltrados = useMemo(() => {
    if (!busca) return usuarios;

    const termo = busca.toLowerCase();
    return usuarios.filter(
      (u) =>
        u.nome.toLowerCase().includes(termo) ||
        getRoleName(u.role_id).toLowerCase().includes(termo)
    );
  }, [usuarios, busca]);

  const usuariosOrdenados = useMemo(() => {
    return [...usuariosFiltrados].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (ordenacao.campo) {
        case 'nome':
          aVal = a.nome;
          bVal = b.nome;
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

  const handleDesativarUsuario = async (id: number) => {
    if (!confirmDelete) {
      setConfirmDelete(id);
      return;
    }

    try {
      await desativarUsuario(id);
      setConfirmDelete(null);
    } catch (err: any) {
      // A API recusa desativar o último administrador, e a mensagem dela
      // explica o motivo — vale mais que um texto genérico nosso.
      toast.error(err.response?.data?.detail || 'Erro ao desativar usuário');
    }
    setConfirmDelete(null);
  };

  const handleReativarUsuario = async (usuario: Usuario) => {
    try {
      await reativarUsuario(usuario.id);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao reativar usuário');
    }
  };

  const fecharResetSenha = () => {
    setResetPasswordFor(null);
    setNovaSenha('');
    setConfirmarSenha('');
    setSenhaError('');
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
      toast.success(`Senha do usuário ${resetPasswordFor.nome} atualizada com sucesso!`);
      fecharResetSenha();
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
      'Administrador': 'bg-alerta/15 text-alerta-forte dark:text-alerta-suave',
      'Tecnico': 'bg-info/15 text-info-forte dark:text-info-suave',
      'Usuario': 'bg-superficie-elevada text-conteudo-tenue',
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
          <Users className="w-6 h-6 text-alerta-forte dark:text-alerta-suave" />
          <h2 className="text-xl font-semibold text-conteudo">
            Usuários
          </h2>
          <span className="px-2 py-1 text-xs font-semibold bg-alerta/15 text-alerta-forte dark:text-alerta-suave rounded-full">
            Admin
          </span>
        </div>

        <div className="flex gap-3">
          {/* Busca */}
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-conteudo-tenue" />
            <input
              type="text"
              placeholder="Buscar usuários..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-borda bg-superficie-base text-conteudo placeholder:text-conteudo-tenue focus:outline-none focus:border-sinal focus:ring-1 focus:ring-sinal"
            />
          </div>

          {/* Botão Atualizar */}
          <button
            onClick={refreshData}
            disabled={loading}
            className="px-4 py-2 bg-superficie-elevada text-conteudo-suave rounded-lg hover:bg-borda transition-colors flex items-center gap-2"
            aria-label="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Botão Novo Usuário */}
          {isAdmin && (
            <button
              onClick={handleNovoUsuario}
              className="px-4 py-2 bg-sinal hover:brightness-110 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Usuário</span>
            </button>
          )}
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="mb-4 p-4 bg-perigo/10 border border-perigo/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-perigo-forte dark:text-perigo-suave mt-0.5" />
          <div className="flex-1">
            <p className="text-perigo-forte dark:text-perigo-suave">{error}</p>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="relative flex-1 overflow-auto border border-borda bg-superficie">
        <Colchetes />
        {loading && !usuarios.length ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-conteudo-tenue">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              Carregando usuários...
            </div>
          </div>
        ) : usuariosOrdenados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Users className="w-12 h-12 text-conteudo-tenue mb-4" />
            <p className="text-conteudo-tenue text-center">
              {busca 
                ? 'Nenhum usuário encontrado com os critérios de busca'
                : 'Nenhum usuário cadastrado ainda'}
            </p>
            {isAdmin && !busca && (
              <button
                onClick={handleNovoUsuario}
                className="mt-4 px-4 py-2 bg-sinal hover:brightness-110 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar primeiro usuário
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-borda">
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleOrdenar('id')}
                    className="flex items-center gap-1 font-medium text-xs uppercase tracking-wider text-conteudo-tenue hover:text-conteudo"
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
                    onClick={() => handleOrdenar('nome')}
                    className="flex items-center gap-1 font-medium text-xs uppercase tracking-wider text-conteudo-tenue hover:text-conteudo"
                  >
                    Usuário
                    {ordenacao.campo === 'nome' && (
                      ordenacao.direcao === 'asc' ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="font-medium text-xs uppercase tracking-wider text-conteudo-tenue">
                    Perfil
                  </span>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="font-medium text-xs uppercase tracking-wider text-conteudo-tenue">
                    Setor
                  </span>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleOrdenar('created_at')}
                    className="flex items-center gap-1 font-medium text-xs uppercase tracking-wider text-conteudo-tenue hover:text-conteudo"
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
                  <span className="font-medium text-xs uppercase tracking-wider text-conteudo-tenue">
                    Ações
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {usuariosOrdenados.map((usuario) => (
                <tr
                  key={usuario.id}
                  className={`hover:bg-superficie-elevada transition-colors ${
                    usuario.ativo ? '' : 'opacity-60'
                  }`}
                >
                  <td className="px-6 py-4 text-sm text-conteudo">
                    #{usuario.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-conteudo-tenue" />
                      <span className="text-sm font-medium text-conteudo">
                        {usuario.nome}
                      </span>
                      {/* A API desativa em vez de apagar, para não quebrar a FK
                          dos chamados que a pessoa abriu. Sem este selo, a linha
                          volta idêntica à ativa e parece que a ação falhou. */}
                      {!usuario.ativo && (
                        <span className="inline-flex rounded-full bg-superficie-elevada px-2 py-0.5 text-[11px] font-medium text-conteudo-tenue">
                          Inativo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getRoleColor(getUserRole(usuario))}`}>
                      {getUserRole(usuario)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-conteudo-tenue" />
                      <span className="text-sm text-conteudo-suave">
                        {getSetorNome(usuario.setor_id)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-conteudo-suave">
                    {formatDate(usuario.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Visualizar sempre disponível */}
                      <button
                        onClick={() => handleVisualizarUsuario(usuario)}
                        className="p-2 text-conteudo-suave hover:bg-superficie-elevada rounded-lg transition-colors"
                        aria-label="Visualizar usuário"
                      >
                        <Eye className="w-4 h-4 text-info-forte dark:text-info-suave" />
                      </button>

                      {/* Editar - apenas admin */}
                      {isAdmin && (
                        <button
                          onClick={() => handleEditarUsuario(usuario)}
                          className="p-2 text-info-forte dark:text-info-suave hover:bg-info/10 rounded-lg transition-colors"
                          aria-label="Editar usuário"
                        >
                          <Edit className="w-4 h-4 text-alerta-forte dark:text-alerta-suave" />
                        </button>
                      )}

                      {/* Reset senha - apenas admin */}
                      {isAdmin && (
                        <button
                          onClick={() => setResetPasswordFor(usuario)}
                          className="p-2 text-alerta-forte dark:text-alerta-suave hover:bg-alerta/10 rounded-lg transition-colors"
                          aria-label="Resetar senha"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                      )}

                      {/* Desativar ou reativar — apenas admin, e não em si mesmo.
                          O rótulo diz "desativar" porque é o que a API faz: o
                          usuário perde o acesso mas o histórico dele continua
                          referenciando um registro que existe. */}
                      {isAdmin && usuario.id !== Number(user?.id) && (
                        !usuario.ativo ? (
                          <button
                            onClick={() => handleReativarUsuario(usuario)}
                            className="p-2 text-sucesso-forte dark:text-sucesso-suave hover:bg-sucesso/10 rounded-lg transition-colors"
                            aria-label={`Reativar ${usuario.nome}`}
                            title="Reativar"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : confirmDelete === usuario.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDesativarUsuario(usuario.id)}
                              className="px-2 py-1 bg-perigo hover:bg-perigo-forte text-white text-xs rounded transition-colors"
                            >
                              Desativar
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 bg-superficie-elevada hover:bg-borda text-conteudo-suave text-xs rounded transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDesativarUsuario(usuario.id)}
                            className="p-2 text-perigo-forte dark:text-perigo-suave hover:bg-perigo/10 rounded-lg transition-colors"
                            aria-label={`Desativar ${usuario.nome}`}
                            title="Desativar"
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
      <div className="mt-4 flex justify-between items-center text-sm text-conteudo-suave">
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
      <Modal
        aberto={resetPasswordFor !== null}
        aoFechar={fecharResetSenha}
        titulo="Resetar senha"
        descricao={resetPasswordFor?.nome}
        largura="sm"
      >
        <div className="space-y-4">
          {senhaError && (
            <div className="rounded-lg border border-perigo/30 bg-perigo/10 px-4 py-3 text-sm text-perigo-forte dark:text-perigo-suave">
              {senhaError}
            </div>
          )}

          <div>
            <label htmlFor="nova-senha" className={ROTULO}>
              Nova senha
            </label>
            <Input
              id="nova-senha"
              type="password"
              autoComplete="new-password"
              value={novaSenha}
              onChange={(e) => {
                setNovaSenha(e.target.value);
                setSenhaError('');
              }}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label htmlFor="confirmar-senha" className={ROTULO}>
              Confirmar senha
            </label>
            <Input
              id="confirmar-senha"
              type="password"
              autoComplete="new-password"
              value={confirmarSenha}
              onChange={(e) => {
                setConfirmarSenha(e.target.value);
                setSenhaError('');
              }}
              placeholder="Digite a senha novamente"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variante="secundario" onClick={fecharResetSenha}>
              Cancelar
            </Button>
            <Button onClick={handleResetPassword}>
              <Key className="h-4 w-4" aria-hidden="true" />
              Resetar senha
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsuariosTab;
