import React, { useEffect, useMemo, useState } from 'react';
import {
  Repeat,
  Plus,
  CheckCircle2,
  History,
  Pencil,
  Trash2,
  Power,
  X,
  CalendarClock,
  AlertTriangle,
  Loader2,
  Save,
  Info,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
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
        classe: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
      };
    if (ymd === hoje)
      return {
        label: 'Hoje',
        classe:
          'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
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
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
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
        <div className="bg-superficie border border-borda rounded-xl shadow-md transition-colors">
          <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Repeat className="w-7 h-7 text-info" />
              <div>
                <h1 className="text-3xl font-bold text-conteudo text-info tracking-tight">
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-info text-white font-medium hover:bg-[#6D28D9] transition-colors"
            >
              <Plus className="w-4 h-4" />
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
              className="w-4 h-4 accent-[#3B82F6]"
            />
            Mostrar também as desativadas
          </label>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-info" />
          </div>
        ) : tarefasOrdenadas.length === 0 ? (
          <div className="bg-superficie border border-borda rounded-xl shadow-md p-12 text-center">
            <Repeat className="w-12 h-12 text-conteudo-tenue mx-auto mb-4" />
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
                  className={`bg-superficie border rounded-xl shadow-md p-5 transition-colors ${
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
                    <span className="px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                      {t.prioridade}
                    </span>
                    {(t.categoria_nome || nomeCategoria(t.categoria_id)) && (
                      <span className="px-2 py-1 rounded-full bg-info/15 text-blue-700 dark:text-blue-300">
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
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 border-borda">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-conteudo-tenue" />
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

                  {/* Ações */}
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    {t.ativo && (
                      <button
                        onClick={() => abrirRealizar(t)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Realizar
                      </button>
                    )}
                    <button
                      onClick={() => abrirDetalhes(t)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-superficie-elevada text-conteudo-suave text-sm hover:bg-borda transition-colors"
                    >
                      <Info className="w-4 h-4" />
                      Detalhes
                    </button>
                    <button
                      onClick={() => abrirHistorico(t)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-superficie-elevada text-conteudo-suave text-sm hover:bg-borda transition-colors"
                    >
                      <History className="w-4 h-4" />
                      Histórico
                    </button>
                    <button
                      onClick={() => abrirEditar(t)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-superficie-elevada text-conteudo-suave text-sm hover:bg-borda transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => alternarAtivo(t)}
                      title={t.ativo ? 'Desativar' : 'Reativar'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-superficie-elevada text-conteudo-suave text-sm hover:bg-borda transition-colors"
                    >
                      <Power className="w-4 h-4" />
                      {t.ativo ? 'Desativar' : 'Reativar'}
                    </button>
                    <button
                      onClick={() => excluir(t)}
                      title="Excluir"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-perigo/10 text-perigo-forte dark:text-perigo-suave text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================== MODAL CRIAR/EDITAR ==================== */}
      {(modal === 'criar' || modal === 'editar') && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModal(null)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-3xl bg-superficie rounded-lg shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-borda">
                <div className="flex items-center gap-3">
                  <Repeat className="w-5 h-5 text-info" />
                  <h2 className="text-xl font-semibold text-conteudo">
                    {modal === 'editar' ? 'Editar tarefa' : 'Nova tarefa recorrente'}
                  </h2>
                </div>
                <button
                  onClick={() => setModal(null)}
                  className="p-1 rounded-lg hover:bg-superficie-elevada"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-conteudo-tenue" />
                </button>
              </div>

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
                    <select
                      value={form.categoria_id}
                      onChange={(e) => atualizarForm({ categoria_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-superficie text-conteudo border-borda focus:outline-none focus:ring-2 focus:ring-info"
                    >
                      <option value="">Sem categoria</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-conteudo-suave mb-1">
                      Responsável padrão
                    </label>
                    <select
                      value={form.responsavel_id}
                      onChange={(e) => atualizarForm({ responsavel_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-superficie text-conteudo border-borda focus:outline-none focus:ring-2 focus:ring-info"
                    >
                      <option value="">Sem responsável</option>
                      {usuarios.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-conteudo-suave mb-1">
                      Prioridade
                    </label>
                    <select
                      value={form.prioridade}
                      onChange={(e) =>
                        atualizarForm({ prioridade: e.target.value as PrioridadeEnum })
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-superficie text-conteudo border-borda focus:outline-none focus:ring-2 focus:ring-info"
                    >
                      {Object.values(PrioridadeEnum).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-conteudo-suave mb-1">
                      Recorrência
                    </label>
                    <select
                      value={form.tipo_recorrencia}
                      onChange={(e) =>
                        atualizarForm({
                          tipo_recorrencia: e.target.value as TipoRecorrencia,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-superficie text-conteudo border-borda focus:outline-none focus:ring-2 focus:ring-info"
                    >
                      <option value="diaria">Diária</option>
                      <option value="semanal">Semanal</option>
                      <option value="mensal">Mensal</option>
                    </select>
                  </div>
                </div>

                {/* Config específica do tipo */}
                <div className="grid grid-cols-2 gap-4">
                  {form.tipo_recorrencia === 'semanal' && (
                    <div>
                      <label className="block text-sm font-medium text-conteudo-suave mb-1">
                        Dia da semana
                      </label>
                      <select
                        value={form.dia_semana}
                        onChange={(e) =>
                          atualizarForm({ dia_semana: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 border rounded-lg bg-superficie text-conteudo border-borda focus:outline-none focus:ring-2 focus:ring-info"
                      >
                        {DIAS_SEMANA.map((d, i) => (
                          <option key={i} value={i}>
                            {d}
                          </option>
                        ))}
                      </select>
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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-info text-white font-medium hover:bg-[#6D28D9] disabled:opacity-60"
                  >
                    {salvando ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL REALIZAR ==================== */}
      {modal === 'realizar' && selecionada && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModal(null)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-superficie rounded-lg shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-borda">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-sucesso-forte dark:text-sucesso-suave" />
                  <h2 className="text-xl font-semibold text-conteudo">
                    Realizar tarefa
                  </h2>
                </div>
                <button
                  onClick={() => setModal(null)}
                  className="p-1 rounded-lg hover:bg-superficie-elevada"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-conteudo-tenue" />
                </button>
              </div>
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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-60"
                  >
                    {salvando ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL HISTÓRICO ==================== */}
      {modal === 'historico' && selecionada && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModal(null)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-superficie rounded-lg shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-borda">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-info" />
                  <h2 className="text-xl font-semibold text-conteudo">
                    Histórico — {selecionada.titulo}
                  </h2>
                </div>
                <button
                  onClick={() => setModal(null)}
                  className="p-1 rounded-lg hover:bg-superficie-elevada"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-conteudo-tenue" />
                </button>
              </div>
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
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL DETALHES (só leitura) ==================== */}
      {modal === 'detalhes' && selecionada && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModal(null)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-superficie rounded-lg shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-borda">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-info" />
                  <h2 className="text-xl font-semibold text-conteudo">
                    Detalhes da tarefa
                  </h2>
                </div>
                <button
                  onClick={() => setModal(null)}
                  className="p-1 rounded-lg hover:bg-superficie-elevada"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-conteudo-tenue" />
                </button>
              </div>

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
                  <span className="px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                    {selecionada.prioridade}
                  </span>
                  {(selecionada.categoria_nome ||
                    nomeCategoria(selecionada.categoria_id)) && (
                    <span className="px-2 py-1 rounded-full bg-info/15 text-blue-700 dark:text-blue-300">
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
                        ? 'bg-sucesso/15 text-green-700 dark:text-green-300'
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
                    <FileText className="w-3.5 h-3.5" />
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
                    <Pencil className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => setModal(null)}
                    className="px-4 py-2 rounded-lg bg-info text-white font-medium hover:bg-[#6D28D9]"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TarefasRecorrentes;
