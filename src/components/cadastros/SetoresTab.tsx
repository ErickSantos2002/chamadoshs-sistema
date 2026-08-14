import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useCadastros } from '../../context/CadastrosContext';
import { Colchetes } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import SetorModal from './SetorModal';
import { IconeAlerta, IconeBusca, IconeDesfazer, IconeEditar, IconeEnergia, IconeMais, IconeOlho, IconeRecarregar, IconeSeta, IconeSetaCima, IconeSetor } from '../ui/icones';
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
  // `updateSetor` não vem daqui: quem salva a edição é o `SetorModal`.
  const { setores, desativarSetor, reativarSetor, refreshData, loading, error } =
    useCadastros();
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

  const podeEditar = ['Administrador', 'Tecnico'].includes(user?.role || '');
  const podeExcluir = ['Administrador', 'Tecnico'].includes(user?.role || '');

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
      await reativarSetor(setor.id);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao reativar setor');
    }
  };

  const handleDesativarSetor = async (id: number) => {
    if (!confirmDelete) {
      setConfirmDelete(id);
      return;
    }

    try {
      await desativarSetor(id);
      setConfirmDelete(null);
    } catch (err: any) {
      // A API recusa desativar setor que ainda tem usuários ativos e diz
      // QUANTOS são. Sem repassar essa mensagem, a pessoa fica sem saber o
      // que precisa fazer antes de tentar de novo.
      toast.error(err.response?.data?.detail || 'Erro ao desativar setor');
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
          <IconeSetor className="w-6 h-6 text-sucesso-forte dark:text-sucesso-suave" />
          <h2 className="text-xl font-semibold text-conteudo">
            Setores
          </h2>
        </div>

        <div className="flex gap-3">
          {/* Busca */}
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <IconeBusca className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-conteudo-tenue" />
            <input
              type="text"
              placeholder="Buscar setores..."
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
            <IconeRecarregar className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Botão Novo Setor */}
          {podeEditar && (
            <button
              onClick={handleNovoSetor}
              className="px-4 py-2 bg-sucesso hover:bg-sucesso-forte text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <IconeMais className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Setor</span>
            </button>
          )}
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="mb-4 p-4 bg-perigo/10 border border-perigo/30 rounded-lg flex items-start gap-3">
          <IconeAlerta className="w-5 h-5 text-perigo-forte dark:text-perigo-suave mt-0.5" />
          <div className="flex-1">
            <p className="text-perigo-forte dark:text-perigo-suave">{error}</p>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="relative min-h-0 flex-1 overflow-auto border border-borda bg-superficie">
        <Colchetes />
        {loading && !setores.length ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-conteudo-tenue">
              <IconeRecarregar className="w-8 h-8 animate-spin mx-auto mb-2" />
              Carregando setores...
            </div>
          </div>
        ) : setoresOrdenados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <IconeSetor className="w-12 h-12 text-conteudo-tenue mb-4" />
            <p className="text-conteudo-tenue text-center">
              {busca 
                ? 'Nenhum setor encontrado com os critérios de busca'
                : 'Nenhum setor cadastrado ainda'}
            </p>
            {podeEditar && !busca && (
              <button
                onClick={handleNovoSetor}
                className="mt-4 px-4 py-2 bg-sucesso hover:bg-sucesso-forte text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <IconeMais className="w-4 h-4" />
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
                        <IconeSetaCima className="w-4 h-4" /> : 
                        <IconeSeta className="w-4 h-4" />
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
                        <IconeSetaCima className="w-4 h-4" /> : 
                        <IconeSeta className="w-4 h-4" />
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
                        <IconeSetaCima className="w-4 h-4" /> : 
                        <IconeSeta className="w-4 h-4" />
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
                      <IconeSetor className="w-4 h-4 text-conteudo-tenue" />
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
                        <IconeOlho className="w-4 h-4 text-info-forte dark:text-info-suave" />
                      </button>

                      {/* Editar - apenas para admin/gerente */}
                      {podeEditar && (
                        <button
                          onClick={() => handleEditarSetor(setor)}
                          className="p-2 text-info-forte dark:text-info-suave hover:bg-info/10 rounded-lg transition-colors"
                          aria-label="Editar setor"
                        >
                          <IconeEditar className="w-4 h-4 text-alerta-forte dark:text-alerta-suave" />
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
                            <IconeDesfazer className="w-4 h-4" />
                          </button>
                        ) : confirmDelete === setor.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDesativarSetor(setor.id)}
                              className="px-2 py-1 bg-alerta-forte hover:brightness-110 text-white text-xs transition-colors"
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
                          // Ícone de ligar/desligar, não lixeira: aqui a ação
                          // desativa, e o botão ao lado reverte. A lixeira
                          // continua em Categorias, onde o DELETE apaga de
                          // verdade — assim o ícone informa a diferença. Âmbar
                          // em vez de vermelho pelo mesmo motivo: vermelho
                          // promete irreversível.
                          <button
                            onClick={() => handleDesativarSetor(setor.id)}
                            className="p-2 text-alerta-forte dark:text-alerta-suave hover:bg-alerta/10 transition-colors"
                            aria-label={`Desativar ${setor.nome}`}
                            title="Desativar"
                          >
                            <IconeEnergia className="w-4 h-4" />
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
