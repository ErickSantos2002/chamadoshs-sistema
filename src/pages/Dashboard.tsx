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
import { useTheme } from '../context/ThemeContext';
import {
  corDaPrioridade,
  corDaSerie,
  corDoStatus,
  estiloDoGrafico,
} from '../lib/graficos';

// ========================================
// HELPERS DE PERÍODO (data)
// ========================================

// Formata um Date local como YYYY-MM-DD (compatível com <input type="date">)
const toInputDate = (d: Date): string => {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

// Intervalos dos atalhos
const rangeEsteMes = (): { inicio: string; fim: string } => {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0); // último dia do mês
  return { inicio: toInputDate(inicio), fim: toInputDate(fim) };
};

const rangeMesPassado = (): { inicio: string; fim: string } => {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0); // último dia do mês anterior
  return { inicio: toInputDate(inicio), fim: toInputDate(fim) };
};

const rangeUltimos30 = (): { inicio: string; fim: string } => {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 29);
  return { inicio: toInputDate(inicio), fim: toInputDate(hoje) };
};

// Verdadeiro se a data cai dentro de [inicio, fim] (limites inclusivos, dia inteiro).
// Sem início e sem fim => "Tudo" (não filtra). Sem a data (ex.: chamado não
// resolvido, data_resolucao ausente) => fica de fora quando há recorte ativo.
const dentroDoPeriodo = (
  dataStr: string | null | undefined,
  inicio: string,
  fim: string
): boolean => {
  if (!inicio && !fim) return true;
  if (!dataStr) return false;
  const data = new Date(dataStr);
  if (inicio && data < new Date(`${inicio}T00:00:00`)) return false;
  if (fim && data > new Date(`${fim}T23:59:59.999`)) return false;
  return true;
};

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

