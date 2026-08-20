import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { useUsuariosPorId } from '../hooks/useUsuariosPorId';
import { PrioridadeEnum, TarefaRecorrente } from '../types/api';
import { tarefasRecorrentesService } from '../services/chamadoshsapi';
import { KanbanColumn } from '../components/KanbanColumn';
import { Button, Input, Modal, Seletor } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { corDaPrioridade, corDoStatus } from '../lib/graficos';
import { agruparPorColuna, estaNoFluxo } from '../lib/quadro';
import { cn } from '../lib/utils';
import NovoChamadoForm from '../components/NovoChamadoForm';
import ChamadoModal from '../components/ChamadoModal';
import { IconeAgenda, IconeArquivar, IconeBusca, IconeCarregando, IconeConfereCirculo, IconeMais } from '../components/ui/icones';

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
  const { darkMode } = useTheme();

  // Filtros. O filtro por status saiu: num quadro que já separa os chamados em
  // colunas por status, filtrar por status só esvazia colunas.
  const [filtroPrioridade, setFiltroPrioridade] = useState<PrioridadeEnum | ''>('');
  const [filtroCategoria, setFiltroCategoria] = useState<number | ''>('');
  const [busca, setBusca] = useState('');

  /**
   * Arquivado e cancelado não são etapas do atendimento e não podem disputar
   * espaço com o trabalho do dia: ficam atrás de um interruptor, desligado por
   * padrão. Um só, e não dois — são a mesma pergunta ("cadê o que saiu do
   * fluxo?"), e dois botões no cabeçalho cobrariam da pessoa saber de antemão
   * sob qual das duas marcas o chamado sumiu.
   *
   * Sem persistir de propósito. Quem foi consultar um chamado fora do fluxo
   * consultou uma vez; deixar as colunas abertas para a próxima visita
   * cobraria dessa pessoa lembrar de fechá-las.
   */
  const [mostrarForaDoFluxo, setMostrarForaDoFluxo] = useState(false);

  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [chamadoAberto, setChamadoAberto] = useState<number | null>(null);

  const temFiltro = Boolean(filtroPrioridade || filtroCategoria || busca);

  const limparFiltros = () => {
    setFiltroPrioridade('');
    setFiltroCategoria('');
    setBusca('');
  };

  // Estado para armazenar os usuários (solicitantes)
  const usuarios = useUsuariosPorId();

  // Lembrete de tarefas recorrentes do dia (pendentes + realizadas hoje) — só técnico/admin
  const [tarefasDoDia, setTarefasDoDia] = useState<TarefaRecorrente[]>([]);

  // Permissões baseadas em role
  const isAdmin = user?.role === 'Administrador';
  const isTecnico = user?.role === 'Tecnico';

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

  const buscando = busca.trim().length > 0;

  /**
   * O interruptor define o ESCOPO do quadro, aplicado antes dos filtros:
   * `chamados` traz arquivados e cancelados desde que o contexto passou a
   * pedi-los à API, e só as colunas de fora do fluxo devem recebê-los.
   *
   * A BUSCA atravessa o escopo. Quem digita um protocolo já sabe que aquele
   * chamado existe — está perguntando ONDE ele está. Devolver quatro colunas
   * vazias porque ele foi cancelado responde "não existe", que é falso e é o
   * caminho mais curto para a pessoa concluir que o sistema perdeu o chamado.
   * Foi assim que quatro protocolos viraram um mistério de meia hora.
   *
   * Vale só para a busca. Prioridade e categoria são recortes de quem está
   * varrendo o quadro, não de quem procura um chamado específico.
   */
  const chamadosNoEscopo = useMemo(
    () =>
      mostrarForaDoFluxo || buscando ? chamados : chamados.filter(estaNoFluxo),
    [chamados, mostrarForaDoFluxo, buscando]
  );

  // Filtra os chamados localmente. A busca cobre título e protocolo: quem
  // lembra do assunto raramente lembra do número.
  const chamadosFiltrados = chamadosNoEscopo.filter((chamado) => {
    if (filtroPrioridade && chamado.prioridade !== filtroPrioridade) return false;
    if (filtroCategoria && chamado.categoria_id !== filtroCategoria) return false;

    if (busca) {
      const termo = busca.toLowerCase();
      const casa =
        chamado.protocolo.toLowerCase().includes(termo) ||
        chamado.titulo.toLowerCase().includes(termo);
      if (!casa) return false;
    }

    return true;
  });

  /**
   * A contagem do cabeçalho ignora arquivados e cancelados SEMPRE, inclusive
   * com o interruptor ligado. Ela responde "quantos chamados este sistema
   * tem", e quem lê esse número está pensando em trabalho — abrir as colunas
   * de fora do fluxo para consultar um chamado antigo não deveria inflar o
   * total de 141 para 150.
   *
   * Quantos chamados fora do fluxo existem continua visível: cada uma das
   * duas colunas traz o próprio contador no topo.
   */
  const totalNoFluxo = useMemo(
    () => chamados.filter(estaNoFluxo).length,
    [chamados]
  );
  const filtradosNoFluxo = chamadosFiltrados.filter(estaNoFluxo).length;

  // A regra de qual coluna cada chamado ocupa vive em `lib/quadro`, com teste.
  // A ordem lá é a correção: a marca `arquivado` é consultada antes do status.
  const chamadosPorColuna = useMemo(
    () => agruparPorColuna(chamadosFiltrados),
    [chamadosFiltrados]
  );

  /**
   * Quantos chamados fora do fluxo estão DESENHADOS agora.
   *
   * Serve a duas coisas. Primeiro, decide se as duas colunas aparecem: a busca
   * atravessa o escopo, então ela pode trazer um cancelado para dentro sem que
   * exista coluna para desenhá-lo. Segundo, entra no texto do cabeçalho — sem
   * ele, procurar um protocolo cancelado mostraria "0 de 141 chamados" com o
   * card do chamado ali na tela, ao lado.
   */
  const foraDoFluxoNaTela =
    chamadosPorColuna.arquivado.length + chamadosPorColuna.cancelado.length;
  const mostrarColunasDeFora = mostrarForaDoFluxo || foraDoFluxoNaTela > 0;

  // As cores de status e de prioridade agora vivem no KanbanColumn, mapeadas
  // para as cores de significado do tema.

  if (loading) {
    return (
      <div className="min-h-full bg-superficie-base flex items-center justify-center">
        <div className="text-center">
          <IconeCarregando className="w-12 h-12 animate-spin text-info mx-auto mb-4" />
          <p className="text-conteudo-suave">Carregando chamados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-superficie-base transition-colors">
      <div className="p-6">

        {/* Cabeçalho: título, busca, filtros e ação, numa faixa só.
            Os filtros eram um painel que abria e fechava — escondido por
            padrão, o que faz a pessoa esquecer que existe filtro aplicado. */}
        <div className="mb-4 rounded-xl border border-borda bg-superficie p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-conteudo">Chamados</h1>
              <p className="text-sm text-conteudo-tenue">
                {filtradosNoFluxo === totalNoFluxo
                  ? `${totalNoFluxo} chamados`
                  : `${filtradosNoFluxo} de ${totalNoFluxo} chamados`}
                {/* Contados à parte, e não somados ao número acima: são
                    unidades diferentes. "141 chamados" é trabalho; os de fora
                    do fluxo são registro. Somar os dois criaria um total que
                    não corresponde a nada que alguém queira saber. */}
                {foraDoFluxoNaTela > 0 && ` · ${foraDoFluxoNaTela} fora do fluxo`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Título ou protocolo"
                aria-label="Buscar chamado por título ou protocolo"
                icone={<IconeBusca className="h-4 w-4" />}
                className="w-56"
              />

              {/* O ponto colorido é a MESMA cor que a prioridade tem nos
                  gráficos. Filtro e gráfico falando cores diferentes da mesma
                  coisa é o tipo de detalhe que ensina a não confiar em nenhum
                  dos dois. */}
              <Seletor
                rotulo="Filtrar por prioridade"
                valor={filtroPrioridade}
                aoMudar={(v) => setFiltroPrioridade(v as PrioridadeEnum | '')}
                opcoes={[
                  { valor: '', rotulo: 'Todas prioridades' },
                  ...Object.values(PrioridadeEnum).map((p) => ({
                    valor: p,
                    rotulo: p,
                    cor: corDaPrioridade(p, darkMode),
                  })),
                ]}
                className="w-48"
              />

              <Seletor
                rotulo="Filtrar por categoria"
                valor={filtroCategoria === '' ? '' : String(filtroCategoria)}
                aoMudar={(v) => setFiltroCategoria(v ? Number(v) : '')}
                opcoes={[
                  { valor: '', rotulo: 'Todas categorias' },
                  ...categorias.map((categoria) => ({
                    valor: String(categoria.id),
                    rotulo: categoria.nome,
                  })),
                ]}
                className="w-48"
              />

              {/* Não entra em `temFiltro` nem em "Limpar": não é recorte da
                  lista, são duas colunas a mais. Limpar filtro fechando a
                  coluna que a pessoa acabou de abrir seria surpresa, não
                  limpeza.

                  O rótulo nomeia as duas marcas em vez de resumi-las em "fora
                  do fluxo": esse é vocabulário nosso, e quem abre chamado
                  precisaria clicar para descobrir o que significa.

                  O verbo fica. Tirá-lo encurtaria o botão e deixaria o estado
                  por conta do aspecto aceso ou apagado — que é justamente o
                  que ninguém lê num cabeçalho com outros quatro controles.
                  "Mostrar" diz o que o clique faz, sem precisar interpretar
                  tom de cor. */}
              <Button
                variante={mostrarForaDoFluxo ? 'secundario' : 'fantasma'}
                tamanho="sm"
                aria-pressed={mostrarForaDoFluxo}
                onClick={() => setMostrarForaDoFluxo((antes) => !antes)}
              >
                <IconeArquivar className="h-4 w-4" aria-hidden="true" />
                {mostrarForaDoFluxo
                  ? 'Ocultar arquivados e cancelados'
                  : 'Mostrar arquivados e cancelados'}
              </Button>

              {temFiltro && (
                <Button variante="fantasma" tamanho="sm" onClick={limparFiltros}>
                  Limpar
                </Button>
              )}

              <Button onClick={() => setModalNovoAberto(true)}>
                <IconeMais className="h-4 w-4" aria-hidden="true" />
                Novo Chamado
              </Button>
            </div>
          </div>
        </div>

        {/* Lembrete de tarefas recorrentes (só técnico/admin) */}
        {(isAdmin || isTecnico) && (
          <div className="mb-4 rounded-xl border border-borda bg-superficie p-5 shadow-sm transition-colors">
            <div className="flex items-center mb-2">
              <IconeAgenda className="w-5 h-5 mr-2 text-info" />
              <h2 className="text-base font-semibold text-conteudo">
                Tarefas recorrentes do dia
              </h2>
            </div>

            {tarefasDoDia.length === 0 ? (
              // O ✅ era um emoji: desenhado pelo sistema, colorido por conta
              // própria e alheio ao tema. O ícone acompanha a cor do texto.
              <p className="flex items-center gap-2 text-sm text-conteudo-tenue">
                <IconeConfereCirculo className="h-4 w-4 shrink-0 text-sucesso" />
                Nenhuma tarefa recorrente para hoje.
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
                        className={`text-sm font-medium hover:text-info hover:underline transition-colors text-left ${
                          !pendente && realizadaHoje
                            ? 'text-conteudo-tenue'
                            : 'text-conteudo'
                        }`}
                        title="Ir para Tarefas Recorrentes"
                      >
                        {t.titulo}
                      </button>

                      {pendente ? (
                        atrasada ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-perigo/15 text-perigo-forte dark:text-perigo-suave">
                            Atrasada desde {formatarDataBR(t.proxima_data)}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-alerta/15 text-alerta-forte dark:text-alerta-suave">
                            Hoje
                          </span>
                        )
                      ) : (
                        realizadaHoje && (
                          <>
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-sucesso/15 text-sucesso-forte dark:text-sucesso-suave">
                              <IconeConfereCirculo className="w-3 h-3" />
                              Realizada
                            </span>
                            <span className="text-xs text-conteudo-tenue">
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

        {/* Mensagem de erro */}
        {error && (
          <div className="mb-6 rounded-lg border border-perigo/30 bg-perigo/10 px-4 py-3 text-perigo-forte dark:text-perigo-suave">
            {error}
          </div>
        )}


        {/* Kanban. Quatro colunas de fluxo; as duas de fora — arquivo e
            cancelados — só entram quando pedidas. As duas só crescem, e sem
            interruptor apertariam as outras quatro para sempre. */}
        <div
          className={cn(
            'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2',
            mostrarColunasDeFora ? 'xl:grid-cols-6' : 'xl:grid-cols-4'
          )}
        >

          {/* === COLUNA ABERTO === */}
          <KanbanColumn
            title="Aberto"
            descricao="Aguardando atendimento"
            colorDot={corDoStatus("Aberto", darkMode)}
            items={chamadosPorColuna['Aberto']}
            usuarios={usuarios}
            categorias={categorias}
            aoAbrir={(chamado) => setChamadoAberto(chamado.id)}
            usuarioLogadoId={user?.id}
          />

          {/* === EM ANDAMENTO === */}
          <KanbanColumn
            title="Em Andamento"
            descricao="Técnico trabalhando no chamado"
            colorDot={corDoStatus("Em Andamento", darkMode)}
            items={chamadosPorColuna['Em Andamento']}
            usuarios={usuarios}
            categorias={categorias}
            aoAbrir={(chamado) => setChamadoAberto(chamado.id)}
            usuarioLogadoId={user?.id}
          />

          {/* === AGUARDANDO === */}
          <KanbanColumn
            title="Aguardando"
            descricao="Relógio de SLA pausado"
            colorDot={corDoStatus("Aguardando", darkMode)}
            items={chamadosPorColuna['Aguardando']}
            usuarios={usuarios}
            categorias={categorias}
            aoAbrir={(chamado) => setChamadoAberto(chamado.id)}
            usuarioLogadoId={user?.id}
          />

          {/* === RESOLVIDO (inclui Fechados) === */}
          <KanbanColumn
            title="Resolvido"
            descricao="Finalizado com sucesso"
            colorDot={corDoStatus("Resolvido", darkMode)}
            items={chamadosPorColuna['Resolvido']}
            usuarios={usuarios}
            categorias={categorias}
            aoAbrir={(chamado) => setChamadoAberto(chamado.id)}
            usuarioLogadoId={user?.id}
          />

          {/* === ARQUIVADO E CANCELADO ===
              `corDoStatus` não conhece nenhum dos dois e devolve o cinza neutro
              de fallback. É de propósito, por dois motivos que se somam: as
              quatro cores de status passam pela conta de ΔE >= 20 do
              `validar:paleta`, e cores novas teriam que ser calculadas contra
              todas elas em quatro tipos de visão. E cinza neutro é o que "fora
              do fluxo" significa — nenhum dos dois é etapa do atendimento.

              O que separa as duas colunas é o texto, não a cor: o selo vermelho
              "Cancelado" nos cards já dá o sinal de que ali houve interrupção,
              e repeti-lo no ponto da coluna seria a mesma informação duas
              vezes. */}
          {mostrarColunasDeFora && (
            <>
              <KanbanColumn
                title="Arquivado"
                descricao="Fora do fluxo, guardado para consulta"
                colorDot={corDoStatus("Arquivado", darkMode)}
                items={chamadosPorColuna['arquivado']}
                usuarios={usuarios}
                categorias={categorias}
                aoAbrir={(chamado) => setChamadoAberto(chamado.id)}
                usuarioLogadoId={user?.id}
              />

              <KanbanColumn
                title="Cancelado"
                descricao="Interrompido antes de ser resolvido"
                colorDot={corDoStatus("Cancelado", darkMode)}
                items={chamadosPorColuna['cancelado']}
                usuarios={usuarios}
                categorias={categorias}
                aoAbrir={(chamado) => setChamadoAberto(chamado.id)}
                usuarioLogadoId={user?.id}
              />
            </>
          )}
        </div>
      </div>

      {/* Abertura de chamado sem sair do quadro. O contexto atrás continua
          visível, e ao salvar o card já aparece na coluna Aberto. */}
      <Modal
        aberto={modalNovoAberto}
        aoFechar={() => setModalNovoAberto(false)}
        titulo="Novo Chamado"
        descricao="Quanto mais claro o relato, menos idas e vindas até a solução."
      >
        <NovoChamadoForm
          aoCriar={() => {
            setModalNovoAberto(false);
            carregarChamados();
          }}
          aoCancelar={() => setModalNovoAberto(false)}
        />
      </Modal>

      {/* Espiada no chamado sem sair do quadro. Editar continua na página. */}
      <ChamadoModal
        chamadoId={chamadoAberto}
        aoFechar={() => setChamadoAberto(null)}
        aoAbrirEmPagina={(id) => navigate(`/chamados/${id}`)}
      />
    </div>
  );

};

export default Chamados;
