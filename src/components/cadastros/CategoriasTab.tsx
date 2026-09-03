import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useCadastros } from '../../context/CadastrosContext';
import { useAuth } from '../../hooks/useAuth';
import { Aviso, BlocoCarregando, BotaoDeAcao, Button, Input } from '../ui';
import CategoriaModal from './CategoriaModal';
import { IconeApagar, IconeBusca, IconeEditar, IconeEtiqueta, IconeMais, IconeOlho, IconeRecarregar, IconeSeta, IconeSetaCima } from '../ui/icones';
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
    <div className="flex h-full flex-col gap-5 p-6">
      {/* Header com ações */}
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <IconeEtiqueta className="h-6 w-6 text-on-tint-info" />
          <h2 className="text-sm font-semibold text-conteudo">
            Categorias
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Busca */}
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Buscar categorias..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              icone={<IconeBusca className="h-4 w-4" />}
            />
          </div>

          {/* Botão Atualizar */}
          <Button
            variante="secundario"
            onClick={refreshData}
            disabled={loading}
            aria-label="Atualizar dados"
          >
            <IconeRecarregar className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Botão Nova Categoria */}
          {podeEditar && (
            <Button onClick={handleNovaCategoria}>
              <IconeMais className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Categoria</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <Aviso variante="perigo" className="shrink-0">{error}</Aviso>
      )}

      {/* Tabela */}
      <div className="relative min-h-0 flex-1 overflow-auto rounded-xl border border-borda bg-superficie">
        {loading && !categorias.length ? (
          <BlocoCarregando className="h-full" tamanho="lg">
            Carregando categorias...
          </BlocoCarregando>
        ) : categoriasOrdenadas.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8">
            <IconeEtiqueta className="mb-4 h-12 w-12 text-conteudo-tenue" />
            <p className="text-center text-sm text-conteudo-tenue">
              {busca
                ? 'Nenhuma categoria encontrada com os critérios de busca'
                : 'Nenhuma categoria cadastrada ainda'}
            </p>
            {podeEditar && !busca && (
              <Button className="mt-4" onClick={handleNovaCategoria}>
                <IconeMais className="h-4 w-4" />
                Criar primeira categoria
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-borda">
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-conteudo-suave">
                  <button
                    onClick={() => handleOrdenar('id')}
                    className="flex items-center gap-1 hover:text-conteudo"
                  >
                    ID
                    {ordenacao.campo === 'id' && (
                      ordenacao.direcao === 'asc' ?
                        <IconeSetaCima className="h-4 w-4" /> :
                        <IconeSeta className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-conteudo-suave">
                  <button
                    onClick={() => handleOrdenar('nome')}
                    className="flex items-center gap-1 hover:text-conteudo"
                  >
                    Nome
                    {ordenacao.campo === 'nome' && (
                      ordenacao.direcao === 'asc' ?
                        <IconeSetaCima className="h-4 w-4" /> :
                        <IconeSeta className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-conteudo-suave">
                  Descrição
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-conteudo-suave">
                  <button
                    onClick={() => handleOrdenar('created_at')}
                    className="flex items-center gap-1 hover:text-conteudo"
                  >
                    Criado em
                    {ordenacao.campo === 'created_at' && (
                      ordenacao.direcao === 'asc' ?
                        <IconeSetaCima className="h-4 w-4" /> :
                        <IconeSeta className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-conteudo-suave">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {categoriasOrdenadas.map((categoria) => (
                <tr
                  key={categoria.id}
                  className={`border-b border-borda-suave transition-colors hover:bg-superficie-elevada ${
                    categoria.ativo ? '' : 'opacity-60'
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-conteudo">
                    #{categoria.id}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <IconeEtiqueta className="h-4 w-4 text-conteudo-tenue" />
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
                  <td className="px-4 py-3 text-sm text-conteudo-suave">
                    {categoria.descricao || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-conteudo-suave">
                    {formatDate(categoria.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-1">
                      {/* Visualizar sempre disponível. Tom neutro: ler não
                          altera nada, e não precisa da cor de quem altera. */}
                      <BotaoDeAcao
                        titulo="Visualizar"
                        descricao={`Visualizar ${categoria.nome}`}
                        onClick={() => handleVisualizarCategoria(categoria)}
                      >
                        <IconeOlho className="h-4 w-4" />
                      </BotaoDeAcao>

                      {/* Editar - apenas para admin/gerente */}
                      {podeEditar && (
                        <BotaoDeAcao
                          tom="info"
                          titulo="Editar"
                          descricao={`Editar ${categoria.nome}`}
                          onClick={() => handleEditarCategoria(categoria)}
                        >
                          <IconeEditar className="h-4 w-4" />
                        </BotaoDeAcao>
                      )}

                      {/* Excluir - apenas para admin/gerente */}
                      {podeExcluir && (
                        confirmDelete === categoria.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleExcluirCategoria(categoria.id)}
                              className="rounded-lg bg-perigo px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-perigo-forte"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="rounded-lg border border-borda bg-superficie-elevada px-3 py-1.5 text-xs font-semibold text-conteudo transition-colors hover:bg-borda"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <BotaoDeAcao
                            tom="perigo"
                            titulo="Excluir"
                            descricao={`Excluir ${categoria.nome}`}
                            onClick={() => handleExcluirCategoria(categoria.id)}
                          >
                            <IconeApagar className="h-4 w-4" />
                          </BotaoDeAcao>
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
      <div className="flex shrink-0 items-center justify-between text-sm text-conteudo-tenue">
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
