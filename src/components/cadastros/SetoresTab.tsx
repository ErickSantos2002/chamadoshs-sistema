import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  RefreshCw,
  Building,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useCadastros } from '../../context/CadastrosContext';
import { useAuth } from '../../hooks/useAuth';
import SetorModal from './SetorModal';
import type {
  Setor,
  ModalMode,
  OrdenacaoCampo,
  OrdenacaoDirecao,
} from '../../types/cadastros.types';

// ========================================
// COMPONENTE SETORES TAB
// ========================================

const SetoresTab: React.FC = () => {
  const { setores, deleteSetor, updateSetor, refreshData, loading, error } = useCadastros();
  const { user } = useAuth();

  // ========================================
  // ESTADOS LOCAIS
  // ========================================

  const [busca, setBusca] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [setorEditando, setSetorEditando] = useState<Setor | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [ordenacao, setOrdenacao] = useState<{
    campo: OrdenacaoCampo;
    direcao: OrdenacaoDirecao;
  }>({ campo: 'id', direcao: 'asc' });

  // ========================================
  // VERIFICAÇÃO DE PERMISSÕES
  // ========================================

  const podeEditar = ['Administrador', 'Gerente', 'Tecnico'].includes(user?.role || '');
  const podeExcluir = ['Administrador', 'Gerente', 'Tecnico'].includes(user?.role || '');

  // ========================================
  // FILTRAGEM E ORDENAÇÃO
  // ========================================

  const setoresFiltrados = useMemo(() => {
    if (!busca) return setores;

    const termo = busca.toLowerCase();
    return setores.filter(
      (s) =>
        s.nome.toLowerCase().includes(termo) ||
        s.descricao?.toLowerCase().includes(termo)
    );
  }, [setores, busca]);

  const setoresOrdenados = useMemo(() => {
    return [...setoresFiltrados].sort((a, b) => {
      let aVal = a[ordenacao.campo as keyof Setor];
      let bVal = b[ordenacao.campo as keyof Setor];

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
  }, [setoresFiltrados, ordenacao]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleOrdenar = (campo: OrdenacaoCampo) => {
    setOrdenacao((prev) => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleNovoSetor = () => {
    setSetorEditando(null);
    setModalMode('create');
  };

  const handleEditarSetor = (setor: Setor) => {
    setSetorEditando(setor);
    setModalMode('edit');
  };

  const handleVisualizarSetor = (setor: Setor) => {
    setSetorEditando(setor);
    setModalMode('view');
  };

  const handleReativarSetor = async (setor: Setor) => {
    try {
      await updateSetor(setor.id, { nome: setor.nome, descricao: setor.descricao, ativo: true });
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao reativar setor');
    }
  };

  const handleExcluirSetor = async (id: number) => {
    if (!confirmDelete) {
      setConfirmDelete(id);
      return;
    }

    try {
      await deleteSetor(id);
      setConfirmDelete(null);
    } catch (err: any) {
      // Erro já tratado no context
      alert(err.response?.data?.detail || 'Erro ao excluir setor');
    }
    setConfirmDelete(null);
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header com ações */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-3">
          <Building className="w-6 h-6 text-sucesso-forte dark:text-sucesso-suave" />
          <h2 className="text-xl font-semibold text-conteudo">
            Setores
          </h2>
        </div>

        <div className="flex gap-3">
          {/* Busca */}
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-conteudo-tenue" />
            <input
              type="text"
              placeholder="Buscar setores..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-borda rounded-lg bg-superficie text-conteudo placeholder:text-conteudo-tenue focus:outline-none focus:ring-2 focus:ring-info"
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

          {/* Botão Novo Setor */}
          {podeEditar && (
            <button
              onClick={handleNovoSetor}
              className="px-4 py-2 bg-sucesso hover:bg-sucesso-forte dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Setor</span>
            </button>
          )}
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="mb-4 p-4 bg-perigo/10 border border-perigo/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-perigo-forte dark:text-perigo-suave mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="flex-1 overflow-auto bg-superficie rounded-lg shadow">
        {loading && !setores.length ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-conteudo-tenue">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              Carregando setores...
            </div>
          </div>
        ) : setoresOrdenados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Building className="w-12 h-12 text-conteudo-tenue mb-4" />
            <p className="text-conteudo-tenue text-center">
              {busca 
                ? 'Nenhum setor encontrado com os critérios de busca'
                : 'Nenhum setor cadastrado ainda'}
            </p>
            {podeEditar && !busca && (
              <button
                onClick={handleNovoSetor}
                className="mt-4 px-4 py-2 bg-sucesso hover:bg-sucesso-forte dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar primeiro setor
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
                    Nome
                    {ordenacao.campo === 'nome' && (
                      ordenacao.direcao === 'asc' ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="font-medium text-xs uppercase tracking-wider text-conteudo-tenue">
                    Descrição
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
              {setoresOrdenados.map((setor) => (
                <tr
                  key={setor.id}
                  className={`hover:bg-superficie-elevada transition-colors ${
                    setor.ativo ? '' : 'opacity-60'
                  }`}
                >
                  <td className="px-6 py-4 text-sm text-conteudo">
                    #{setor.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-conteudo-tenue" />
                      <span className="text-sm font-medium text-conteudo">
                        {setor.nome}
                      </span>
                      {/* Setor também é desativado, não apagado: usuários
                          apontam para ele e apagar quebraria a referência. */}
                      {!setor.ativo && (
                        <span className="inline-flex rounded-full bg-superficie-elevada px-2 py-0.5 text-[11px] font-medium text-conteudo-tenue">
                          Inativo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-conteudo-suave">
                    {setor.descricao || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-conteudo-suave">
                    {formatDate(setor.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Visualizar sempre disponível */}
                      <button
                        onClick={() => handleVisualizarSetor(setor)}
                        className="p-2 text-conteudo-suave hover:bg-superficie-elevada rounded-lg transition-colors"
                        aria-label="Visualizar setor"
                      >
                        <Eye className="w-4 h-4 text-info-forte dark:text-info-suave" />
                      </button>

                      {/* Editar - apenas para admin/gerente */}
                      {podeEditar && (
                        <button
                          onClick={() => handleEditarSetor(setor)}
                          className="p-2 text-info-forte dark:text-info-suave hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          aria-label="Editar setor"
                        >
                          <Edit className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        </button>
                      )}

                      {/* Desativar ou reativar. O rótulo diz o que a API faz:
                          o setor some das escolhas, mas continua existindo para
                          os usuários que já apontam para ele. */}
                      {podeExcluir && (
                        !setor.ativo ? (
                          <button
                            onClick={() => handleReativarSetor(setor)}
                            className="p-2 text-sucesso-forte dark:text-sucesso-suave hover:bg-sucesso/10 rounded-lg transition-colors"
                            aria-label={`Reativar ${setor.nome}`}
                            title="Reativar"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : confirmDelete === setor.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleExcluirSetor(setor.id)}
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
                            onClick={() => handleExcluirSetor(setor.id)}
                            className="p-2 text-perigo-forte dark:text-perigo-suave hover:bg-perigo/10 rounded-lg transition-colors"
                            aria-label={`Desativar ${setor.nome}`}
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
          Total: {setoresOrdenados.length} setor(es)
        </div>
        {busca && (
          <div>
            Exibindo resultados para: "{busca}"
          </div>
        )}
      </div>

      {/* Modal de Setor */}
      <SetorModal
        isOpen={modalMode !== null}
        onClose={() => {
          setModalMode(null);
          setSetorEditando(null);
        }}
        mode={modalMode}
        setor={setorEditando}
      />
    </div>
  );
};

export default SetoresTab;
