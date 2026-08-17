import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MINIMO_SOLUCAO, validarMinimo } from '../lib/validacao';
import ContadorMinimo from '../components/ContadorMinimo';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { useUsuariosPorId } from '../hooks/useUsuariosPorId';
import { categoriasService, chamadosService } from '../services/chamadoshsapi';
import { getRoleName } from '../utils/roleMapper';
import { useTheme } from '../context/ThemeContext';
import { corDaPrioridade, corDoStatus } from '../lib/graficos';
import SlaBadge from '../components/SlaBadge';
import Avaliacao from '../components/Avaliacao';
import { Seletor } from '../components/ui';
import { IconeArquivar, IconeConfereCirculo, IconeDesarquivar, IconeDesfazer, IconeEditar, IconeFechar, IconeIniciar, IconeProibido, IconeRelogio, IconeSalvar, IconeUsuario, IconeVoltar } from '../components/ui/icones';
import {
  Chamado,
  Comentario,
  Historico,
  StatusEnum,
  PrioridadeEnum,
  ChamadoUpdate,
  Categoria,
} from '../types/api';

const ChamadoDetalhes: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
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
  const usuarios = useUsuariosPorId();
  const [categoriaNome, setCategoriaNome] = useState<string>('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para edição
  const [modoEdicao, setModoEdicao] = useState(false);
  const [novoComentario, setNovoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  // Dados de edição. A descrição não está entre eles: é imutável de propósito,
  // preserva o relato original do solicitante.
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

  // Permissões
  const isAdmin = user?.role === 'Administrador';
  const isTecnico = user?.role === 'Tecnico';
  const podeEditar = isAdmin || isTecnico;

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
      setCategoriaEditada(chamadoData.categoria_id);
      setStatusEditado(chamadoData.status);
      setPrioridadeEditada(chamadoData.prioridade);
      setTecnicoEditado(chamadoData.tecnico_responsavel_id);
      setSolucaoEditada(chamadoData.solucao || '');

      // Carregar técnicos e categorias se for admin ou técnico
      if (podeEditar) {
        const [, categoriasData] = await Promise.all([
          carregarTecnicos(),
          categoriasService.listar(true), // apenas categorias ativas
        ]);
        setCategorias(categoriasData);
      }

      // Os nomes de solicitante, técnico, autores de comentário e de histórico
      // vêm do índice montado por useUsuariosPorId, numa listagem só.
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
      };

      // A solução só vai quando muda de fato. Reenviar o valor carregado faria
      // um chamado antigo de solução curta ser recusado ao salvar qualquer
      // outro campo, quando a API passar a exigir tamanho mínimo — a pessoa
      // mexeria no status e levaria erro sobre um texto que nem tocou.
      if (solucaoEditada !== (chamado.solucao ?? '')) {
        dadosAtualizacao.solucao = solucaoEditada || undefined;
      }

      await atualizarChamado(chamado.id, dadosAtualizacao);

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
        comentario: novoComentario,
        is_interno: false,
      });

      setNovoComentario('');
      await carregarDados(true); // Forçar busca da API
    } catch (err: any) {
      console.error('Erro ao enviar comentário:', err);
      toast.error(err?.response?.data?.detail || 'Erro ao enviar comentário.');
    } finally {
      setEnviandoComentario(false);
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

      await atualizarChamado(chamado.id, dadosAtualizacao);
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
    // A solução é o que fica de registro do atendimento e o que alguém lê
    // quando o mesmo problema volta. "ok" e "resolvido" não servem a ninguém.
    const problema = validarMinimo(solucaoModal, MINIMO_SOLUCAO, 'Solução');
    if (problema) {
      toast.error(problema);
      return;
    }

    if (!chamado || !user) return;

    try {
      setLoading(true);

      const dadosAtualizacao: ChamadoUpdate = {
        status: statusAlvo,
        solucao: solucaoModal,
      };

      await atualizarChamado(chamado.id, dadosAtualizacao);
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

    // O motivo do cancelamento é gravado na mesma coluna `solucao`, então
    // obedece ao mesmo mínimo — senão cancelar com "x" passaria por uma porta
    // que resolver com "x" não passa.
    const problema = validarMinimo(motivoCancelamento, MINIMO_SOLUCAO, 'Motivo');
    if (problema) {
      toast.error(problema);
      return;
    }

    try {
      setProcessando(true);

      // Primeiro cancela o chamado
      await chamadosService.cancelar(chamado.id);

      // Depois atualiza com o motivo (solução)
      await atualizarChamado(chamado.id, { solucao: motivoCancelamento });

      setMostrarModalCancelar(false);
      setMotivoCancelamento('');

      // Redireciona para a página de chamados
      navigate('/chamados', { replace: true });
    } catch (err: any) {
      console.error('Erro ao cancelar chamado:', err);
      toast.error(err?.response?.data?.detail || 'Erro ao cancelar chamado.');
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
        await chamadosService.desarquivar(chamado.id);
      } else {
        // Arquivar
        await chamadosService.arquivar(chamado.id);
      }

      setMostrarModalArquivar(false);

      // Redireciona para a página de chamados
      navigate('/chamados', { replace: true });
    } catch (err: any) {
      console.error('Erro ao arquivar/desarquivar chamado:', err);
      toast.error(err?.response?.data?.detail || 'Erro ao processar solicitação.');
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
            className="px-4 py-2 bg-sinal hover:brightness-110 text-white font-medium
                      rounded-lg shadow-sm hover:shadow-md transition-all duration-200
                      flex items-center gap-2"
          >
            <IconeIniciar className="w-5 h-5" />
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
            className="px-4 py-2 bg-alerta-forte hover:brightness-110 text-white font-medium
                      rounded-lg shadow-sm hover:shadow-md transition-all duration-200
                      flex items-center gap-2"
          >
            <IconeRelogio className="w-5 h-5" />
            Aguardando Retorno
          </button>,

          <button
            key="resolver"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.RESOLVIDO)}
            className="px-4 py-2 bg-info hover:bg-info-forte text-white font-medium
                      rounded-lg shadow-sm hover:shadow-md transition-all duration-200
                      flex items-center gap-2"
          >
            <IconeConfereCirculo className="w-5 h-5" />
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
            className="px-4 py-2 bg-sinal hover:brightness-110 text-white font-medium
                      rounded-lg shadow-sm hover:shadow-md transition-all duration-200
                      flex items-center gap-2"
          >
            <IconeIniciar className="w-5 h-5" />
            Retomar Atendimento
          </button>,

          <button
            key="resolver"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.RESOLVIDO)}
            className="px-4 py-2 bg-info hover:bg-info-forte text-white font-medium
                      rounded-lg shadow-sm hover:shadow-md transition-all duration-200
                      flex items-center gap-2"
          >
            <IconeConfereCirculo className="w-5 h-5" />
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
            className="px-4 py-2 bg-alerta-forte hover:brightness-110 text-white font-medium
                      rounded-lg shadow-sm hover:shadow-md transition-all duration-200
                      flex items-center gap-2"
          >
            <IconeDesfazer className="w-5 h-5" />
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
            className="px-4 py-2 bg-alerta-forte hover:brightness-110 text-white font-medium
                      rounded-lg shadow-sm hover:shadow-md transition-all duration-200
                      flex items-center gap-2"
          >
            <IconeDesfazer className="w-5 h-5" />
            Reabrir
          </button>
        );
        break;
    }

    return botoesComuns;
  };


  // Função para exibir o status (Fechado vira Resolvido visualmente)
  const getStatusDisplay = (status: StatusEnum): string => {
    return status === StatusEnum.FECHADO ? 'Resolvido' : status;
  };

  /**
   * Selo de status e de prioridade.
   *
   * A cor vem de `graficos.ts`, que é a única fonte. Esta tela mantinha um
   * `switch` próprio, e as duas tabelas discordavam em quase tudo: aqui
   * "Aberto" era azul e no quadro era rosa, "Aguardando" era âmbar e no quadro
   * violeta, e "Baixa" era verde — que neste sistema significa SLA no prazo.
   * O mesmo chamado trocava de cor conforme a tela em que era aberto.
   *
   * O texto fica em `--conteudo`, não na cor do status. A cor entra como
   * fundo esmaecido e traço lateral: assim o contraste do texto é o do tema,
   * garantido, em vez de depender de cada cor de status ter contraste
   * suficiente contra a própria versão clara.
   */
  const seloDaCor = (cor: string): React.CSSProperties => ({
    backgroundColor: `${cor}22`,
    borderLeft: `2px solid ${cor}`,
  });


  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Formata uma duração em minutos de forma amigável: "2d 3h", "4h 15min", "30min".
  const formatarDuracao = (minutos: number): string => {
    const total = Math.max(0, Math.round(minutos));
    if (total < 1) return 'menos de 1min';
    const dias = Math.floor(total / 1440);
    const horas = Math.floor((total % 1440) / 60);
    const mins = total % 60;
    if (dias > 0) return `${dias}d${horas > 0 ? ` ${horas}h` : ''}`;
    if (horas > 0) return `${horas}h${mins > 0 ? ` ${mins}min` : ''}`;
    return `${mins}min`;
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
        return 'bg-info/15 text-info-forte dark:text-info-suave';

      case 2: // Técnico
        return 'bg-info/20 text-info-forte dark:text-info-suave';

      case 3: // Usuário
        return 'bg-superficie-elevada text-conteudo-suave';

      default:
        return 'bg-superficie-elevada text-conteudo bg-superficie-elevada text-conteudo-suave';
    }
  };


  if (loading && !chamado) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-info mx-auto"></div>
          <p className="mt-4 text-conteudo-suave">
            Carregando chamado...
          </p>
        </div>
      </div>
    );
  }

  if (error || !chamado) {
    return (
      <div className="p-6">
        <div className="bg-perigo/10 border border-perigo/30
                        text-perigo-forte dark:text-perigo-suave px-4 py-3 rounded-lg">
          {error || 'Chamado não encontrado'}
        </div>
        <button
          onClick={() => navigate('/chamados')}
          className="mt-4 px-4 py-2 bg-sinal hover:brightness-110 text-white rounded-lg"
        >
          Voltar para Chamados
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-superficie-base transition-colors">
      <div className="p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="bg-superficie border border-borda rounded-xl shadow-md transition-colors">
          <div className="px-6 py-4">
            {/* Botão Voltar */}
            <button
              onClick={() => navigate('/chamados')}
              className="text-info hover:text-info-forte
                        mb-2 flex items-center gap-1 transition-colors"
              >
              <IconeVoltar className="w-4 h-4" />
              Voltar
            </button>

            <div className="flex justify-between items-start">
              {/* Título e subtítulo */}
              <div>
                <h1 className="text-3xl font-bold text-conteudo tracking-tight">
                  Chamado #{chamado.protocolo}
                </h1>
                <p className="text-conteudo-suave mt-1">
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
                          className="px-4 py-2 border border-perigo/40
                                    text-perigo-forte dark:text-perigo-suave rounded-lg
                                    hover:bg-perigo/10
                                    transition-colors flex items-center gap-2"
                        >
                          <IconeProibido className="w-5 h-5" />
                          Cancelar Chamado
                        </button>
                      )}

                      {/* Botão Arquivar/Desarquivar */}
                      <button
                        onClick={() => setMostrarModalArquivar(true)}
                        className={`px-4 py-2 border rounded-lg
                                  transition-colors flex items-center gap-2 ${
                                    chamado?.arquivado
                                      ? 'border-sucesso/40 text-sucesso-forte dark:text-sucesso-suave hover:bg-sucesso/10'
                                      : 'border-alerta/40 text-alerta-forte dark:text-alerta-suave hover:bg-alerta/10'
                                  }`}
                      >
                        {chamado?.arquivado ? (
                          <>
                            <IconeDesarquivar className="w-5 h-5" />
                            Desarquivar
                          </>
                        ) : (
                          <>
                            <IconeArquivar className="w-5 h-5" />
                            Arquivar
                          </>
                        )}
                      </button>

                      {/* Botão Editar */}
                      <button
                        onClick={() => setModoEdicao(true)}
                        className="px-4 py-2 border border-borda
                                  text-conteudo-suave rounded-lg
                                  hover:bg-superficie-elevada
                                  transition-colors flex items-center gap-2"
                      >
                        <IconeEditar className="w-5 h-5" />
                        Editar Detalhes
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Botão Cancelar Edição */}
                      <button
                        onClick={() => setModoEdicao(false)}
                        className="px-4 py-2 border border-borda
                                  text-conteudo-suave rounded-lg
                                  hover:bg-superficie-elevada
                                  transition-colors flex items-center gap-2"
                      >
                        <IconeFechar className="w-5 h-5" />
                        Cancelar
                      </button>

                      {/* Botão Salvar */}
                      <button
                        onClick={handleSalvarEdicao}
                        className="px-4 py-2 bg-sucesso hover:bg-sucesso-forte
                                  text-white font-medium rounded-lg shadow-sm
                                  hover:shadow-md transition-all duration-200 flex items-center gap-2"
                      >
                        <IconeSalvar className="w-5 h-5" />
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
          <div className="bg-superficie border border-borda rounded-xl shadow-md p-4 transition-colors">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-conteudo-suave">
                Ações Rápidas:
              </span>
              {getBotoesAcao()}
            </div>
          </div>
        )}

        {/* Informações do Chamado */}
        <div
          className="bg-superficie 
        border border-borda
        rounded-xl shadow-md p-6 transition-colors"
        >
          {/* TÍTULO DA SEÇÃO */}
          <h2 className="text-xl font-bold text-conteudo mb-6">
            Informações do Chamado
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {/* ========================== COLUNA ESQUERDA ========================== */}
            <div className="space-y-6">
              {/* Solicitante */}
              <div>
                <label className="block text-sm font-semibold text-conteudo-suave dark:text-info mb-1">
                  <IconeUsuario className="w-4 h-4 inline mr-1" />
                  Solicitante
                </label>

                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-conteudo font-medium">
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
                <label className="block text-sm font-semibold text-conteudo-suave dark:text-info mb-1">
                  Status
                </label>

                {modoEdicao ? (
                  <Seletor
                    rotulo="Status"
                    valor={statusEditado}
                    aoMudar={(v) => setStatusEditado(v as StatusEnum)}
                    opcoes={Object.values(StatusEnum)
                      .filter((status) => status !== StatusEnum.FECHADO) // Remove Fechado do dropdown
                      .map((status) => ({
                        valor: status,
                        rotulo: status,
                        cor: corDoStatus(getStatusDisplay(status), darkMode),
                      }))}
                  />
                ) : (
                  <span
                    className="inline-flex px-3 py-1 text-sm font-semibold text-conteudo"
                    style={seloDaCor(corDoStatus(getStatusDisplay(chamado.status), darkMode))}
                  >
                    {getStatusDisplay(chamado.status)}
                  </span>
                )}
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-semibold text-conteudo-suave dark:text-info mb-1">
                  Categoria
                </label>

                {modoEdicao ? (
                  <Seletor
                    rotulo="Categoria"
                    valor={categoriaEditada ? String(categoriaEditada) : ''}
                    aoMudar={(v) => setCategoriaEditada(v ? Number(v) : undefined)}
                    opcoes={[
                      { valor: '', rotulo: 'Sem categoria' },
                      ...categorias.map((categoria) => ({
                        valor: String(categoria.id),
                        rotulo: categoria.nome,
                      })),
                    ]}
                  />
                ) : (
                  <p className="text-conteudo">
                    {categoriaNome}
                  </p>
                )}
              </div>

              {/* Data Abertura */}
              <div>
                <label className="block text-sm font-semibold text-conteudo-suave dark:text-info mb-1">
                  Data de Abertura
                </label>

                <p className="text-conteudo">
                  {formatarData(chamado.data_abertura)}
                </p>
              </div>

              {/* Tempo em aberto (tempo útil de SLA: horas úteis, descontando pausas em Aguardando) */}
              {chamado.sla && (
                <div>
                  <label className="block text-sm font-semibold text-conteudo-suave dark:text-info mb-1">
                    Tempo em aberto
                  </label>

                  <p className="text-conteudo">
                    {formatarDuracao(chamado.sla.minutos_resolucao_consumidos)}
                    {chamado.status !== StatusEnum.RESOLVIDO &&
                      chamado.status !== StatusEnum.FECHADO && (
                        <span className="ml-2 text-xs text-conteudo-tenue">
                          (em andamento)
                        </span>
                      )}
                  </p>
                  <p className="text-xs text-conteudo-tenue mt-0.5">
                    tempo útil de atendimento
                    {chamado.sla.minutos_pausados > 0
                      ? `, descontado ${formatarDuracao(chamado.sla.minutos_pausados)} em Aguardando`
                      : ''}
                  </p>
                </div>
              )}
            </div>

            {/* ========================== COLUNA DIREITA ========================== */}
            <div className="space-y-6">
              {/* Técnico Responsável */}
              <div>
                <label className="block text-sm font-semibold text-conteudo-suave dark:text-info mb-1">
                  Técnico Responsável
                </label>

                {modoEdicao ? (
                  <Seletor
                    rotulo="Técnico responsável"
                    valor={tecnicoEditado ? String(tecnicoEditado) : ''}
                    aoMudar={(v) => setTecnicoEditado(v ? Number(v) : undefined)}
                    opcoes={[
                      { valor: '', rotulo: 'Sem atribuição' },
                      ...tecnicos.map((tecnico) => ({
                        valor: String(tecnico.id),
                        rotulo: tecnico.nome,
                      })),
                    ]}
                  />
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {chamado.tecnico_responsavel_id ? (
                      <>
                        <p className="text-conteudo font-medium">
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
                      <p className="text-conteudo">
                        Sem atribuição
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-sm font-semibold text-conteudo-suave dark:text-info mb-1">
                  Prioridade
                </label>

                {modoEdicao ? (
                  <Seletor
                    rotulo="Prioridade"
                    valor={prioridadeEditada}
                    aoMudar={(v) => setPrioridadeEditada(v as PrioridadeEnum)}
                    opcoes={Object.values(PrioridadeEnum).map((prioridade) => ({
                      valor: prioridade,
                      rotulo: prioridade,
                      cor: corDaPrioridade(prioridade, darkMode),
                    }))}
                  />
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="inline-flex px-3 py-1 text-sm font-semibold text-conteudo"
                      style={seloDaCor(corDaPrioridade(chamado.prioridade, darkMode))}
                    >
                      {chamado.prioridade}
                    </span>
                    <SlaBadge sla={chamado?.sla} />
                  </div>
                )}
              </div>

              {/* Protocolo */}
              <div>
                <label className="block text-sm font-semibold text-conteudo-suave dark:text-info mb-1">
                  Protocolo
                </label>

                <p className="text-conteudo font-mono">
                  #{chamado.protocolo}
                </p>
              </div>

              {/* Última Atualização */}
              <div>
                <label className="block text-sm font-semibold text-conteudo-suave dark:text-info mb-1">
                  Última Atualização
                </label>

                <p className="text-conteudo">
                  {chamado.updated_at
                    ? formatarData(chamado.updated_at)
                    : 'Não atualizado'}
                </p>
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="mt-6">
            <label className="block text-base font-bold text-conteudo dark:text-info mb-3">
              Descrição
              {modoEdicao && (
                <span className="ml-2 text-xs font-normal text-conteudo-tenue">
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
                        bg-superficie-elevada
                        text-conteudo-suave
                        border-borda
                        cursor-not-allowed opacity-75"
                placeholder="Descrição do chamado..."
              />
            ) : (
              <p className="text-conteudo whitespace-pre-wrap break-words overflow-wrap-anywhere">
                {chamado.descricao}
              </p>
            )}
          </div>

          {/* Solução */}
          {(modoEdicao || chamado.solucao) && (
            <div className="mt-6">
              <label className="block text-base font-bold text-conteudo dark:text-info mb-3">
                Solução
              </label>

              {modoEdicao ? (
                <textarea
                  value={solucaoEditada}
                  onChange={(e) => setSolucaoEditada(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg 
                          bg-superficie
                          text-conteudo
                          border-borda
                          focus:outline-none focus:ring-2 
                          focus:ring-info transition-colors"
                  placeholder="Descreva a solução aplicada..."
                />
              ) : (
                <p className="text-conteudo whitespace-pre-wrap break-words overflow-wrap-anywhere">
                  {chamado.solucao || 'Sem solução registrada'}
                </p>
              )}
            </div>
          )}

          {/* Avaliação
              As estrelas e a regra de quem pode avaliar vivem no componente
              <Avaliacao />, que esta tela e o modal do quadro usam. Estavam
              escritas por extenso aqui; ao levá-las para o modal, repetir a
              regra criaria a segunda implementação de uma permissão — que é
              como este projeto acabou com três tabelas de cor de status que
              discordavam entre si. */}
          {(chamado.status === StatusEnum.RESOLVIDO ||
            chamado.status === StatusEnum.FECHADO) && (
            <div className="mt-6 pt-6 border-t border-borda">
              <label className="block text-sm font-bold text-conteudo mb-3">
                Avaliação do Atendimento
              </label>
              <Avaliacao chamado={chamado} aoAvaliar={setChamado} tamanho="md" />
            </div>
          )}
        </div>

        {/* Comentários */}
        <div
          className="bg-superficie 
        border border-borda 
        rounded-xl shadow-md p-6 transition-colors"
        >
          <h2 className="text-xl font-bold text-conteudo dark:text-info mb-4">
            Comentários {comentarios.length > 0 && `(${comentarios.length})`}
          </h2>

          {/* Formulário de novo comentário */}
          <div className="mb-6">
            <textarea
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              rows={3}
              placeholder="Adicione um comentário..."
              className="w-full px-3 py-2 border border-borda
                      rounded-lg focus:ring-2 focus:ring-info
                      bg-superficie text-conteudo transition-colors"
            />

            <button
              onClick={handleEnviarComentario}
              disabled={!novoComentario.trim() || enviandoComentario}
              className="mt-2 px-4 py-2 bg-info hover:bg-info-forte
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
              <p className="text-conteudo-tenue text-center py-4">
                Nenhum comentário ainda.
              </p>
            ) : (
              comentarios.map((comentario) => {
                const usuario = usuarios[comentario.usuario_id];

                // Um fundo SÓ. O cartão carregava dois — o `bg-white/80` da
                // era pré-paleta e o `bg-superficie/80` que veio substituí-lo
                // sem que o antigo saísse. Com duas classes de fundo, quem
                // decide é a ordem do CSS gerado, não a do atributo: venceu o
                // branco, e no tema escuro o cartão aparecia claro com o nome
                // ilegível por cima.
                return (
                  <div
                    key={comentario.id}
                    className="border border-borda p-4 bg-superficie-elevada"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-conteudo">
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

                      <span className="text-sm text-conteudo-tenue">
                        {formatarData(comentario.created_at)}
                      </span>
                    </div>

                    <p className="text-conteudo-suave whitespace-pre-wrap break-words overflow-wrap-anywhere">
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
          className="bg-superficie 
        border border-borda 
        rounded-xl shadow-md p-6 transition-colors"
        >
          <h2 className="text-xl font-bold text-conteudo dark:text-info mb-4">
            Histórico {historico.length > 0 && `(${historico.length})`}
          </h2>

          {/* Lista de histórico com scroll */}
          <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3">
            {historico.length === 0 ? (
              <p className="text-conteudo-tenue text-center py-4">
                Nenhum histórico registrado.
              </p>
            ) : (
              historico.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 border-l-2 
                          border-info pl-4 py-2"
                >
                  <div className="flex-1">
                    <p className="font-medium text-conteudo">
                      {item.acao}
                    </p>

                    {item.descricao && (
                      <p className="text-sm text-conteudo-suave">
                        {item.descricao}
                      </p>
                    )}

                    {item.status_anterior && item.status_novo && (
                      <p className="text-sm text-conteudo-tenue">
                        {limparValorEnum(item.status_anterior)} →{' '}
                        {limparValorEnum(item.status_novo)}
                      </p>
                    )}
                  </div>

                  <span className="text-xs text-conteudo-tenue whitespace-nowrap">
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
          <div className="bg-superficie rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">

              {/* Título e Fechar */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-conteudo dark:text-info">
                    {statusAlvo === StatusEnum.RESOLVIDO
                      ? "Resolver Chamado"
                      : "Fechar Chamado"}
                  </h2>

                  <p className="text-conteudo-suave mt-1">
                    Descreva a solução aplicada para este chamado
                  </p>
                </div>

                <button
                  onClick={() => {
                    setMostrarModalResolucao(false);
                    setSolucaoModal("");
                  }}
                  className="text-conteudo-tenue hover:text-conteudo-suave
                            text-conteudo-tenue dark:hover:text-conteudo"
                >
                  <IconeFechar className="w-6 h-6" />
                </button>
              </div>

              {/* Conteúdo */}
              <div className="space-y-4">

                {/* Campo de Solução */}
                <div>
                  <label className="block text-sm font-bold text-conteudo dark:text-info mb-2">
                    Solução <span className="text-perigo">*</span>
                  </label>

                  <textarea
                    value={solucaoModal}
                    onChange={(e) => setSolucaoModal(e.target.value)}
                    rows={6}
                    placeholder="Descreva detalhadamente a solução aplicada..."
                    className="w-full px-3 py-2 border border-borda
                              rounded-lg focus:ring-2 focus:ring-info
                              bg-superficie
                              text-conteudo resize-none"
                  />

                  <ContadorMinimo valor={solucaoModal} minimo={MINIMO_SOLUCAO} />

                  <p className="text-sm text-conteudo-tenue mt-1">
                    É o que alguém vai ler quando o mesmo problema voltar.
                  </p>
                </div>

                {/* Botões */}
                <div className="flex justify-end gap-3 pt-4">

                  <button
                    onClick={() => {
                      setMostrarModalResolucao(false);
                      setSolucaoModal("");
                    }}
                    className="px-4 py-2 border border-borda
                              text-conteudo-suave
                              rounded-lg hover:bg-superficie-elevada
                              transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleConfirmarResolucao}
                    disabled={validarMinimo(solucaoModal, MINIMO_SOLUCAO, 'Solução') !== null}
                    className="px-4 py-2 bg-sucesso hover:bg-sucesso-forte
                              disabled:opacity-50 disabled:cursor-not-allowed
                              text-white font-medium rounded-lg shadow-sm
                              hover:shadow-md transition-all duration-200
                              flex items-center gap-2"
                  >
                    <IconeConfereCirculo className="w-5 h-5" />
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
          <div className="bg-superficie rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-conteudo dark:text-info">
                    Cancelar Chamado
                  </h2>
                  <p className="text-conteudo-suave mt-1">
                    Descreva o motivo do cancelamento deste chamado
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMostrarModalCancelar(false);
                    setMotivoCancelamento('');
                  }}
                  className="text-conteudo-tenue hover:text-conteudo-suave
                            text-conteudo-tenue dark:hover:text-conteudo"
                >
                  <IconeFechar className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-perigo/10 border border-perigo/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-perigo-forte dark:text-perigo-suave">
                  Esta ação irá marcar o chamado como cancelado. O chamado não será excluído, mas não aparecerá mais na listagem padrão.
                </p>
              </div>

              {/* Campo de Motivo */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-conteudo dark:text-info mb-2">
                  Motivo do Cancelamento <span className="text-perigo">*</span>
                </label>

                <textarea
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  rows={6}
                  placeholder="Descreva o motivo pelo qual este chamado está sendo cancelado..."
                  className="w-full px-3 py-2 border border-borda
                            rounded-lg focus:ring-2 focus:ring-perigo
                            bg-superficie
                            text-conteudo resize-none"
                />

                <ContadorMinimo valor={motivoCancelamento} minimo={MINIMO_SOLUCAO} />

                <p className="text-sm text-conteudo-tenue mt-1">
                  Fica registrado no chamado como o desfecho dele.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setMostrarModalCancelar(false);
                    setMotivoCancelamento('');
                  }}
                  disabled={processando}
                  className="px-4 py-2 border border-borda
                            text-conteudo-suave rounded-lg
                            hover:bg-superficie-elevada
                            transition-colors disabled:opacity-50"
                >
                  Não, voltar
                </button>
                <button
                  onClick={handleCancelarChamado}
                  disabled={
                    processando ||
                    validarMinimo(motivoCancelamento, MINIMO_SOLUCAO, 'Motivo') !== null
                  }
                  className="px-4 py-2 bg-perigo hover:bg-perigo-forte
                            disabled:opacity-50 disabled:cursor-not-allowed
                            text-white font-medium rounded-lg shadow-sm
                            hover:shadow-md transition-all duration-200
                            flex items-center gap-2"
                >
                  <IconeProibido className="w-5 h-5" />
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
          {/* `max-h` e rolagem como nos outros dois modais desta tela. Sem
              teto, num visor baixo — a TV em paisagem, por exemplo — o painel
              transborda para cima e para baixo e é cortado nos dois lados, sem
              rolagem possível. */}
          <div className="bg-superficie shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-conteudo dark:text-info">
                    {chamado?.arquivado ? 'Desarquivar Chamado' : 'Arquivar Chamado'}
                  </h2>
                  <p className="text-conteudo-suave mt-1">
                    {chamado?.arquivado
                      ? 'Este chamado voltará a aparecer na listagem padrão.'
                      : 'Este chamado será ocultado da listagem padrão.'}
                  </p>
                </div>
                <button
                  onClick={() => setMostrarModalArquivar(false)}
                  className="text-conteudo-tenue hover:text-conteudo-suave
                            text-conteudo-tenue dark:hover:text-conteudo"
                >
                  <IconeFechar className="w-6 h-6" />
                </button>
              </div>

              <div className={`${chamado?.arquivado ? 'bg-sucesso/10 border-sucesso/30' : 'bg-alerta/10 border-alerta/30'} border rounded-lg p-4 mb-4`}>
                <p className={`text-sm ${chamado?.arquivado ? 'text-sucesso-forte dark:text-sucesso-suave' : 'text-alerta-forte dark:text-alerta-suave'}`}>
                  {chamado?.arquivado
                    ? 'O chamado será restaurado e voltará a aparecer na listagem principal.'
                    : 'O chamado não será excluído, apenas ocultado da visualização padrão. Você poderá visualizá-lo novamente usando os filtros.'}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setMostrarModalArquivar(false)}
                  disabled={processando}
                  className="px-4 py-2 border border-borda
                            text-conteudo-suave rounded-lg
                            hover:bg-superficie-elevada
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
                                ? 'bg-sucesso hover:bg-sucesso-forte'
                                : 'bg-alerta-forte hover:brightness-110'
                            }`}
                >
                  {chamado?.arquivado ? (
                    <>
                      <IconeDesarquivar className="w-5 h-5" />
                      {processando ? 'Desarquivando...' : 'Sim, desarquivar'}
                    </>
                  ) : (
                    <>
                      <IconeArquivar className="w-5 h-5" />
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
