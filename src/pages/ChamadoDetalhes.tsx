import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { usuariosService } from '../services/chamadoshsapi';
import { getRoleName } from '../utils/roleMapper';
import {
  Chamado,
  Comentario,
  Historico,
  StatusEnum,
  PrioridadeEnum,
  ChamadoUpdate,
  Usuario,
} from '../types/api';
import { ArrowLeft, Edit, Save, X, Loader2 } from 'lucide-react';

const ChamadoDetalhes: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    tecnicos,
    buscarChamado,
    atualizarChamado,
    carregarComentarios,
    criarComentario,
    carregarHistorico,
    carregarTecnicos,
  } = useChamados();

  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [usuarios, setUsuarios] = useState<Record<number, Usuario>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para edição
  const [modoEdicao, setModoEdicao] = useState(false);
  const [novoComentario, setNovoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  // Dados de edição
  const [statusEditado, setStatusEditado] = useState<StatusEnum>(StatusEnum.ABERTO);
  const [prioridadeEditada, setPrioridadeEditada] = useState<PrioridadeEnum>(PrioridadeEnum.MEDIA);
  const [tecnicoEditado, setTecnicoEditado] = useState<number | undefined>();
  const [solucaoEditada, setSolucaoEditada] = useState('');
  const [observacoesEditadas, setObservacoesEditadas] = useState('');

  // Permissões
  const isAdmin = user?.role === 'Administrador';
  const isTecnico = user?.role === 'Tecnico';
  const isUsuario = user?.role === 'Usuario';
  const podeEditar = isAdmin || isTecnico;

  useEffect(() => {
    if (id) {
      carregarDados();
    }
  }, [id]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);

      const chamadoId = parseInt(id!);

      // Buscar chamado do contexto/API
      const chamadoData = await buscarChamado(chamadoId);

      if (!chamadoData) {
        setError('Chamado não encontrado');
        setLoading(false);
        return;
      }

      // Carregar comentários e histórico em paralelo
      const [comentariosData, historicoData] = await Promise.all([
        carregarComentarios(chamadoId),
        carregarHistorico(chamadoId),
      ]);

      setChamado(chamadoData);
      setComentarios(comentariosData);
      setHistorico(historicoData);

      // Inicializar estados de edição
      setStatusEditado(chamadoData.status);
      setPrioridadeEditada(chamadoData.prioridade);
      setTecnicoEditado(chamadoData.tecnico_responsavel_id);
      setSolucaoEditada(chamadoData.solucao || '');
      setObservacoesEditadas(chamadoData.observacoes || '');

      // Carregar técnicos se for admin ou técnico
      if (podeEditar) {
        await carregarTecnicos();
      }

      // Carregar dados dos usuários envolvidos (solicitante, comentários, histórico)
      const usuarioIds = new Set<number>();
      usuarioIds.add(chamadoData.solicitante_id);
      if (chamadoData.tecnico_responsavel_id) usuarioIds.add(chamadoData.tecnico_responsavel_id);
      comentariosData.forEach((c) => usuarioIds.add(c.usuario_id));
      historicoData.forEach((h) => usuarioIds.add(h.usuario_id));

      // Buscar usuários em paralelo
      const usuariosPromises = Array.from(usuarioIds).map(async (userId) => {
        try {
          const usuario = await usuariosService.buscar(userId);
          return { id: userId, usuario };
        } catch {
          return { id: userId, usuario: null };
        }
      });

      const usuariosResult = await Promise.all(usuariosPromises);
      const usuariosMap: Record<number, Usuario> = {};
      usuariosResult.forEach(({ id, usuario }) => {
        if (usuario) usuariosMap[id] = usuario;
      });

      setUsuarios(usuariosMap);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados do chamado.');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarEdicao = async () => {
    if (!chamado || !user) return;

    try {
      setLoading(true);

      const dadosAtualizacao: ChamadoUpdate = {
        status: statusEditado,
        prioridade: prioridadeEditada,
        tecnico_responsavel_id: tecnicoEditado,
        solucao: solucaoEditada || undefined,
        observacoes: observacoesEditadas || undefined,
      };

      await atualizarChamado(chamado.id, dadosAtualizacao, user.id);

      setModoEdicao(false);
      await carregarDados();
    } catch (err: any) {
      console.error('Erro ao atualizar chamado:', err);
      setError('Erro ao atualizar chamado.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarComentario = async () => {
    if (!novoComentario.trim() || !chamado || !user) return;

    try {
      setEnviandoComentario(true);

      await criarComentario({
        chamado_id: chamado.id,
        usuario_id: user.id,
        comentario: novoComentario,
        is_interno: false,
      });

      setNovoComentario('');
      await carregarDados();
    } catch (err: any) {
      console.error('Erro ao enviar comentário:', err);
      alert('Erro ao enviar comentário.');
    } finally {
      setEnviandoComentario(false);
    }
  };

  const getStatusColor = (status: StatusEnum) => {
    switch (status) {
      case StatusEnum.ABERTO:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case StatusEnum.EM_ANDAMENTO:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case StatusEnum.AGUARDANDO:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case StatusEnum.RESOLVIDO:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case StatusEnum.FECHADO:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getPrioridadeColor = (prioridade: PrioridadeEnum) => {
    switch (prioridade) {
      case PrioridadeEnum.BAIXA:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case PrioridadeEnum.MEDIA:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case PrioridadeEnum.ALTA:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case PrioridadeEnum.CRITICA:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Função para obter a cor do badge da role
  const getRoleBadgeColor = (roleId: number) => {
    switch (roleId) {
      case 1: // Administrador
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400';
      case 2: // Técnico
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400';
      case 3: // Usuário
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400';
    }
  };

  if (loading && !chamado) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando chamado...</p>
        </div>
      </div>
    );
  }

  if (error || !chamado) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                      text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
          {error || 'Chamado não encontrado'}
        </div>
        <button
          onClick={() => navigate('/chamados')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Voltar para Chamados
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-100 dark:bg-[#121212] transition-colors">
      <div className="p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md transition-colors">
          <div className="px-6 py-4">
            <button
              onClick={() => navigate('/chamados')}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-2 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-[#facc15] tracking-tight">
                  Chamado #{chamado.protocolo}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">{chamado.titulo}</p>
              </div>

              {podeEditar && (
                <div className="flex gap-2">
                  {!modoEdicao ? (
                    <button
                      onClick={() => setModoEdicao(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                               text-white font-medium rounded-lg shadow-sm hover:shadow-md
                               transition-all duration-200 flex items-center gap-2"
                    >
                      <Edit className="w-5 h-5" />
                      Editar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setModoEdicao(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700
                                 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2a2a]
                                 transition-colors flex items-center gap-2"
                      >
                        <X className="w-5 h-5" />
                        Cancelar
                      </button>
                      <button
                        onClick={handleSalvarEdicao}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium
                                 rounded-lg shadow-sm hover:shadow-md transition-all duration-200
                                 flex items-center gap-2"
                      >
                        <Save className="w-5 h-5" />
                        Salvar
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informações do Chamado */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            {modoEdicao ? (
              <select
                value={statusEditado}
                onChange={(e) => setStatusEditado(e.target.value as StatusEnum)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                         text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                         focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {Object.values(StatusEnum).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusColor(
                  chamado.status
                )}`}
              >
                {chamado.status}
              </span>
            )}
          </div>

          {/* Prioridade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prioridade
            </label>
            {modoEdicao ? (
              <select
                value={prioridadeEditada}
                onChange={(e) => setPrioridadeEditada(e.target.value as PrioridadeEnum)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                         text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                         focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {Object.values(PrioridadeEnum).map((prioridade) => (
                  <option key={prioridade} value={prioridade}>
                    {prioridade}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getPrioridadeColor(
                  chamado.prioridade
                )}`}
              >
                {chamado.prioridade}
              </span>
            )}
          </div>

          {/* Técnico Responsável */}
          {podeEditar && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Técnico Responsável
              </label>
              {modoEdicao ? (
                <select
                  value={tecnicoEditado || ''}
                  onChange={(e) => setTecnicoEditado(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600
                           rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-[#2d2d2d]
                           dark:text-white"
                >
                  <option value="">Sem atribuição</option>
                  {tecnicos.map((tecnico) => (
                    <option key={tecnico.id} value={tecnico.id}>
                      {tecnico.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-900 dark:text-white">
                  {chamado.tecnico_responsavel_id
                    ? tecnicos.find((t) => t.id === chamado.tecnico_responsavel_id)?.nome || 'Não encontrado'
                    : 'Sem atribuição'}
                </p>
              )}
            </div>
          )}

          {/* Data de Abertura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data de Abertura
            </label>
            <p className="text-gray-900 dark:text-white">{formatarData(chamado.data_abertura)}</p>
          </div>
        </div>

        {/* Descrição */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Descrição
          </label>
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{chamado.descricao}</p>
        </div>

        {/* Solução */}
        {(modoEdicao || chamado.solucao) && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Solução
            </label>
            {modoEdicao ? (
              <textarea
                value={solucaoEditada}
                onChange={(e) => setSolucaoEditada(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                         text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                         focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Descreva a solução aplicada..."
              />
            ) : (
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                {chamado.solucao || 'Sem solução registrada'}
              </p>
            )}
          </div>
        )}

        {/* Observações */}
        {(modoEdicao || chamado.observacoes) && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Observações
            </label>
            {modoEdicao ? (
              <textarea
                value={observacoesEditadas}
                onChange={(e) => setObservacoesEditadas(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                         text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                         focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Observações adicionais..."
              />
            ) : (
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                {chamado.observacoes || 'Sem observações'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Comentários */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Comentários</h2>

        {/* Formulário de novo comentário */}
        <div className="mb-6">
          <textarea
            value={novoComentario}
            onChange={(e) => setNovoComentario(e.target.value)}
            rows={3}
            placeholder="Adicione um comentário..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600
                     rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-[#2d2d2d]
                     dark:text-white"
          />
          <button
            onClick={handleEnviarComentario}
            disabled={!novoComentario.trim() || enviandoComentario}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {enviandoComentario ? 'Enviando...' : 'Enviar Comentário'}
          </button>
        </div>

        {/* Lista de comentários */}
        <div className="space-y-4">
          {comentarios.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              Nenhum comentário ainda.
            </p>
          ) : (
            comentarios.map((comentario) => {
              const usuario = usuarios[comentario.usuario_id];
              return (
                <div
                  key={comentario.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {usuario?.nome || `Usuário #${comentario.usuario_id}`}
                      </span>
                      {usuario && (
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                            usuario.role_id
                          )}`}
                        >
                          {getRoleName(usuario.role_id)}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatarData(comentario.created_at)}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {comentario.comentario}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Histórico */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Histórico</h2>

        <div className="space-y-3">
          {historico.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              Nenhum histórico registrado.
            </p>
          ) : (
            historico.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 border-l-2 border-blue-500 pl-4 py-2"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{item.acao}</p>
                  {item.descricao && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.descricao}</p>
                  )}
                  {item.status_anterior && item.status_novo && (
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {item.status_anterior} → {item.status_novo}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatarData(item.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default ChamadoDetalhes;
