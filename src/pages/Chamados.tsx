import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { useUsuariosPorId } from '../hooks/useUsuariosPorId';
import { PrioridadeEnum, TarefaRecorrente } from '../types/api';
import { tarefasRecorrentesService } from '../services/chamadoshsapi';
import { KanbanColumn } from '../components/KanbanColumn';
import { Badge, Button, Input, Modal, Seletor } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { corDaPrioridade, corDoStatus } from '../lib/graficos';
import { ehDaPessoa, responsaveisDosChamados } from '../lib/pessoas';
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
   * Filtro por pessoa: o responsável do chamado. Só a equipe vê (ver
   * `podeFiltrarPorPessoa` abaixo) — para quem abre chamado, o quadro já é o
   * dos chamados dele, e um seletor de nomes a mais só ocuparia espaço.
   *
   * String, e não número, porque tem uma opção que não é id: "sem
   * responsável". A regra de casamento vive em `lib/pessoas`, com teste.
   */
  const [filtroPessoa, setFiltroPessoa] = useState<string>('');

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

  const temFiltro = Boolean(
    filtroPrioridade || filtroCategoria || filtroPessoa || busca
  );

  const limparFiltros = () => {
    setFiltroPrioridade('');
    setFiltroCategoria('');
    setFiltroPessoa('');
    setBusca('');
  };

  // Estado para armazenar os usuários (solicitantes)
  const usuarios = useUsuariosPorId();

  // Lembrete de tarefas recorrentes do dia (pendentes + realizadas hoje) — só técnico/admin
  const [tarefasDoDia, setTarefasDoDia] = useState<TarefaRecorrente[]>([]);

  // Permissões baseadas em role
  const isAdmin = user?.role === 'Administrador';
  const isTecnico = user?.role === 'Tecnico';

  /**
   * Quem enxerga o filtro por pessoa. É pergunta de quem distribui e atende
   * trabalho; quem só abre chamado está olhando um quadro que já é o dele.
   *
   * O filtro é de exibição, não de acesso: esconder o seletor não esconde
   * chamado nenhum, e o que cada perfil pode ver quem decide é a API.
   */
  const podeFiltrarPorPessoa = isAdmin || isTecnico;

  // Forçar reload dos chamados quando a página é montada
  useEffect(() => {
    carregarChamados();
  }, []);

  /**
   * Carrega as tarefas recorrentes do dia para o lembrete: as pendentes
   * (proxima_data <= hoje) e as que já foram realizadas hoje (ultima_execucao).
   *
   * Função, e não corpo de efeito, porque o auto-refresh também precisa dela:
   * o quadro numa TV recarrega sozinho e o lembrete ficava congelado no que
   * era verdade quando a página abriu. `hojeYMD()` é lido a cada chamada de
   * propósito — assim a virada de meia-noite entra na próxima atualização, em
   * vez de manter as tarefas de ontem na tela até alguém recarregar no F5.
   */
  const carregarTarefasDoDia = useCallback(() => {
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

  useEffect(() => {
    carregarTarefasDoDia();
  }, [carregarTarefasDoDia]);

  // Auto-refresh a cada 10 minutos (para TV/monitoramento). Atualiza as duas
  // coisas que a tela mostra: o quadro e o lembrete de tarefas do dia.
  useEffect(() => {
    const intervalo = setInterval(() => {
      carregarChamados();
      carregarTarefasDoDia();
    }, 600000); // 10 minutos em milissegundos

    // Cleanup: limpar o intervalo quando o componente desmontar
    return () => clearInterval(intervalo);
  }, [carregarTarefasDoDia]);

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

  /**
   * Os nomes do seletor de pessoa, tirados dos chamados carregados — quem tem
   * chamado aparece, quem não tem não ocupa linha. Regra e ordem em
   * `lib/pessoas`, com teste.
   *
   * Sai de `chamados`, não de `chamadosNoEscopo`: a lista precisa ficar parada
   * enquanto se mexe nos outros filtros. Uma lista de nomes que encolhe a cada
   * clique faz a pessoa procurar um nome que estava ali agora há pouco.
   */
  const pessoas = useMemo(
    () => responsaveisDosChamados(chamados, usuarios),
    [chamados, usuarios]
  );

  // Filtra os chamados localmente. A busca cobre título e protocolo: quem
  // lembra do assunto raramente lembra do número.
  const chamadosFiltrados = chamadosNoEscopo.filter((chamado) => {
    if (filtroPrioridade && chamado.prioridade !== filtroPrioridade) return false;
    if (filtroCategoria && chamado.categoria_id !== filtroCategoria) return false;
    if (!ehDaPessoa(chamado, filtroPessoa)) return false;

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

  /**
   * A raia de cada coluna. Largura mínima de 268px — a mesma do quadro de
   * referência —, e `flex-1` para as quatro colunas de fluxo ainda ocuparem a
   * faixa inteira numa tela larga, como ocupavam na grade. Quando as seis não
   * cabem, ninguém encolhe: o quadro rola de lado.
   */
  const raia = 'flex min-w-[268px] flex-1 flex-col';

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <IconeCarregando className="mx-auto mb-4 h-12 w-12 animate-spin text-info" />
          <p className="text-conteudo-suave">Carregando chamados...</p>
        </div>
      </div>
    );
  }

  return (
    // O quadro ocupa a altura do `<main>` e rola por dentro; o fundo é da
    // casca, a página não pinta o próprio.
    <div className="flex h-full min-h-0 flex-col gap-5">

      {/* Cabeçalho: título, busca, filtros e ação, numa faixa só.
          Os filtros eram um painel que abria e fechava — escondido por
          padrão, o que faz a pessoa esquecer que existe filtro aplicado. */}
      <div className="flex shrink-0 flex-col gap-4 rounded-2xl border border-borda bg-superficie px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-conteudo">Chamados</h1>
          <p className="mt-0.5 text-sm text-conteudo-tenue">
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

          {/* Filtro por pessoa: o responsável, que é a inicial que o card
              mostra no canto. Só para a equipe.

              Fica ao lado dos outros recortes e não vira um painel à parte:
              a pergunta "o que está com fulano" quase sempre vem junta de
              "e é crítico?", e separar os dois cobraria dois lugares.

              Some quando não há responsável nenhum nos chamados — um
              seletor com uma opção só não é escolha, é enfeite. */}
          {podeFiltrarPorPessoa && pessoas.length > 0 && (
            <Seletor
              rotulo="Filtrar por responsável"
              valor={filtroPessoa}
              aoMudar={setFiltroPessoa}
              opcoes={[
                { valor: '', rotulo: 'Todas as pessoas' },
                ...pessoas,
              ]}
              className="w-48"
            />
          )}

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

      {/* Lembrete de tarefas recorrentes (só técnico/admin) */}
      {(isAdmin || isTecnico) && (
        <div className="shrink-0 rounded-xl border border-borda bg-superficie p-5">
          <div className="mb-3 flex items-center gap-2">
            <IconeAgenda className="h-4 w-4 text-info" />
            <h2 className="text-sm font-semibold text-conteudo">
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
            // Teto proporcional: sem ele, um dia com muitas tarefas
            // espremia o quadro (que é `flex-1`) até zero.
            <ul className="max-h-[30vh] space-y-1.5 overflow-y-auto">
              {tarefasDoDia.map((t) => {
                const hoje = hojeYMD();
                const pendente = t.proxima_data <= hoje;
                const realizadaHoje =
                  (t.ultima_execucao ?? '').slice(0, 10) === hoje;
                const atrasada = t.proxima_data < hoje;
                return (
                  <li key={t.id} className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => navigate('/tarefas-recorrentes')}
                      className={cn(
                        'text-left text-sm font-medium transition-colors hover:text-info hover:underline',
                        !pendente && realizadaHoje
                          ? 'text-conteudo-tenue'
                          : 'text-conteudo'
                      )}
                      title="Ir para Tarefas Recorrentes"
                    >
                      {t.titulo}
                    </button>

                    {/* Os selos são os mesmos do resto do sistema: fundo de
                        significado a 20% e texto na cor cheia, desenhados
                        pelo `Badge` em vez de repetidos à mão aqui. */}
                    {pendente ? (
                      atrasada ? (
                        <Badge variante="perigo">
                          Atrasada desde {formatarDataBR(t.proxima_data)}
                        </Badge>
                      ) : (
                        <Badge variante="alerta">Hoje</Badge>
                      )
                    ) : (
                      realizadaHoje && (
                        <>
                          <Badge variante="sucesso">
                            <IconeConfereCirculo className="h-3 w-3" />
                            Realizada
                          </Badge>
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
        <div className="shrink-0 rounded-xl border border-perigo/30 bg-perigo/10 px-4 py-3 text-sm text-on-tint-danger">
          {error}
        </div>
      )}

      {/* Kanban. Quatro colunas de fluxo; as duas de fora — arquivo e
          cancelados — só entram quando pedidas. As duas só crescem, e sem
          interruptor apertariam as outras quatro para sempre.

          O quadro é uma moldura só, que preenche o que sobra da altura e rola
          por dentro: `min-h-0` para o flex poder encolhê-la, `overflow-hidden`
          para o canto arredondado cortar o conteúdo, e a rolagem lateral no
          rolador de dentro. */}
      {/* `min-h-[26rem]` é o que impede o quadro de sumir.
          Ele é o único `flex-1` entre irmãos `shrink-0` numa página de
          altura travada: num celular de 667px, o cabeçalho empilhado e o
          card de tarefas do dia comem quase tudo, e o que sobra para as
          colunas chega perto de zero — a tela abria sem mostrar chamado
          nenhum, sem barra de rolagem e sem aviso. Com um piso, o que não
          couber passa a empurrar o `<main>`, que rola. */}
      {/* `min-h-[26rem]` sozinho, sem `min-h-0` ao lado. As duas classes
          escrevem `min-height` no mesmo elemento e quem vencia era a ordem do
          CSS gerado, não a ordem no atributo — a mesma armadilha que
          `estilos.test.ts` já pega para `bg-*`. E o piso basta: ele também
          derruba o `min-height: auto` que todo item de flex traz de fábrica,
          que era o motivo de alguém ter posto `min-h-0` junto. */}
      <div className="min-h-[26rem] flex-1 overflow-hidden rounded-2xl border border-borda bg-superficie-elevada/50">
        {/* Só na horizontal. A vertical é de cada coluna, por dentro —
            `overflow-auto` aqui dava duas barras verticais aninhadas. */}
        <div className="h-full overflow-x-auto">
          {/* Sem `min-w-max`. Ele mandava a fileira ser tão larga quanto o
              conteúdo, e as raias são `flex-1`: numa fileira de largura
              max-content, todo item que cresce recebe a fração do MAIOR deles,
              e as seis raias esticavam juntas. O resultado era o quadro
              aparecendo com uma coluna só ocupando a tela inteira e as outras
              cinco jogadas para fora, atrás da barra de rolagem.

              Sem ele a fileira tem a largura do quadro. As raias dividem esse
              espaço e param de encolher nos 268px de `min-w`; a partir daí a
              fileira transborda e a rolagem horizontal entra — que era o
              comportamento pretendido desde o começo. */}
          <div className="flex h-full gap-3 p-3">

            {/* === COLUNA ABERTO === */}
            <div className={raia}>
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
            </div>

            {/* === EM ANDAMENTO === */}
            <div className={raia}>
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
            </div>

            {/* === AGUARDANDO === */}
            <div className={raia}>
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
            </div>

            {/* === RESOLVIDO (inclui Fechados) === */}
            <div className={raia}>
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
            </div>

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
                <div className={raia}>
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
                </div>

                <div className={raia}>
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
                </div>
              </>
            )}
          </div>
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
