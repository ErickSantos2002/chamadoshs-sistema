import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useCadastros } from '../../context/CadastrosContext';
import { useAuth } from '../../hooks/useAuth';
import {
  Aviso,
  Badge,
  BlocoCarregando,
  BotaoDeAcao,
  Button,
  Input,
  Tabela,
  TabelaCabecalho,
  TabelaCelula,
  TabelaCelulaDeCabecalho,
  TabelaCorpo,
  TabelaLinha,
} from '../ui';
import SetorModal from './SetorModal';
import { IconeBusca, IconeDesfazer, IconeEditar, IconeEnergia, IconeMais, IconeOlho, IconeRecarregar, IconeSetor } from '../ui/icones';
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
    if (confirmDelete !== id) {
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
          <IconeSetor className="h-6 w-6 text-on-tint-success" />
          <h2 className="text-sm font-semibold text-conteudo">
            Setores
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Busca */}
          <div className="w-full sm:w-64">
            {/* `aria-label` porque o campo nao tem rotulo visivel e o
                placeholder some no primeiro caractere. `type="search"` porque
                e busca. O icone e decoracao e nao pode ser lido junto do
                nome — o mesmo tratamento que o template ja tinha. */}
            <Input
              type="search"
              aria-label="Buscar setores"
              placeholder="Buscar setores..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              icone={<IconeBusca className="h-4 w-4" aria-hidden="true" />}
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
        <Aviso variante="perigo" className="shrink-0">{error}</Aviso>
      )}

      {/* Tabela */}
      <div className="relative min-h-0 flex-1 overflow-auto rounded-xl border border-borda bg-superficie">
        {loading && !setores.length ? (
          <BlocoCarregando className="h-full" tamanho="lg">
            Carregando setores...
          </BlocoCarregando>
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
          <Tabela>
            <TabelaCabecalho>
              <tr>
                <TabelaCelulaDeCabecalho
                  aoOrdenar={() => handleOrdenar('id')}
                  ordenadaPor={ordenacao.campo === 'id' ? ordenacao.direcao : null}
                >
                  ID
                </TabelaCelulaDeCabecalho>
                <TabelaCelulaDeCabecalho
                  aoOrdenar={() => handleOrdenar('nome')}
                  ordenadaPor={ordenacao.campo === 'nome' ? ordenacao.direcao : null}
                >
                  Nome
                </TabelaCelulaDeCabecalho>
                <TabelaCelulaDeCabecalho>Descrição</TabelaCelulaDeCabecalho>
                <TabelaCelulaDeCabecalho
                  aoOrdenar={() => handleOrdenar('created_at')}
                  ordenadaPor={
                    ordenacao.campo === 'created_at' ? ordenacao.direcao : null
                  }
                >
                  Criado em
                </TabelaCelulaDeCabecalho>
                <TabelaCelulaDeCabecalho aDireita>Ações</TabelaCelulaDeCabecalho>
              </tr>
            </TabelaCabecalho>
            <TabelaCorpo>
              {setoresOrdenados.map((setor) => (
                <TabelaLinha
                  key={setor.id}
                  className={setor.ativo ? undefined : 'opacity-60'}
                >
                  <TabelaCelula>#{setor.id}</TabelaCelula>
                  <TabelaCelula>
                    <div className="flex items-center gap-2">
                      <IconeSetor className="h-4 w-4 text-conteudo-tenue" />
                      <span className="text-sm font-medium text-conteudo">
                        {setor.nome}
                      </span>
                      {/* Setor também é desativado, não apagado: usuários
                          apontam para ele e apagar quebraria a referência. */}
                      {!setor.ativo && <Badge variante="discreto">Inativo</Badge>}
                    </div>
                  </TabelaCelula>
                  <TabelaCelula tenue>{setor.descricao || '-'}</TabelaCelula>
                  <TabelaCelula tenue>{formatDate(setor.created_at)}</TabelaCelula>
                  <TabelaCelula className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Visualizar sempre disponível. Tom neutro: ler não
                          altera nada, e não precisa da cor de quem altera. */}
                      <BotaoDeAcao
                        titulo="Visualizar"
                        descricao={`Visualizar ${setor.nome}`}
                        onClick={() => handleVisualizarSetor(setor)}
                      >
                        <IconeOlho className="h-4 w-4" />
                      </BotaoDeAcao>

                      {/* Editar - apenas para admin/gerente */}
                      {podeEditar && (
                        <BotaoDeAcao
                          tom="info"
                          titulo="Editar"
                          descricao={`Editar ${setor.nome}`}
                          onClick={() => handleEditarSetor(setor)}
                        >
                          <IconeEditar className="h-4 w-4" />
                        </BotaoDeAcao>
                      )}

                      {/* Desativar ou reativar. O rótulo diz o que a API faz:
                          o setor some das escolhas, mas continua existindo para
                          os usuários que já apontam para ele. */}
                      {podeExcluir && (
                        !setor.ativo ? (
                          <BotaoDeAcao
                            tom="sucesso"
                            titulo="Reativar"
                            descricao={`Reativar ${setor.nome}`}
                            onClick={() => handleReativarSetor(setor)}
                          >
                            <IconeDesfazer className="h-4 w-4" />
                          </BotaoDeAcao>
                        ) : confirmDelete === setor.id ? (
                          // ESTE PAR CONTINUA ESCRITO A MAO, e nao e
                          // esquecimento — e a falta de uma variante.
                          //
                          // O `Button` tem primario, secundario, sucesso,
                          // perigo e fantasma; o `Button.jsx` do pacote tem o
                          // mesmo conjunto. Nao ha variante de ALERTA, e aqui
                          // a acao pede ambar de proposito: ela desativa, o
                          // botao ao lado reverte, e vermelho prometeria
                          // irreversivel — que e o que a lixeira de Categorias
                          // significa e esta nao.
                          //
                          // Inventar `variante="alerta"` seria criar API que o
                          // pacote nao tem, o que a secao 30 proibe. Migrar so
                          // o "Cancelar" deixaria dois botoes irmaos com pesos
                          // de fonte diferentes, um ao lado do outro.
                          //
                          // O contraste esta certo: `--alerta-forte` e
                          // warning-700, e branco sobre ele da 5,02:1. A
                          // catraca nao o acusa.
                          //
                          // Levantado ao operador como candidato a emenda do
                          // pacote — e o mesmo formato da E7: um degrau que
                          // falta, com uso real.
                          <div className="flex items-center gap-2">
                            <Button variante="secundario"
                              onClick={() => handleDesativarSetor(setor.id)}>
                              Desativar
                            </Button>
                            <Button
                              variante="secundario"
                              tamanho="sm"
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          // Ícone de ligar/desligar, não lixeira: aqui a ação
                          // desativa, e o botão ao lado reverte. A lixeira
                          // continua em Categorias, onde o DELETE apaga de
                          // verdade — assim o ícone informa a diferença. Âmbar
                          // em vez de vermelho pelo mesmo motivo: vermelho
                          // promete irreversível.
                          <BotaoDeAcao
                            tom="alerta"
                            titulo="Desativar"
                            descricao={`Desativar ${setor.nome}`}
                            onClick={() => handleDesativarSetor(setor.id)}
                          >
                            <IconeEnergia className="h-4 w-4" />
                          </BotaoDeAcao>
                        )
                      )}
                    </div>
                  </TabelaCelula>
                </TabelaLinha>
              ))}
            </TabelaCorpo>
          </Tabela>
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
