import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { Button, Modal, Seletor } from '../components/ui';
import { IconeAgenda, IconeApagar, IconeAtencao, IconeCarregando, IconeConfereCirculo, IconeDocumento, IconeEditar, IconeEnergia, IconeHistorico, IconeInfo, IconeMais, IconeRepetir, IconeSalvar } from '../components/ui/icones';
import {
  tarefasRecorrentesService,
  usuariosService,
} from '../services/chamadoshsapi';
import {
  TarefaRecorrente,
  TarefaRecorrenteCreate,
  TarefaRecorrenteExecucao,
  TipoRecorrencia,
  PrioridadeEnum,
  Usuario,
} from '../types/api';

// ========================================
// HELPERS
// ========================================

const DIAS_SEMANA = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

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

const formatarDataHora = (iso?: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const recorrenciaLabel = (t: TarefaRecorrente): string => {
  const n = t.intervalo || 1;
  if (t.tipo_recorrencia === 'diaria') {
    return n > 1 ? `A cada ${n} dias` : 'Diária';
  }
  if (t.tipo_recorrencia === 'semanal') {
    const dia = t.dia_semana != null ? DIAS_SEMANA[t.dia_semana] : '?';
    return `Semanal · ${dia}${n > 1 ? ` (a cada ${n} sem.)` : ''}`;
  }
  return `Mensal · dia ${t.dia_mes ?? '?'}${n > 1 ? ` (a cada ${n} meses)` : ''}`;
};

// Sugestão da 1ª data ao criar: próxima ocorrência A PARTIR de hoje (inclui hoje).
// É apenas um pré-preenchimento editável; o valor final é o que o usuário enviar.
const sugerirPrimeiraData = (
  tipo: TipoRecorrencia,
  diaSemana: number | null,
  diaMes: number | null
): string => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fmt = (d: Date) => {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  if (tipo === 'diaria') return fmt(hoje);

  if (tipo === 'semanal') {
    if (diaSemana == null) return fmt(hoje);
    const dias = (diaSemana - hoje.getDay() + 7) % 7; // 0 = hoje
    const d = new Date(hoje);
    d.setDate(d.getDate() + dias);
    return fmt(d);
  }

  // mensal
  if (diaMes == null) return fmt(hoje);
  const ultimoDia = (ano: number, mes: number) =>
    new Date(ano, mes + 1, 0).getDate();
  let ano = hoje.getFullYear();
  let mes = hoje.getMonth();
  const clamp = () => Math.min(diaMes, ultimoDia(ano, mes));
  if (clamp() < hoje.getDate()) {
    mes += 1;
    if (mes > 11) {
      mes = 0;
      ano += 1;
    }
  }
  return fmt(new Date(ano, mes, clamp()));
};

type FormState = {
  titulo: string;
  descricao: string;
  instrucoes: string;
  categoria_id: string;
  responsavel_id: string;
  prioridade: PrioridadeEnum;
  tipo_recorrencia: TipoRecorrencia;
  intervalo: number;
  dia_semana: number;
  dia_mes: number;
  proxima_data: string;
};

const formInicial = (): FormState => ({
  titulo: '',
  descricao: '',
  instrucoes: '',
  categoria_id: '',
  responsavel_id: '',
  prioridade: PrioridadeEnum.MEDIA,
  tipo_recorrencia: 'semanal',
  intervalo: 1,
  dia_semana: 1,
  dia_mes: 1,
  proxima_data: '',
});

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

const TarefasRecorrentes: React.FC = () => {
  const { user } = useAuth();
  const { categorias } = useChamados();

  const podeGerenciar =
    user?.role === 'Administrador' || user?.role === 'Tecnico';

  const [tarefas, setTarefas] = useState<TarefaRecorrente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostrarInativas, setMostrarInativas] = useState(false);

  // Modais
  const [modal, setModal] = useState<
    'criar' | 'editar' | 'realizar' | 'historico' | 'detalhes' | null
  >(null);
  const [selecionada, setSelecionada] = useState<TarefaRecorrente | null>(null);
  const [form, setForm] = useState<FormState>(formInicial());
  const [observacao, setObservacao] = useState('');
  const [historico, setHistorico] = useState<TarefaRecorrenteExecucao[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [proximaEditada, setProximaEditada] = useState(false);

  // ========================================
  // CARGA
  // ========================================

  const carregar = async () => {
    try {
      setLoading(true);
      const dados = await tarefasRecorrentesService.listar(
        mostrarInativas ? undefined : { ativo: true }
      );
      setTarefas(dados);
    } catch (err) {
      console.error('Erro ao carregar tarefas recorrentes:', err);
      toast.error('Erro ao carregar tarefas recorrentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarInativas]);

  useEffect(() => {
    usuariosService
      .listar({ ativo: true })
      .then(setUsuarios)
      .catch(() => setUsuarios([]));
  }, []);

  const nomeUsuario = (id?: number | null) =>
    usuarios.find((u) => u.id === id)?.nome;

  const nomeCategoria = (id?: number | null) =>
    categorias.find((c) => c.id === id)?.nome;

  // ========================================
  // AÇÕES
  // ========================================

  const abrirCriar = () => {
    const f = formInicial();
    f.proxima_data = sugerirPrimeiraData(
      f.tipo_recorrencia,
      f.dia_semana,
      f.dia_mes
    );
    setForm(f);
    setProximaEditada(false);
    setSelecionada(null);
    setModal('criar');
  };

  const abrirEditar = (t: TarefaRecorrente) => {
    setForm({
      titulo: t.titulo,
      descricao: t.descricao || '',
      instrucoes: t.instrucoes || '',
      categoria_id: t.categoria_id ? String(t.categoria_id) : '',
      responsavel_id: t.responsavel_id ? String(t.responsavel_id) : '',
      prioridade: t.prioridade,
      tipo_recorrencia: t.tipo_recorrencia,
      intervalo: t.intervalo || 1,
      dia_semana: t.dia_semana ?? 1,
      dia_mes: t.dia_mes ?? 1,
      proxima_data: t.proxima_data,
    });
    setProximaEditada(true); // ao editar, não sobrescrever a data
    setSelecionada(t);
    setModal('editar');
  };

  // Recalcula a sugestão da próxima data quando muda o padrão (só no criar e se
  // o usuário ainda não editou o campo manualmente).
  const atualizarForm = (patch: Partial<FormState>) => {
    setForm((atual) => {
      const novo = { ...atual, ...patch };
      if (modal === 'criar' && !proximaEditada && 'proxima_data' in patch === false) {
        novo.proxima_data = sugerirPrimeiraData(
          novo.tipo_recorrencia,
          novo.dia_semana,
          novo.dia_mes
        );
      }
      return novo;
    });
  };

  const montarPayload = (): TarefaRecorrenteCreate => ({
    titulo: form.titulo.trim(),
    descricao: form.descricao.trim() || null,
    instrucoes: form.instrucoes.trim() || null,
    categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
    responsavel_id: form.responsavel_id ? Number(form.responsavel_id) : null,
    prioridade: form.prioridade,
    tipo_recorrencia: form.tipo_recorrencia,
    intervalo: Math.max(1, Number(form.intervalo) || 1),
    dia_semana: form.tipo_recorrencia === 'semanal' ? form.dia_semana : null,
    dia_mes: form.tipo_recorrencia === 'mensal' ? form.dia_mes : null,
    proxima_data: form.proxima_data || null,
  });

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim()) {
      toast.error('Informe um título');
      return;
    }
    try {
      setSalvando(true);
      const payload = montarPayload();
      if (modal === 'editar' && selecionada) {
        await tarefasRecorrentesService.atualizar(selecionada.id, payload);
        toast.success('Tarefa atualizada');
      } else {
        await tarefasRecorrentesService.criar(payload);
        toast.success('Tarefa recorrente criada');
      }
      setModal(null);
      await carregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar a tarefa');
    } finally {
      setSalvando(false);
    }
  };

  const abrirRealizar = (t: TarefaRecorrente) => {
    setSelecionada(t);
    setObservacao('');
    setModal('realizar');
  };

  const confirmarRealizar = async () => {
    if (!selecionada || !user) return;
    try {
      setSalvando(true);
      await tarefasRecorrentesService.realizar(selecionada.id, {
        observacao: observacao.trim() || null,
      });
      toast.success('Tarefa realizada! Próxima data atualizada.');
      setModal(null);
      await carregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar a realização');
    } finally {
      setSalvando(false);
    }
  };

  const abrirDetalhes = (t: TarefaRecorrente) => {
    setSelecionada(t);
    setModal('detalhes');
  };

  const abrirHistorico = async (t: TarefaRecorrente) => {
    setSelecionada(t);
    setHistorico([]);
    setModal('historico');
    try {
      const execs = await tarefasRecorrentesService.listarExecucoes(t.id);
      setHistorico(execs);
    } catch {
      toast.error('Erro ao carregar o histórico');
    }
  };

  const alternarAtivo = async (t: TarefaRecorrente) => {
    try {
      await tarefasRecorrentesService.atualizar(t.id, { ativo: !t.ativo });
      toast.success(t.ativo ? 'Tarefa desativada' : 'Tarefa reativada');
      await carregar();
    } catch {
      toast.error('Erro ao alterar o status');
    }
  };

  const excluir = async (t: TarefaRecorrente) => {
    const temHistorico = t.total_execucoes > 0;
    const mensagem = temHistorico
      ? `Tem certeza que quer excluir "${t.titulo}"?\n\n` +
        `Essa tarefa tem ${t.total_execucoes} ` +
        `${t.total_execucoes === 1 ? 'realização registrada' : 'realizações registradas'} no histórico. ` +
        `Excluir vai apagar a tarefa E todo esse histórico de realizações.\n\n` +
        `Esta ação NÃO pode ser desfeita.`
      : `Tem certeza que quer excluir "${t.titulo}"?\n\nEsta ação não pode ser desfeita.`;

    if (!window.confirm(mensagem)) return;
    try {
      await tarefasRecorrentesService.excluir(t.id);
      toast.success('Tarefa excluída');
      await carregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir a tarefa');
    }
  };

  // ========================================
  // STATUS DA PRÓXIMA DATA
  // ========================================

  const statusData = (
    ymd: string
  ): { label: string; classe: string } | null => {
    const hoje = hojeYMD();
    if (ymd < hoje)
      return {
        label: 'Atrasada',
        classe: 'bg-perigo/15 text-perigo-forte dark:text-perigo-suave',
      };
    if (ymd === hoje)
      return {
        label: 'Hoje',
        classe:
          'bg-alerta/15 text-alerta-forte dark:text-alerta-suave',
      };
    return null;
  };

  const tarefasOrdenadas = useMemo(
    () =>
      [...tarefas].sort((a, b) => a.proxima_data.localeCompare(b.proxima_data)),
    [tarefas]
  );

  // ========================================
  // GUARD DE PERMISSÃO
  // ========================================

  if (!podeGerenciar) {
    return (
      <div className="min-h-full bg-superficie-base flex items-center justify-center p-6">
        <div className="text-center">
          <IconeAtencao className="w-12 h-12 text-alerta mx-auto mb-4" />
          <p className="text-conteudo-suave text-lg">
            Você não tem permissão para acessar Tarefas Recorrentes.
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="min-h-full bg-superficie-base transition-colors">
      <div className="p-6">
        {/* Cabeçalho */}
        <div className="relative border border-borda bg-superficie transition-colors">
          <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <IconeRepetir className="w-7 h-7 text-info" />
              <div>
                <h1 className="text-3xl font-bold text-conteudo tracking-tight">
                  Tarefas Recorrentes
                </h1>
                <p className="text-conteudo-tenue text-sm mt-1">
                  Rotinas que se repetem — registre cada realização e a próxima
                  data avança sozinha.
                </p>
              </div>
            </div>
            <button
              onClick={abrirCriar}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-info text-white font-medium hover:bg-info-forte transition-colors"
            >
              <IconeMais className="w-4 h-4" />
              Nova tarefa
            </button>
          </div>
        </div>

        {/* Filtro */}
        <div className="mt-6 mb-6 flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-conteudo-suave cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarInativas}
              onChange={(e) => setMostrarInativas(e.target.checked)}
              className="w-4 h-4 accent-sinal"
            />
            Mostrar também as desativadas
          </label>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <IconeCarregando className="w-10 h-10 animate-spin text-info" />
          </div>
        ) : tarefasOrdenadas.length === 0 ? (
          <div className="relative border border-borda bg-superficie p-12 text-center">
            <IconeRepetir className="w-12 h-12 text-conteudo-tenue mx-auto mb-4" />
            <p className="text-conteudo-tenue text-lg">
              Nenhuma tarefa recorrente cadastrada.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tarefasOrdenadas.map((t) => {
              const st = statusData(t.proxima_data);
              return (
                <div
                  key={t.id}
                  className={`relative border bg-superficie p-5 transition-colors ${
                    t.ativo
                      ? 'border-borda'
                      : 'border-borda opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-conteudo truncate">
                        {t.titulo}
                      </h3>
                      <p className="text-xs text-conteudo-tenue mt-0.5">
                        {recorrenciaLabel(t)}
                      </p>
                    </div>
                    {!t.ativo && (
                      <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-superficie-elevada text-conteudo-suave">
                        Desativada
                      </span>
                    )}
                  </div>

                  {t.descricao && (
                    <p className="text-sm text-conteudo-suave mt-2 line-clamp-2">
                      {t.descricao}
                    </p>
                  )}

                  {/* Metadados */}
                  <div className="flex flex-wrap gap-2 mt-3 text-xs">
                    <span className="px-2 py-1 rounded-full bg-alerta/15 text-alerta-forte dark:text-alerta-suave">
                      {t.prioridade}
                    </span>
                    {(t.categoria_nome || nomeCategoria(t.categoria_id)) && (
                      <span className="px-2 py-1 rounded-full bg-info/15 text-info-forte dark:text-info-suave">
                        {t.categoria_nome || nomeCategoria(t.categoria_id)}
                      </span>
                    )}
                    {(t.responsavel_nome || nomeUsuario(t.responsavel_id)) && (
                      <span className="px-2 py-1 rounded-full bg-superficie-elevada text-conteudo-suave">
                        Resp.: {t.responsavel_nome || nomeUsuario(t.responsavel_id)}
                      </span>
                    )}
                  </div>

                  {/* Próxima data + contador */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-borda">
                    <div className="flex items-center gap-2">
                      <IconeAgenda className="w-4 h-4 text-conteudo-tenue" />
                      <span className="text-sm text-conteudo-suave">
                        Próxima: {formatarDataBR(t.proxima_data)}
                      </span>
                      {st && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.classe}`}
                        >
                          {st.label}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-conteudo-tenue">
                      {t.total_execucoes}{' '}
                      {t.total_execucoes === 1 ? 'realização' : 'realizações'}
                    </span>
                  </div>

                  {/* Ações.
                      Antes eram seis botões do mesmo peso, cada um com sua cor:
                      realizar a tarefa do dia disputava atenção com excluí-la.
                      Agora só a ação principal é sólida, as de consulta ficam
                      discretas, e a destrutiva sai do grupo — encostada na
                      direita, para não ser clicada por vizinhança. */}
                  <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-borda-suave pt-3">
                    {t.ativo && (
                      <Button variante="sucesso" tamanho="sm" onClick={() => abrirRealizar(t)}>
                        <IconeConfereCirculo className="h-4 w-4" aria-hidden="true" />
                        Realizar
                      </Button>
                    )}

                    <Button variante="secundario" tamanho="sm" onClick={() => abrirDetalhes(t)}>
                      <IconeInfo className="h-4 w-4" aria-hidden="true" />
                      Detalhes
                    </Button>

                    <Button variante="secundario" tamanho="sm" onClick={() => abrirHistorico(t)}>
                      <IconeHistorico className="h-4 w-4" aria-hidden="true" />
                      Histórico
                    </Button>

                    <Button variante="secundario" tamanho="sm" onClick={() => abrirEditar(t)}>
                      <IconeEditar className="h-4 w-4" aria-hidden="true" />
                      Editar
                    </Button>

                    <Button variante="secundario" tamanho="sm" onClick={() => alternarAtivo(t)}>
                      <IconeEnergia className="h-4 w-4" aria-hidden="true" />
                      {t.ativo ? 'Desativar' : 'Reativar'}
                    </Button>

                    <Button
                      variante="secundario"
                      tamanho="sm"
                      onClick={() => excluir(t)}
                      title={`Excluir ${t.titulo}`}
                      className="ml-auto border-perigo/40 text-perigo hover:bg-perigo/10 hover:border-perigo/60"
                    >
                      <IconeApagar className="h-4 w-4" aria-hidden="true" />
                      Excluir
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================== MODAL CRIAR/EDITAR ==================== */}
      {(modal === 'criar' || modal === 'editar') && (
        <Modal
          aberto
          aoFechar={() => setModal(null)}
          titulo={modal === 'editar' ? 'Editar tarefa' : 'Nova tarefa recorrente'}
          largura="md"
        >

              <form onSubmit={salvar} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-conteudo-suave mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={form.titulo}
                    onChange={(e) => atualizarForm({ titulo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-superficie text-conteudo border-borda focus:outline-none focus:ring-2 focus:ring-info"
                    placeholder="Ex: Abertura de logs"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-conteudo-suave mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={form.descricao}
                    onChange={(e) => atualizarForm({ descricao: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg bg-superficie text-conteudo border-borda focus:outline-none focus:ring-2 focus:ring-info"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-conteudo-suave mb-1">
                    Instruções / procedimento
                  </label>
                  <textarea
                    value={form.instrucoes}
                    onChange={(e) => atualizarForm({ instrucoes: e.target.value })}
                    rows={8}
                    className="w-full px-3 py-2 border rounded-lg bg-superficie text-conteudo border-borda focus:outline-none focus:ring-2 focus:ring-info"
                    placeholder="Passo a passo de como executar"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-conteudo-suave mb-1">
                      Categoria
                    </label>
                    <Seletor
                      rotulo="Categoria"
                      valor={String(form.categoria_id ?? '')}
                      aoMudar={(v) => atualizarForm({ categoria_id: v })}
                      opcoes={[
                        { valor: '', rotulo: 'Sem categoria' },
                        ...categorias.map((c) => ({ valor: String(c.id), rotulo: c.nome })),
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-conteudo-suave mb-1">
                      Responsável padrão
                    </label>
                    <Seletor
                      rotulo="Responsável padrão"
                      valor={String(form.responsavel_id ?? '')}
                      aoMudar={(v) => atualizarForm({ responsavel_id: v })}
                      opcoes={[
                        { valor: '', rotulo: 'Sem responsável' },
                        ...usuarios.map((u) => ({ valor: String(u.id), rotulo: u.nome })),
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-conteudo-suave mb-1">
                      Prioridade
                    </label>
                    <Seletor
                      rotulo="Prioridade"
                      valor={form.prioridade}
                      aoMudar={(v) => atualizarForm({ prioridade: v as PrioridadeEnum })}
                      opcoes={Object.values(PrioridadeEnum).map((p) => ({
                        valor: p,
                        rotulo: p,
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-conteudo-suave mb-1">
                      Recorrência
                    </label>
                    <Seletor
                      rotulo="Recorrência"
                      valor={form.tipo_recorrencia}
                      aoMudar={(v) =>
                        atualizarForm({ tipo_recorrencia: v as TipoRecorrencia })
                      }
                      opcoes={[
                        { valor: 'diaria', rotulo: 'Diária' },
                        { valor: 'semanal', rotulo: 'Semanal' },
                        { valor: 'mensal', rotulo: 'Mensal' },
                      ]}
                    />
                  </div>
                </div>

                {/* Config específica do tipo */}
                <div className="grid grid-cols-2 gap-4">
                  {form.tipo_recorrencia === 'semanal' && (
                    <div>
                      <label className="block text-sm font-medium text-conteudo-suave mb-1">
                        Dia da semana
                      </label>
                      <Seletor
                        rotulo="Dia da semana"
                        valor={String(form.dia_semana)}
                        aoMudar={(v) => atualizarForm({ dia_semana: Number(v) })}
                        opcoes={DIAS_SEMANA.map((d, i) => ({
                          valor: String(i),
                          rotulo: d,
                        }))}
                      />
                    </div>
                  )}
                  {form.tipo_recorrencia === 'mensal' && (
                    <div>
                      <label className="block text-sm font-medium text-conteudo-suave mb-1">
                        Dia do mês
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={form.dia_mes}
                        onChange={(e) =>
                          atualizarForm({ dia_mes: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 border rounded-lg bg-superficie text-conteudo border-borda focus:outline-none focus:ring-2 focus:ring-info"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-conteudo-suave mb-1">
                      A cada (intervalo)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.intervalo}
                      onChange={(e) =>
                        atualizarForm({ intervalo: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-superficie text-conteudo border-borda focus:outline-none focus:ring-2 focus:ring-info"
                    />
                    <p className="text-xs text-conteudo-tenue mt-1">
                      {form.tipo_recorrencia === 'diaria'
                        ? 'dias'
                        : form.tipo_recorrencia === 'semanal'
                          ? 'semanas'
                          : 'meses'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-conteudo-suave mb-1">
                    Próxima data {modal === 'criar' && '(sugerida — pode ajustar)'}
                  </label>
                  <input
                    type="date"
                    value={form.proxima_data}
                    onChange={(e) => {
                      setProximaEditada(true);
                      setForm((a) => ({ ...a, proxima_data: e.target.value }));
                    }}
                    className="w-full px-3 py-2 border rounded-lg bg-superficie text-conteudo border-borda focus:outline-none focus:ring-2 focus:ring-info"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="px-4 py-2 rounded-lg bg-superficie-elevada text-conteudo-suave hover:bg-borda"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-info text-white font-medium hover:bg-info-forte disabled:opacity-60"
                  >
                    {salvando ? (
                      <IconeCarregando className="w-4 h-4 animate-spin" />
                    ) : (
                      <IconeSalvar className="w-4 h-4" />
                    )}
                    Salvar
                  </button>
                </div>
              </form>
        </Modal>
      )}

      {/* ==================== MODAL REALIZAR ==================== */}
      {modal === 'realizar' && selecionada && (
        <Modal
          aberto
          aoFechar={() => setModal(null)}
          titulo="Realizar tarefa"
          largura="sm"
        >
              <div className="p-6 space-y-4">
                <div>
                  <p className="font-medium text-conteudo">
                    {selecionada.titulo}
                  </p>
                  <p className="text-sm text-conteudo-tenue">
                    Agendada para {formatarDataBR(selecionada.proxima_data)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-conteudo-suave mb-1">
                    Observação (opcional)
                  </label>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg bg-superficie text-conteudo border-borda focus:outline-none focus:ring-2 focus:ring-sucesso"
                    placeholder="O que foi feito, alguma ocorrência..."
                  />
                </div>
                <p className="text-xs text-conteudo-tenue">
                  Vai registrar você como responsável, com data e hora de agora, e
                  avançar a próxima data automaticamente.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setModal(null)}
                    className="px-4 py-2 rounded-lg bg-superficie-elevada text-conteudo-suave hover:bg-borda"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarRealizar}
                    disabled={salvando}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sucesso text-white font-medium hover:bg-sucesso-forte disabled:opacity-60"
                  >
                    {salvando ? (
                      <IconeCarregando className="w-4 h-4 animate-spin" />
                    ) : (
                      <IconeConfereCirculo className="w-4 h-4" />
                    )}
                    Confirmar
                  </button>
                </div>
              </div>
        </Modal>
      )}

      {/* ==================== MODAL HISTÓRICO ==================== */}
      {modal === 'historico' && selecionada && (
        <Modal
          aberto
          aoFechar={() => setModal(null)}
          titulo="Histórico — {selecionada.titulo}"
          largura="md"
        >
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {historico.length === 0 ? (
                  <p className="text-center text-conteudo-tenue py-8">
                    Nenhuma execução registrada ainda.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-conteudo-tenue border-b border-borda">
                      <tr>
                        <th className="py-2 pr-4">Realizada em</th>
                        <th className="py-2 pr-4">Quem</th>
                        <th className="py-2 pr-4">Prevista</th>
                        <th className="py-2">Observação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 divide-borda">
                      {historico.map((e) => (
                        <tr key={e.id}>
                          <td className="py-2 pr-4 text-conteudo whitespace-nowrap">
                            {formatarDataHora(e.realizada_em)}
                          </td>
                          <td className="py-2 pr-4 text-conteudo-suave">
                            {e.usuario_nome || nomeUsuario(e.usuario_id) || `#${e.usuario_id}`}
                          </td>
                          <td className="py-2 pr-4 text-conteudo-tenue whitespace-nowrap">
                            {formatarDataBR(e.data_prevista)}
                          </td>
                          <td className="py-2 text-conteudo-suave">
                            {e.observacao || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
        </Modal>
      )}

      {/* ==================== MODAL DETALHES (só leitura) ==================== */}
      {modal === 'detalhes' && selecionada && (
        <Modal
          aberto
          aoFechar={() => setModal(null)}
          titulo="Detalhes da tarefa"
          largura="sm"
        >

              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <div>
                  <h3 className="text-lg font-semibold text-conteudo">
                    {selecionada.titulo}
                  </h3>
                  <p className="text-sm text-conteudo-tenue mt-0.5">
                    {recorrenciaLabel(selecionada)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-alerta/15 text-alerta-forte dark:text-alerta-suave">
                    {selecionada.prioridade}
                  </span>
                  {(selecionada.categoria_nome ||
                    nomeCategoria(selecionada.categoria_id)) && (
                    <span className="px-2 py-1 rounded-full bg-info/15 text-info-forte dark:text-info-suave">
                      {selecionada.categoria_nome ||
                        nomeCategoria(selecionada.categoria_id)}
                    </span>
                  )}
                  {(selecionada.responsavel_nome ||
                    nomeUsuario(selecionada.responsavel_id)) && (
                    <span className="px-2 py-1 rounded-full bg-superficie-elevada text-conteudo-suave">
                      Resp.:{' '}
                      {selecionada.responsavel_nome ||
                        nomeUsuario(selecionada.responsavel_id)}
                    </span>
                  )}
                  <span
                    className={`px-2 py-1 rounded-full ${
                      selecionada.ativo
                        ? 'bg-sucesso/15 text-sucesso-forte dark:text-sucesso-suave'
                        : 'bg-superficie-elevada text-conteudo-suave'
                    }`}
                  >
                    {selecionada.ativo ? 'Ativa' : 'Desativada'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs uppercase text-conteudo-tenue">Próxima data</p>
                    <p className="text-conteudo">
                      {formatarDataBR(selecionada.proxima_data)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-conteudo-tenue">Realizações</p>
                    <p className="text-conteudo">
                      {selecionada.total_execucoes}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase text-conteudo-tenue mb-1">Descrição</p>
                  <p className="text-sm text-conteudo-suave whitespace-pre-wrap">
                    {selecionada.descricao || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase text-conteudo-tenue mb-1 flex items-center gap-1.5">
                    <IconeDocumento className="w-3.5 h-3.5" />
                    Instruções / procedimento
                  </p>
                  <div className="text-sm text-conteudo-suave whitespace-pre-wrap rounded-lg bg-superficie-elevada border border-borda p-3">
                    {selecionada.instrucoes || 'Sem instruções cadastradas.'}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => abrirEditar(selecionada)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-superficie-elevada text-conteudo-suave hover:bg-borda"
                  >
                    <IconeEditar className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => setModal(null)}
                    className="px-4 py-2 rounded-lg bg-info text-white font-medium hover:bg-info-forte"
                  >
                    Fechar
                  </button>
                </div>
              </div>
        </Modal>
      )}
    </div>
  );
};

export default TarefasRecorrentes;