const Dashboard: React.FC = () => {
  const { darkMode } = useTheme();
  // Eixos, grade e dica acompanham o tema: antes eram hexadecimais fixos do
  // tema escuro, e no claro a grade sumia contra o fundo branco.
  const estilo = estiloDoGrafico(darkMode);

  const { categorias } = useChamados();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados locais
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todas');
  const [incluirCancelados, setIncluirCancelados] = useState(false);

  // Período (default: mês atual). presetAtivo controla o destaque dos atalhos.
  const [periodoInicio, setPeriodoInicio] = useState<string>(() => rangeEsteMes().inicio);
  const [periodoFim, setPeriodoFim] = useState<string>(() => rangeEsteMes().fim);
  const [presetAtivo, setPresetAtivo] = useState<
    'mes' | 'mesPassado' | '30d' | 'tudo' | 'custom'
  >('mes');

  const aplicarPreset = (preset: 'mes' | 'mesPassado' | '30d' | 'tudo') => {
    setPresetAtivo(preset);
    if (preset === 'tudo') {
      setPeriodoInicio('');
      setPeriodoFim('');
      return;
    }
    const r =
      preset === 'mes'
        ? rangeEsteMes()
        : preset === 'mesPassado'
          ? rangeMesPassado()
          : rangeUltimos30();
    setPeriodoInicio(r.inicio);
    setPeriodoFim(r.fim);
  };

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

        const data = await chamadosService.listarTodos(params);
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

    // Recorte por período: KPIs e gráficos consideram chamados ABERTOS no período.
    chamadosFiltrados = chamadosFiltrados.filter((c) =>
      dentroDoPeriodo(c.data_abertura, periodoInicio, periodoFim)
    );

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
    // Nota: Resolvidos inclui também os Fechados (unificado no frontend)
    const abertos = chamadosAtivos.filter((c) => c.status === StatusEnum.ABERTO).length;
    const emAndamento = chamadosAtivos.filter((c) => c.status === StatusEnum.EM_ANDAMENTO).length;
    const resolvidos = chamadosAtivos.filter(
      (c) => c.status === StatusEnum.RESOLVIDO || c.status === StatusEnum.FECHADO
    ).length;
    const aguardando = chamadosAtivos.filter((c) => c.status === StatusEnum.AGUARDANDO).length;
    const arquivados = chamadosArquivados.length;

    // Dados para gráfico de status (Fechados unificados com Resolvidos)
    // Sem campo `color`: a cor de cada fatia vem de `corDoStatus` na hora de
    // desenhar. O campo existia aqui e não era lido por ninguém — sobra de
    // quando cada gráfico trazia a própria paleta.
    const porStatus = [
      { name: 'Abertos', value: abertos },
      { name: 'Em Andamento', value: emAndamento },
      { name: 'Aguardando', value: aguardando },
      { name: 'Resolvidos', value: resolvidos },
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
      { name: 'Baixa', value: prioridades[PrioridadeEnum.BAIXA] },
      { name: 'Média', value: prioridades[PrioridadeEnum.MEDIA] },
      { name: 'Alta', value: prioridades[PrioridadeEnum.ALTA] },
      { name: 'Crítica', value: prioridades[PrioridadeEnum.CRITICA] },
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

    // Tempo médio de resolução (em horas) - Considera Resolvidos E Fechados
    const chamadosComResolucao = chamadosFiltrados.filter(
      (c) =>
        (c.status === StatusEnum.RESOLVIDO || c.status === StatusEnum.FECHADO) &&
        c.tempo_resolucao_minutos !== null &&
        c.tempo_resolucao_minutos !== undefined
    );
    const tempoMedioResolucao =
      chamadosComResolucao.length > 0
        ? Math.round(
            chamadosComResolucao.reduce((acc, c) => acc + (c.tempo_resolucao_minutos || 0), 0) /
              chamadosComResolucao.length / 60
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
      arquivados,
      porStatus,
      porPrioridade,
      porCategoria,
      tempoMedioResolucao,
      chamadosRecentes,
    };
  }, [chamados, user, categorias, filtroStatus, filtroPrioridade, incluirCancelados, periodoInicio, periodoFim]);

  // Métricas de SLA
  const metricasSla = useMemo(() => {
    // % de SLA do período: considera chamados RESOLVIDOS dentro do intervalo
    // escolhido (por data_resolucao). É o indicador "quanto do que fechou no
    // período bateu o prazo".
    const resolvidos = chamados.filter(
      (c) =>
        (c.status === StatusEnum.RESOLVIDO || c.status === StatusEnum.FECHADO) &&
        dentroDoPeriodo(c.data_resolucao, periodoInicio, periodoFim)
    );
    // Cancelados são excluídos explicitamente de "em aberto": cancelado é um
    // booleano independente do status, e um chamado cancelado não é trabalho pendente.
    const emAberto = chamados.filter(
      (c) => c.status !== StatusEnum.RESOLVIDO && c.status !== StatusEnum.FECHADO && !c.cancelado
    );

    // % dentro do SLA: só faz sentido sobre os resolvidos que de fato têm SLA
    // calculado (a API manda sla: null quando não há configuração ou o chamado
    // foi cancelado). Calcular sobre o total de resolvidos mascararia a ausência
    // de dado como "0% no prazo".
    const resolvidosComSla = resolvidos.filter((c) => c.sla);
    const resolvidosNoPrazo = resolvidosComSla.filter(
      (c) => c.sla!.situacao !== 'Estourado'
    ).length;

    const percentualNoPrazo =
      resolvidosComSla.length > 0
        ? Math.round((resolvidosNoPrazo / resolvidosComSla.length) * 100)
        : null;

    // Estourados em aberto: a dor de agora
    const estouradosEmAberto = emAberto.filter(
      (c) => c.sla?.situacao === 'Estourado'
    ).length;

    const emAtencao = emAberto.filter((c) => c.sla?.situacao === 'Atenção').length;

    return {
      percentualNoPrazo,
      totalResolvidosComSla: resolvidosComSla.length,
      estouradosEmAberto,
      emAtencao,
    };
  }, [chamados, periodoInicio, periodoFim]);

  // ========================================
  // FUNÇÕES AUXILIARES
  // ========================================

  const getStatusBadgeColor = (status: StatusEnum): string => {
    const colors: Record<StatusEnum, string> = {
      [StatusEnum.ABERTO]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400',
      [StatusEnum.EM_ANDAMENTO]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400',
      [StatusEnum.AGUARDANDO]: 'bg-superficie-elevada text-conteudo-tenue',
      [StatusEnum.RESOLVIDO]: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
      [StatusEnum.FECHADO]: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400', // Unificado com Resolvido
    };
    return colors[status] || '';
  };

  // Função para exibir o status (Fechado vira Resolvido visualmente)
  const getStatusDisplay = (status: StatusEnum): string => {
    return status === StatusEnum.FECHADO ? 'Resolvido' : status;
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
      <div className="min-h-full bg-superficie-base flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-conteudo-suave">
            Carregando dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-superficie-base transition-colors">
      <div className="p-6">

        {/* Cabeçalho */}
        <div className="bg-superficie border border-borda rounded-xl shadow-md transition-colors">
          <div className="px-6 py-4">
            <h1 className="text-3xl font-bold text-conteudo text-info tracking-tight">
              Chamados - Dashboard
            </h1>
            <p className="text-conteudo-suave mt-1">
              Bem-vindo, <span className="font-semibold">{user?.username}</span>{' '}
              ({user?.role})
            </p>
            <p className="text-conteudo-tenue text-sm mt-2">
              Visualize os indicadores e a situação atual dos chamados do sistema.
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-superficie border border-borda rounded-xl shadow-md p-6 mt-6 mb-6 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Filter className="w-5 h-5 mr-2 text-conteudo-suave" />
              <h2 className="text-lg font-semibold text-conteudo">
                Filtros
              </h2>
            </div>

            {/* Botão Toggle Cancelados */}
            <button
              onClick={() => setIncluirCancelados(!incluirCancelados)}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-medium ${
                incluirCancelados
                  ? 'bg-perigo/15 text-perigo-forte dark:text-perigo-suave hover:bg-red-200 dark:hover:bg-red-900/50'
                  : 'bg-superficie-elevada text-conteudo-suave hover:bg-superficie-elevada'
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

          {/* Período */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-conteudo-suave mb-2">
              Período
            </label>

            {/* Atalhos */}
            <div className="flex flex-wrap gap-2 mb-3">
              {([
                { key: 'mes', label: 'Este mês' },
                { key: 'mesPassado', label: 'Mês passado' },
                { key: '30d', label: 'Últimos 30 dias' },
                { key: 'tudo', label: 'Tudo' },
              ] as const).map((p) => (
                <button
                  key={p.key}
                  onClick={() => aplicarPreset(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    presetAtivo === p.key
                      ? 'bg-info text-white shadow'
                      : 'bg-superficie-elevada text-conteudo-suave hover:bg-superficie-elevada'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Intervalo personalizado */}
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-conteudo-tenue mb-1">
                  De
                </label>
                <input
                  type="date"
                  value={periodoInicio}
                  max={periodoFim || undefined}
                  onChange={(e) => {
                    setPeriodoInicio(e.target.value);
                    setPresetAtivo('custom');
                  }}
                  className="px-3 py-2 border rounded-lg bg-superficie
                            text-conteudo border-borda
                            focus:outline-none focus:ring-2 focus:ring-info transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-conteudo-tenue mb-1">
                  Até
                </label>
                <input
                  type="date"
                  value={periodoFim}
                  min={periodoInicio || undefined}
                  onChange={(e) => {
                    setPeriodoFim(e.target.value);
                    setPresetAtivo('custom');
                  }}
                  className="px-3 py-2 border rounded-lg bg-superficie
                            text-conteudo border-borda
                            focus:outline-none focus:ring-2 focus:ring-info transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-conteudo-suave mb-1">
                Status
              </label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-superficie
                          text-conteudo border-borda
                          focus:outline-none focus:ring-2 focus:ring-info transition-colors"
              >
                <option value="todos">Todos</option>
                <option value={StatusEnum.ABERTO}>Abertos</option>
                <option value={StatusEnum.EM_ANDAMENTO}>Em Andamento</option>
                <option value={StatusEnum.AGUARDANDO}>Aguardando</option>
                <option value={StatusEnum.RESOLVIDO}>Resolvidos</option>
              </select>
            </div>

            {/* Prioridade */}
            <div>
              <label className="block text-sm font-medium text-conteudo-suave mb-1">
                Prioridade
              </label>
              <select
                value={filtroPrioridade}
                onChange={(e) => setFiltroPrioridade(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-superficie
                          text-conteudo border-borda
                          focus:outline-none focus:ring-2 focus:ring-info transition-colors"
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
          <div className="bg-superficie border border-borda rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-conteudo-tenue">Total de Chamados</p>
                <p className="text-3xl font-semibold text-[#2563EB] dark:text-[#60A5FA] mt-2 tracking-tight">
                  {metricas.total}
                </p>
              </div>
              <div className="bg-blue-100/70 dark:bg-blue-900/50 p-3 rounded-full">
                <Ticket className="w-6 h-6 text-info-forte dark:text-info-suave" />
              </div>
            </div>
          </div>

          {/* Abertos */}
          <div className="bg-superficie border border-borda rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-conteudo-tenue">Abertos</p>
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
          <div className="bg-superficie border border-borda rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-conteudo-tenue">Em Andamento</p>
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
          <div className="bg-superficie border border-borda rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-conteudo-tenue">Resolvidos</p>
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
          <div className="bg-superficie border border-borda rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-conteudo-tenue">Arquivados</p>
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

        {/* ======================================== */}
        {/* MÉTRICAS DE SLA                          */}
        {/* ======================================== */}
        <div className="bg-superficie-elevada rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-conteudo mb-4">
            SLA
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-conteudo-tenue">
                Resolvidos dentro do prazo
              </p>
              <p
                className={`text-3xl font-bold ${
                  metricasSla.percentualNoPrazo !== null
                    ? 'text-sucesso-forte dark:text-sucesso-suave'
                    : 'text-conteudo-tenue'
                }`}
              >
                {metricasSla.percentualNoPrazo !== null
                  ? `${metricasSla.percentualNoPrazo}%`
                  : '—'}
              </p>
              <p className="text-xs text-conteudo-tenue">
                {metricasSla.percentualNoPrazo !== null
                  ? `de ${metricasSla.totalResolvidosComSla} chamado(s) resolvido(s) no período`
                  : 'sem dados de SLA no período'}
              </p>
            </div>
            <div>
              <p className="text-sm text-conteudo-tenue">
                Estourados em aberto
              </p>
              <p className="text-3xl font-bold text-perigo-forte dark:text-perigo-suave">
                {metricasSla.estouradosEmAberto}
              </p>
              <p className="text-xs text-conteudo-tenue">precisam de ação agora</p>
            </div>
            <div>
              <p className="text-sm text-conteudo-tenue">
                Em atenção (≥80% do prazo)
              </p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {metricasSla.emAtencao}
              </p>
              <p className="text-xs text-conteudo-tenue">prestes a estourar</p>
            </div>
          </div>
        </div>

        {/* Tempo Médio */}
        {metricas.tempoMedioResolucao > 0 && (
          <div className="bg-superficie border border-borda rounded-xl shadow-md p-6 mb-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-conteudo-tenue">Tempo Médio de Resolução</p>
                <p className="text-2xl font-bold text-info mt-2">
                  {metricas.tempoMedioResolucao}h
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/40 p-3 rounded-full">
                <Activity className="w-6 h-6 text-info" />
              </div>
            </div>
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Gráfico de Status */}
          <div className="bg-superficie border border-borda rounded-xl shadow-md p-6 transition-colors">
            <h3 className="text-lg font-semibold text-conteudo mb-4">
              Chamados por Status
            </h3>

            {metricas.porStatus.some(s => s.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <RChart>
                  <Pie
                    data={metricas.porStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    dataKey="value"
                    label={({ name, value }) => (value > 0 ? `${name}: ${value}` : '')}
                    stroke={estilo.dica.backgroundColor}
                    strokeWidth={2}
                  >
                    {metricas.porStatus.map((entry) => (
                      <Cell key={entry.name} fill={corDoStatus(entry.name, darkMode)} />
                    ))}
                  </Pie>

                  <Tooltip
                    wrapperStyle={{ outline: 'none' }}
                    contentStyle={estilo.dica}
                    labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
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
              <div className="h-[300px] flex items-center justify-center text-conteudo-tenue">
                Sem dados para exibir
              </div>
            )}
          </div>

          {/* Gráfico de Prioridade */}
          <div className="bg-superficie border border-borda rounded-xl shadow-md p-6 transition-colors">
            <h3 className="text-lg font-semibold text-conteudo mb-4">
              Chamados por Prioridade
            </h3>

            {metricas.porPrioridade.some(p => p.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metricas.porPrioridade}>
                  <CartesianGrid strokeDasharray="3 3" stroke={estilo.grade} />

                  <XAxis dataKey="name" stroke={estilo.eixo} tick={{ fill: estilo.texto }} />
                  <YAxis stroke={estilo.eixo} tick={{ fill: estilo.texto }} allowDecimals={false} />

                  <Tooltip
                    cursor={{ fill: estilo.grade, fillOpacity: 0.3 }}
                    wrapperStyle={{ outline: 'none' }}
                    contentStyle={estilo.dica}
                    labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                  />

                  <Bar dataKey="value" name="Chamados" radius={[8, 8, 0, 0]}>
                    {metricas.porPrioridade.map((entry) => (
                      <Cell key={entry.name} fill={corDaPrioridade(entry.name, darkMode)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

            ) : (
              <div className="h-[300px] flex items-center justify-center text-conteudo-tenue">
                Sem dados para exibir
              </div>
            )}
          </div>

        </div>

        {/* Top 5 Categorias */}
        {metricas.porCategoria.length > 0 && (
          <div className="bg-superficie border border-borda rounded-xl shadow-md p-6 mb-6 transition-colors">
            <h3 className="text-lg font-semibold text-conteudo mb-4">
              Top 5 Categorias
            </h3>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metricas.porCategoria} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={estilo.grade} horizontal={false} />

                <XAxis
                  type="number"
                  stroke={estilo.eixo}
                  tick={{ fill: estilo.texto }}
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke={estilo.eixo}
                  tick={{ fill: estilo.texto }}
                  width={150}
                />

                <Tooltip
                  cursor={{ fill: estilo.grade, fillOpacity: 0.3 }}
                  wrapperStyle={{ outline: 'none' }}
                  contentStyle={estilo.dica}
                  labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                />

                {/* A cor sai da POSIÇÃO na lista, e o índice vem do dado — não
                    da ordenação por valor. Se seguisse o tamanho da barra, uma
                    categoria mudaria de cor sempre que outra a ultrapassasse. */}
                <Bar dataKey="value" name="Chamados" radius={[0, 8, 8, 0]}>
                  {metricas.porCategoria.map((entry, idx) => (
                    <Cell key={entry.name} fill={corDaSerie(idx, darkMode)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabela de Chamados Recentes */}
        <div className="bg-superficie border border-borda rounded-xl shadow-md p-6 transition-colors">
          <h3 className="text-lg font-semibold text-conteudo text-info mb-4">
            Chamados Recentes
          </h3>

          {metricas.chamadosRecentes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-superficie-elevada border-b border-borda">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-conteudo-suave text-info">
                      Protocolo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-conteudo-suave text-info">
                      Título
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-conteudo-suave text-info">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-conteudo-suave text-info">
                      Prioridade
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-conteudo-suave text-info">
                      Data
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-conteudo-suave text-info">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-borda divide-borda">
                  {metricas.chamadosRecentes.map((chamado) => (
                    <tr
                      key={chamado.id}
                      className="transition-colors hover:bg-superficie-elevada/80"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-conteudo">
                        #{chamado.protocolo}
                      </td>

                      <td className="px-4 py-3 text-sm text-conteudo-suave max-w-xs truncate">
                        {chamado.titulo}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                              chamado.status
                            )}`}
                          >
                            {getStatusDisplay(chamado.status)}
                          </span>
                          {chamado.arquivado && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-alerta/15 text-alerta-forte dark:text-alerta-suave">
                              <Archive className="w-3 h-3" />
                              Arquivado
                            </span>
                          )}
                          {chamado.cancelado && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-perigo/15 text-perigo-forte dark:text-perigo-suave">
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

                      <td className="px-4 py-3 text-sm text-center text-conteudo-suave">
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
              <XCircle className="w-12 h-12 text-conteudo-tenue mx-auto mb-4" />
              <p className="text-conteudo-tenue text-lg">
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
