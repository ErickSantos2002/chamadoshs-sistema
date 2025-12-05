import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { usuariosService, categoriasService, chamadosService } from '../services/chamadoshsapi';
import { getRoleName } from '../utils/roleMapper';
import {
  Chamado,
  Comentario,
  Historico,
  StatusEnum,
  PrioridadeEnum,
  UrgenciaEnum,
  ChamadoUpdate,
  Usuario,
  Categoria,
} from '../types/api';
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Loader2,
  CheckCircle,
  Clock,
  PlayCircle,
  XCircle,
  RotateCcw,
  User,
  Star,
  Ban,
  Archive,
  ArchiveRestore,
} from 'lucide-react';

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
  const [categoriaNome, setCategoriaNome] = useState<string>('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para edição
  const [modoEdicao, setModoEdicao] = useState(false);
  const [novoComentario, setNovoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  // Dados de edição
  const [descricaoEditada, setDescricaoEditada] = useState('');
  const [categoriaEditada, setCategoriaEditada] = useState<
    number | undefined
  >();
  const [statusEditado, setStatusEditado] = useState<StatusEnum>(
    StatusEnum.ABERTO,
  );
  const [prioridadeEditada, setPrioridadeEditada] = useState<PrioridadeEnum>(
    PrioridadeEnum.MEDIA,
  );
  const [tecnicoEditado, setTecnicoEditado] = useState<number | undefined>();
  const [solucaoEditada, setSolucaoEditada] = useState('');

  // Estados para modal de resolução
  const [mostrarModalResolucao, setMostrarModalResolucao] = useState(false);
  const [statusAlvo, setStatusAlvo] = useState<StatusEnum>(
    StatusEnum.RESOLVIDO,
  );
  const [solucaoModal, setSolucaoModal] = useState('');

  // Estados para modais de cancelar e arquivar
  const [mostrarModalCancelar, setMostrarModalCancelar] = useState(false);
  const [mostrarModalArquivar, setMostrarModalArquivar] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  // Estados para avaliação
  const [avaliacao, setAvaliacao] = useState<number | null>(null);
  const [hoverAvaliacao, setHoverAvaliacao] = useState<number | null>(null);
  const [salvandoAvaliacao, setSalvandoAvaliacao] = useState(false);

  // Permissões
  const isAdmin = user?.role === 'Administrador';
  const isTecnico = user?.role === 'Tecnico';
  const isUsuario = user?.role === 'Usuario';
  const podeEditar = isAdmin || isTecnico;
  const isSolicitante = chamado?.solicitante_id === user?.id;
  const podeAvaliar =
    isSolicitante &&
    (chamado?.status === StatusEnum.RESOLVIDO ||
      chamado?.status === StatusEnum.FECHADO);

  useEffect(() => {
    if (id) {
      carregarDados();
    }
  }, [id]);

  const carregarDados = async (forcarAPI = false) => {
    try {
      setLoading(true);
      setError(null);

      const chamadoId = parseInt(id!);

      // Se forçar, buscar diretamente da API, senão buscar do contexto/cache
      let chamadoData;
      if (forcarAPI) {
        const { default: api } = await import('../services/api');
        const response = await api.get(`/chamados/${chamadoId}`);
        chamadoData = response.data;
      } else {
        chamadoData = await buscarChamado(chamadoId);
      }

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
      setAvaliacao(chamadoData.avaliacao || null);

      // Buscar nome da categoria se existir
      if (chamadoData.categoria_id) {
        try {
          const categoria = await categoriasService.buscar(
            chamadoData.categoria_id,
          );
          setCategoriaNome(categoria.nome);
        } catch (err) {
          console.error('Erro ao buscar categoria:', err);
          setCategoriaNome('Não especificada');
        }
      } else {
        setCategoriaNome('Não especificada');
      }

      // Inicializar estados de edição
      setDescricaoEditada(chamadoData.descricao);
      setCategoriaEditada(chamadoData.categoria_id);
      setStatusEditado(chamadoData.status);
      setPrioridadeEditada(chamadoData.prioridade);
      setTecnicoEditado(chamadoData.tecnico_responsavel_id);
      setSolucaoEditada(chamadoData.solucao || '');

      // Carregar técnicos e categorias se for admin ou técnico
      if (podeEditar) {
        const [tecnicosData, categoriasData] = await Promise.all([
          carregarTecnicos(),
          categoriasService.listar(true), // apenas categorias ativas
        ]);
        setCategorias(categoriasData);
      }

      // Carregar dados dos usuários envolvidos (solicitante, comentários, histórico)
      const usuarioIds = new Set<number>();
      usuarioIds.add(chamadoData.solicitante_id);
      if (chamadoData.tecnico_responsavel_id)
        usuarioIds.add(chamadoData.tecnico_responsavel_id);
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
        categoria_id: categoriaEditada,
        status: statusEditado,
        prioridade: prioridadeEditada,
        tecnico_responsavel_id: tecnicoEditado,
        solucao: solucaoEditada || undefined,
      };

      await atualizarChamado(chamado.id, dadosAtualizacao, user.id);

      setModoEdicao(false);
      await carregarDados(true); // Forçar busca da API
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
      await carregarDados(true); // Forçar busca da API
    } catch (err: any) {
      console.error('Erro ao enviar comentário:', err);
      alert('Erro ao enviar comentário.');
    } finally {
      setEnviandoComentario(false);
    }
  };

  // Função para salvar avaliação
  const handleSalvarAvaliacao = async (nota: number) => {
    if (!chamado || !user) return;

    try {
      setSalvandoAvaliacao(true);

      const dadosAtualizacao: ChamadoUpdate = {
        avaliacao: nota,
      };

      await atualizarChamado(chamado.id, dadosAtualizacao, user.id);
      setAvaliacao(nota);

      // Não precisa recarregar tudo, já atualizamos o estado local
    } catch (err: any) {
      console.error('Erro ao salvar avaliação:', err);
      alert('Erro ao salvar avaliação.');
    } finally {
      setSalvandoAvaliacao(false);
    }
  };

  // Função para mudança rápida de status
  const handleMudancaRapidaStatus = async (novoStatus: StatusEnum) => {
    // Se for resolver ou fechar, abrir modal para solicitar solução
    if (
      novoStatus === StatusEnum.RESOLVIDO ||
      novoStatus === StatusEnum.FECHADO
    ) {
      setStatusAlvo(novoStatus);
      setSolucaoModal(chamado?.solucao || '');
      setMostrarModalResolucao(true);
      return;
    }

    // Para outros status, fazer mudança direta
    if (!chamado || !user) return;

    try {
      setLoading(true);

      const dadosAtualizacao: ChamadoUpdate = {
        status: novoStatus,
      };

      await atualizarChamado(chamado.id, dadosAtualizacao, user.id);
      await carregarDados(true); // Forçar busca da API
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      setError('Erro ao atualizar status.');
    } finally {
      setLoading(false);
    }
  };

  // Função para confirmar resolução/fechamento com solução
  const handleConfirmarResolucao = async () => {
    if (!solucaoModal.trim()) {
      alert('Por favor, descreva a solução aplicada.');
      return;
    }

    if (!chamado || !user) return;

    try {
      setLoading(true);

      const dadosAtualizacao: ChamadoUpdate = {
        status: statusAlvo,
        solucao: solucaoModal,
      };

      await atualizarChamado(chamado.id, dadosAtualizacao, user.id);
      setMostrarModalResolucao(false);
      setSolucaoModal('');
      await carregarDados(true); // Forçar busca da API
    } catch (err: any) {
      console.error('Erro ao atualizar chamado:', err);
      setError('Erro ao atualizar chamado.');
    } finally {
      setLoading(false);
    }
  };

  // Função para cancelar chamado
  const handleCancelarChamado = async () => {
    if (!chamado || !user) return;

    if (!motivoCancelamento.trim()) {
      alert('Por favor, descreva o motivo do cancelamento.');
      return;
    }

    try {
      setProcessando(true);

      // Primeiro cancela o chamado
      await chamadosService.cancelar(chamado.id, user.id);

      // Depois atualiza com o motivo (solução)
      await atualizarChamado(chamado.id, { solucao: motivoCancelamento }, user.id);

      setMostrarModalCancelar(false);
      setMotivoCancelamento('');

      // Redireciona para a página de chamados
      navigate('/chamados', { replace: true });
    } catch (err: any) {
      console.error('Erro ao cancelar chamado:', err);
      alert('Erro ao cancelar chamado.');
    } finally {
      setProcessando(false);
    }
  };

  // Função para arquivar chamado
  const handleArquivarChamado = async () => {
    if (!chamado || !user) return;

    try {
      setProcessando(true);

      if (chamado.arquivado) {
        // Desarquivar
        await chamadosService.desarquivar(chamado.id, user.id);
      } else {
        // Arquivar
        await chamadosService.arquivar(chamado.id, user.id);
      }

      setMostrarModalArquivar(false);

      // Redireciona para a página de chamados
      navigate('/chamados', { replace: true });
    } catch (err: any) {
      console.error('Erro ao arquivar/desarquivar chamado:', err);
      alert('Erro ao processar solicitação.');
    } finally {
      setProcessando(false);
    }
  };

  // Função para obter os botões de ação baseados no status atual
  const getBotoesAcao = () => {
    if (!podeEditar || !chamado) return null;

    const botoesComuns = [];

    switch (chamado.status) {

      /* ================== ABERTO ================== */
      case StatusEnum.ABERTO:
        botoesComuns.push(
          <button
            key="iniciar"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.EM_ANDAMENTO)}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium
                      rounded-lg shadow-sm hover:shadow-md transition-all duration-200
                      flex items-center gap-2"
          >
            <PlayCircle className="w-5 h-5" />
            Iniciar Atendimento
          </button>
        );
        break;

      /* ================== EM ANDAMENTO ================== */
      case StatusEnum.EM_ANDAMENTO:
        botoesComuns.push(
          <button
            key="aguardando"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.AGUARDANDO)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium
                      rounded-lg shadow-sm hover:shadow-md transition-all duration-200
                      flex items-center gap-2"
          >
            <Clock className="w-5 h-5" />
            Aguardando Retorno
          </button>,

          <button
            key="resolver"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.RESOLVIDO)}
            className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium
                      rounded-lg shadow-sm hover:shadow-md transition-all duration-200
                      flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Marcar como Resolvido
          </button>
        );
        break;

      /* ================== AGUARDANDO ================== */
      case StatusEnum.AGUARDANDO:
        botoesComuns.push(
          <button
            key="retomar"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.EM_ANDAMENTO)}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium
                      rounded-lg shadow-sm hover:shadow-md transition-all duration-200
                      flex items-center gap-2"
          >
            <PlayCircle className="w-5 h-5" />
            Retomar Atendimento
          </button>,

          <button
            key="resolver"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.RESOLVIDO)}
            className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium
                      rounded-lg shadow-sm hover:shadow-md transition-all duration-200
                      flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Marcar como Resolvido
          </button>
        );
        break;

      /* ================== RESOLVIDO ================== */
      case StatusEnum.RESOLVIDO:
        botoesComuns.push(
          <button
            key="reabrir"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.EM_ANDAMENTO)}
            className="px-4 py-2 bg-[#DB2777] hover:bg-[#BE185D] text-white font-medium
                      rounded-lg shadow-sm hover:shadow-md transition-all duration-200
                      flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Reabrir
          </button>
        );
        break;

      /* ================== FECHADO (unificado com Resolvido visualmente) ================== */
      case StatusEnum.FECHADO:
        botoesComuns.push(
          <button
            key="reabrir"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.EM_ANDAMENTO)}
            className="px-4 py-2 bg-[#DB2777] hover:bg-[#BE185D] text-white font-medium
                      rounded-lg shadow-sm hover:shadow-md transition-all duration-200
                      flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Reabrir
          </button>
        );
        break;
    }

    return botoesComuns;
  };


  const getStatusColor = (status: StatusEnum) => {
    switch (status) {
      case StatusEnum.ABERTO:
        return 'bg-[#2563EB]/20 text-[#2563EB] dark:bg-[#2563EB]/25 dark:text-[#93C5FD]'; // Azul

      case StatusEnum.EM_ANDAMENTO:
        return 'bg-[#7C3AED]/20 text-[#7C3AED] dark:bg-[#7C3AED]/25 dark:text-[#C4B5FD]'; // Roxo

      case StatusEnum.AGUARDANDO:
        return 'bg-amber-200 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'; // Amber

      case StatusEnum.RESOLVIDO:
        return 'bg-green-200 text-green-700 dark:bg-green-900/30 dark:text-green-300'; // Verde

      case StatusEnum.FECHADO:
        return 'bg-green-200 text-green-700 dark:bg-green-900/30 dark:text-green-300'; // Unificado com Resolvido

      default:
        return 'bg-gray-300 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300';
    }
  };

  // Função para exibir o status (Fechado vira Resolvido visualmente)
  const getStatusDisplay = (status: StatusEnum): string => {
    return status === StatusEnum.FECHADO ? 'Resolvido' : status;
  };


  const getPrioridadeColor = (prioridade: PrioridadeEnum) => {
    switch (prioridade) {
      case PrioridadeEnum.BAIXA:
        return 'bg-green-200 text-green-700 dark:bg-green-900/30 dark:text-green-300';

      case PrioridadeEnum.MEDIA:
        return 'bg-[#06B6D4]/20 text-[#06B6D4] dark:bg-[#06B6D4]/25 dark:text-[#67E8F9]'; // Ciano

      case PrioridadeEnum.ALTA:
        return 'bg-[#DB2777]/20 text-[#DB2777] dark:bg-[#DB2777]/25 dark:text-[#F9A8D4]'; // Rosa

      case PrioridadeEnum.CRITICA:
        return 'bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-300'; // Vermelho

      default:
        return 'bg-gray-300 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300';
    }
  };


  const getUrgenciaColor = (urgencia: UrgenciaEnum) => {
    switch (urgencia) {
      case UrgenciaEnum.NAO_URGENTE:
        return 'bg-green-200 text-green-700 dark:bg-green-900/30 dark:text-green-300';

      case UrgenciaEnum.NORMAL:
        return 'bg-[#06B6D4]/20 text-[#06B6D4] dark:bg-[#06B6D4]/25 dark:text-[#67E8F9]';

      case UrgenciaEnum.URGENTE:
        return 'bg-[#DB2777]/20 text-[#DB2777] dark:bg-[#DB2777]/25 dark:text-[#F9A8D4]';

      case UrgenciaEnum.MUITO_URGENTE:
        return 'bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-300';

      default:
        return 'bg-gray-300 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300';
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

  // Função para limpar valores de enum (remove prefixos como "StatusEnum.", "PrioridadeEnum.", etc.)
  const limparValorEnum = (valor: string | null | undefined): string => {
    if (!valor) return '';

    // Remove prefixos de enum (StatusEnum., PrioridadeEnum., UrgenciaEnum., etc.)
    const semPrefixo = valor.replace(/^(Status|Prioridade|Urgencia)Enum\./, '');

    return semPrefixo;
  };

  // Função para obter a cor do badge da role
  const getRoleBadgeColor = (roleId: number) => {
    switch (roleId) {
      case 1: // Admin
        return 'bg-[#7C3AED]/20 text-[#7C3AED] dark:bg-[#7C3AED]/25 dark:text-[#C4B5FD]';

      case 2: // Técnico
        return 'bg-[#2563EB]/20 text-[#2563EB] dark:bg-[#2563EB]/25 dark:text-[#93C5FD]';

      case 3: // Usuário
        return 'bg-[#A78BFA]/20 text-[#A78BFA] dark:bg-[#A78BFA]/25 dark:text-[#DDD6FE]';

      default:
        return 'bg-gray-300 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300';
    }
  };


  if (loading && !chamado) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#7C3AED] mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Carregando chamado...
          </p>
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
          className="mt-4 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg"
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
            {/* Botão Voltar */}
            <button
              onClick={() => navigate('/chamados')}
              className="text-[#7C3AED] hover:text-[#6D28D9]
                        dark:text-[#A78BFA] dark:hover:text-[#C4B5FD]
                        mb-2 flex items-center gap-1 transition-colors"
              >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>

            <div className="flex justify-between items-start">
              {/* Título e subtítulo */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-[#A78BFA] tracking-tight">
                  Chamado #{chamado.protocolo}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  {chamado.titulo}
                </p>
              </div>

              {/* Botões de ação (editar / salvar / cancelar / arquivar) */}
              {podeEditar && (
                <div className="flex gap-2">
                  {!modoEdicao ? (
                    <>
                      {/* Botão Cancelar Chamado */}
                      {!chamado?.cancelado && (
                        <button
                          onClick={() => setMostrarModalCancelar(true)}
                          className="px-4 py-2 border border-red-300 dark:border-red-600
                                    text-red-700 dark:text-red-400 rounded-lg
                                    hover:bg-red-50 dark:hover:bg-red-900/20
                                    transition-colors flex items-center gap-2"
                        >
                          <Ban className="w-5 h-5" />
                          Cancelar Chamado
                        </button>
                      )}

                      {/* Botão Arquivar/Desarquivar */}
                      <button
                        onClick={() => setMostrarModalArquivar(true)}
                        className={`px-4 py-2 border rounded-lg
                                  transition-colors flex items-center gap-2 ${
                                    chamado?.arquivado
                                      ? 'border-green-300 dark:border-green-600 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                                      : 'border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                  }`}
                      >
                        {chamado?.arquivado ? (
                          <>
                            <ArchiveRestore className="w-5 h-5" />
                            Desarquivar
                          </>
                        ) : (
                          <>
                            <Archive className="w-5 h-5" />
                            Arquivar
                          </>
                        )}
                      </button>

                      {/* Botão Editar */}
                      <button
                        onClick={() => setModoEdicao(true)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600
                                  text-gray-700 dark:text-gray-300 rounded-lg
                                  hover:bg-gray-50 dark:hover:bg-[#2a2a2a]
                                  transition-colors flex items-center gap-2"
                      >
                        <Edit className="w-5 h-5" />
                        Editar Detalhes
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Botão Cancelar Edição */}
                      <button
                        onClick={() => setModoEdicao(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600
                                  text-gray-700 dark:text-gray-300 rounded-lg
                                  hover:bg-gray-50 dark:hover:bg-[#2a2a2a]
                                  transition-colors flex items-center gap-2"
                      >
                        <X className="w-5 h-5" />
                        Cancelar
                      </button>

                      {/* Botão Salvar */}
                      <button
                        onClick={handleSalvarEdicao}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700
                                  text-white font-medium rounded-lg shadow-sm
                                  hover:shadow-md transition-all duration-200 flex items-center gap-2"
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

        {/* Botões de Ação Rápida */}
        {podeEditar && !modoEdicao && (
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-4 transition-colors">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Ações Rápidas:
              </span>
              {getBotoesAcao()}
            </div>
          </div>
        )}

        {/* Informações do Chamado */}
        <div
          className="bg-white/95 dark:bg-[#1e1e1e]/95 
        border border-gray-200 dark:border-[#2d2d2d]
        rounded-xl shadow-md p-6 transition-colors"
        >
          {/* TÍTULO DA SEÇÃO */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-[#A78BFA] mb-6">
            Informações do Chamado
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {/* ========================== COLUNA ESQUERDA ========================== */}
            <div className="space-y-6">
              {/* Solicitante */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-[#7C3AED] mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Solicitante
                </label>

                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-gray-900 dark:text-white font-medium">
                    {usuarios[chamado.solicitante_id]?.nome ||
                      `Usuário #${chamado.solicitante_id}`}
                  </p>

                  {usuarios[chamado.solicitante_id] && (
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full 
                    ${getRoleBadgeColor(usuarios[chamado.solicitante_id].role_id)}`}
                    >
                      {getRoleName(usuarios[chamado.solicitante_id].role_id)}
                    </span>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-[#7C3AED] mb-1">
                  Status
                </label>

                {modoEdicao ? (
                  <select
                    value={statusEditado}
                    onChange={(e) =>
                      setStatusEditado(e.target.value as StatusEnum)
                    }
                    className="w-full px-3 py-2 border rounded-lg 
                    bg-white dark:bg-[#2a2a2a]
                    text-gray-800 dark:text-gray-200
                    border-gray-300 dark:border-gray-600
                    focus:outline-none focus:ring-2 
                    focus:ring-[#7C3AED] transition-colors"
                  >
                    {Object.values(StatusEnum)
                      .filter((status) => status !== StatusEnum.FECHADO) // Remove Fechado do dropdown
                      .map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                  </select>
                ) : (
                  <span
                    className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full
                  ${getStatusColor(chamado.status)}`}
                  >
                    {getStatusDisplay(chamado.status)}
                  </span>
                )}
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-[#7C3AED] mb-1">
                  Categoria
                </label>

                {modoEdicao ? (
                  <select
                    value={categoriaEditada || ''}
                    onChange={(e) =>
                      setCategoriaEditada(
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    className="w-full px-3 py-2 border rounded-lg 
                    bg-white dark:bg-[#2a2a2a]
                    text-gray-800 dark:text-gray-200
                    border-gray-300 dark:border-gray-600
                    focus:outline-none focus:ring-2 
                    focus:ring-[#7C3AED] transition-colors"
                  >
                    <option value="">Sem categoria</option>

                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {categoriaNome}
                  </p>
                )}
              </div>

              {/* Data Abertura */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-[#7C3AED] mb-1">
                  Data de Abertura
                </label>

                <p className="text-gray-900 dark:text-white">
                  {formatarData(chamado.data_abertura)}
                </p>
              </div>
            </div>

            {/* ========================== COLUNA DIREITA ========================== */}
            <div className="space-y-6">
              {/* Técnico Responsável */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-[#7C3AED] mb-1">
                  Técnico Responsável
                </label>

                {modoEdicao ? (
                  <select
                    value={tecnicoEditado || ''}
                    onChange={(e) =>
                      setTecnicoEditado(
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    className="w-full px-3 py-2 border rounded-lg
                    border-gray-300 dark:border-gray-600
                    dark:bg-[#2d2d2d] dark:text-white
                    focus:ring-2 focus:ring-[#7C3AED]"
                  >
                    <option value="">Sem atribuição</option>

                    {tecnicos.map((tecnico) => (
                      <option key={tecnico.id} value={tecnico.id}>
                        {tecnico.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {chamado.tecnico_responsavel_id ? (
                      <>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {tecnicos.find(
                            (t) => t.id === chamado.tecnico_responsavel_id,
                          )?.nome || 'Não encontrado'}
                        </p>

                        {usuarios[chamado.tecnico_responsavel_id] && (
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full 
                          ${getRoleBadgeColor(usuarios[chamado.tecnico_responsavel_id].role_id)}`}
                          >
                            {getRoleName(
                              usuarios[chamado.tecnico_responsavel_id].role_id,
                            )}
                          </span>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-900 dark:text-white">
                        Sem atribuição
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-[#7C3AED] mb-1">
                  Prioridade
                </label>

                {modoEdicao ? (
                  <select
                    value={prioridadeEditada}
                    onChange={(e) =>
                      setPrioridadeEditada(e.target.value as PrioridadeEnum)
                    }
                    className="w-full px-3 py-2 border rounded-lg 
                    bg-white dark:bg-[#2a2a2a]
                    text-gray-800 dark:text-gray-200
                    border-gray-300 dark:border-gray-600
                    focus:outline-none focus:ring-2 
                    focus:ring-[#DB2777] transition-colors"
                  >
                    {Object.values(PrioridadeEnum).map((prioridade) => (
                      <option key={prioridade} value={prioridade}>
                        {prioridade}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full 
                  ${getPrioridadeColor(chamado.prioridade)}`}
                  >
                    {chamado.prioridade}
                  </span>
                )}
              </div>

              {/* Protocolo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-[#7C3AED] mb-1">
                  Protocolo
                </label>

                <p className="text-gray-900 dark:text-white font-mono">
                  #{chamado.protocolo}
                </p>
              </div>

              {/* Última Atualização */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-[#7C3AED] mb-1">
                  Última Atualização
                </label>

                <p className="text-gray-900 dark:text-white">
                  {chamado.updated_at
                    ? formatarData(chamado.updated_at)
                    : 'Não atualizado'}
                </p>
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="mt-6">
            <label className="block text-base font-bold text-gray-900 dark:text-[#7C3AED] mb-3">
              Descrição
              {modoEdicao && (
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  (não editável - preserva o relato original do solicitante)
                </span>
              )}
            </label>

            {modoEdicao ? (
              <textarea
                value={chamado.descricao}
                disabled
                rows={4}
                className="w-full px-3 py-2 border rounded-lg
                        bg-gray-100 dark:bg-[#1e1e1e]
                        text-gray-600 dark:text-gray-400
                        border-gray-300 dark:border-gray-600
                        cursor-not-allowed opacity-75"
                placeholder="Descrição do chamado..."
              />
            ) : (
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap break-words overflow-wrap-anywhere">
                {chamado.descricao}
              </p>
            )}
          </div>

          {/* Solução */}
          {(modoEdicao || chamado.solucao) && (
            <div className="mt-6">
              <label className="block text-base font-bold text-gray-900 dark:text-[#7C3AED] mb-3">
                Solução
              </label>

              {modoEdicao ? (
                <textarea
                  value={solucaoEditada}
                  onChange={(e) => setSolucaoEditada(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg 
                          bg-white dark:bg-[#2a2a2a]
                          text-gray-800 dark:text-gray-200
                          border-gray-300 dark:border-gray-600
                          focus:outline-none focus:ring-2 
                          focus:ring-[#7C3AED] transition-colors"
                  placeholder="Descreva a solução aplicada..."
                />
              ) : (
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap break-words overflow-wrap-anywhere">
                  {chamado.solucao || 'Sem solução registrada'}
                </p>
              )}
            </div>
          )}

          {/* Avaliação */}
          {(chamado.status === StatusEnum.RESOLVIDO ||
            chamado.status === StatusEnum.FECHADO) && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-bold text-gray-900 dark:text-[#7C3AED] mb-3">
                Avaliação do Atendimento
              </label>

              {podeAvaliar ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((nota) => (
                      <button
                        key={nota}
                        onClick={() => handleSalvarAvaliacao(nota)}
                        onMouseEnter={() => setHoverAvaliacao(nota)}
                        onMouseLeave={() => setHoverAvaliacao(null)}
                        disabled={salvandoAvaliacao}
                        className="transition-all duration-200 hover:scale-110 
                                disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            (
                              hoverAvaliacao !== null
                                ? nota <= hoverAvaliacao
                                : nota <= (avaliacao || 0)
                            )
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      </button>
                    ))}

                    {avaliacao && (
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        {avaliacao} de 5 estrelas
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {avaliacao
                      ? 'Clique nas estrelas para alterar sua avaliação'
                      : 'Clique nas estrelas para avaliar o atendimento (opcional)'}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {avaliacao ? (
                    <>
                      {[1, 2, 3, 4, 5].map((nota) => (
                        <Star
                          key={nota}
                          className={`w-6 h-6 ${
                            nota <= avaliacao
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        {avaliacao} de 5 estrelas
                      </span>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Aguardando avaliação do solicitante
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comentários */}
        <div
          className="bg-white/95 dark:bg-[#1e1e1e]/95 
        border border-gray-200 dark:border-[#2d2d2d] 
        rounded-xl shadow-md p-6 transition-colors"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-[#7C3AED] mb-4">
            Comentários {comentarios.length > 0 && `(${comentarios.length})`}
          </h2>

          {/* Formulário de novo comentário */}
          <div className="mb-6">
            <textarea
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              rows={3}
              placeholder="Adicione um comentário..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600
                      rounded-lg focus:ring-2 focus:ring-[#7C3AED]
                      dark:bg-[#2d2d2d] dark:text-white transition-colors"
            />

            <button
              onClick={handleEnviarComentario}
              disabled={!novoComentario.trim() || enviandoComentario}
              className="mt-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9]
                      text-white rounded-lg
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors"
            >
              {enviandoComentario ? 'Enviando...' : 'Enviar Comentário'}
            </button>
          </div>

          {/* Lista de comentários com scroll */}
          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
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
                    className="border border-gray-200 dark:border-gray-700 
                            rounded-lg p-4 bg-white/80 dark:bg-[#1e1e1e]/80"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {usuario?.nome || `Usuário #${comentario.usuario_id}`}
                        </span>

                        {usuario && (
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full 
                          ${getRoleBadgeColor(usuario.role_id)}`}
                          >
                            {getRoleName(usuario.role_id)}
                          </span>
                        )}
                      </div>

                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatarData(comentario.created_at)}
                      </span>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                      {comentario.comentario}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Histórico */}
        <div
          className="bg-white/95 dark:bg-[#1e1e1e]/95 
        border border-gray-200 dark:border-[#2d2d2d] 
        rounded-xl shadow-md p-6 transition-colors"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-[#7C3AED] mb-4">
            Histórico {historico.length > 0 && `(${historico.length})`}
          </h2>

          {/* Lista de histórico com scroll */}
          <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3">
            {historico.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Nenhum histórico registrado.
              </p>
            ) : (
              historico.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 border-l-2 
                          border-[#7C3AED] pl-4 py-2"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.acao}
                    </p>

                    {item.descricao && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.descricao}
                      </p>
                    )}

                    {item.status_anterior && item.status_novo && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {limparValorEnum(item.status_anterior)} →{' '}
                        {limparValorEnum(item.status_novo)}
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

      {/* Modal de Resolução/Fechamento */}
      {mostrarModalResolucao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">

              {/* Título e Fechar */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-[#7C3AED]">
                    {statusAlvo === StatusEnum.RESOLVIDO
                      ? "Resolver Chamado"
                      : "Fechar Chamado"}
                  </h2>

                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Descreva a solução aplicada para este chamado
                  </p>
                </div>

                <button
                  onClick={() => {
                    setMostrarModalResolucao(false);
                    setSolucaoModal("");
                  }}
                  className="text-gray-500 hover:text-gray-700
                            dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Conteúdo */}
              <div className="space-y-4">

                {/* Campo de Solução */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 dark:text-[#7C3AED] mb-2">
                    Solução <span className="text-red-500">*</span>
                  </label>

                  <textarea
                    value={solucaoModal}
                    onChange={(e) => setSolucaoModal(e.target.value)}
                    rows={6}
                    placeholder="Descreva detalhadamente a solução aplicada..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700
                              rounded-lg focus:ring-2 focus:ring-[#7C3AED]
                              bg-white dark:bg-[#2a2a2a]
                              text-gray-800 dark:text-gray-200 resize-none"
                  />

                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Campo obrigatório — descreva o que foi feito para resolver o problema
                  </p>
                </div>

                {/* Botões */}
                <div className="flex justify-end gap-3 pt-4">

                  <button
                    onClick={() => {
                      setMostrarModalResolucao(false);
                      setSolucaoModal("");
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600
                              text-gray-700 dark:text-gray-300
                              rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2a2a]
                              transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleConfirmarResolucao}
                    disabled={!solucaoModal.trim()}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700
                              disabled:bg-gray-400 disabled:cursor-not-allowed
                              text-white font-medium rounded-lg shadow-sm
                              hover:shadow-md transition-all duration-200
                              flex items-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {statusAlvo === StatusEnum.RESOLVIDO
                      ? "Marcar como Resolvido"
                      : "Fechar Chamado"}
                  </button>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelar Chamado */}
      {mostrarModalCancelar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-[#7C3AED]">
                    Cancelar Chamado
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Descreva o motivo do cancelamento deste chamado
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMostrarModalCancelar(false);
                    setMotivoCancelamento('');
                  }}
                  className="text-gray-500 hover:text-gray-700
                            dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  Esta ação irá marcar o chamado como cancelado. O chamado não será excluído, mas não aparecerá mais na listagem padrão.
                </p>
              </div>

              {/* Campo de Motivo */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-900 dark:text-[#7C3AED] mb-2">
                  Motivo do Cancelamento <span className="text-red-500">*</span>
                </label>

                <textarea
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  rows={6}
                  placeholder="Descreva o motivo pelo qual este chamado está sendo cancelado..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700
                            rounded-lg focus:ring-2 focus:ring-red-500
                            bg-white dark:bg-[#2a2a2a]
                            text-gray-800 dark:text-gray-200 resize-none"
                />

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Campo obrigatório — explique por que o chamado foi cancelado
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setMostrarModalCancelar(false);
                    setMotivoCancelamento('');
                  }}
                  disabled={processando}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600
                            text-gray-700 dark:text-gray-300 rounded-lg
                            hover:bg-gray-50 dark:hover:bg-[#2a2a2a]
                            transition-colors disabled:opacity-50"
                >
                  Não, voltar
                </button>
                <button
                  onClick={handleCancelarChamado}
                  disabled={processando || !motivoCancelamento.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700
                            disabled:bg-gray-400 disabled:cursor-not-allowed
                            text-white font-medium rounded-lg shadow-sm
                            hover:shadow-md transition-all duration-200
                            flex items-center gap-2"
                >
                  <Ban className="w-5 h-5" />
                  {processando ? 'Cancelando...' : 'Sim, cancelar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Arquivar/Desarquivar Chamado */}
      {mostrarModalArquivar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-[#7C3AED]">
                    {chamado?.arquivado ? 'Desarquivar Chamado' : 'Arquivar Chamado'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {chamado?.arquivado
                      ? 'Este chamado voltará a aparecer na listagem padrão.'
                      : 'Este chamado será ocultado da listagem padrão.'}
                  </p>
                </div>
                <button
                  onClick={() => setMostrarModalArquivar(false)}
                  className="text-gray-500 hover:text-gray-700
                            dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className={`${chamado?.arquivado ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'} border rounded-lg p-4 mb-4`}>
                <p className={`text-sm ${chamado?.arquivado ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}`}>
                  {chamado?.arquivado
                    ? 'O chamado será restaurado e voltará a aparecer na listagem principal.'
                    : 'O chamado não será excluído, apenas ocultado da visualização padrão. Você poderá visualizá-lo novamente usando os filtros.'}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setMostrarModalArquivar(false)}
                  disabled={processando}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600
                            text-gray-700 dark:text-gray-300 rounded-lg
                            hover:bg-gray-50 dark:hover:bg-[#2a2a2a]
                            transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleArquivarChamado}
                  disabled={processando}
                  className={`px-4 py-2 font-medium rounded-lg shadow-sm
                            hover:shadow-md transition-all duration-200
                            flex items-center gap-2 disabled:opacity-50 text-white ${
                              chamado?.arquivado
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-amber-600 hover:bg-amber-700'
                            }`}
                >
                  {chamado?.arquivado ? (
                    <>
                      <ArchiveRestore className="w-5 h-5" />
                      {processando ? 'Desarquivando...' : 'Sim, desarquivar'}
                    </>
                  ) : (
                    <>
                      <Archive className="w-5 h-5" />
                      {processando ? 'Arquivando...' : 'Sim, arquivar'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChamadoDetalhes;
