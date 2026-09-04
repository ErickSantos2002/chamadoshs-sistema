import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MINIMO_SOLUCAO, validarMinimo } from '../lib/validacao';
import ContadorMinimo from '../components/ContadorMinimo';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { useUsuariosPorId } from '../hooks/useUsuariosPorId';
import { categoriasService, chamadosService } from '../services/chamadoshsapi';
import { useTheme } from '../context/ThemeContext';
import { corDaPrioridade, corDoStatus } from '../lib/graficos';
import SlaBadge from '../components/SlaBadge';
import Avaliacao from '../components/Avaliacao';
import {
  Aviso,
  Badge,
  BlocoCarregando,
  Button,
  Campo,
  Input,
  Modal,
  Seletor,
  Textarea,
} from '../components/ui';
import {
  MarcaBadge,
  PapelBadge,
  PrioridadeBadge,
  VARIANTE_DE_STATUS,
} from '../components/SelosDeChamado';
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
          <Button variante="primario"
            key="iniciar"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.EM_ANDAMENTO)}>
            <IconeIniciar className="h-4 w-4" />
            Iniciar Atendimento
          </Button>
        );
        break;

      /* ================== EM ANDAMENTO ================== */
      case StatusEnum.EM_ANDAMENTO:
        botoesComuns.push(
          <Button variante="secundario"
            key="aguardando"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.AGUARDANDO)}>
            <IconeRelogio className="h-4 w-4" />
            Aguardando Retorno
          </Button>,

          <Button variante="sucesso"
            key="resolver"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.RESOLVIDO)}>
            <IconeConfereCirculo className="h-4 w-4" />
            Marcar como Resolvido
          </Button>
        );
        break;

      /* ================== AGUARDANDO ================== */
      case StatusEnum.AGUARDANDO:
        botoesComuns.push(
          <Button variante="primario"
            key="retomar"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.EM_ANDAMENTO)}>
            <IconeIniciar className="h-4 w-4" />
            Retomar Atendimento
          </Button>,

          <Button variante="sucesso"
            key="resolver"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.RESOLVIDO)}>
            <IconeConfereCirculo className="h-4 w-4" />
            Marcar como Resolvido
          </Button>
        );
        break;

      /* ================== RESOLVIDO ================== */
      case StatusEnum.RESOLVIDO:
        botoesComuns.push(
          <Button variante="secundario"
            key="reabrir"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.EM_ANDAMENTO)}>
            <IconeDesfazer className="h-4 w-4" />
            Reabrir
          </Button>
        );
        break;

      /* ================== FECHADO (unificado com Resolvido visualmente) ================== */
      case StatusEnum.FECHADO:
        botoesComuns.push(
          <Button variante="secundario"
            key="reabrir"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.EM_ANDAMENTO)}>
            <IconeDesfazer className="h-4 w-4" />
            Reabrir
          </Button>
        );
        break;
    }

    return botoesComuns;
  };


  // Função para exibir o status (Fechado vira Resolvido visualmente)
  const getStatusDisplay = (status: StatusEnum): string => {
    return status === StatusEnum.FECHADO ? 'Resolvido' : status;
  };

  /*
   * O `seloDaCor` saiu daqui na Fase 15, como saiu do `Dashboard` na 13.
   *
   * Ele pintava o selo com a cor de `graficos.ts` — que é a fonte certa para
   * GRÁFICO, e por isso continua alimentando o ponto colorido das opções do
   * `Seletor` logo abaixo. Para SELO, a §16 manda usar o mapa
   * `status → variante`, e o selo pela cor de gráfico era a segunda fonte de
   * verdade que a §5.4 proíbe: as duas podiam divergir, e ninguém saberia qual
   * está certa.
   *
   * O corte é o mesmo dos dois lados: cor de gráfico onde é gráfico ou
   * amostra; `Badge` do mapa onde é estado.
   */

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

  // O `getRoleBadgeColor` virou `PapelBadge`, em `SelosDeChamado.tsx`, junto
  // dos outros mapas. A nota de lá conta o que o `switch` estava fazendo: 5%
  // de alfa separando Administrador de Técnico, e um `default` com duas cores
  // de texto na mesma string.

  if (loading && !chamado) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <BlocoCarregando tamanho="lg">
          <p className="text-sm text-conteudo-suave">Carregando chamado...</p>
        </BlocoCarregando>
      </div>
    );
  }

  if (error || !chamado) {
    return (
      <div className="space-y-5">
        {/*
          Era a decima copia literal do `Aviso`, e a unica que sobreviveu a
          Fase 8 -- porque esta num `return` antecipado, longe do corpo da
          tela, onde a varredura por bloco de erro nao passou.

          Alem da forma, ela perdia o `role="alert"`: a falha de carga
          aparecia so para quem enxerga. A cor tambem era outra, `bg-perigo/10`
          contra os 15% do `--tint-danger` do pacote.
        */}
        <Aviso variante="perigo">{error || 'Chamado não encontrado'}</Aviso>
        <Button variante="primario"
          onClick={() => navigate('/chamados')}>
          Voltar para Chamados
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-5">
        {/* Cabeçalho */}
        <div className="rounded-2xl border border-borda bg-superficie">
          <div className="px-5 py-4">
            {/* Botão Voltar — que e link, e nao botao: vai para uma rota
                fixa (`/chamados`), nao desfaz nada nem volta no historico.
                Mesmo caso do lembrete de tarefas em `Chamados.tsx`. */}
            <Link
              to="/chamados"
              className="mb-2 inline-flex items-center gap-1 rounded text-sm font-medium text-action
                        transition-colors hover:brightness-110
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
              <IconeVoltar className="h-4 w-4" />
              Voltar
            </Link>

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
                    {chamado.cancelado && <MarcaBadge marca="cancelado" />}
                    {chamado.arquivado && <MarcaBadge marca="arquivado" />}
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
                                    text-on-tint-danger transition-colors
                                    hover:bg-perigo/10"
                        >
                          <IconeProibido className="h-4 w-4" />
                          Cancelar Chamado
                        </button>
                      )}

                      {/* Botão Arquivar/Desarquivar.

                          Era verde quando arquivado e ambar quando nao, e as
                          duas cores saem pela regra registrada no DECISOES.md:
                          "info e alerta sao semanticas de selo e aviso, nao de
                          botao". Arquivar tambem nao e conclusao, entao o verde
                          nao cabia nem por esse lado.

                          `secundario` pela mesma regra que os tres "Desativar":
                          a acao e reversivel -- `arquivar` e `desarquivar` sao
                          um par na API --, e o rotulo ja carrega o sentido. */}
                      <Button
                        variante="secundario"
                        onClick={() => setMostrarModalArquivar(true)}
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
                      </Button>

                      {/* Botão Excluir.
                          Último da fileira e o único em vermelho cheio: é a
                          única ação da página que não tem volta, e não pode
                          parecer irmã de "Arquivar" nem de "Editar".

                          Quem pode chegar aqui está em `utils/exclusao`, com
                          teste — administrador, e só em chamado que já saiu do
                          fluxo. */}
                      {chamado && podeExcluir(chamado, user?.role) && (
                        <Button variante="perigo"
                          onClick={() => setMostrarModalExcluir(true)}>
                          <IconeApagar className="h-4 w-4" />
                          Excluir
                        </Button>
                      )}

                      {/* Botão Editar */}
                      <Button
                        variante="secundario"
                        onClick={() => setModoEdicao(true)}
                      >
                        <IconeEditar className="h-4 w-4" />
                        Editar Detalhes
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Botão Cancelar Edição */}
                      <Button
                        variante="secundario"
                        onClick={() => setModoEdicao(false)}
                      >
                        <IconeFechar className="h-4 w-4" />
                        Cancelar
                      </Button>

                      {/* Botão Salvar */}
                      <Button variante="sucesso"
                        onClick={handleSalvarEdicao}>
                        <IconeSalvar className="h-4 w-4" />
                        Salvar
                      </Button>
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

        {/*
          ── LISTA DE DEFINIÇÕES ─────────────────────────────────────────

          Este painel tem nove pares "nome do campo → valor", e os nove nomes
          eram `<label>`. Nenhum deles apontava para nada.

          Um `<label>` sem `for` e sem controle dentro é **inerte**: não cria
          relação nenhuma. Quem lê a tela com os olhos junta "Protocolo" ao
          `#4187` pela proximidade e pelo tamanho da fonte; quem navega por
          leitor de tela ouve "Protocolo" e, num item à parte, "#4187", sem
          nada dizendo que um é o nome do outro. É o mesmo defeito de família
          que a Fase 11 achou nos campos de formulário — o sinal certo pelo
          mecanismo errado —, só que aqui o mecanismo não existia.

          Quatro dos nove ficam mais delicados: em modo de edição eles passam a
          ter um `Seletor` do lado. A saída óbvia seria pôr `htmlFor` nesses
          quatro, e ela é uma armadilha: o id só existe em modo de edição, e
          fora dele o rótulo apontaria para um id inexistente — o ponteiro
          quebrado que já está travado por teste no `Campo`. Um `<label>`
          ENVOLVENDO o `Seletor` também não serve: o `Seletor` já se nomeia
          sozinho (`aria-label={rotulo}`, sem rótulo visível), e envolver
          criaria um segundo nome para o mesmo controle, que é a segunda fonte
          de verdade da §5.4.

          `<dl>`/`<dt>`/`<dd>` resolve os nove de uma vez, e é o que este bloco
          sempre foi: a relação nome→valor passa a ser estrutural, sem ponteiro
          para manter; o `Seletor` continua com o nome dele; e nada muda de
          lugar na tela, porque `<dt>` e `<dd>` já são bloco e o preflight do
          Tailwind zera a margem de 40px que o `<dd>` traria do navegador.
        */}
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
            {/*
              `dl` e nao `div`: ver a nota LISTA DE DEFINICOES logo acima do
              cabecalho deste painel. Sao duas listas, uma por coluna, porque
              `dl > div > div > dt` nao e valido — o `div` de agrupamento so
              vale como filho DIRETO do `dl`.
            */}
            <dl className="space-y-5">
              {/* Solicitante */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  <IconeUsuario className="mr-1 inline h-3.5 w-3.5" />
                  Solicitante
                </dt>

                <dd className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-conteudo">
                    {usuarios[chamado.solicitante_id]?.nome ||
                      `Usuário #${chamado.solicitante_id}`}
                  </p>

                  {usuarios[chamado.solicitante_id] && (
                    <PapelBadge roleId={usuarios[chamado.solicitante_id].role_id} />
                  )}
                </dd>
              </div>

              {/* Status */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Status
                </dt>

                <dd>
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
                    /*
                      Rotulo e variante vem de fontes DIFERENTES de proposito, e
                      isso e a pergunta aberta registrada no DECISOES.md:
                      `getStatusDisplay` mostra "Resolvido" para o status
                      FECHADO, enquanto o mapa da secao 16 pinta FECHADO de
                      `discreto` e RESOLVIDO de `sucesso`. Um chamado fechado e
                      um resolvido leem a mesma palavra em cores diferentes.
                      A secao 30 proibe reescrever rotulo que a tela ja mostra,
                      entao os dois ficam como estao ate o produto decidir.
                    */
                    <Badge variante={VARIANTE_DE_STATUS[chamado.status]}>
                      {getStatusDisplay(chamado.status)}
                    </Badge>
                  )}
                </dd>
              </div>

              {/* Categoria */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Categoria
                </dt>

                <dd>
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
                </dd>
              </div>

              {/* Data Abertura */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Data de Abertura
                </dt>

                <dd className="text-sm text-conteudo">
                  {formatarData(chamado.data_abertura)}
                </dd>
              </div>

              {/* Tempo em aberto (tempo útil de SLA: horas úteis, descontando pausas em Aguardando) */}
              {chamado.sla && (
                <div>
                  <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                    Tempo em aberto
                  </dt>

                  <dd>
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
                  </dd>
                </div>
              )}
            </dl>

            {/* ========================== COLUNA DIREITA ========================== */}
            <dl className="space-y-5">
              {/* Técnico Responsável */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Técnico Responsável
                </dt>

                <dd>
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
                            <PapelBadge
                              roleId={usuarios[chamado.tecnico_responsavel_id].role_id}
                            />
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-conteudo">
                          Sem atribuição
                        </p>
                      )}
                    </div>
                  )}
                </dd>
              </div>

              {/* Prioridade */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Prioridade
                </dt>

                <dd>
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
                      <PrioridadeBadge prioridade={chamado.prioridade} />
                      <SlaBadge sla={chamado?.sla} />
                    </div>
                  )}
                </dd>
              </div>

              {/* Protocolo */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Protocolo
                </dt>

                <dd className="font-mono text-sm text-conteudo">
                  #{chamado.protocolo}
                </dd>
              </div>

              {/* Última Atualização */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Última Atualização
                </dt>

                <dd className="text-sm text-conteudo">
                  {chamado.updated_at
                    ? formatarData(chamado.updated_at)
                    : 'Não atualizado'}
                </dd>
              </div>
            </dl>
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
              /* `readOnly` e nao `disabled`, e a diferenca nao e cosmetica.
               *
               * Este campo EXIBE o relato original do solicitante — ele e
               * imutavel de proposito, e o rotulo acima diz isso. Mas
               * `disabled` tira o elemento da ordem de tabulacao E impede
               * selecionar o texto: justamente o texto que o tecnico precisa
               * reler e citar enquanto escreve a solucao, logo abaixo.
               *
               * `readOnly` mantem o campo focavel e o conteudo copiavel, e
               * continua recusando digitacao. `aria-readonly` vai junto porque
               * nem todo leitor de tela expoe o `readOnly` nativo.
               *
               * Achado pela varredura da Fase 8 e adiado ate aqui, que e a
               * fase desta tela. */
              <Textarea
                value={chamado.descricao}
                readOnly
                aria-readonly="true"
                aria-label="Descrição do chamado, não editável"
                rows={4}
                className="bg-superficie-elevada text-conteudo-suave"
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
                <Textarea
                  aria-label="Solução"
                  value={solucaoEditada}
                  onChange={(e) => setSolucaoEditada(e.target.value)}
                  rows={4}
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
              {/* O rotulo era so o placeholder, que SOME no primeiro
                  caractere digitado — o item da secao 29 que diz que nenhum
                  campo pode depender dele. O mesmo campo no ChamadoModal ja
                  passava pelo primitivo; era esta tela que estava atras. */}
              <Textarea
                aria-label="Novo comentário"
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                rows={3}
                placeholder="Adicione um comentário..."
              />

              <Button
                variante="primario"
                className="mt-2"
                onClick={handleEnviarComentario}
                carregando={enviandoComentario}
                disabled={!novoComentario.trim()}
              >
                Enviar Comentário
              </Button>
            </div>

            {/* Lista de comentários.
                Sem rolagem própria: tinha um teto de 600px, herdado de
                quando a página inteira rolava. Com o `<main>` da casca já
                rolando, aquilo dava duas barras verticais coladas e
                prendia a roda do mouse aqui dentro. */}
            <div className="space-y-4">
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

                          {usuario && <PapelBadge roleId={usuario.role_id} />}
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

          {/* Lista de histórico. Mesma história do bloco de comentários:
              o teto de 500px saiu, quem rola é o `<main>`. */}
          <div className="space-y-3 p-5">
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
        <Modal
          aberto={mostrarModalResolucao}
          aoFechar={() => {
            setMostrarModalResolucao(false);
            setSolucaoModal("");
          }}
          titulo={
            statusAlvo === StatusEnum.RESOLVIDO
              ? "Resolver Chamado"
              : "Fechar Chamado"
          }
          descricao="Descreva a solução aplicada para este chamado"
          largura="md"
          rodape={
            <>
              <Button
                variante="secundario"
                onClick={() => {
                  setMostrarModalResolucao(false);
                  setSolucaoModal("");
                }}
              >
                Cancelar
              </Button>

              <Button variante="sucesso"
                onClick={handleConfirmarResolucao}
                disabled={validarMinimo(solucaoModal, MINIMO_SOLUCAO, 'Solução') !== null}>
                <IconeConfereCirculo className="h-4 w-4" />
                {statusAlvo === StatusEnum.RESOLVIDO
                  ? "Marcar como Resolvido"
                  : "Fechar Chamado"}
              </Button>
            </>
          }
        >
          {/* O asterisco era um `<span>` solto dentro do rotulo: lido em voz
              alta ele vira "Solucao asterisco", que nao comunica
              obrigatoriedade a ninguem. O `Campo` poe `aria-required` no
              controle, que e onde ela e procurada.
              
              E o rotulo passa a APONTAR para o campo: o <label> nao tinha
              `htmlFor` e o textarea nao tinha `id`, entao clicar no texto
              "Solucao" nao focava nada. */}
          <Campo
            id="solucao-resolucao"
            rotulo="Solução"
            obrigatorio
            dica="É o que alguém vai ler quando o mesmo problema voltar."
          >
            <Textarea
              value={solucaoModal}
              onChange={(e) => setSolucaoModal(e.target.value)}
              rows={6}
              placeholder="Descreva detalhadamente a solução aplicada..."
              className="resize-none"
            />
          </Campo>

          <ContadorMinimo valor={solucaoModal} minimo={MINIMO_SOLUCAO} />
        </Modal>
      )}

      {/* Modal de Cancelar Chamado */}
      {mostrarModalCancelar && (
        <Modal
          aberto={mostrarModalCancelar}
          aoFechar={() => {
            setMostrarModalCancelar(false);
            setMotivoCancelamento('');
          }}
          titulo="Cancelar Chamado"
          descricao="Descreva o motivo do cancelamento deste chamado"
          largura="md"
          rodape={
            <>
              <Button
                variante="secundario"
                onClick={() => {
                  setMostrarModalCancelar(false);
                  setMotivoCancelamento('');
                }}
                disabled={processando}
              >
                Não, voltar
              </Button>
              <Button variante="perigo"
                onClick={handleCancelarChamado}
                disabled={
                  processando ||
                  validarMinimo(motivoCancelamento, MINIMO_SOLUCAO, 'Motivo') !== null
                }>
                <IconeProibido className="h-4 w-4" />
                {processando ? 'Cancelando...' : 'Sim, cancelar'}
              </Button>
            </>
          }
        >
          <div className="mb-4 rounded-xl border border-perigo/30 bg-perigo/10 p-4">
            <p className="text-sm text-on-tint-danger">
              Esta ação irá marcar o chamado como cancelado. O chamado não será excluído, mas não aparecerá mais na listagem padrão.
            </p>
          </div>

          {/* Mesmo par do modal de resolver: rotulo que aponta para o campo,
              e obrigatoriedade no controle em vez de num asterisco solto.
              
              O anel de foco era `focus:ring-perigo` aqui e `ring-sinal` nos
              outros — a quinta variacao de anel de campo do projeto. Passa a
              ser `--focus-ring`, como todos: quem navega por teclado nao
              deveria descobrir o assunto do modal pela cor do anel. */}
          <Campo
            id="motivo-cancelamento"
            rotulo="Motivo do Cancelamento"
            obrigatorio
            dica="Fica registrado no chamado como o desfecho dele."
          >
            <Textarea
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              rows={6}
              placeholder="Descreva o motivo pelo qual este chamado está sendo cancelado..."
              className="resize-none"
            />
          </Campo>

          <ContadorMinimo valor={motivoCancelamento} minimo={MINIMO_SOLUCAO} />
        </Modal>
      )}

      {/* Modal de Excluir Chamado.
          A trava é digitar o protocolo. Um "Sim, excluir" simples — o padrão
          dos outros modais desta tela — resolve para ações que se desfazem,
          e nenhuma outra aqui apaga dados. Digitar obriga a ler o que está na
          caixa vermelha, e é impossível de fazer por reflexo. */}
      {mostrarModalExcluir && chamado && (
        <Modal
          aberto={mostrarModalExcluir}
          aoFechar={() => {
            setMostrarModalExcluir(false);
            setConfirmacaoProtocolo('');
          }}
          titulo="Excluir Chamado"
          descricao={`Chamado #${chamado.protocolo}`}
          largura="sm"
          rodape={
            <>
              <Button
                variante="secundario"
                onClick={() => {
                  setMostrarModalExcluir(false);
                  setConfirmacaoProtocolo('');
                }}
                disabled={processando}
              >
                Não, voltar
              </Button>
              <Button variante="perigo"
                onClick={handleExcluirChamado}
                disabled={processando || !protocoloConfere}>
                <IconeApagar className="h-4 w-4" />
                {processando ? 'Excluindo...' : 'Excluir'}
              </Button>
            </>
          }
        >
          {/* Diz o que se perde, não o que a ação se chama. "Esta ação é
              irreversível" é frase de aviso que ninguém lê; nomear os
              comentários e o histórico faz a pessoa pensar no que havia
              ali dentro. */}
          <div className="mb-4 rounded-xl border border-perigo/30 bg-perigo/10 p-4">
            <p className="text-sm text-on-tint-danger">
              O chamado, os {comentarios.length} comentários e as{' '}
              {historico.length} entradas de histórico dele deixam de
              existir. Não há como desfazer, e não há cópia em outro lugar.
            </p>
          </div>

          {/* Este era o unico dos seis que ja tinha `htmlFor` e `id`. O que
              faltava era o contorno: `border-borda` da 1,23:1, e os primitivos
              foram para `--border-control` na Fase 8. */}
          <Campo
            id="confirmacao-protocolo"
            rotulo={
              <>
                Digite <span className="font-mono">{chamado.protocolo}</span> para
                confirmar
              </>
            }
          >
            <Input
              type="text"
              value={confirmacaoProtocolo}
              onChange={(e) => setConfirmacaoProtocolo(e.target.value)}
              autoComplete="off"
              autoFocus
              placeholder={chamado.protocolo}
              className="font-mono"
            />
          </Campo>
        </Modal>
      )}

      {/* Modal de Arquivar/Desarquivar Chamado */}
      {mostrarModalArquivar && (
        <Modal
          aberto={mostrarModalArquivar}
          aoFechar={() => setMostrarModalArquivar(false)}
          titulo={chamado?.arquivado ? 'Desarquivar Chamado' : 'Arquivar Chamado'}
          descricao={
            chamado?.arquivado
              ? 'Este chamado voltará a aparecer na listagem padrão.'
              : 'Este chamado será ocultado da listagem padrão.'
          }
          largura="sm"
          rodape={
            <>
              <Button
                variante="secundario"
                onClick={() => setMostrarModalArquivar(false)}
                disabled={processando}
              >
                Cancelar
              </Button>
              {/* A cor deixa de depender do estado.
                  
                  Era verde para desarquivar e ambar para arquivar, com texto
                  branco cravado — `bg-sucesso` com branco da 2,54:1, e a
                  catraca NAO o via: a classe estava dentro de um literal
                  interpolado, que o scanner exclui de proposito para nao
                  repetir o falso positivo da Fase 7.
                  
                  Agora e `primario` nos dois casos. Arquivar e reversivel — o
                  botao ao lado desarquiva —, entao pela regra do operador nao
                  pede vermelho; e e a acao principal do modal, entao nao pode
                  ser neutra como o Cancelar ao lado, que sumiria contra ela.
                  Quem carrega a diferenca e o rotulo, que ja muda. */}
              <Button
                variante="primario"
                onClick={handleArquivarChamado}
                disabled={processando}
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
              </Button>
            </>
          }
        >
          <div className={`rounded-xl border p-4 ${chamado?.arquivado ? 'border-sucesso/30 bg-sucesso/10' : 'border-alerta/30 bg-alerta/10'}`}>
            <p className={`text-sm ${chamado?.arquivado ? 'text-on-tint-success' : 'text-on-tint-warning'}`}>
              {chamado?.arquivado
                ? 'O chamado será restaurado e voltará a aparecer na listagem principal.'
                : 'O chamado não será excluído, apenas ocultado da visualização padrão. Você poderá visualizá-lo novamente usando os filtros.'}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ChamadoDetalhes;
