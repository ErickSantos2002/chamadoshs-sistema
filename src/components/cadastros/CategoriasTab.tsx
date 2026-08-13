import React, { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  RefreshCw,
  Tag,
  ChevronUp,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { useCadastros } from '../../context/CadastrosContext';
import { Colchetes } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import CategoriaModal from './CategoriaModal';
import type {
  Categoria,
  ModalMode,
  OrdenacaoCampo,
  OrdenacaoDirecao,
} from '../../types/cadastros.types';

// ========================================
// COMPONENTE CATEGORIAS TAB
// ========================================

const CategoriasTab: React.FC = () => {
  const { categorias, deleteCategoria, refreshData, loading, error } = useCadastros();
  const { user } = useAuth();

  // ========================================
  // ESTADOS LOCAIS
  // ========================================

  const [busca, setBusca] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [ordenacao, setOrdenacao] = useState<{
    campo: OrdenacaoCampo;
    direcao: OrdenacaoDirecao;
  }>({ campo: 'id', direcao: 'asc' });

  // ========================================
  // VERIFICAÇÃO DE PERMISSÕES
  // ========================================

  const podeEditar = ['Administrador', 'Tecnico'].includes(user?.role || '');
  const podeExcluir = ['Administrador', 'Tecnico'].includes(user?.role || '');

  // ========================================
  // FILTRAGEM E ORDENAÇÃO
  // ========================================

  const categoriasFiltradas = useMemo(() => {
    if (!busca) return categorias;

    const termo = busca.toLowerCase();
    return categorias.filter(
      (c) =>
        c.nome.toLowerCase().includes(termo) ||
        c.descricao?.toLowerCase().includes(termo)
    );
  }, [categorias, busca]);

  const categoriasOrdenadas = useMemo(() => {
    return [...categoriasFiltradas].sort((a, b) => {
      let aVal = a[ordenacao.campo as keyof Categoria];
      let bVal = b[ordenacao.campo as keyof Categoria];

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
  }, [categoriasFiltradas, ordenacao]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleOrdenar = (campo: OrdenacaoCampo) => {
    setOrdenacao((prev) => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleNovaCategoria = () => {
    setCategoriaEditando(null);
    setModalMode('create');
  };

  const handleEditarCategoria = (categoria: Categoria) => {
    setCategoriaEditando(categoria);
    setModalMode('edit');
  };

  const handleVisualizarCategoria = (categoria: Categoria) => {
    setCategoriaEditando(categoria);
    setModalMode('view');
  };

  const handleExcluirCategoria = async (id: number) => {
    if (!confirmDelete) {
      setConfirmDelete(id);
      return;
    }

    try {
      await deleteCategoria(id);
      setConfirmDelete(null);
    } catch (err: any) {
      // Erro já tratado no context
      toast.error(err.response?.data?.detail || 'Erro ao excluir categoria');
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
          <Tag className="w-6 h-6 text-info-forte dark:text-info-suave" />
          <h2 className="text-xl font-semibold text-conteudo">
            Categorias
          </h2>
        </div>

        <div className="flex gap-3">
          {/* Busca */}
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-conteudo-tenue" />
            <input
              type="text"
              placeholder="Buscar categorias..."
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

          {/* Botão Nova Categoria */}
          {podeEditar && (
            <button
              onClick={handleNovaCategoria}
              className="px-4 py-2 bg-info hover:bg-info-forte text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Categoria</span>
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
      <div className="relative min-h-0 flex-1 overflow-auto border border-borda bg-superficie">
        <Colchetes />
        {loading && !categorias.length ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-conteudo-tenue">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              Carregando categorias...
            </div>
          </div>
        ) : categoriasOrdenadas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Tag className="w-12 h-12 text-conteudo-tenue mb-4" />
            <p className="text-conteudo-tenue text-center">
              {busca 
                ? 'Nenhuma categoria encontrada com os critérios de busca'
                : 'Nenhuma categoria cadastrada ainda'}
            </p>
            {podeEditar && !busca && (
              <button
                onClick={handleNovaCategoria}
                className="mt-4 px-4 py-2 bg-info hover:bg-info-forte text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar primeira categoria
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
              {categoriasOrdenadas.map((categoria) => (
                <tr
                  key={categoria.id}
                  className={`hover:bg-superficie-elevada transition-colors ${
                    categoria.ativo ? '' : 'opacity-60'
                  }`}
                >
                  <td className="px-6 py-4 text-sm text-conteudo">
                    #{categoria.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-conteudo-tenue" />
                      <span className="text-sm font-medium text-conteudo">
                        {categoria.nome}
                      </span>
                      {/* Diferente de usuário e setor, categoria é apagada de
                          verdade — mas só quando não há chamado vinculado. A
                          inativa existe e precisa ser distinguível da ativa. */}
                      {!categoria.ativo && (
                        <span className="inline-flex rounded-full bg-superficie-elevada px-2 py-0.5 text-[11px] font-medium text-conteudo-tenue">
                          Inativa
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-conteudo-suave">
                    {categoria.descricao || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-conteudo-suave">
                    {formatDate(categoria.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Visualizar sempre disponível */}
                      <button
                        onClick={() => handleVisualizarCategoria(categoria)}
                        className="p-2 text-conteudo-suave hover:bg-superficie-elevada rounded-lg transition-colors"
                        aria-label="Visualizar categoria"
                      >
                        <Eye className="w-4 h-4 text-info-forte dark:text-info-suave" />
                      </button>

                      {/* Editar - apenas para admin/gerente */}
                      {podeEditar && (
                        <button
                          onClick={() => handleEditarCategoria(categoria)}
                          className="p-2 text-info-forte dark:text-info-suave hover:bg-info/10 rounded-lg transition-colors"
                          aria-label="Editar categoria"
                        >
                          <Edit className="w-4 h-4 text-alerta-forte dark:text-alerta-suave" />
                        </button>
                      )}

                      {/* Excluir - apenas para admin/gerente */}
                      {podeExcluir && (
                        confirmDelete === categoria.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleExcluirCategoria(categoria.id)}
                              className="px-2 py-1 bg-perigo hover:bg-perigo-forte text-white text-xs rounded transition-colors"
                            >
                              Confirmar
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
                            onClick={() => handleExcluirCategoria(categoria.id)}
                            className="p-2 text-perigo-forte dark:text-perigo-suave hover:bg-perigo/10 rounded-lg transition-colors"
                            aria-label="Excluir categoria"
                            title="Excluir"
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
          Total: {categoriasOrdenadas.length} categoria(s)
        </div>
        {busca && (
          <div>
            Exibindo resultados para: "{busca}"
          </div>
        )}
      </div>

      {/* Modal de Categoria */}
      <CategoriaModal
        isOpen={modalMode !== null}
        onClose={() => {
          setModalMode(null);
          setCategoriaEditando(null);
        }}
        mode={modalMode}
        categoria={categoriaEditando}
      />
    </div>
  );
};

export default CategoriasTab;
