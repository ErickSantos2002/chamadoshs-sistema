import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useCadastros } from '../../context/CadastrosContext';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input } from '../ui';
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
    <div className="flex h-full flex-col gap-5 p-6">
      {/* Header com ações */}
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <IconeSetor className="h-6 w-6 text-sucesso-forte dark:text-sucesso-suave" />
          <h2 className="text-sm font-semibold text-conteudo">
            Setores
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Busca */}
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Buscar setores..."
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

          {/* Botão Novo Setor */}
          {podeEditar && (
            <Button onClick={handleNovoSetor}>
              <IconeMais className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Setor</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="flex shrink-0 items-start gap-2 rounded-lg border border-perigo/30 bg-perigo/10 px-4 py-3 text-sm text-perigo-forte dark:text-perigo-suave">
          <IconeAlerta className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="relative min-h-0 flex-1 overflow-auto rounded-xl border border-borda bg-superficie">
        {loading && !setores.length ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-sm text-conteudo-tenue">
              <IconeRecarregar className="mx-auto mb-2 h-8 w-8 animate-spin" />
              Carregando setores...
            </div>
          </div>
        ) : setoresOrdenados.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8">
            <IconeSetor className="mb-4 h-12 w-12 text-conteudo-tenue" />
            <p className="text-center text-sm text-conteudo-tenue">
              {busca
                ? 'Nenhum setor encontrado com os critérios de busca'
                : 'Nenhum setor cadastrado ainda'}
            </p>
            {podeEditar && !busca && (
              <Button className="mt-4" onClick={handleNovoSetor}>
                <IconeMais className="h-4 w-4" />
                Criar primeiro setor
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-borda">
                <th className="px-4 py-3 text-left text-xs font-medium text-conteudo-suave">
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
                <th className="px-4 py-3 text-left text-xs font-medium text-conteudo-suave">
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
                <th className="px-4 py-3 text-left text-xs font-medium text-conteudo-suave">
                  Descrição
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-conteudo-suave">
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
                <th className="px-4 py-3 text-right text-xs font-medium text-conteudo-suave">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {setoresOrdenados.map((setor) => (
                <tr
                  key={setor.id}
                  className={`border-b border-borda-suave transition-colors hover:bg-superficie-elevada ${
                    setor.ativo ? '' : 'opacity-60'
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-conteudo">
                    #{setor.id}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <IconeSetor className="h-4 w-4 text-conteudo-tenue" />
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
                  <td className="px-4 py-3 text-sm text-conteudo-suave">
                    {setor.descricao || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-conteudo-suave">
                    {formatDate(setor.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-1">
                      {/* Visualizar sempre disponível */}
                      <button
                        onClick={() => handleVisualizarSetor(setor)}
                        className="rounded-lg p-2 text-conteudo-suave transition-colors hover:bg-superficie-elevada"
                        aria-label="Visualizar setor"
                      >
                        <IconeOlho className="h-4 w-4 text-info-forte dark:text-info-suave" />
                      </button>

                      {/* Editar - apenas para admin/gerente */}
                      {podeEditar && (
                        <button
                          onClick={() => handleEditarSetor(setor)}
                          className="rounded-lg p-2 text-info-forte transition-colors hover:bg-info/10 dark:text-info-suave"
                          aria-label="Editar setor"
                        >
                          <IconeEditar className="h-4 w-4 text-alerta-forte dark:text-alerta-suave" />
                        </button>
                      )}

                      {/* Desativar ou reativar. O rótulo diz o que a API faz:
                          o setor some das escolhas, mas continua existindo para
                          os usuários que já apontam para ele. */}
                      {podeExcluir && (
                        !setor.ativo ? (
                          <button
                            onClick={() => handleReativarSetor(setor)}
                            className="rounded-lg p-2 text-sucesso-forte transition-colors hover:bg-sucesso/10 dark:text-sucesso-suave"
                            aria-label={`Reativar ${setor.nome}`}
                            title="Reativar"
                          >
                            <IconeDesfazer className="h-4 w-4" />
                          </button>
                        ) : confirmDelete === setor.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDesativarSetor(setor.id)}
                              className="rounded-lg bg-alerta-forte px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:brightness-110"
                            >
                              Desativar
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="rounded-lg border border-borda bg-superficie-elevada px-3 py-1.5 text-xs font-semibold text-conteudo transition-colors hover:bg-borda"
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
                            className="rounded-lg p-2 text-alerta-forte transition-colors hover:bg-alerta/10 dark:text-alerta-suave"
                            aria-label={`Desativar ${setor.nome}`}
                            title="Desativar"
                          >
                            <IconeEnergia className="h-4 w-4" />
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
      <div className="flex shrink-0 items-center justify-between text-sm text-conteudo-tenue">
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
