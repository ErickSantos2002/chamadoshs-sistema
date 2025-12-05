import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart as RChart,
  Pie,
  Cell,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Ticket,
  AlertCircle,
  Clock,
  CheckCircle2,
  Filter,
  ChevronRight,
  XCircle,
  Loader2,
  Activity,
  Eye,
  EyeOff,
  Archive,
  Ban,
} from 'lucide-react';
import { useChamados } from '../hooks/useChamados';
import { useAuth } from '../hooks/useAuth';
import { Chamado, StatusEnum, PrioridadeEnum } from '../types/api';
import { useNavigate } from 'react-router-dom';
import { chamadosService } from '../services/chamadoshsapi';

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

const Dashboard: React.FC = () => {
  const { categorias } = useChamados();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados locais
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todas');
  const [incluirCancelados, setIncluirCancelados] = useState(false);

  const CORES_GRAFICO = ['#3b82f6', '#22c55e', '#facc15', '#ef4444', '#a855f7'];

  // ========================================
  // CARREGAR CHAMADOS COM FILTROS CORRETOS
  // ========================================

  useEffect(() => {
    const carregarChamadosDashboard = async () => {
      if (!user) return;

      try {
        setLoading(true);

        const params: any = {
          incluir_arquivados: true, // Dashboard sempre inclui arquivados
          incluir_cancelados: incluirCancelados, // Controlado pelo filtro
        };

        // Usuários comuns só veem seus próprios chamados
        if (user.role === 'Usuario') {
          params.solicitante_id = user.id;
        }

        const data = await chamadosService.listar(params);
        setChamados(data);
      } catch (err) {
        console.error('Erro ao carregar chamados do dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    carregarChamadosDashboard();
  }, [user, incluirCancelados]);

  // ========================================
  // CÁLCULO DE MÉTRICAS
  // ========================================

  const metricas = useMemo(() => {
    if (!chamados || chamados.length === 0) {
      return {
        total: 0,
        abertos: 0,
        emAndamento: 0,
        aguardando: 0,
        resolvidos: 0,
        fechados: 0,
        arquivados: 0,
        porStatus: [],
        porPrioridade: [],
        porCategoria: [],
        tempoMedioResolucao: 0,
        chamadosRecentes: [],
      };
    }

    // Filtrar chamados baseado na role do usuário
    let chamadosFiltrados = chamados;
    if (user?.role === 'Usuario') {
      chamadosFiltrados = chamados.filter((c) => c.solicitante_id === user.id);
    }
    // Técnicos e Administradores veem todos os chamados

    // Aplicar filtros adicionais
    if (filtroStatus !== 'todos') {
      chamadosFiltrados = chamadosFiltrados.filter((c) => c.status === filtroStatus);
    }
    if (filtroPrioridade !== 'todas') {
      chamadosFiltrados = chamadosFiltrados.filter((c) => c.prioridade === filtroPrioridade);
    }

    // Separar arquivados dos ativos
    const chamadosAtivos = chamadosFiltrados.filter((c) => !c.arquivado);
    const chamadosArquivados = chamadosFiltrados.filter((c) => c.arquivado);

    // Contadores por status (APENAS ATIVOS - excluindo arquivados)
    const abertos = chamadosAtivos.filter((c) => c.status === StatusEnum.ABERTO).length;
    const emAndamento = chamadosAtivos.filter((c) => c.status === StatusEnum.EM_ANDAMENTO).length;
    const resolvidos = chamadosAtivos.filter((c) => c.status === StatusEnum.RESOLVIDO).length;
    const fechados = chamadosAtivos.filter((c) => c.status === StatusEnum.FECHADO).length;
    const aguardando = chamadosAtivos.filter((c) => c.status === StatusEnum.AGUARDANDO).length;
    const arquivados = chamadosArquivados.length;

    // Dados para gráfico de status
    const porStatus = [
      { name: 'Abertos', value: abertos, color: '#3b82f6' },
      { name: 'Em Andamento', value: emAndamento, color: '#f59e0b' },
      { name: 'Aguardando', value: aguardando, color: '#6b7280' },
      { name: 'Resolvidos', value: resolvidos, color: '#10b981' },
      { name: 'Fechados', value: fechados, color: '#6366f1' },
    ];

    // Dados para gráfico de prioridade
    const prioridades = {
      [PrioridadeEnum.BAIXA]: 0,
      [PrioridadeEnum.MEDIA]: 0,
      [PrioridadeEnum.ALTA]: 0,
      [PrioridadeEnum.CRITICA]: 0,
    };

    chamadosFiltrados.forEach((c) => {
      if (c.prioridade) {
        prioridades[c.prioridade]++;
      }
    });

    const porPrioridade = [
      { name: 'Baixa', value: prioridades[PrioridadeEnum.BAIXA], color: '#10b981' },
      { name: 'Média', value: prioridades[PrioridadeEnum.MEDIA], color: '#f59e0b' },
      { name: 'Alta', value: prioridades[PrioridadeEnum.ALTA], color: '#ef4444' },
      { name: 'Crítica', value: prioridades[PrioridadeEnum.CRITICA], color: '#dc2626' },
    ];

    // Dados para gráfico de categoria
    const categoriaMap = new Map<string, number>();
    chamadosFiltrados.forEach((c) => {
      if (c.categoria_id) {
        const categoria = categorias.find((cat) => cat.id === c.categoria_id);
        const nome = categoria?.nome || 'Sem categoria';
        categoriaMap.set(nome, (categoriaMap.get(nome) || 0) + 1);
      } else {
        categoriaMap.set('Sem categoria', (categoriaMap.get('Sem categoria') || 0) + 1);
      }
    });

    const porCategoria = Array.from(categoriaMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Tempo médio de resolução (em horas)
    const chamadosResolvidos = chamadosFiltrados.filter(
      (c) => c.tempo_resolucao_minutos !== null && c.tempo_resolucao_minutos !== undefined
    );
    const tempoMedioResolucao =
      chamadosResolvidos.length > 0
        ? Math.round(
            chamadosResolvidos.reduce((acc, c) => acc + (c.tempo_resolucao_minutos || 0), 0) /
              chamadosResolvidos.length / 60
          )
        : 0;

    // Chamados recentes (últimos 10)
    const chamadosRecentes = [...chamadosFiltrados]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    return {
      total: chamadosFiltrados.length,
      abertos,
      emAndamento,
      aguardando,
      resolvidos,
      fechados,
      arquivados,
      porStatus,
      porPrioridade,
      porCategoria,
      tempoMedioResolucao,
      chamadosRecentes,
    };
  }, [chamados, user, categorias, filtroStatus, filtroPrioridade, incluirCancelados]);

  // ========================================
  // FUNÇÕES AUXILIARES
  // ========================================

  const getStatusBadgeColor = (status: StatusEnum): string => {
    const colors: Record<StatusEnum, string> = {
      [StatusEnum.ABERTO]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400',
      [StatusEnum.EM_ANDAMENTO]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400',
      [StatusEnum.AGUARDANDO]: 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400',
      [StatusEnum.RESOLVIDO]: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
      [StatusEnum.FECHADO]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-400',
    };
    return colors[status] || '';
  };

  const getPrioridadeBadgeColor = (prioridade: PrioridadeEnum): string => {
    const colors: Record<PrioridadeEnum, string> = {
      [PrioridadeEnum.BAIXA]: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
      [PrioridadeEnum.MEDIA]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400',
      [PrioridadeEnum.ALTA]: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
      [PrioridadeEnum.CRITICA]: 'bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-300',
    };
    return colors[prioridade] || '';
  };

  const formatarData = (data: string): string => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ========================================
  // RENDER
  // ========================================

  if (loading) {
    return (
      <div className="min-h-full bg-gray-100 dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">
            Carregando dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-100 dark:bg-[#121212] transition-colors">
      <div className="p-6">

        {/* Cabeçalho */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md transition-colors">
          <div className="px-6 py-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-[#A78BFA] tracking-tight">
              Chamados - Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Bem-vindo, <span className="font-semibold">{user?.username}</span>{' '}
              ({user?.role})
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              Visualize os indicadores e a situação atual dos chamados do sistema.
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 mt-6 mb-6 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Filter className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-300" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Filtros
              </h2>
            </div>

            {/* Botão Toggle Cancelados */}
            <button
              onClick={() => setIncluirCancelados(!incluirCancelados)}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-medium ${
                incluirCancelados
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title={incluirCancelados ? 'Ocultar cancelados' : 'Mostrar cancelados'}
            >
              {incluirCancelados ? (
                <>
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Exibindo cancelados</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span className="hidden sm:inline">Cancelados ocultos</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                          text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                          focus:outline-none focus:ring-2 focus:ring-[#7C3AED] transition-colors"
              >
                <option value="todos">Todos</option>
                <option value={StatusEnum.ABERTO}>Abertos</option>
                <option value={StatusEnum.EM_ANDAMENTO}>Em Andamento</option>
                <option value={StatusEnum.AGUARDANDO}>Aguardando</option>
                <option value={StatusEnum.RESOLVIDO}>Resolvidos</option>
                <option value={StatusEnum.FECHADO}>Fechados</option>
              </select>
            </div>

            {/* Prioridade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prioridade
              </label>
              <select
                value={filtroPrioridade}
                onChange={(e) => setFiltroPrioridade(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                          text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                          focus:outline-none focus:ring-2 focus:ring-[#DB2777] transition-colors"
              >
                <option value="todas">Todas</option>
                <option value={PrioridadeEnum.BAIXA}>Baixa</option>
                <option value={PrioridadeEnum.MEDIA}>Média</option>
                <option value={PrioridadeEnum.ALTA}>Alta</option>
                <option value={PrioridadeEnum.CRITICA}>Crítica</option>
              </select>
            </div>

          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">

          {/* Total */}
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">Total de Chamados</p>
                <p className="text-3xl font-semibold text-[#2563EB] dark:text-[#60A5FA] mt-2 tracking-tight">
                  {metricas.total}
                </p>
              </div>
              <div className="bg-blue-100/70 dark:bg-blue-900/50 p-3 rounded-full">
                <Ticket className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Abertos */}
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">Abertos</p>
                <p className="text-3xl font-semibold text-[#DB2777] dark:text-[#F472B6] mt-2 tracking-tight">
                  {metricas.abertos}
                </p>
              </div>
              <div className="bg-pink-100/70 dark:bg-pink-900/50 p-3 rounded-full">
                <AlertCircle className="w-6 h-6 text-[#DB2777]" />
              </div>
            </div>
          </div>

          {/* Em andamento */}
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">Em Andamento</p>
                <p className="text-3xl font-semibold text-[#06B6D4] dark:text-[#67E8F9] mt-2 tracking-tight">
                  {metricas.emAndamento}
                </p>
              </div>
              <div className="bg-cyan-100/70 dark:bg-cyan-900/50 p-3 rounded-full">
                <Clock className="w-6 h-6 text-[#06B6D4]" />
              </div>
            </div>
          </div>

          {/* Resolvidos */}
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">Resolvidos</p>
                <p className="text-3xl font-semibold text-[#4ADE80] dark:text-[#86EFAC] mt-2 tracking-tight">
                  {metricas.resolvidos}
                </p>
              </div>
              <div className="bg-green-100/70 dark:bg-green-900/50 p-3 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-[#4ADE80]" />
              </div>
            </div>
          </div>

          {/* Arquivados */}
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">Arquivados</p>
                <p className="text-3xl font-semibold text-[#F59E0B] dark:text-[#FCD34D] mt-2 tracking-tight">
                  {metricas.arquivados}
                </p>
              </div>
              <div className="bg-amber-100/70 dark:bg-amber-900/50 p-3 rounded-full">
                <Archive className="w-6 h-6 text-[#F59E0B]" />
              </div>
            </div>
          </div>

        </div>

        {/* Tempo Médio */}
        {metricas.tempoMedioResolucao > 0 && (
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 mb-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">Tempo Médio de Resolução</p>
                <p className="text-2xl font-bold text-[#7C3AED] dark:text-[#A78BFA] mt-2">
                  {metricas.tempoMedioResolucao}h
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/40 p-3 rounded-full">
                <Activity className="w-6 h-6 text-[#7C3AED]" />
              </div>
            </div>
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Gráfico de Status */}
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Chamados por Status
            </h3>

            {metricas.porStatus.some(s => s.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <RChart>
                  <Pie
                    data={metricas.porStatus.map(s => ({
                      ...s,
                      color:
                        s.name === "Abertos" ? "#DB2777" :
                        s.name === "Em Andamento" ? "#06B6D4" :
                        s.name === "Aguardando" ? "#A78BFA" :
                        s.name === "Resolvidos" ? "#4ADE80" :
                        "#7C3AED"
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    dataKey="value"
                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}
                  >
                    {metricas.porStatus.map((entry) => {
                      const color =
                        entry.name === "Abertos" ? "#DB2777" :
                        entry.name === "Em Andamento" ? "#06B6D4" :
                        entry.name === "Aguardando" ? "#A78BFA" :
                        entry.name === "Resolvidos" ? "#4ADE80" :
                        "#7C3AED";

                      return <Cell key={entry.name} fill={color} />;
                    })}
                  </Pie>

                  {/* TOOLTIP PADRONIZADO */}
                  <Tooltip
                    wrapperStyle={{ outline: "none" }}
                    contentStyle={{
                      backgroundColor: "#1f1b24",        // fundo roxo escuro (dark elegante)
                      border: "1px solid #7C3AED",       // borda roxa
                      borderRadius: "8px",
                      color: "#F3E8FF",                  // texto lilás claro
                      padding: "8px 12px",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
                    }}
                    labelStyle={{
                      color: "#A78BFA",                  // título lilás
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                    itemStyle={{
                      color: "#fff",                     // texto dos valores
                    }}
                  />

                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{
                      marginTop: 10,
                      fontSize: "12px",
                      color: "#fff",
                    }}
                  />
                </RChart>
              </ResponsiveContainer>

            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                Sem dados para exibir
              </div>
            )}
          </div>

          {/* Gráfico de Prioridade */}
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Chamados por Prioridade
            </h3>

            {metricas.porPrioridade.some(p => p.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={metricas.porPrioridade.map(p => ({
                    ...p,
                    color:
                      p.name === "Baixa" ? "#4ADE80" :
                      p.name === "Média" ? "#06B6D4" :
                      p.name === "Alta" ? "#DB2777" :
                      "#7C3AED"
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />

                  <XAxis dataKey="name" stroke="#A78BFA" />
                  <YAxis stroke="#A78BFA" />

                  {/* TOOLTIP PADRONIZADO */}
                  <Tooltip
                    wrapperStyle={{ outline: "none" }}
                    contentStyle={{
                      backgroundColor: "#1f1b24",        // fundo roxo escuro
                      border: "1px solid #7C3AED",       // borda roxa
                      borderRadius: "8px",
                      color: "#F3E8FF",                  // texto lilás claro
                      padding: "8px 12px",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
                    }}
                    labelStyle={{
                      color: "#A78BFA",                  // título lilás
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                    itemStyle={{
                      color: "#fff",                     // texto dos dados
                    }}
                  />

                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {metricas.porPrioridade.map((entry) => {
                      const color =
                        entry.name === "Baixa" ? "#4ADE80" :
                        entry.name === "Média" ? "#06B6D4" :
                        entry.name === "Alta" ? "#DB2777" :
                        "#7C3AED";

                      return <Cell key={entry.name} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                Sem dados para exibir
              </div>
            )}
          </div>

        </div>

        {/* Top 5 Categorias */}
        {metricas.porCategoria.length > 0 && (
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 mb-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Top 5 Categorias
            </h3>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metricas.porCategoria} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />

                <XAxis type="number" stroke="#A78BFA" />
                <YAxis dataKey="name" type="category" stroke="#A78BFA" width={150} />

                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {metricas.porCategoria.map((_, idx) => {
                    const palette = ["#7C3AED", "#A78BFA", "#2563EB", "#DB2777", "#06B6D4"];
                    return <Cell key={idx} fill={palette[idx % palette.length]} />;
                  })}
                </Bar>

                {/* TOOLTIP PADRONIZADO */}
                <Tooltip
                  wrapperStyle={{ outline: "none" }}
                  contentStyle={{
                    backgroundColor: "#1f1b24",        // fundo roxo escuro elegante
                    border: "1px solid #7C3AED",       // borda roxa primária
                    borderRadius: "8px",
                    color: "#F3E8FF",                  // texto lilás claro
                    padding: "8px 12px",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
                  }}
                  labelStyle={{
                    color: "#A78BFA",                  // título lilás
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                  itemStyle={{
                    color: "#fff",                     // texto dos valores
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabela de Chamados Recentes */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-[#A78BFA] mb-4">
            Chamados Recentes
          </h3>

          {metricas.chamadosRecentes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-[#2d2d2d]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-[#A78BFA]">
                      Protocolo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-[#A78BFA]">
                      Título
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-[#A78BFA]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-[#A78BFA]">
                      Prioridade
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-[#A78BFA]">
                      Data
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-[#A78BFA]">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-[#2d2d2d]">
                  {metricas.chamadosRecentes.map((chamado) => (
                    <tr
                      key={chamado.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/80"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        #{chamado.protocolo}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                        {chamado.titulo}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                              chamado.status
                            )}`}
                          >
                            {chamado.status}
                          </span>
                          {chamado.arquivado && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                              <Archive className="w-3 h-3" />
                              Arquivado
                            </span>
                          )}
                          {chamado.cancelado && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
                              <Ban className="w-3 h-3" />
                              Cancelado
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPrioridadeBadgeColor(
                            chamado.prioridade
                          )}`}
                        >
                          {chamado.prioridade}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">
                        {formatarData(chamado.created_at)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => navigate(`/chamados/${chamado.id}`)}
                          className="text-[#2563EB] dark:text-[#60A5FA] hover:text-[#3B82F6] dark:hover:text-[#93C5FD] font-medium inline-flex items-center gap-1"
                        >
                          Ver detalhes
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <XCircle className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Nenhum chamado encontrado
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
