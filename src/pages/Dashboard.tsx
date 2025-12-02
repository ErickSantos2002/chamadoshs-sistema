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
} from 'lucide-react';
import { useChamados } from '../hooks/useChamados';
import { useAuth } from '../hooks/useAuth';
import { Chamado, StatusEnum, PrioridadeEnum } from '../types/api';
import { useNavigate } from 'react-router-dom';

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

const Dashboard: React.FC = () => {
  const { chamados, usuarios, categorias, loading } = useChamados();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados locais
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todas');

  const CORES_GRAFICO = ['#3b82f6', '#22c55e', '#facc15', '#ef4444', '#a855f7'];

  // ========================================
  // CÁLCULO DE MÉTRICAS
  // ========================================

  const metricas = useMemo(() => {
    if (!chamados || chamados.length === 0) {
      return {
        total: 0,
        abertos: 0,
        emAndamento: 0,
        resolvidos: 0,
        fechados: 0,
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
    } else if (user?.role === 'Tecnico') {
      chamadosFiltrados = chamados.filter(
        (c) => c.tecnico_responsavel_id === user.id || c.solicitante_id === user.id
      );
    }

    // Aplicar filtros adicionais
    if (filtroStatus !== 'todos') {
      chamadosFiltrados = chamadosFiltrados.filter((c) => c.status === filtroStatus);
    }
    if (filtroPrioridade !== 'todas') {
      chamadosFiltrados = chamadosFiltrados.filter((c) => c.prioridade === filtroPrioridade);
    }

    // Contadores por status
    const abertos = chamadosFiltrados.filter((c) => c.status === StatusEnum.ABERTO).length;
    const emAndamento = chamadosFiltrados.filter((c) => c.status === StatusEnum.EM_ANDAMENTO).length;
    const resolvidos = chamadosFiltrados.filter((c) => c.status === StatusEnum.RESOLVIDO).length;
    const fechados = chamadosFiltrados.filter((c) => c.status === StatusEnum.FECHADO).length;
    const aguardando = chamadosFiltrados.filter((c) => c.status === StatusEnum.AGUARDANDO).length;

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
      resolvidos,
      fechados,
      porStatus,
      porPrioridade,
      porCategoria,
      tempoMedioResolucao,
      chamadosRecentes,
    };
  }, [chamados, user, categorias, filtroStatus, filtroPrioridade]);

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-[#facc15] tracking-tight">
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
          <div className="flex items-center mb-6">
            <Filter className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Filtros
            </h2>
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
                          focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
                          focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  Total de Chamados
                </p>
                <p className="text-3xl font-semibold text-blue-500 dark:text-blue-300 mt-2 tracking-tight">
                  {metricas.total}
                </p>
              </div>
              <div className="bg-blue-100/70 dark:bg-blue-900/50 p-3 rounded-full">
                <Ticket className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  Abertos
                </p>
                <p className="text-3xl font-semibold text-amber-500 dark:text-amber-300 mt-2 tracking-tight">
                  {metricas.abertos}
                </p>
              </div>
              <div className="bg-amber-100/70 dark:bg-amber-900/50 p-3 rounded-full">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  Em Andamento
                </p>
                <p className="text-3xl font-semibold text-orange-500 dark:text-orange-300 mt-2 tracking-tight">
                  {metricas.emAndamento}
                </p>
              </div>
              <div className="bg-orange-100/70 dark:bg-orange-900/50 p-3 rounded-full">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  Resolvidos
                </p>
                <p className="text-3xl font-semibold text-green-500 dark:text-green-300 mt-2 tracking-tight">
                  {metricas.resolvidos}
                </p>
              </div>
              <div className="bg-green-100/70 dark:bg-green-900/50 p-3 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Tempo Médio de Resolução */}
        {metricas.tempoMedioResolucao > 0 && (
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 mb-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  Tempo Médio de Resolução
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {metricas.tempoMedioResolucao}h
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/40 p-3 rounded-full">
                <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
                    data={metricas.porStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) =>
                      value > 0 ? `${name}: ${value}` : ''
                    }
                  >
                    {metricas.porStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{
                      marginTop: 10,
                      fontSize: '12px',
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
                <BarChart data={metricas.porPrioridade}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#f9fafb',
                      color: '#000',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                    }}
                    itemStyle={{ color: '#000' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {metricas.porPrioridade.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
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
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.1} />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis dataKey="name" type="category" stroke="#6b7280" width={150} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#f9fafb',
                    color: '#000',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                  }}
                  itemStyle={{ color: '#000' }}
                  labelStyle={{ color: '#8b5cf6', fontWeight: 600 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabela de Chamados Recentes */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Chamados Recentes
          </h3>

          {metricas.chamadosRecentes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-[#2a2a2a] border-b border-gray-200 dark:border-[#2d2d2d]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                      Protocolo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                      Título
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                      Prioridade
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-[#2d2d2d]">
                  {metricas.chamadosRecentes.map((chamado) => (
                    <tr
                      key={chamado.id}
                      className="hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        #{chamado.protocolo}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                        {chamado.titulo}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                            chamado.status
                          )}`}
                        >
                          {chamado.status}
                        </span>
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
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1"
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
