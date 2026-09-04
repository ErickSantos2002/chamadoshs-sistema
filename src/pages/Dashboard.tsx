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
import { Link } from 'react-router-dom';
import { chamadosService } from '../services/chamadoshsapi';
import { useTheme } from '../context/ThemeContext';
import {
  Aviso,
  Badge,
  BlocoCarregando,
  Campo,
  Card,
  CardHeader,
  Input,
  Seletor,
  Tabela,
  TabelaCabecalho,
  TabelaCelula,
  TabelaCelulaDeCabecalho,
  TabelaCorpo,
  TabelaLinha,
} from '../components/ui';
import {
  MarcaBadge,
  PrioridadeBadge,
  VARIANTE_DE_STATUS,
} from '../components/SelosDeChamado';
import { IconeAlerta, IconeArquivar, IconeAtividade, IconeChamado, IconeConfereCirculo, IconeFecharCirculo, IconeFiltro, IconeOlho, IconeOlhoFechado, IconeProibido, IconeRelogio, IconeSetaDireita } from '../components/ui/icones';
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

  // Estados locais
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
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
        setErro(null);
      } catch (err) {
        console.error('Erro ao carregar chamados do dashboard:', err);
        // A falha PRECISA aparecer na tela.
        //
        // Antes o `catch` so escrevia no console: `chamados` ficava em [], o
        // `loading` caia, e o painel renderizava zeros. Falha de rede ficava
        // IDENTICA a "nao ha chamados" — e um painel que responde "zero
        // abertos" quando na verdade nao conseguiu perguntar e pior que um
        // painel que nao carrega, porque parece uma afirmacao sobre a
        // operacao.
        //
        // E o mesmo argumento que o `TrilhaErro` da auditoria ja fazia: erro e
        // um ESTADO, e nao um aviso somado aos outros.
        setErro(
          'Não foi possível carregar os chamados. Os números abaixo podem estar desatualizados.'
        );
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
  /* `seloDaCor` saiu junto com os selos que ele pintava.
   *
   * Era a segunda fonte de verdade para status e prioridade -> cor: a paleta
   * categorica de graficos a 13% com uma barra de 2px na cor cheia. Quem
   * carrega isso agora e o mapa da secao 16, em `SelosDeChamado`.
   *
   * A funcao ficou sem uso na mesma passagem, e sai por isso — helper de cor
   * parado num arquivo e convite para a proxima tabela voltar a pintar selo a
   * mao. `corDoStatus` e `corDaPrioridade` continuam, e continuam certos: eles
   * pintam GRAFICO, que e o papel para o qual a paleta e certificada.
   */

  /**
   * O resumo em texto de um gráfico de distribuição.
   *
   * A §29 é explícita sobre barra desenhada: `progressbar` quando há escala de
   * 0 a 100 e um alvo; `meter` quando é medida sem alvo; e **nenhum papel de
   * progresso** quando é comparação ou distribuição — nesse caso a barra vai
   * `aria-hidden`, ou o grupo inteiro leva `role="img"` com `aria-label`.
   *
   * Estes gráficos são distribuição: quantos chamados em cada prioridade, em
   * cada categoria. Não há alvo, e a soma não é um progresso rumo a nada.
   *
   * Os números existiam APENAS dentro do SVG do recharts — nos rótulos de eixo
   * e na altura das barras. Quem não vê o gráfico não recebia nada: nem os
   * valores, nem sequer a informação de que havia um gráfico ali.
   */
  const resumoDoGrafico = (
    titulo: string,
    dados: { name: string; value: number }[]
  ): string => {
    const comValor = dados.filter((d) => d.value > 0);
    if (comValor.length === 0) return `${titulo}: sem dados no período.`;
    return (
      `${titulo}: ` +
      comValor.map((d) => `${d.name} ${d.value}`).join(', ') +
      '.'
    );
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
      <div className="flex min-h-full items-center justify-center">
        <BlocoCarregando tamanho="lg">
          <p className="text-conteudo-suave">Carregando dashboard...</p>
        </BlocoCarregando>
      </div>
    );
  }

  return (
    <div className="space-y-5">

        {/* A falha de carga aparece ANTES dos numeros, e nao no lugar deles.
            Substituir o painel inteiro esconderia dados que ainda podem valer
            — de uma carga anterior — e o aviso diz exatamente isso. */}
        {erro && <Aviso variante="perigo">{erro}</Aviso>}

        {/* Cabeçalho da página. O `<div>` de moldura que pintava o fundo saiu:
            quem pinta agora é o `<main>` da casca. */}
        <div className="rounded-2xl border border-borda bg-superficie px-5 py-4">
          <h1 className="text-xl font-extrabold tracking-tight text-conteudo">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-conteudo-tenue">
            Bem-vindo, <span className="font-semibold text-conteudo-suave">{user?.username}</span>{' '}
            ({user?.role}) — situação atual dos chamados do sistema.
          </p>
        </div>

        {/* Filtros */}
        <Card padding="lg">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <IconeFiltro className="h-4 w-4 text-conteudo-tenue" />
              <h2 className="text-sm font-semibold text-conteudo">Filtros</h2>
            </div>

            {/* Botão Toggle Cancelados.

                `aria-pressed` porque isto e um INTERRUPTOR, e nao um botao de
                acao: ele tem estado, e o estado precisa ser dito.

                O rotulo visivel ja diz ("Exibindo cancelados" / "Cancelados
                ocultos"), mas ele e `hidden sm:inline` — em tela estreita some
                e sobram o icone e a cor. Ai o nome acessivel cai no `title`,
                que diz a ACAO e nao o estado ("Mostrar cancelados"), e os dois
                se contradizem conforme a largura da janela.

                Com `aria-pressed` o estado passa a ser dito pelo canal proprio,
                em qualquer largura, sem depender de qual texto sobrou. */}
            <button
              onClick={() => setIncluirCancelados(!incluirCancelados)}
              aria-pressed={incluirCancelados}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                incluirCancelados
                  ? 'border-perigo/30 bg-perigo/20 text-on-tint-danger hover:bg-perigo/30'
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
            {/* Era um `<label>` sem `htmlFor`, e nao havia como ter um: ele
                nomeia um GRUPO — quatro atalhos e dois campos de data —, e nao
                um controle. `<p>` mais `aria-labelledby` diz a mesma coisa
                pelo mecanismo certo. */}
            <p
              id="dashboard-periodo"
              className="block text-sm font-medium text-conteudo-suave mb-2"
            >
              Período
            </p>

            {/* Atalhos.

                `aria-pressed` em cada um. Qual esta ativo era dito SO pela cor
                (`bg-sinal` contra `bg-superficie-elevada`) — nao ha visto, nao
                ha moldura diferente, nao ha palavra a mais. A §16 proibe cor
                sozinha, e aqui ela nao estava so informando mal: para quem usa
                leitor de tela, os quatro eram indistinguiveis.

                `aria-pressed` e nao `aria-current`: sao alternativas de um
                mesmo controle de filtro, e nao itens de navegacao. */}
            <div
              role="group"
              aria-labelledby="dashboard-periodo"
              className="flex flex-wrap gap-2 mb-3"
            >
              {([
                { key: 'mes', label: 'Este mês' },
                { key: 'mesPassado', label: 'Mês passado' },
                { key: '30d', label: 'Últimos 30 dias' },
                { key: 'tudo', label: 'Tudo' },
              ] as const).map((p) => (
                <button
                  key={p.key}
                  onClick={() => aplicarPreset(p.key)}
                  aria-pressed={presetAtivo === p.key}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    presetAtivo === p.key
                      ? 'border-transparent bg-sinal text-[var(--text-on-primary)]'
                      : 'border-borda bg-superficie-elevada text-conteudo-suave hover:text-conteudo'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Intervalo personalizado */}
            <div className="flex flex-wrap items-end gap-4">
              {/* Eram dois <input> escritos a mao, com a forma do campo
                  ANTERIOR a emenda E7: `border-borda` da 1,23:1 contra a
                  pagina, e a WCAG 1.4.11 pede 3:1 para o limite de um
                  controle. Os primitivos foram para 4,76:1 na Fase 8 e estes
                  ficaram para tras — a migracao PIOROU a diferenca entre eles
                  e o resto do sistema.

                  O rotulo tambem era um <label> sem `htmlFor`, com o campo sem
                  `id`: clicar no texto nao focava o campo, e o leitor de tela
                  nao anunciava o nome. O `Campo` amarra os dois. */}
              <Campo id="periodo-inicio" rotulo="De" className="w-40">
                <Input
                  type="date"
                  value={periodoInicio}
                  max={periodoFim || undefined}
                  onChange={(e) => {
                    setPeriodoInicio(e.target.value);
                    setPresetAtivo('custom');
                  }}
                />
              </Campo>
              <Campo id="periodo-fim" rotulo="Até" className="w-40">
                <Input
                  type="date"
                  value={periodoFim}
                  min={periodoInicio || undefined}
                  onChange={(e) => {
                    setPeriodoFim(e.target.value);
                    setPresetAtivo('custom');
                  }}
                />
              </Campo>
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
        </Card>

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
        <Card padding="lg">
          <CardHeader titulo="SLA" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-conteudo-tenue">
                Resolvidos dentro do prazo
              </p>
              <p
                className={`mt-2 text-3xl font-bold tabular-nums ${
                  metricasSla.percentualNoPrazo !== null
                    ? 'text-on-tint-success'
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
              <p className="mt-2 text-3xl font-bold tabular-nums text-on-tint-danger">
                {metricasSla.estouradosEmAberto}
              </p>
              <p className="mt-1.5 text-xs text-conteudo-tenue">precisam de ação agora</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-conteudo-tenue">
                Em atenção (≥80% do prazo)
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-on-tint-warning">
                {metricasSla.emAtencao}
              </p>
              <p className="mt-1.5 text-xs text-conteudo-tenue">prestes a estourar</p>
            </div>
          </div>
        </Card>

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
          <Card padding="lg">
            <CardHeader titulo="Chamados por Status" />
            <div>
            {metricas.porStatus.some(s => s.value > 0) ? (
              <>
                {/* Rosca com o total no meio, como a do HelpHS.
                    Era pizza cheia com o rótulo escrito por cima de cada fatia,
                    e numa fatia estreita o texto saía por fora e encavalava no
                    vizinho. Os nomes e os números foram para a lista abaixo,
                    onde cabem sempre e ficam alinhados numa coluna só. */}
                <div className="relative">
                  {/* A rosca sai da arvore de acessibilidade: os nomes e os
                      numeros dela ja estao na LISTA abaixo, em texto. Anuncia-
                      la seria ler a mesma distribuicao duas vezes.
                      
                      E `aria-hidden` so no desenho, e nao no `<div relative>`
                      inteiro: o total no centro nao esta repetido em lugar
                      nenhum, e some junto se o recorte for maior. */}
                  <div aria-hidden="true">
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
                  </div>

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
          </Card>

          {/* Gráfico de Prioridade */}
          <Card padding="lg">
            <CardHeader titulo="Chamados por Prioridade" />
            <div>
            {metricas.porPrioridade.some(p => p.value > 0) ? (
              <div
                role="img"
                aria-label={resumoDoGrafico(
                  'Chamados por prioridade',
                  metricas.porPrioridade
                )}
              >
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
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-conteudo-tenue">
                Sem dados para exibir
              </div>
            )}
            </div>
          </Card>

        </div>

        {/* Top 5 Categorias */}
        {metricas.porCategoria.length > 0 && (
          <Card padding="lg">
            <CardHeader titulo="Top 5 Categorias" />
            <div>
            <div
              role="img"
              aria-label={resumoDoGrafico(
                'Chamados por categoria',
                metricas.porCategoria
              )}
            >
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
          </Card>
        )}

        {/* Tabela de Chamados Recentes */}
        <Card padding="lg">
          <CardHeader titulo="Chamados Recentes" />
          <div>
          {metricas.chamadosRecentes.length > 0 ? (
            <div className="overflow-x-auto">
              <Tabela>
                <TabelaCabecalho fixo>
                  <tr>
                    <TabelaCelulaDeCabecalho>Protocolo</TabelaCelulaDeCabecalho>
                    <TabelaCelulaDeCabecalho>Título</TabelaCelulaDeCabecalho>
                    <TabelaCelulaDeCabecalho className="text-center">
                      Status
                    </TabelaCelulaDeCabecalho>
                    <TabelaCelulaDeCabecalho className="text-center">
                      Prioridade
                    </TabelaCelulaDeCabecalho>
                    <TabelaCelulaDeCabecalho className="text-center">
                      Data
                    </TabelaCelulaDeCabecalho>
                    <TabelaCelulaDeCabecalho className="text-center">
                      Ações
                    </TabelaCelulaDeCabecalho>
                  </tr>
                </TabelaCabecalho>

                <TabelaCorpo>
                  {metricas.chamadosRecentes.map((chamado) => (
                    <TabelaLinha key={chamado.id}>
                      <TabelaCelula className="font-medium">
                        #{chamado.protocolo}
                      </TabelaCelula>

                      <TabelaCelula tenue className="max-w-xs truncate">
                        {chamado.titulo}
                      </TabelaCelula>

                      <TabelaCelula className="text-center">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {/* A cor sai do mapa da secao 16, e nao mais da
                              paleta CATEGORICA de graficos.

                              O selo era `corDoStatus(...)` a 13% com uma barra
                              de 2px na cor cheia — uma SEGUNDA fonte de verdade
                              para status -> cor, que a secao 5.4 proibe e que
                              ja tinha divergido do resto: o mesmo chamado
                              aparecia de um jeito no quadro e de outro aqui.

                              E a mesma forma do defeito que o Avatar tinha: a
                              paleta de graficos e certificada para FORMA, e
                              estava sendo usada para carregar TEXTO.

                              O ROTULO nao muda. `getStatusDisplay` mostra
                              FECHADO como "Resolvido", nesta tela e em
                              ChamadoDetalhes, e isso e conteudo — a secao 30
                              nao deixa trocar por motivo visual. Por isso o
                              `Badge` com a variante do mapa, e nao o
                              `StatusBadge`, que traria o rotulo do enum. */}
                          <Badge variante={VARIANTE_DE_STATUS[chamado.status]}>
                            {getStatusDisplay(chamado.status)}
                          </Badge>
                          {chamado.arquivado && <MarcaBadge marca="arquivado" />}
                          {chamado.cancelado && <MarcaBadge marca="cancelado" />}
                        </div>
                      </TabelaCelula>

                      <TabelaCelula className="text-center">
                        {/* Aqui o rotulo JA e o valor do enum, entao o
                            `PrioridadeBadge` entra inteiro. */}
                        <PrioridadeBadge prioridade={chamado.prioridade} />
                      </TabelaCelula>

                      <TabelaCelula tenue className="text-center">
                        {formatarData(chamado.created_at)}
                      </TabelaCelula>

                      <TabelaCelula className="text-center">
                        {/* Terceiro `<button>` com `navigate()` desta rodada,
                            depois do "Voltar" do ChamadoDetalhes e do lembrete
                            de tarefas do quadro. Vai para uma rota, logo e
                            link: leitor de tela anuncia "link", e voltam o
                            abrir em nova aba, o menu do botao direito e o
                            endereco na barra de status.

                            O nome acessivel leva o protocolo. Numa tabela de
                            dez linhas havia dez "Ver detalhes" identicos, e a
                            lista de links do leitor de tela nao dizia qual era
                            qual. */}
                        <Link
                          to={`/chamados/${chamado.id}`}
                          aria-label={`Ver detalhes do chamado ${chamado.protocolo}`}
                          className="text-sinal hover:brightness-110 font-medium inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                        >
                          Ver detalhes
                          <IconeSetaDireita className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </TabelaCelula>
                    </TabelaLinha>
                  ))}
                </TabelaCorpo>
              </Tabela>
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
        </Card>
    </div>
  );
};

export default Dashboard;
