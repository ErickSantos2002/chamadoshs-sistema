import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { useUsuariosPorId } from '../hooks/useUsuariosPorId';
import { StatusEnum, PrioridadeEnum, Chamado, TarefaRecorrente } from '../types/api';
import { Filter, Plus, Search, Loader2, User, ChevronDown, ChevronUp, CalendarClock, CheckCircle2 } from 'lucide-react';
import { tarefasRecorrentesService } from '../services/chamadoshsapi';
import { KanbanColumn } from '../components/KanbanColumn';

// Data de hoje (local) em YYYY-MM-DD, para comparar com proxima_data das tarefas
const hojeYMD = (): string => {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

const formatarDataBR = (ymd?: string | null): string => {
  if (!ymd) return '—';
  const [ano, mes, dia] = ymd.split('-');
  return `${dia}/${mes}/${ano}`;
};

const Chamados: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chamados, categorias, loading, error, carregarChamados } = useChamados();

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<StatusEnum | ''>('');
  const [filtroPrioridade, setFiltroPrioridade] = useState<PrioridadeEnum | ''>('');
  const [filtroCategoria, setFiltroCategoria] = useState<number | ''>('');
  const [filtroProtocolo, setFiltroProtocolo] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Estado para armazenar os usuários (solicitantes)
  const usuarios = useUsuariosPorId();

  // Lembrete de tarefas recorrentes do dia (pendentes + realizadas hoje) — só técnico/admin
  const [tarefasDoDia, setTarefasDoDia] = useState<TarefaRecorrente[]>([]);

  // Permissões baseadas em role
  const isAdmin = user?.role === 'Administrador';
  const isTecnico = user?.role === 'Tecnico';
  const isUsuario = user?.role === 'Usuario';

  // Forçar reload dos chamados quando a página é montada
  useEffect(() => {
    carregarChamados();
  }, []);

  // Carrega as tarefas recorrentes do dia para o lembrete: as pendentes
  // (proxima_data <= hoje) e as que já foram realizadas hoje (ultima_execucao).
  useEffect(() => {
    if (!(isAdmin || isTecnico)) return;
    const hoje = hojeYMD();
    tarefasRecorrentesService
      .listar({ ativo: true })
      .then((todas) =>
        setTarefasDoDia(
          todas.filter(
            (t) =>
              t.proxima_data <= hoje ||
              (t.ultima_execucao ?? '').slice(0, 10) === hoje
          )
        )
      )
      .catch(() => setTarefasDoDia([]));
  }, [isAdmin, isTecnico]);

  // Auto-refresh a cada 10 minutos (para TV/monitoramento)
  useEffect(() => {
    const intervalo = setInterval(() => {
      carregarChamados();
    }, 600000); // 10 minutos em milissegundos

    // Cleanup: limpar o intervalo quando o componente desmontar
    return () => clearInterval(intervalo);
  }, []);

  // Nomes dos solicitantes: uma listagem só, em vez de um GET por usuário.

  // Filtra os chamados localmente
  const chamadosFiltrados = chamados.filter((chamado) => {
    if (filtroStatus && chamado.status !== filtroStatus) return false;
    if (filtroPrioridade && chamado.prioridade !== filtroPrioridade) return false;
    if (filtroCategoria && chamado.categoria_id !== filtroCategoria) return false;
    if (filtroProtocolo && !chamado.protocolo.toLowerCase().includes(filtroProtocolo.toLowerCase())) return false;
    return true;
  });

  // Agrupa chamados por status para o layout Kanban
  // Nota: Fechados são unificados com Resolvidos visualmente
  const chamadosPorStatus = useMemo(() => {
    const grupos: Record<StatusEnum, Chamado[]> = {
      [StatusEnum.ABERTO]: [],
      [StatusEnum.EM_ANDAMENTO]: [],
      [StatusEnum.AGUARDANDO]: [],
      [StatusEnum.RESOLVIDO]: [],
      [StatusEnum.FECHADO]: [], // Mantido para compatibilidade, mas não será exibido
    };

    chamadosFiltrados.forEach((chamado) => {
      // Unifica Fechados com Resolvidos
      if (chamado.status === StatusEnum.FECHADO) {
        grupos[StatusEnum.RESOLVIDO].push(chamado);
      } else {
        grupos[chamado.status].push(chamado);
      }
    });

    // Ordena cada grupo por ID decrescente (mais recente primeiro)
    Object.keys(grupos).forEach((status) => {
      grupos[status as StatusEnum].sort((a, b) => b.id - a.id);
    });

    return grupos;
  }, [chamadosFiltrados]);

  // Função para obter a cor do status
  const getStatusColor = (status: StatusEnum) => {
    switch (status) {
      case StatusEnum.ABERTO:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400';
      case StatusEnum.EM_ANDAMENTO:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400';
      case StatusEnum.AGUARDANDO:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400';
      case StatusEnum.RESOLVIDO:
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400';
      case StatusEnum.FECHADO:
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400'; // Unificado com Resolvido
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400';
    }
  };

  // Função para exibir o status (Fechado vira Resolvido visualmente)
  const getStatusDisplay = (status: StatusEnum): string => {
    return status === StatusEnum.FECHADO ? 'Resolvido' : status;
  };

  // Função para obter a cor da prioridade
  const getPrioridadeColor = (prioridade: PrioridadeEnum) => {
    switch (prioridade) {
      case PrioridadeEnum.BAIXA:
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400';
      case PrioridadeEnum.MEDIA:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400';
      case PrioridadeEnum.ALTA:
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400';
      case PrioridadeEnum.CRITICA:
        return 'bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400';
    }
  };

  // Formatar data
  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-100 dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Carregando chamados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-100 dark:bg-[#121212] transition-colors">
      <div className="p-6">

        {/* Cabeçalho */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md transition-colors mb-6">
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-[#A78BFA] tracking-tight">
                Gestão de Chamados
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {isAdmin && 'Visualize e gerencie todos os chamados do sistema'}
                {isTecnico && 'Visualize e gerencie os chamados atribuídos a você'}
                {isUsuario && 'Visualize e acompanhe seus chamados'}
              </p>
            </div>

            {/* Botão Novo Chamado */}
            <button
              onClick={() => navigate('/chamados/novo')}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1E40AF] dark:bg-[#2563EB] dark:hover:bg-[#1E3A8A]
                        text-white font-medium rounded-lg shadow-sm hover:shadow-md
                        transition-all duration-200 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Novo Chamado
            </button>
          </div>
        </div>

        {/* Lembrete de tarefas recorrentes (só técnico/admin) */}
        {(isAdmin || isTecnico) && (
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 mb-4 transition-colors">
            <div className="flex items-center mb-2">
              <CalendarClock className="w-5 h-5 mr-2 text-[#7C3AED] dark:text-[#A78BFA]" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Tarefas recorrentes do dia
              </h2>
            </div>

            {tarefasDoDia.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nenhuma tarefa recorrente para hoje. ✅
              </p>
            ) : (
              <ul className="space-y-1.5">
                {tarefasDoDia.map((t) => {
                  const hoje = hojeYMD();
                  const pendente = t.proxima_data <= hoje;
                  const realizadaHoje =
                    (t.ultima_execucao ?? '').slice(0, 10) === hoje;
                  const atrasada = t.proxima_data < hoje;
                  return (
                    <li key={t.id} className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => navigate('/tarefas-recorrentes')}
                        className={`text-sm font-medium hover:text-[#7C3AED] dark:hover:text-[#A78BFA] hover:underline transition-colors text-left ${
                          !pendente && realizadaHoje
                            ? 'text-gray-500 dark:text-gray-400'
                            : 'text-gray-800 dark:text-gray-200'
                        }`}
                        title="Ir para Tarefas Recorrentes"
                      >
                        {t.titulo}
                      </button>

                      {pendente ? (
                        atrasada ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                            Atrasada desde {formatarDataBR(t.proxima_data)}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                            Hoje
                          </span>
                        )
                      ) : (
                        realizadaHoje && (
                          <>
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3" />
                              Realizada
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Próxima: {formatarDataBR(t.proxima_data)}
                            </span>
                          </>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 mb-4 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Filter className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-300" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Filtros
              </h2>
            </div>
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300
                        hover:text-[#2563EB] dark:hover:text-[#60A5FA] font-medium transition-colors"
            >
              {mostrarFiltros ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Ocultar filtros
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Mostrar filtros
                </>
              )}
            </button>
          </div>

          {mostrarFiltros && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-6">

                {/* Filtro Protocolo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Protocolo
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={filtroProtocolo}
                      onChange={(e) => setFiltroProtocolo(e.target.value)}
                      placeholder="Buscar por protocolo..."
                      className="pl-10 w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                              text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                              focus:outline-none focus:ring-2 focus:ring-[#7C3AED] transition-colors"
                    />
                  </div>
                </div>

                {/* Filtro Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value as StatusEnum | '')}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                            text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                            focus:outline-none focus:ring-2 focus:ring-[#A78BFA] transition-colors"
                  >
                    <option value="">Todos os status</option>
                    {Object.values(StatusEnum)
                      .filter((status) => status !== StatusEnum.FECHADO) // Remove Fechado do filtro
                      .map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Filtro Prioridade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={filtroPrioridade}
                    onChange={(e) => setFiltroPrioridade(e.target.value as PrioridadeEnum | '')}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                            text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                            focus:outline-none focus:ring-2 focus:ring-[#DB2777] transition-colors"
                  >
                    <option value="">Todas as prioridades</option>
                    {Object.values(PrioridadeEnum).map((prioridade) => (
                      <option key={prioridade} value={prioridade}>
                        {prioridade}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por categoria */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={filtroCategoria}
                    onChange={(e) =>
                      setFiltroCategoria(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                            text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                            focus:outline-none focus:ring-2 focus:ring-[#DB2777] transition-colors"
                  >
                    <option value="">Todas as categorias</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Botão limpar filtros */}
              {(filtroStatus || filtroPrioridade || filtroCategoria || filtroProtocolo) && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setFiltroStatus('');
                      setFiltroPrioridade('');
                      setFiltroCategoria('');
                      setFiltroProtocolo('');
                    }}
                    className="text-sm text-[#2563EB] hover:text-[#1E40AF] dark:text-[#60A5FA]
                              dark:hover:text-[#93C5FD] font-medium"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                        text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Contador */}
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Exibindo {chamadosFiltrados.length} de {chamados.length} chamados
        </div>

        {/* Kanban - 4 colunas (Fechados unificados com Resolvidos) */}
        <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-2 md:grid-cols-2 gap-4">

          {/* === COLUNA ABERTO === */}
          <KanbanColumn
            title="Aberto"
            colorDot="bg-blue-500"
            badgeColor="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            items={chamadosPorStatus[StatusEnum.ABERTO]}
            usuarios={usuarios}
            navigate={navigate}
            getPrioridadeColor={getPrioridadeColor}
          />

          {/* === EM ANDAMENTO === */}
          <KanbanColumn
            title="Em Andamento"
            colorDot="bg-[#06B6D4]"
            badgeColor="bg-[#06B6D4]/20 text-[#06B6D4]"
            items={chamadosPorStatus[StatusEnum.EM_ANDAMENTO]}
            usuarios={usuarios}
            navigate={navigate}
            getPrioridadeColor={getPrioridadeColor}
          />

          {/* === AGUARDANDO === */}
          <KanbanColumn
            title="Aguardando"
            colorDot="bg-[#A78BFA]"
            badgeColor="bg-[#A78BFA]/20 text-[#A78BFA]"
            items={chamadosPorStatus[StatusEnum.AGUARDANDO]}
            usuarios={usuarios}
            navigate={navigate}
            getPrioridadeColor={getPrioridadeColor}
          />

          {/* === RESOLVIDO (inclui Fechados) === */}
          <KanbanColumn
            title="Resolvido"
            colorDot="bg-[#4ADE80]"
            badgeColor="bg-[#4ADE80]/20 text-[#4ADE80]"
            items={chamadosPorStatus[StatusEnum.RESOLVIDO]}
            usuarios={usuarios}
            navigate={navigate}
            getPrioridadeColor={getPrioridadeColor}
          />
        </div>
      </div>
    </div>
  );

};

export default Chamados;
