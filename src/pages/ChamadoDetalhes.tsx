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
import { Badge, Seletor } from '../components/ui';
import { confirmacaoConfere, podeExcluir } from '../utils/exclusao';
import { IconeApagar, IconeArquivar, IconeConfereCirculo, IconeDesarquivar, IconeDesfazer, IconeEditar, IconeFechar, IconeIniciar, IconeProibido, IconeRelogio, IconeSalvar, IconeUsuario, IconeVoltar } from '../components/ui/icones';
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
    deletarChamado,
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

  // Exclusão. O protocolo digitado é a trava: o botão só libera quando ele
  // bate com o do chamado. Ver `podeExcluir` para quem chega até aqui.
  const [mostrarModalExcluir, setMostrarModalExcluir] = useState(false);
  const [confirmacaoProtocolo, setConfirmacaoProtocolo] = useState('');

  // A trava do botão de excluir. A comparação mora em `utils/exclusao`, com
  // teste: escrita aqui, ela dava verdadeiro com chamado nulo.
  const protocoloConfere = confirmacaoConfere(
    confirmacaoProtocolo,
    chamado?.protocolo
  );

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

      // `?? null` nos dois campos limpáveis: escolher "Sem categoria" ou "Sem
      // atribuição" deixa o estado local `undefined`, o axios descarta
      // `undefined` antes de enviar, e a API com `exclude_unset` não toca no
      // que não chegou — a limpeza era engolida em silêncio. `null` viaja.
      const dadosAtualizacao: ChamadoUpdate = {
        categoria_id: categoriaEditada ?? null,
        status: statusEditado,
        prioridade: prioridadeEditada,
        tecnico_responsavel_id: tecnicoEditado ?? null,
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

  /**
   * Apaga o chamado de vez.
   *
   * Quem chega aqui já passou por `podeExcluir` (administrador, chamado fora
   * do fluxo) e já digitou o protocolo. `deletarChamado` vem do contexto e
   * também tira o chamado da lista em memória — sem isso o card ficaria no
   * quadro até o próximo carregamento, apontando para uma página que não
   * existe mais.
   */
  const handleExcluirChamado = async () => {
    if (!chamado) return;

    try {
      setProcessando(true);

      await deletarChamado(chamado.id);

      setMostrarModalExcluir(false);
      setConfirmacaoProtocolo('');
      toast.success(`Chamado ${chamado.protocolo} excluído.`);

      // `replace` para o Voltar do navegador não trazer a pessoa de volta a
      // uma página de chamado que já não existe.
      navigate('/chamados', { replace: true });
    } catch (err: any) {
      // O 403 já é anunciado pelo interceptor; repetir mostraria duas
      // mensagens para o mesmo erro.
      if (err?.response?.status !== 403) {
        toast.error(err?.response?.data?.detail || 'Não foi possível excluir o chamado.');
      }
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
            className="flex items-center gap-2 rounded-lg bg-sinal px-4 py-2
                      text-sm font-semibold text-white
                      transition-colors hover:brightness-110"
          >
            <IconeIniciar className="h-4 w-4" />
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
            className="flex items-center gap-2 rounded-lg bg-alerta-forte px-4 py-2
                      text-sm font-semibold text-white
                      transition-colors hover:brightness-110"
          >
            <IconeRelogio className="h-4 w-4" />
            Aguardando Retorno
          </button>,

          <button
            key="resolver"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.RESOLVIDO)}
            className="flex items-center gap-2 rounded-lg bg-info px-4 py-2
                      text-sm font-semibold text-white
                      transition-colors hover:bg-info-forte"
          >
            <IconeConfereCirculo className="h-4 w-4" />
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
            className="flex items-center gap-2 rounded-lg bg-sinal px-4 py-2
                      text-sm font-semibold text-white
                      transition-colors hover:brightness-110"
          >
            <IconeIniciar className="h-4 w-4" />
            Retomar Atendimento
          </button>,

          <button
            key="resolver"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.RESOLVIDO)}
            className="flex items-center gap-2 rounded-lg bg-info px-4 py-2
                      text-sm font-semibold text-white
                      transition-colors hover:bg-info-forte"
          >
            <IconeConfereCirculo className="h-4 w-4" />
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
            className="flex items-center gap-2 rounded-lg bg-alerta-forte px-4 py-2
                      text-sm font-semibold text-white
                      transition-colors hover:brightness-110"
          >
            <IconeDesfazer className="h-4 w-4" />
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
            className="flex items-center gap-2 rounded-lg bg-alerta-forte px-4 py-2
                      text-sm font-semibold text-white
                      transition-colors hover:brightness-110"
          >
            <IconeDesfazer className="h-4 w-4" />
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
      <div className="flex min-h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-sinal"></div>
          <p className="mt-4 text-sm text-conteudo-suave">
            Carregando chamado...
          </p>
        </div>
      </div>
    );
  }

  if (error || !chamado) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-perigo/30 bg-perigo/10 px-5 py-4
                        text-sm text-perigo-forte dark:text-perigo-suave">
          {error || 'Chamado não encontrado'}
        </div>
        <button
          onClick={() => navigate('/chamados')}
          className="rounded-lg bg-sinal px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110"
        >
          Voltar para Chamados
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-5">
        {/* Cabeçalho */}
        <div className="rounded-2xl border border-borda bg-superficie">
          <div className="px-5 py-4">
            {/* Botão Voltar */}
            <button
              onClick={() => navigate('/chamados')}
              className="mb-2 flex items-center gap-1 text-sm font-medium text-sinal
                        transition-colors hover:brightness-110"
              >
              <IconeVoltar className="h-4 w-4" />
              Voltar
            </button>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              {/* Título e subtítulo */}
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-conteudo">
                  Chamado #{chamado.protocolo}
                </h1>
                <p className="mt-0.5 text-sm text-conteudo-tenue">
                  {chamado.titulo}
                </p>

                {/* Cancelado e arquivado dizem o que aconteceu COM o chamado, e
                    o campo "Status" logo abaixo não os menciona: cancelar não
                    mexe no status, então um chamado cancelado continua exibindo
                    "Aberto" ou "Resolvido" ali.

                    Esta era a única tela que não avisava. O modal, o card do
                    quadro e a tabela do painel já mostravam o selo; aqui, a
                    única pista era a AUSÊNCIA do botão "Cancelar Chamado" — e
                    ninguém percebe um botão que não está lá. Foi assim que um
                    chamado cancelado foi marcado como resolvido sem que quem
                    marcou soubesse do cancelamento. */}
                {(chamado.cancelado || chamado.arquivado) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {chamado.cancelado && <Badge variante="perigo">Cancelado</Badge>}
                    {chamado.arquivado && <Badge variante="neutro">Arquivado</Badge>}
                    <span className="text-sm text-conteudo-tenue">
                      Fora do fluxo de atendimento — o status abaixo é o que ele
                      tinha quando saiu.
                    </span>
                  </div>
                )}
              </div>

              {/* Botões de ação (editar / salvar / cancelar / arquivar) */}
              {podeEditar && (
                <div className="flex flex-wrap items-center gap-2">
                  {!modoEdicao ? (
                    <>
                      {/* Botão Cancelar Chamado */}
                      {!chamado?.cancelado && (
                        <button
                          onClick={() => setMostrarModalCancelar(true)}
                          className="flex items-center gap-2 rounded-lg border border-perigo/40
                                    px-4 py-2 text-sm font-semibold
                                    text-perigo-forte transition-colors
                                    hover:bg-perigo/10 dark:text-perigo-suave"
                        >
                          <IconeProibido className="h-4 w-4" />
                          Cancelar Chamado
                        </button>
                      )}

                      {/* Botão Arquivar/Desarquivar */}
                      <button
                        onClick={() => setMostrarModalArquivar(true)}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2
                                  text-sm font-semibold transition-colors ${
                                    chamado?.arquivado
                                      ? 'border-sucesso/40 text-sucesso-forte hover:bg-sucesso/10 dark:text-sucesso-suave'
                                      : 'border-alerta/40 text-alerta-forte hover:bg-alerta/10 dark:text-alerta-suave'
                                  }`}
                      >
                        {chamado?.arquivado ? (
                          <>
                            <IconeDesarquivar className="h-4 w-4" />
                            Desarquivar
                          </>
                        ) : (
                          <>
                            <IconeArquivar className="h-4 w-4" />
                            Arquivar
                          </>
                        )}
                      </button>

                      {/* Botão Excluir.
                          Último da fileira e o único em vermelho cheio: é a
                          única ação da página que não tem volta, e não pode
                          parecer irmã de "Arquivar" nem de "Editar".

                          Quem pode chegar aqui está em `utils/exclusao`, com
                          teste — administrador, e só em chamado que já saiu do
                          fluxo. */}
                      {chamado && podeExcluir(chamado, user?.role) && (
                        <button
                          onClick={() => setMostrarModalExcluir(true)}
                          className="flex items-center gap-2 rounded-lg bg-perigo px-4 py-2
                                    text-sm font-semibold text-white
                                    transition-colors hover:bg-perigo-forte"
                        >
                          <IconeApagar className="h-4 w-4" />
                          Excluir
                        </button>
                      )}

                      {/* Botão Editar */}
                      <button
                        onClick={() => setModoEdicao(true)}
                        className="flex items-center gap-2 rounded-lg border border-borda
                                  px-4 py-2 text-sm font-semibold text-conteudo-suave
                                  transition-colors hover:bg-superficie-elevada hover:text-conteudo"
                      >
                        <IconeEditar className="h-4 w-4" />
                        Editar Detalhes
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Botão Cancelar Edição */}
                      <button
                        onClick={() => setModoEdicao(false)}
                        className="flex items-center gap-2 rounded-lg border border-borda
                                  px-4 py-2 text-sm font-semibold text-conteudo-suave
                                  transition-colors hover:bg-superficie-elevada hover:text-conteudo"
                      >
                        <IconeFechar className="h-4 w-4" />
                        Cancelar
                      </button>

                      {/* Botão Salvar */}
                      <button
                        onClick={handleSalvarEdicao}
                        className="flex items-center gap-2 rounded-lg bg-sucesso px-4 py-2
                                  text-sm font-semibold text-white
                                  transition-colors hover:bg-sucesso-forte"
                      >
                        <IconeSalvar className="h-4 w-4" />
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
          <div className="rounded-xl border border-borda bg-superficie p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-conteudo">
                Ações Rápidas:
              </span>
              {getBotoesAcao()}
            </div>
          </div>
        )}

        {/* Informações do Chamado */}
        <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
          {/* TÍTULO DA SEÇÃO */}
          <div className="border-b border-borda px-5 py-4">
            <h2 className="text-sm font-semibold text-conteudo">
              Informações do Chamado
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-6 p-5 md:grid-cols-2">
            {/* ========================== COLUNA ESQUERDA ========================== */}
            <div className="space-y-5">
              {/* Solicitante */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  <IconeUsuario className="mr-1 inline h-3.5 w-3.5" />
                  Solicitante
                </label>

                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-conteudo">
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
                <label className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
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
                    className="inline-flex px-2 py-1 text-xs font-semibold text-conteudo"
                    style={seloDaCor(corDoStatus(getStatusDisplay(chamado.status), darkMode))}
                  >
                    {getStatusDisplay(chamado.status)}
                  </span>
                )}
              </div>

              {/* Categoria */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
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
                  <p className="text-sm text-conteudo">
                    {categoriaNome}
                  </p>
                )}
              </div>

              {/* Data Abertura */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Data de Abertura
                </label>

                <p className="text-sm text-conteudo">
                  {formatarData(chamado.data_abertura)}
                </p>
              </div>

              {/* Tempo em aberto (tempo útil de SLA: horas úteis, descontando pausas em Aguardando) */}
              {chamado.sla && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                    Tempo em aberto
                  </label>

                  <p className="text-sm text-conteudo">
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
            <div className="space-y-5">
              {/* Técnico Responsável */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
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
                        <p className="text-sm font-medium text-conteudo">
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
                      <p className="text-sm text-conteudo">
                        Sem atribuição
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Prioridade */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
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
                      className="inline-flex px-2 py-1 text-xs font-semibold text-conteudo"
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
                <label className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Protocolo
                </label>

                <p className="font-mono text-sm text-conteudo">
                  #{chamado.protocolo}
                </p>
              </div>

              {/* Última Atualização */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Última Atualização
                </label>

                <p className="text-sm text-conteudo">
                  {chamado.updated_at
                    ? formatarData(chamado.updated_at)
                    : 'Não atualizado'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Descrição */}
        <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
          <div className="border-b border-borda px-5 py-4">
            <h2 className="text-sm font-semibold text-conteudo">
              Descrição
              {modoEdicao && (
                <span className="ml-2 text-xs font-normal text-conteudo-tenue">
                  (não editável - preserva o relato original do solicitante)
                </span>
              )}
            </h2>
          </div>

          <div className="p-5">
            {modoEdicao ? (
              <textarea
                value={chamado.descricao}
                disabled
                rows={4}
                className="w-full rounded-lg border border-borda
                        bg-superficie-elevada px-3 py-2 text-sm
                        text-conteudo-suave
                        cursor-not-allowed opacity-75"
                placeholder="Descrição do chamado..."
              />
            ) : (
              <p className="text-sm text-conteudo whitespace-pre-wrap break-words overflow-wrap-anywhere">
                {chamado.descricao}
              </p>
            )}
          </div>
        </div>

        {/* Solução */}
        {(modoEdicao || chamado.solucao) && (
          <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
            <div className="border-b border-borda px-5 py-4">
              <h2 className="text-sm font-semibold text-conteudo">
                Solução
              </h2>
            </div>

            <div className="p-5">
              {modoEdicao ? (
                <textarea
                  value={solucaoEditada}
                  onChange={(e) => setSolucaoEditada(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-borda
                          bg-superficie px-3 py-2 text-sm
                          text-conteudo transition-colors
                          hover:border-conteudo-tenue
                          focus:border-transparent focus:outline-none focus:ring-2
                          focus:ring-sinal"
                  placeholder="Descreva a solução aplicada..."
                />
              ) : (
                <p className="text-sm text-conteudo whitespace-pre-wrap break-words overflow-wrap-anywhere">
                  {chamado.solucao || 'Sem solução registrada'}
                </p>
              )}
            </div>
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
          <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
            <div className="border-b border-borda px-5 py-4">
              <h2 className="text-sm font-semibold text-conteudo">
                Avaliação do Atendimento
              </h2>
            </div>
            <div className="p-5">
              <Avaliacao chamado={chamado} aoAvaliar={setChamado} tamanho="md" />
            </div>
          </div>
        )}

        {/* Comentários */}
        <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
          <div className="border-b border-borda px-5 py-4">
            <h2 className="text-sm font-semibold text-conteudo">
              Comentários {comentarios.length > 0 && `(${comentarios.length})`}
            </h2>
          </div>

          <div className="p-5">
            {/* Formulário de novo comentário */}
            <div className="mb-5">
              <textarea
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                rows={3}
                placeholder="Adicione um comentário..."
                className="w-full rounded-lg border border-borda
                        bg-superficie px-3 py-2 text-sm text-conteudo
                        transition-colors hover:border-conteudo-tenue
                        focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sinal"
              />

              <button
                onClick={handleEnviarComentario}
                disabled={!novoComentario.trim() || enviandoComentario}
                className="mt-2 rounded-lg bg-info px-4 py-2
                        text-sm font-semibold text-white
                        transition-colors hover:bg-info-forte
                        disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enviandoComentario ? 'Enviando...' : 'Enviar Comentário'}
              </button>
            </div>

            {/* Lista de comentários com scroll */}
            <div className="max-h-[600px] space-y-4 overflow-y-auto pr-2">
              {comentarios.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-conteudo-tenue">
                  Nenhum comentário ainda.
                </div>
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
                      className="rounded-xl border border-borda bg-superficie-elevada p-4"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-conteudo">
                            {usuario?.nome || `Usuário #${comentario.usuario_id}`}
                          </span>

                          {usuario && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold
                            ${getRoleBadgeColor(usuario.role_id)}`}
                            >
                              {getRoleName(usuario.role_id)}
                            </span>
                          )}
                        </div>

                        <span className="whitespace-nowrap text-xs text-conteudo-tenue">
                          {formatarData(comentario.created_at)}
                        </span>
                      </div>

                      <p className="text-sm text-conteudo-suave whitespace-pre-wrap break-words overflow-wrap-anywhere">
                        {comentario.comentario}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Histórico */}
        <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
          <div className="border-b border-borda px-5 py-4">
            <h2 className="text-sm font-semibold text-conteudo">
              Histórico {historico.length > 0 && `(${historico.length})`}
            </h2>
          </div>

          {/* Lista de histórico com scroll */}
          <div className="max-h-[500px] space-y-3 overflow-y-auto p-5">
            {historico.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-conteudo-tenue">
                Nenhum histórico registrado.
              </div>
            ) : (
              historico.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 border-l-2
                          border-sinal py-2 pl-4"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-conteudo">
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

                  <span className="whitespace-nowrap text-xs text-conteudo-tenue">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-borda bg-superficie shadow-xl">
            <div className="p-5">

              {/* Título e Fechar */}
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-conteudo">
                    {statusAlvo === StatusEnum.RESOLVIDO
                      ? "Resolver Chamado"
                      : "Fechar Chamado"}
                  </h2>

                  <p className="mt-0.5 text-sm text-conteudo-tenue">
                    Descreva a solução aplicada para este chamado
                  </p>
                </div>

                <button
                  onClick={() => {
                    setMostrarModalResolucao(false);
                    setSolucaoModal("");
                  }}
                  className="rounded-lg p-1 text-conteudo-tenue transition-colors
                            hover:bg-superficie-elevada hover:text-conteudo"
                >
                  <IconeFechar className="h-5 w-5" />
                </button>
              </div>

              {/* Conteúdo */}
              <div className="space-y-4">

                {/* Campo de Solução */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-conteudo-suave">
                    Solução <span className="text-perigo">*</span>
                  </label>

                  <textarea
                    value={solucaoModal}
                    onChange={(e) => setSolucaoModal(e.target.value)}
                    rows={6}
                    placeholder="Descreva detalhadamente a solução aplicada..."
                    className="w-full resize-none rounded-lg border border-borda
                              bg-superficie px-3 py-2 text-sm text-conteudo
                              transition-colors hover:border-conteudo-tenue
                              focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sinal"
                  />

                  <ContadorMinimo valor={solucaoModal} minimo={MINIMO_SOLUCAO} />

                  <p className="mt-1 text-sm text-conteudo-tenue">
                    É o que alguém vai ler quando o mesmo problema voltar.
                  </p>
                </div>

                {/* Botões */}
                <div className="flex justify-end gap-2 border-t border-borda pt-4">

                  <button
                    onClick={() => {
                      setMostrarModalResolucao(false);
                      setSolucaoModal("");
                    }}
                    className="rounded-lg border border-borda px-4 py-2
                              text-sm font-semibold text-conteudo-suave
                              transition-colors hover:bg-superficie-elevada hover:text-conteudo"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleConfirmarResolucao}
                    disabled={validarMinimo(solucaoModal, MINIMO_SOLUCAO, 'Solução') !== null}
                    className="flex items-center gap-2 rounded-lg bg-sucesso px-4 py-2
                              text-sm font-semibold text-white
                              transition-colors hover:bg-sucesso-forte
                              disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <IconeConfereCirculo className="h-4 w-4" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-borda bg-superficie shadow-xl">
            <div className="p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-conteudo">
                    Cancelar Chamado
                  </h2>
                  <p className="mt-0.5 text-sm text-conteudo-tenue">
                    Descreva o motivo do cancelamento deste chamado
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMostrarModalCancelar(false);
                    setMotivoCancelamento('');
                  }}
                  className="rounded-lg p-1 text-conteudo-tenue transition-colors
                            hover:bg-superficie-elevada hover:text-conteudo"
                >
                  <IconeFechar className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 rounded-xl border border-perigo/30 bg-perigo/10 p-4">
                <p className="text-sm text-perigo-forte dark:text-perigo-suave">
                  Esta ação irá marcar o chamado como cancelado. O chamado não será excluído, mas não aparecerá mais na listagem padrão.
                </p>
              </div>

              {/* Campo de Motivo */}
              <div className="mb-5">
                <label className="mb-1.5 block text-sm font-medium text-conteudo-suave">
                  Motivo do Cancelamento <span className="text-perigo">*</span>
                </label>

                <textarea
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  rows={6}
                  placeholder="Descreva o motivo pelo qual este chamado está sendo cancelado..."
                  className="w-full resize-none rounded-lg border border-borda
                            bg-superficie px-3 py-2 text-sm text-conteudo
                            transition-colors hover:border-conteudo-tenue
                            focus:border-transparent focus:outline-none focus:ring-2 focus:ring-perigo"
                />

                <ContadorMinimo valor={motivoCancelamento} minimo={MINIMO_SOLUCAO} />

                <p className="mt-1 text-sm text-conteudo-tenue">
                  Fica registrado no chamado como o desfecho dele.
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t border-borda pt-4">
                <button
                  onClick={() => {
                    setMostrarModalCancelar(false);
                    setMotivoCancelamento('');
                  }}
                  disabled={processando}
                  className="rounded-lg border border-borda px-4 py-2
                            text-sm font-semibold text-conteudo-suave
                            transition-colors hover:bg-superficie-elevada hover:text-conteudo
                            disabled:opacity-50"
                >
                  Não, voltar
                </button>
                <button
                  onClick={handleCancelarChamado}
                  disabled={
                    processando ||
                    validarMinimo(motivoCancelamento, MINIMO_SOLUCAO, 'Motivo') !== null
                  }
                  className="flex items-center gap-2 rounded-lg bg-perigo px-4 py-2
                            text-sm font-semibold text-white
                            transition-colors hover:bg-perigo-forte
                            disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconeProibido className="h-4 w-4" />
                  {processando ? 'Cancelando...' : 'Sim, cancelar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Excluir Chamado.
          A trava é digitar o protocolo. Um "Sim, excluir" simples — o padrão
          dos outros modais desta tela — resolve para ações que se desfazem,
          e nenhuma outra aqui apaga dados. Digitar obriga a ler o que está na
          caixa vermelha, e é impossível de fazer por reflexo. */}
      {mostrarModalExcluir && chamado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-borda bg-superficie shadow-xl">
            <div className="p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-conteudo">
                    Excluir Chamado
                  </h2>
                  <p className="mt-0.5 text-sm text-conteudo-tenue">
                    Chamado #{chamado.protocolo}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMostrarModalExcluir(false);
                    setConfirmacaoProtocolo('');
                  }}
                  className="rounded-lg p-1 text-conteudo-tenue transition-colors
                            hover:bg-superficie-elevada hover:text-conteudo"
                >
                  <IconeFechar className="h-5 w-5" />
                </button>
              </div>

              {/* Diz o que se perde, não o que a ação se chama. "Esta ação é
                  irreversível" é frase de aviso que ninguém lê; nomear os
                  comentários e o histórico faz a pessoa pensar no que havia
                  ali dentro. */}
              <div className="mb-4 rounded-xl border border-perigo/30 bg-perigo/10 p-4">
                <p className="text-sm text-perigo-forte dark:text-perigo-suave">
                  O chamado, os {comentarios.length} comentários e as{' '}
                  {historico.length} entradas de histórico dele deixam de
                  existir. Não há como desfazer, e não há cópia em outro lugar.
                </p>
              </div>

              <div className="mb-5">
                <label
                  htmlFor="confirmacao-protocolo"
                  className="mb-1.5 block text-sm font-medium text-conteudo-suave"
                >
                  Digite <span className="font-mono">{chamado.protocolo}</span> para confirmar
                </label>

                <input
                  id="confirmacao-protocolo"
                  type="text"
                  value={confirmacaoProtocolo}
                  onChange={(e) => setConfirmacaoProtocolo(e.target.value)}
                  autoComplete="off"
                  autoFocus
                  placeholder={chamado.protocolo}
                  className="w-full rounded-lg border border-borda
                            bg-superficie px-3 py-2 font-mono text-sm
                            text-conteudo transition-colors hover:border-conteudo-tenue
                            focus:border-transparent focus:outline-none focus:ring-2 focus:ring-perigo"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-borda pt-4">
                <button
                  onClick={() => {
                    setMostrarModalExcluir(false);
                    setConfirmacaoProtocolo('');
                  }}
                  disabled={processando}
                  className="rounded-lg border border-borda px-4 py-2
                            text-sm font-semibold text-conteudo-suave
                            transition-colors hover:bg-superficie-elevada hover:text-conteudo
                            disabled:opacity-50"
                >
                  Não, voltar
                </button>
                <button
                  onClick={handleExcluirChamado}
                  disabled={processando || !protocoloConfere}
                  className="flex items-center gap-2 rounded-lg bg-perigo px-4 py-2
                            text-sm font-semibold text-white
                            transition-colors hover:bg-perigo-forte
                            disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconeApagar className="h-4 w-4" />
                  {processando ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Arquivar/Desarquivar Chamado */}
      {mostrarModalArquivar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          {/* `max-h` e rolagem como nos outros dois modais desta tela. Sem
              teto, num visor baixo — a TV em paisagem, por exemplo — o painel
              transborda para cima e para baixo e é cortado nos dois lados, sem
              rolagem possível. */}
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-borda bg-superficie shadow-xl">
            <div className="p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-conteudo">
                    {chamado?.arquivado ? 'Desarquivar Chamado' : 'Arquivar Chamado'}
                  </h2>
                  <p className="mt-0.5 text-sm text-conteudo-tenue">
                    {chamado?.arquivado
                      ? 'Este chamado voltará a aparecer na listagem padrão.'
                      : 'Este chamado será ocultado da listagem padrão.'}
                  </p>
                </div>
                <button
                  onClick={() => setMostrarModalArquivar(false)}
                  className="rounded-lg p-1 text-conteudo-tenue transition-colors
                            hover:bg-superficie-elevada hover:text-conteudo"
                >
                  <IconeFechar className="h-5 w-5" />
                </button>
              </div>

              <div className={`mb-4 rounded-xl border p-4 ${chamado?.arquivado ? 'border-sucesso/30 bg-sucesso/10' : 'border-alerta/30 bg-alerta/10'}`}>
                <p className={`text-sm ${chamado?.arquivado ? 'text-sucesso-forte dark:text-sucesso-suave' : 'text-alerta-forte dark:text-alerta-suave'}`}>
                  {chamado?.arquivado
                    ? 'O chamado será restaurado e voltará a aparecer na listagem principal.'
                    : 'O chamado não será excluído, apenas ocultado da visualização padrão. Você poderá visualizá-lo novamente usando os filtros.'}
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t border-borda pt-4">
                <button
                  onClick={() => setMostrarModalArquivar(false)}
                  disabled={processando}
                  className="rounded-lg border border-borda px-4 py-2
                            text-sm font-semibold text-conteudo-suave
                            transition-colors hover:bg-superficie-elevada hover:text-conteudo
                            disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleArquivarChamado}
                  disabled={processando}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2
                            text-sm font-semibold text-white transition-colors
                            disabled:opacity-50 ${
                              chamado?.arquivado
                                ? 'bg-sucesso hover:bg-sucesso-forte'
                                : 'bg-alerta-forte hover:brightness-110'
                            }`}
                >
                  {chamado?.arquivado ? (
                    <>
                      <IconeDesarquivar className="h-4 w-4" />
                      {processando ? 'Desarquivando...' : 'Sim, desarquivar'}
                    </>
                  ) : (
                    <>
                      <IconeArquivar className="h-4 w-4" />
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
