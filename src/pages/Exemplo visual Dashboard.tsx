import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Filter,
  Home,
  Activity,
  DollarSign,
  PieChart,
  Search,
  Download,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart as RChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import { useAuth } from '../hooks/useAuth';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const DashboardPatrimonio: React.FC = () => {
  const { user } = useAuth();
  const {
    patrimonios,
    categorias,
    setores,
    usuarios,
    filtros,
    setFiltros,
    loading,
    error,
    patrimoniosFiltrados,
    kpis,
    refreshData,
    initializeData,  // <- ADICIONAR
    initialized,      // <- ADICIONAR
  } = useDashboard();

  // Estados locais para paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [buscaLocal, setBuscaLocal] = useState('');
  const itensPorPagina = 10;

  const CORES_GRAFICO = ['#3b82f6', '#22c55e', '#facc15', '#ef4444', '#a855f7'];

  // 2. ADICIONAR este useEffect ANTES do useEffect de busca:
  // Inicializa dados quando o componente monta (após login)
  useEffect(() => {
    if (user && !initialized) {
      initializeData();
    }
  }, [user, initialized, initializeData]);

  // Atualiza busca no contexto com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltros({ ...filtros, busca: buscaLocal });
    }, 300);
    return () => clearTimeout(timer);
  }, [buscaLocal]);

  // Dados para gráficos
  const dadosGraficos = useMemo(() => {
    // Distribuição por Categoria
    const distribuicaoCategoria = categorias
      .map((cat) => {
        const patrimoniosCategoria = patrimoniosFiltrados.filter(
          (p) => p.categoria_id === cat.id,
        );
        const valor = patrimoniosCategoria.reduce(
          (sum, p) => sum + p.valor_atual,
          0,
        );
        return {
          name: cat.nome,
          value: valor,
        };
      })
      .filter((item) => item.value > 0);

    // Distribuição por Setor
    const distribuicaoSetor = setores
      .map((setor) => {
        const patrimoniosSetor = patrimoniosFiltrados.filter(
          (p) => p.setor_id === setor.id,
        );
        return {
          name: setor.nome,
          value: patrimoniosSetor.length,
        };
      })
      .filter((item) => item.value > 0);

    // Depreciação por Categoria
    const depreciacaoCategoria = categorias
      .map((cat) => {
        const patrimoniosCategoria = patrimoniosFiltrados.filter(
          (p) => p.categoria_id === cat.id,
        );
        const depreciacao = patrimoniosCategoria.reduce(
          (sum, p) => sum + (p.valor_aquisicao - p.valor_atual),
          0,
        );
        return {
          categoria: cat.nome,
          valor: depreciacao,
        };
      })
      .filter((item) => item.valor > 0);

    // Valor por Responsável
    const valorResponsavel = usuarios
      .map((user) => {
        const patrimoniosUser = patrimoniosFiltrados.filter(
          (p) => p.responsavel_id === user.id,
        );
        const valor = patrimoniosUser.reduce(
          (sum, p) => sum + p.valor_atual,
          0,
        );
        return {
          responsavel: user.username,
          valor: valor,
        };
      })
      .filter((item) => item.valor > 0)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10); // Top 10 responsáveis

    return {
      distribuicaoCategoria,
      distribuicaoSetor,
      depreciacaoCategoria,
      valorResponsavel,
    };
  }, [patrimoniosFiltrados, categorias, setores, usuarios]);

  const isMobile = window.innerWidth < 768;

  // Paginação
  const dadosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return patrimoniosFiltrados.slice(inicio, fim);
  }, [patrimoniosFiltrados, paginaAtual]);

  const totalPaginas = Math.ceil(patrimoniosFiltrados.length / itensPorPagina);
  const inicio = (paginaAtual - 1) * itensPorPagina + 1;
  const fim = Math.min(
    paginaAtual * itensPorPagina,
    patrimoniosFiltrados.length,
  );

  // Páginas visíveis na navegação
  const paginasVisiveis = useMemo(() => {
    const window = Math.min(5, totalPaginas);
    let start = 1;
    if (totalPaginas > 5) {
      if (paginaAtual <= 3) start = 1;
      else if (paginaAtual >= totalPaginas - 2) start = totalPaginas - 4;
      else start = paginaAtual - 2;
    }
    return Array.from({ length: window }, (_, i) => start + i);
  }, [paginaAtual, totalPaginas]);

  // Handlers
  const handleFiltroChange = useCallback(
    (campo: string, valor: string) => {
      setFiltros({ ...filtros, [campo]: valor });
      setPaginaAtual(1); // Reset página ao filtrar
    },
    [filtros, setFiltros],
  );

  const handleExportarExcel = useCallback(() => {
    if (patrimoniosFiltrados.length === 0) {
      alert('Nenhum dado para exportar!');
      return;
    }

    // Monta os dados que vão pro Excel
    const dados = patrimoniosFiltrados.map((bem) => ({
      Nome: bem.nome,
      Categoria:
        categorias.find((c) => c.id === bem.categoria_id)?.nome || 'N/A',
      Responsavel:
        usuarios.find((u) => u.id === bem.responsavel_id)?.username || 'N/A',
      Setor: setores.find((s) => s.id === bem.setor_id)?.nome || 'N/A',
      'Data de Aquisição': bem.data_aquisicao
        ? new Date(bem.data_aquisicao).toLocaleDateString('pt-BR')
        : 'N/A',
      'Valor Atual (R$)': bem.valor_atual?.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }),
      'Depreciação (R$)': (
        (bem.valor_aquisicao || 0) - (bem.valor_atual || 0)
      ).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }),
      Situação:
        bem.status === 'ativo'
          ? 'Ativo'
          : bem.status === 'manutencao'
            ? 'Manutenção'
            : 'Baixado',
    }));

    // Cria o workbook e a planilha
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dados);
    XLSX.utils.book_append_sheet(wb, ws, 'Patrimonios');

    // Converte para blob e baixa
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(
      blob,
      `Patrimonios_ControlHS_${new Date().toISOString().split('T')[0]}.xlsx`,
    );
  }, [patrimoniosFiltrados, categorias, setores, usuarios]);

  // Função auxiliar para obter nome por ID
  const getNomeCategoria = (id: number) =>
    categorias.find((c) => c.id === id)?.nome || 'N/A';
  const getNomeSetor = (id: number) =>
    setores.find((s) => s.id === id)?.nome || 'N/A';
  const getNomeUsuario = (id: number) =>
    usuarios.find((u) => u.id === id)?.username || 'N/A';

  // Mapear status para exibição
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, string> = {
      ativo: 'Ativo',
      manutencao: 'Manutenção',
      baixado: 'Baixado',
    };
    return statusMap[status] || status;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-full bg-gray-100 dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">
            Carregando dados do patrimônio...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-full bg-gray-100 dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center bg-white dark:bg-[#1e1e1e] rounded-xl p-8 shadow-lg max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Erro ao carregar dados
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar Novamente
          </button>
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
              Patrimônio - Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Bem-vindo, <span className="font-semibold">{user?.username}</span>{' '}
              ({user?.role})
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              Visualize os indicadores e a situação atual dos bens patrimoniais
              da empresa.
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
            <button
              onClick={refreshData}
              className="px-2 py-1 text-sm font-medium rounded-lg
                        text-white 
                        bg-blue-600 hover:bg-blue-700 
                        dark:bg-blue-500 dark:hover:bg-blue-600
                        shadow-sm hover:shadow-md
                        transition-all duration-200"
            >
              Atualizar Dados
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoria
              </label>
              <select
                value={filtros.categoria}
                onChange={(e) =>
                  handleFiltroChange('categoria', e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                          text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                          focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="todas">Todas</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.nome.toLowerCase()}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Setor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Setor
              </label>
              <select
                value={filtros.setor}
                onChange={(e) => handleFiltroChange('setor', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                          text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                          focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="todos">Todos</option>
                {setores.map((setor) => (
                  <option key={setor.id} value={setor.nome.toLowerCase()}>
                    {setor.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Situação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Situação
              </label>
              <select
                value={filtros.situacao}
                onChange={(e) => handleFiltroChange('situacao', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                          text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                          focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="todas">Todas</option>
                <option value="ativos">Ativos</option>
                <option value="manutencao">Manutenção</option>
                <option value="baixados">Baixados</option>
              </select>
            </div>

            {/* Responsável */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Responsável
              </label>
              <select
                value={filtros.responsavel}
                onChange={(e) =>
                  handleFiltroChange('responsavel', e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                          text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                          focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="todos">Todos</option>
                {usuarios.map((user) => (
                  <option key={user.id} value={user.username.toLowerCase()}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {/* Aquisição - Início */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Aquisição - Início
              </label>
              <input
                type="date"
                value={filtros.dataInicio || ''}
                onChange={(e) =>
                  handleFiltroChange('dataInicio', e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                          text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                          focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Aquisição - Fim */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Aquisição - Fim
              </label>
              <input
                type="date"
                value={filtros.dataFim || ''}
                onChange={(e) => handleFiltroChange('dataFim', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                          text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                          focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Filtros Personalizados */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filtros Personalizados
              </label>
              <select
                value={filtros.filtroPersonalizado}
                onChange={(e) =>
                  handleFiltroChange('filtroPersonalizado', e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                          text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                          focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="nenhum">Nenhum</option>
                <option value="antigos">Bens acima de 5 anos</option>
                <option value="depreciados">Totalmente depreciados</option>
                <option value="em_alta">Com alto valor residual</option>
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
                  Total de Itens
                </p>
                <p className="text-3xl font-semibold text-blue-500 dark:text-blue-300 mt-2 tracking-tight">
                  {kpis.totalItens.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="bg-blue-100/70 dark:bg-blue-900/50 p-3 rounded-full">
                <Home className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  Valor Total
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {kpis.valorTotal.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/40 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  Depreciação Acumulada
                </p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                  {kpis.depreciacaoAcumulada.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/40 p-3 rounded-full">
                <Activity className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  Bens Ativos
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {kpis.ativos.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {kpis.manutencao > 0 && `${kpis.manutencao} Manutenção`}
                  {kpis.baixados > 0 && ` | ${kpis.baixados} baixados`}
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/40 p-3 rounded-full">
                <PieChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Distribuição de Valor por Categoria */}
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Distribuição de Valor por Categoria
            </h3>

            {dadosGraficos.distribuicaoCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RChart>
                  <Pie
                    data={dadosGraficos.distribuicaoCategoria}
                    cx="50%"
                    cy="50%"
                    outerRadius={80} // tamanho original restaurado
                    dataKey="value"
                    label={({ name, value }) =>
                      value ? `${name}: ${(value / 1000).toFixed(0)}k` : name
                    }
                  >
                    {dadosGraficos.distribuicaoCategoria.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CORES_GRAFICO[index % CORES_GRAFICO.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value: number) =>
                      value.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })
                    }
                  />

                  {/* Legenda com espaçamento refinado e fonte menor */}
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{
                      marginTop: 10,
                      fontSize: '12px', // fonte um pouco menor para não pesar
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

          {/* Distribuição por Setor */}
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Distribuição por Setor
            </h3>

            {dadosGraficos.distribuicaoSetor.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RChart>
                  <Pie
                    data={dadosGraficos.distribuicaoSetor}
                    cx="50%"
                    cy="50%"
                    outerRadius={80} // mantém o tamanho original do gráfico
                    dataKey="value"
                    label={({ name, value }) => {
                      if (typeof value === 'number') {
                        return `${name}: ${value}`;
                      }
                      return name;
                    }}
                  >
                    {dadosGraficos.distribuicaoSetor.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CORES_GRAFICO[index % CORES_GRAFICO.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value: number) =>
                      typeof value === 'number'
                        ? value.toLocaleString('pt-BR')
                        : value
                    }
                  />

                  {/* Legenda com mesmo ajuste visual do outro gráfico */}
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

          {/* Depreciação por Categoria */}
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Depreciação por Categoria
            </h3>
            {dadosGraficos.depreciacaoCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={dadosGraficos.depreciacaoCategoria}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis dataKey="categoria" type="category" width={120} />
                  <Bar dataKey="valor" fill="#f59e0b" />
                  <Tooltip
                    formatter={(value: number) =>
                      value.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })
                    }
                    contentStyle={{
                      backgroundColor: '#f9fafb',
                      color: '#000',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                    }}
                    itemStyle={{ color: '#000' }}
                    labelStyle={{ color: '#f59e0b', fontWeight: 600 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                Sem dados para exibir
              </div>
            )}
          </div>

          {/* Distribuição de Valor por Responsável */}
          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Top 10 - Valor por Responsável
            </h3>
            {dadosGraficos.valorResponsavel.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={dadosGraficos.valorResponsavel}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis dataKey="responsavel" type="category" width={100} />
                  <Bar dataKey="valor" fill="#2563eb" />
                  <Tooltip
                    formatter={(value: number) =>
                      value.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })
                    }
                    contentStyle={{
                      backgroundColor: '#f9fafb',
                      color: '#000',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                    }}
                    itemStyle={{ color: '#000' }}
                    labelStyle={{ color: '#2563eb', fontWeight: 600 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                Sem dados para exibir
              </div>
            )}
          </div>
        </div>

        {/* Tabela de Bens Patrimoniais */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 md:mb-0">
              Bens Patrimoniais
            </h3>

            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar bem..."
                  value={buscaLocal}
                  onChange={(e) => setBuscaLocal(e.target.value)}
                  className="pl-10 pr-3 py-2 w-full md:w-64 rounded-lg border 
                            focus:outline-none focus:ring-2 focus:ring-blue-500
                            bg-white dark:bg-[#2a2a2a]
                            text-gray-800 dark:text-gray-200
                            border-gray-300 dark:border-gray-600
                            placeholder-gray-400 dark:placeholder-gray-500
                            transition-colors"
                />
              </div>

              <button
                onClick={handleExportarExcel}
                className="flex items-center justify-center gap-2 px-4 py-2 
                          bg-gradient-to-r from-green-500 to-emerald-600 
                          text-white font-medium rounded-lg shadow-md
                          hover:from-green-400 hover:to-emerald-500 
                          dark:hover:from-green-600 dark:hover:to-green-500
                          transition-all duration-300"
              >
                <Download className="w-4 h-4" />
                Exportar Excel
              </button>
            </div>
          </div>

          {/* Tabela */}
          {patrimoniosFiltrados.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-[#2a2a2a] border-b border-gray-200 dark:border-[#2d2d2d]">
                    <tr>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Nome
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                        Categoria
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                        Responsável
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                        Localização
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                        Data de Aquisição
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                        Valor Atual
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                        Depreciação
                      </th>

                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                        Situação
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 dark:divide-[#2d2d2d]">
                    {dadosPaginados.map((bem) => {
                      const depreciacao = (bem.valor_aquisicao || 0) - (bem.valor_atual || 0);

                      return (
                        <tr
                          key={bem.id}
                          className="hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {bem.nome}

                            {bem.numero_serie && (
                              <span className="block text-xs text-gray-500 dark:text-gray-400">
                                SN: {bem.numero_serie}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">
                            {getNomeCategoria(bem.categoria_id)}
                          </td>

                          <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">
                            {getNomeUsuario(bem.responsavel_id)}
                          </td>

                          <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">
                            {getNomeSetor(bem.setor_id)}
                          </td>

                          <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">
                            {bem.data_aquisicao
                              ? new Date(bem.data_aquisicao).toLocaleDateString("pt-BR")
                              : "N/A"}
                          </td>

                          <td className="px-4 py-3 text-sm text-center font-semibold text-blue-600 dark:text-blue-400">
                            {(bem.valor_atual || 0).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </td>

                          <td className="px-4 py-3 text-sm text-center font-semibold text-yellow-600 dark:text-yellow-400">
                            {depreciacao.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                                ${
                                  bem.status === "ativo"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400"
                                    : bem.status === "manutencao"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400"
                                    : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400"
                                }`}
                            >
                              {getStatusDisplay(bem.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div className="mt-6 pt-4 px-6 pb-4 border-t border-gray-200 dark:border-[#2d2d2d]">
                  {/* Desktop */}
                  <div className="hidden md:flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
                    <div>
                      Mostrando {inicio} a {fim} de{' '}
                      {patrimoniosFiltrados.length} registros
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setPaginaAtual((prev) => Math.max(1, prev - 1))
                        }
                        disabled={paginaAtual === 1}
                        className="px-3 py-1 border rounded-lg
                                  bg-white dark:bg-[#1f1f1f]
                                  border-gray-300 dark:border-gray-600
                                  text-gray-700 dark:text-gray-300
                                  hover:bg-gray-50 dark:hover:bg-[#2a2a2a]
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                  transition-colors"
                      >
                        Anterior
                      </button>

                      <div className="flex gap-1">
                        {paginasVisiveis.map((page) => (
                          <button
                            key={page}
                            onClick={() => setPaginaAtual(page)}
                            className={`px-3 py-1 border rounded-lg transition-colors
                              ${
                                paginaAtual === page
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white dark:bg-[#1f1f1f] border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                              }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() =>
                          setPaginaAtual((prev) =>
                            Math.min(totalPaginas, prev + 1),
                          )
                        }
                        disabled={paginaAtual === totalPaginas}
                        className="px-3 py-1 border rounded-lg
                                  bg-white dark:bg-[#1f1f1f]
                                  border-gray-300 dark:border-gray-600
                                  text-gray-700 dark:text-gray-300
                                  hover:bg-gray-50 dark:hover:bg-[#2a2a2a]
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                  transition-colors"
                      >
                        Próximo
                      </button>
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="flex flex-col md:hidden items-center mt-3 text-sm text-gray-600 dark:text-gray-300">
                    {/* Texto de registros */}
                    <div className="mb-2">
                      Mostrando {inicio} a {fim} de{' '}
                      {patrimoniosFiltrados.length} registros
                    </div>

                    {/* Botões de paginação */}
                    <div className="flex justify-center gap-2 items-center">
                      <button
                        onClick={() =>
                          setPaginaAtual((prev) => Math.max(1, prev - 1))
                        }
                        disabled={paginaAtual === 1}
                        className="px-3 py-1 border rounded-lg
                                bg-white dark:bg-[#1f1f1f]
                                border-gray-300 dark:border-gray-600
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-50 dark:hover:bg-[#2a2a2a]
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-colors"
                      >
                        {'<'}
                      </button>

                      <span
                        className="px-3 py-1 border rounded-lg
                                    bg-white dark:bg-[#1f1f1f]
                                    text-gray-700 dark:text-gray-300
                                    border-gray-300 dark:border-gray-600"
                      >
                        {paginaAtual}
                      </span>

                      <button
                        onClick={() =>
                          setPaginaAtual((prev) =>
                            Math.min(totalPaginas, prev + 1),
                          )
                        }
                        disabled={paginaAtual === totalPaginas}
                        className="px-3 py-1 border rounded-lg
                                bg-white dark:bg-[#1f1f1f]
                                border-gray-300 dark:border-gray-600
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-50 dark:hover:bg-[#2a2a2a]
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-colors"
                      >
                        {'>'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Nenhum bem encontrado com os filtros selecionados
              </p>
              <button
                onClick={() => {
                  setFiltros({
                    categoria: 'todas',
                    setor: 'todos',
                    situacao: 'todas',
                    responsavel: 'todos',
                    dataInicio: undefined,
                    dataFim: undefined,
                    filtroPersonalizado: 'nenhum',
                    busca: '',
                  });
                  setBuscaLocal('');
                }}
                className="mt-2 px-2 py-1 text-sm font-medium rounded-lg
                          text-white 
                          bg-blue-600 hover:bg-blue-700 
                          dark:bg-blue-500 dark:hover:bg-blue-600
                          shadow-sm hover:shadow-md
                          transition-all duration-200"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPatrimonio;
