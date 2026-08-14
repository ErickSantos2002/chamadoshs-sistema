import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { useUsuariosPorId } from '../hooks/useUsuariosPorId';
import { StatusEnum, PrioridadeEnum, Chamado, TarefaRecorrente } from '../types/api';
import { tarefasRecorrentesService } from '../services/chamadoshsapi';
import { KanbanColumn } from '../components/KanbanColumn';
import { Button, Input, Modal, SeletorDeFiltro } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { corDaPrioridade, corDoStatus } from '../lib/graficos';
import NovoChamadoForm from '../components/NovoChamadoForm';
import ChamadoModal from '../components/ChamadoModal';
import { IconeAgenda, IconeBusca, IconeCarregando, IconeConfereCirculo, IconeMais } from '../components/ui/icones';

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

  // Filtra os chamados localmente. A busca cobre título e protocolo: quem
  // lembra do assunto raramente lembra do número.
  const chamadosFiltrados = chamados.filter((chamado) => {
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

  // As cores de status e de prioridade agora vivem no KanbanColumn, mapeadas
  // para as cores de significado do tema.

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
                {chamadosFiltrados.length === chamados.length
                  ? `${chamados.length} chamados`
                  : `${chamadosFiltrados.length} de ${chamados.length} chamados`}
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
              <SeletorDeFiltro
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

              <SeletorDeFiltro
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


        {/* Kanban - 4 colunas (Fechados unificados com Resolvidos) */}
        <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-2 md:grid-cols-2 gap-4">

          {/* === COLUNA ABERTO === */}
          <KanbanColumn
            title="Aberto"
            descricao="Aguardando atendimento"
            colorDot={corDoStatus("Aberto", darkMode)}
            items={chamadosPorStatus[StatusEnum.ABERTO]}
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
            items={chamadosPorStatus[StatusEnum.EM_ANDAMENTO]}
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
            items={chamadosPorStatus[StatusEnum.AGUARDANDO]}
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
            items={chamadosPorStatus[StatusEnum.RESOLVIDO]}
            usuarios={usuarios}
            categorias={categorias}
            aoAbrir={(chamado) => setChamadoAberto(chamado.id)}
            usuarioLogadoId={user?.id}
          />
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
