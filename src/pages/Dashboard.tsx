import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart as RChart,
  Pie,
  Cell,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { useChamados } from '../hooks/useChamados';
import { useAuth } from '../hooks/useAuth';
import { Chamado, StatusEnum, PrioridadeEnum } from '../types/api';
import { useNavigate } from 'react-router-dom';
import { chamadosService } from '../services/chamadoshsapi';
import { useTheme } from '../context/ThemeContext';
import { Seletor } from '../components/ui';
import { IconeAlerta, IconeArquivar, IconeAtividade, IconeCarregando, IconeChamado, IconeConfereCirculo, IconeFecharCirculo, IconeFiltro, IconeOlho, IconeOlhoFechado, IconeProibido, IconeRelogio, IconeSetaDireita } from '../components/ui/icones';
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
        cancelados: 0,
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

    /**
     * Separar do fluxo o que saiu dele.
     *
     * Cancelado entra aqui junto com arquivado, e não entrava: o filtro
     * descontava só `arquivado`, então com "Exibindo cancelados" ligado um
     * chamado cancelado com status "Aberto" era contado no card "Abertos".
     * CHAM-2026-0127 é exatamente isso — cancelado em 10/08, status "Aberto"
     * até hoje.
     *
     * As duas marcas são independentes do status justamente porque descrevem o
     * que aconteceu COM o chamado, não em que etapa ele está. Um contador de
     * trabalho pendente não pode ler o status sem antes perguntar se aquele
     * chamado ainda é trabalho.
     *
     * A métrica de SLA logo abaixo já excluía cancelados de "em aberto". Eram
     * duas contas na mesma tela discordando sobre o que é um chamado aberto.
     */
    const chamadosAtivos = chamadosFiltrados.filter(
      (c) => !c.arquivado && !c.cancelado
    );
    const chamadosArquivados = chamadosFiltrados.filter((c) => c.arquivado);
    // `&& !c.arquivado` para os dois cartões não contarem o mesmo chamado
    // duas vezes: dá para cancelar e depois arquivar. A precedência é a mesma
    // que o quadro usa — arquivado ganha.
    const chamadosCancelados = chamadosFiltrados.filter(
      (c) => c.cancelado && !c.arquivado
    );

    // Contadores por status (APENAS ATIVOS - fora arquivados e cancelados)
    // Nota: Resolvidos inclui também os Fechados (unificado no frontend)
    const abertos = chamadosAtivos.filter((c) => c.status === StatusEnum.ABERTO).length;
    const emAndamento = chamadosAtivos.filter((c) => c.status === StatusEnum.EM_ANDAMENTO).length;
    const resolvidos = chamadosAtivos.filter(
      (c) => c.status === StatusEnum.RESOLVIDO || c.status === StatusEnum.FECHADO
    ).length;
    const aguardando = chamadosAtivos.filter((c) => c.status === StatusEnum.AGUARDANDO).length;
    const arquivados = chamadosArquivados.length;
    const cancelados = chamadosCancelados.length;

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

    // Sobre os ATIVOS, como os cartões de status logo acima. Os dois gráficos
    // ficam lado a lado e precisam somar o mesmo total; enquanto este lia
    // `chamadosFiltrados` e aquele lia `chamadosAtivos`, ligar "Exibindo
    // cancelados" engordava um e não mexia no outro.
    chamadosAtivos.forEach((c) => {
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
    chamadosAtivos.forEach((c) => {
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
    // Também sobre os ativos: chamado cancelado não teve resolução para
    // entrar numa média de tempo de resolução.
    const chamadosComResolucao = chamadosAtivos.filter(
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
      // O total é de trabalho, e por isso conta os ativos. Arquivados e
      // cancelados têm cartão próprio logo ao lado — ficam visíveis sem
      // inflar o número que alguém lê como "quantos chamados temos".
      total: chamadosAtivos.length,
      abertos,
      emAndamento,
      aguardando,
      resolvidos,
      arquivados,
      cancelados,
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

  // Função para exibir o status (Fechado vira Resolvido visualmente)
  const getStatusDisplay = (status: StatusEnum): string => {
    return status === StatusEnum.FECHADO ? 'Resolvido' : status;
  };

  /**
   * Selo de status e de prioridade, com a cor vinda de `graficos.ts`.
   *
   * Esta tela mantinha a TERCEIRA tabela de cores de status do sistema, e as
   * três discordavam: aqui "Aberto" era azul, no quadro rosa e no detalhe
   * outro azul; "Baixa" era verde, que neste sistema significa SLA no prazo.
   * O mesmo chamado trocava de cor conforme a tela por onde fosse aberto — e a
   * fatia da pizza logo acima já usava a cor certa, então a divergência estava
   * dentro da própria página.
   *
   * O texto fica em `--conteudo`: assim o contraste é o do tema, garantido, em
   * vez de depender de cada cor de status ter contraste suficiente contra a
   * própria versão esmaecida.
   */
  const seloDaCor = (cor: string): React.CSSProperties => ({
    backgroundColor: `${cor}22`,
    borderLeft: `2px solid ${cor}`,
  });

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
      <div className="flex min-h-full items-center justify-center">
        <div className="text-center">
          <IconeCarregando className="w-12 h-12 animate-spin text-sinal mx-auto mb-4" />
          <p className="text-conteudo-suave">
            Carregando dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

        {/* Cabeçalho da página. O `<div>` de moldura que pintava o fundo saiu:
            quem pinta agora é o `<main>` da casca. */}
        <div className="rounded-xl border border-borda bg-superficie px-5 py-4">
          <h1 className="text-xl font-extrabold tracking-tight text-conteudo">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-conteudo-tenue">
            Bem-vindo, <span className="font-semibold text-conteudo-suave">{user?.username}</span>{' '}
            ({user?.role}) — situação atual dos chamados do sistema.
          </p>
        </div>

        {/* Filtros */}
        <div className="rounded-xl border border-borda bg-superficie p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <IconeFiltro className="h-4 w-4 text-conteudo-tenue" />
              <h2 className="text-sm font-semibold text-conteudo">Filtros</h2>
            </div>

            {/* Botão Toggle Cancelados */}
            <button
              onClick={() => setIncluirCancelados(!incluirCancelados)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                incluirCancelados
                  ? 'border-perigo/30 bg-perigo/20 text-perigo-forte hover:bg-perigo/30 dark:text-perigo-suave'
                  : 'border-borda bg-superficie-elevada text-conteudo-suave hover:text-conteudo'
              }`}
              title={incluirCancelados ? 'Ocultar cancelados' : 'Mostrar cancelados'}
            >
              {incluirCancelados ? (
                <>
                  <IconeOlho className="w-4 h-4" />
                  <span className="hidden sm:inline">Exibindo cancelados</span>
                </>
              ) : (
                <>
                  <IconeOlhoFechado className="w-4 h-4" />
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
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    presetAtivo === p.key
                      ? 'border-transparent bg-sinal text-white dark:text-superficie-base'
                      : 'border-borda bg-superficie-elevada text-conteudo-suave hover:text-conteudo'
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
                  className="rounded-lg border border-borda bg-superficie px-3 py-2 text-sm
                            text-conteudo transition-colors hover:border-conteudo-tenue
                            focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sinal"
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
                  className="rounded-lg border border-borda bg-superficie px-3 py-2 text-sm
                            text-conteudo transition-colors hover:border-conteudo-tenue
                            focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sinal"
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
              {/* Cada opção leva a cor que aquele status tem nos gráficos
                  logo abaixo. É a mesma fonte, `corDoStatus`. */}
              <Seletor
                rotulo="Filtrar por status"
                valor={filtroStatus}
                aoMudar={setFiltroStatus}
                opcoes={[
                  { valor: 'todos', rotulo: 'Todos' },
                  { valor: StatusEnum.ABERTO, rotulo: 'Abertos', cor: corDoStatus('Aberto', darkMode) },
                  {
                    valor: StatusEnum.EM_ANDAMENTO,
                    rotulo: 'Em Andamento',
                    cor: corDoStatus('Em Andamento', darkMode),
                  },
                  {
                    valor: StatusEnum.AGUARDANDO,
                    rotulo: 'Aguardando',
                    cor: corDoStatus('Aguardando', darkMode),
                  },
                  {
                    valor: StatusEnum.RESOLVIDO,
                    rotulo: 'Resolvidos',
                    cor: corDoStatus('Resolvido', darkMode),
                  },
                ]}
              />
            </div>

            {/* Prioridade */}
            <div>
              <label className="block text-sm font-medium text-conteudo-suave mb-1">
                Prioridade
              </label>
              <Seletor
                rotulo="Filtrar por prioridade"
                valor={filtroPrioridade}
                aoMudar={setFiltroPrioridade}
                opcoes={[
                  { valor: 'todas', rotulo: 'Todas' },
                  ...[
                    PrioridadeEnum.BAIXA,
                    PrioridadeEnum.MEDIA,
                    PrioridadeEnum.ALTA,
                    PrioridadeEnum.CRITICA,
                  ].map((p) => ({
                    valor: p,
                    rotulo: p,
                    cor: corDaPrioridade(p, darkMode),
                  })),
                ]}
              />
            </div>

          </div>
        </div>

        {/* KPIs
            Eram cinco blocos quase idênticos com hexadecimal cravado, e as
            cores discordavam da fatia da pizza logo abaixo — o mesmo "Abertos"
            aparecia rosa no gráfico e num rosa diferente no cartão.
            Os três que SÃO status puxam a cor de `corDoStatus`. */}
        {/* Seis cartões: 3+3 em telas médias, um por coluna a partir de xl.
            Eram cinco em `lg:grid-cols-5`; enfileirar seis naquela largura
            deixaria cada um com menos de 170px. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            // O total é a soma, não um status: não recebe cor de significado.
            { rotulo: 'Total de Chamados', valor: metricas.total, Icone: IconeChamado, cor: null },
            {
              rotulo: 'Abertos',
              valor: metricas.abertos,
              Icone: IconeAlerta,
              cor: corDoStatus('Aberto', darkMode),
            },
            {
              rotulo: 'Em Andamento',
              valor: metricas.emAndamento,
              Icone: IconeRelogio,
              cor: corDoStatus('Em Andamento', darkMode),
            },
            {
              rotulo: 'Resolvidos',
              valor: metricas.resolvidos,
              Icone: IconeConfereCirculo,
              cor: corDoStatus('Resolvido', darkMode),
            },
            // Arquivado não é status do chamado, é uma marca sobre ele. Usa a
            // mesma cor do selo "Arquivado" da tabela abaixo.
            { rotulo: 'Arquivados', valor: metricas.arquivados, Icone: IconeArquivar, cor: null },
            // Cancelado saiu dos contadores de status — sem cartão próprio, o
            // número desapareceria da tela e ligar "Exibindo cancelados" não
            // teria efeito visível nenhum aqui em cima.
            { rotulo: 'Cancelados', valor: metricas.cancelados, Icone: IconeProibido, cor: null },
          ].map(({ rotulo, valor, Icone, cor }) => (
            <div
              key={rotulo}
              // `border-l-4` na cor do status: é a marca que o HelpHS usa nos
              // cartões de indicador, e ela diz de relance a que status o
              // número pertence sem depender de ler o rótulo.
              className="rounded-xl border border-l-4 border-borda bg-superficie p-5"
              style={cor ? { borderLeftColor: cor } : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-conteudo-tenue">
                    {rotulo}
                  </p>
                  <p
                    className="mt-2 text-3xl font-bold tabular-nums text-conteudo"
                    style={cor ? { color: cor } : undefined}
                  >
                    {valor}
                  </p>
                </div>
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-superficie-elevada"
                  style={cor ? { backgroundColor: `${cor}1A` } : undefined}
                >
                  <Icone
                    className="h-5 w-5 text-conteudo-tenue"
                    style={cor ? { color: cor } : undefined}
                  />
                </div>
              </div>
            </div>
          ))}

        </div>

        {/* ======================================== */}
        {/* MÉTRICAS DE SLA                          */}
        {/* ======================================== */}
        <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
          <div className="border-b border-borda px-5 py-4">
            <p className="text-sm font-semibold text-conteudo">SLA</p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-conteudo-tenue">
                Resolvidos dentro do prazo
              </p>
              <p
                className={`mt-2 text-3xl font-bold tabular-nums ${
                  metricasSla.percentualNoPrazo !== null
                    ? 'text-sucesso-forte dark:text-sucesso-suave'
                    : 'text-conteudo-tenue'
                }`}
              >
                {metricasSla.percentualNoPrazo !== null
                  ? `${metricasSla.percentualNoPrazo}%`
                  : '—'}
              </p>
              <p className="mt-1.5 text-xs text-conteudo-tenue">
                {metricasSla.percentualNoPrazo !== null
                  ? `de ${metricasSla.totalResolvidosComSla} chamado(s) resolvido(s) no período`
                  : 'sem dados de SLA no período'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-conteudo-tenue">
                Estourados em aberto
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-perigo-forte dark:text-perigo-suave">
                {metricasSla.estouradosEmAberto}
              </p>
              <p className="mt-1.5 text-xs text-conteudo-tenue">precisam de ação agora</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-conteudo-tenue">
                Em atenção (≥80% do prazo)
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-alerta-forte dark:text-alerta-suave">
                {metricasSla.emAtencao}
              </p>
              <p className="mt-1.5 text-xs text-conteudo-tenue">prestes a estourar</p>
            </div>
          </div>
        </div>

        {/* Tempo Médio */}
        {metricas.tempoMedioResolucao > 0 && (
          <div className="rounded-xl border border-l-4 border-borda border-l-sinal bg-superficie p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-conteudo-tenue">
                  Tempo médio de resolução
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-sinal">
                  {metricas.tempoMedioResolucao}h
                </p>
                <p className="mt-1.5 text-xs text-conteudo-tenue">
                  média dos chamados resolvidos no período
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sinal/10">
                <IconeAtividade className="h-5 w-5 text-sinal" />
              </div>
            </div>
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* Gráfico de Status */}
          <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
            <div className="border-b border-borda px-5 py-4">
              <p className="text-sm font-semibold text-conteudo">Chamados por Status</p>
            </div>

            <div className="p-5">
            {metricas.porStatus.some(s => s.value > 0) ? (
              <>
                {/* Rosca com o total no meio, como a do HelpHS.
                    Era pizza cheia com o rótulo escrito por cima de cada fatia,
                    e numa fatia estreita o texto saía por fora e encavalava no
                    vizinho. Os nomes e os números foram para a lista abaixo,
                    onde cabem sempre e ficam alinhados numa coluna só. */}
                <div className="relative">
                  <ResponsiveContainer width="100%" height={190}>
                    <RChart>
                      <Pie
                        data={metricas.porStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={86}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
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
                    </RChart>
                  </ResponsiveContainer>

                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold tabular-nums text-conteudo">
                      {metricas.porStatus.reduce((soma, item) => soma + item.value, 0)}
                    </p>
                    <p className="text-xs text-conteudo-tenue">no fluxo</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-1.5">
                  {metricas.porStatus.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: corDoStatus(item.name, darkMode) }}
                        />
                        <span className="text-xs text-conteudo-suave">{item.name}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-conteudo">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-conteudo-tenue">
                Sem dados para exibir
              </div>
            )}
            </div>
          </div>

          {/* Gráfico de Prioridade */}
          <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
            <div className="border-b border-borda px-5 py-4">
              <p className="text-sm font-semibold text-conteudo">Chamados por Prioridade</p>
            </div>

            <div className="p-5">
            {metricas.porPrioridade.some(p => p.value > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={metricas.porPrioridade} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  {/* Só a grade horizontal: as verticais competiam com as
                      próprias barras, que já marcam a posição no eixo. */}
                  <CartesianGrid strokeDasharray="3 3" stroke={estilo.grade} vertical={false} />

                  <XAxis dataKey="name" tick={{ fill: estilo.texto, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: estilo.texto, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />

                  <Tooltip
                    cursor={{ fill: estilo.grade, fillOpacity: 0.3 }}
                    wrapperStyle={{ outline: 'none' }}
                    contentStyle={estilo.dica}
                    labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                  />

                  <Bar dataKey="value" name="Chamados" radius={[6, 6, 0, 0]}>
                    {metricas.porPrioridade.map((entry) => (
                      <Cell key={entry.name} fill={corDaPrioridade(entry.name, darkMode)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-conteudo-tenue">
                Sem dados para exibir
              </div>
            )}
            </div>
          </div>

        </div>

        {/* Top 5 Categorias */}
        {metricas.porCategoria.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
            <div className="border-b border-borda px-5 py-4">
              <p className="text-sm font-semibold text-conteudo">Top 5 Categorias</p>
            </div>

            <div className="p-5">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={metricas.porCategoria} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={estilo.grade} horizontal={false} />

                <XAxis
                  type="number"
                  tick={{ fill: estilo.texto, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                {/* 120px, e não 150: a barra lateral foi de 224px para 256px e
                    esses 32px saíram da largura útil da página. Com 150 as
                    barras do gráfico ficavam espremidas contra o rótulo. */}
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: estilo.texto, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
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
                <Bar dataKey="value" name="Chamados" radius={[0, 6, 6, 0]}>
                  {metricas.porCategoria.map((entry, idx) => (
                    <Cell key={entry.name} fill={corDaSerie(idx, darkMode)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tabela de Chamados Recentes */}
        <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
          <div className="border-b border-borda px-5 py-4">
            <p className="text-sm font-semibold text-conteudo">Chamados Recentes</p>
          </div>

          <div className="p-5">
          {metricas.chamadosRecentes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-superficie-elevada border-b border-borda">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-conteudo-suave">
                      Protocolo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-conteudo-suave">
                      Título
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-conteudo-suave">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-conteudo-suave">
                      Prioridade
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-conteudo-suave">
                      Data
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-conteudo-suave">
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
                            className="inline-flex px-2 py-1 text-xs font-semibold text-conteudo"
                            style={seloDaCor(
                              corDoStatus(getStatusDisplay(chamado.status), darkMode)
                            )}
                          >
                            {getStatusDisplay(chamado.status)}
                          </span>
                          {chamado.arquivado && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-alerta/15 text-alerta-forte dark:text-alerta-suave">
                              <IconeArquivar className="w-3 h-3" />
                              Arquivado
                            </span>
                          )}
                          {chamado.cancelado && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-perigo/15 text-perigo-forte dark:text-perigo-suave">
                              <IconeProibido className="w-3 h-3" />
                              Cancelado
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex px-2 py-1 text-xs font-semibold text-conteudo"
                          style={seloDaCor(corDaPrioridade(chamado.prioridade, darkMode))}
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
                          className="text-sinal hover:brightness-110 font-medium inline-flex items-center gap-1"
                        >
                          Ver detalhes
                          <IconeSetaDireita className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <IconeFecharCirculo className="w-12 h-12 text-conteudo-tenue mx-auto mb-4" />
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
