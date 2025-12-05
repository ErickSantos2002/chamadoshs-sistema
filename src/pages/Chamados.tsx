import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { StatusEnum, PrioridadeEnum, Chamado, Usuario } from '../types/api';
import { Filter, Plus, Search, Loader2, User } from 'lucide-react';
import { usuariosService } from '../services/chamadoshsapi';
import { KanbanColumn } from '../components/KanbanColumn';

const Chamados: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chamados, loading, error, carregarChamados } = useChamados();

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<StatusEnum | ''>('');
  const [filtroPrioridade, setFiltroPrioridade] = useState<PrioridadeEnum | ''>('');
  const [filtroProtocolo, setFiltroProtocolo] = useState('');

  // Estado para armazenar os usuários (solicitantes)
  const [usuarios, setUsuarios] = useState<Record<number, Usuario>>({});

  // Permissões baseadas em role
  const isAdmin = user?.role === 'Administrador';
  const isTecnico = user?.role === 'Tecnico';
  const isUsuario = user?.role === 'Usuario';

  // Forçar reload dos chamados quando a página é montada
  useEffect(() => {
    carregarChamados();
  }, []);

  // Auto-refresh a cada 10 minutos (para TV/monitoramento)
  useEffect(() => {
    const intervalo = setInterval(() => {
      carregarChamados();
    }, 600000); // 10 minutos em milissegundos

    // Cleanup: limpar o intervalo quando o componente desmontar
    return () => clearInterval(intervalo);
  }, []);

  // Buscar nomes dos usuários (solicitantes)
  useEffect(() => {
    const carregarUsuarios = async () => {
      const usuarioIds = new Set<number>();
      chamados.forEach((chamado) => {
        usuarioIds.add(chamado.solicitante_id);
      });

      const usuariosPromises = Array.from(usuarioIds).map(async (userId) => {
        try {
          const usuario = await usuariosService.buscar(userId);
          return { id: userId, usuario };
        } catch {
          return { id: userId, usuario: null };
        }
      });

      const usuariosResult = await Promise.all(usuariosPromises);
      const usuariosMap: Record<number, Usuario> = {};
      usuariosResult.forEach(({ id, usuario }) => {
        if (usuario) usuariosMap[id] = usuario;
      });

      setUsuarios(usuariosMap);
    };

    if (chamados.length > 0) {
      carregarUsuarios();
    }
  }, [chamados]);

  // Filtra os chamados localmente
  const chamadosFiltrados = chamados.filter((chamado) => {
    if (filtroStatus && chamado.status !== filtroStatus) return false;
    if (filtroPrioridade && chamado.prioridade !== filtroPrioridade) return false;
    if (filtroProtocolo && !chamado.protocolo.toLowerCase().includes(filtroProtocolo.toLowerCase())) return false;
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

    return grupos;
  }, [chamadosFiltrados]);

  // Função para obter a cor do status
  const getStatusColor = (status: StatusEnum) => {
    switch (status) {
      case StatusEnum.ABERTO:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400';
      case StatusEnum.EM_ANDAMENTO:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400';
      case StatusEnum.AGUARDANDO:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400';
      case StatusEnum.RESOLVIDO:
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400';
      case StatusEnum.FECHADO:
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400'; // Unificado com Resolvido
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400';
    }
  };

  // Função para exibir o status (Fechado vira Resolvido visualmente)
  const getStatusDisplay = (status: StatusEnum): string => {
    return status === StatusEnum.FECHADO ? 'Resolvido' : status;
  };

  // Função para obter a cor da prioridade
  const getPrioridadeColor = (prioridade: PrioridadeEnum) => {
    switch (prioridade) {
      case PrioridadeEnum.BAIXA:
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400';
      case PrioridadeEnum.MEDIA:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400';
      case PrioridadeEnum.ALTA:
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400';
      case PrioridadeEnum.CRITICA:
        return 'bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400';
    }
  };

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
      <div className="min-h-full bg-gray-100 dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Carregando chamados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-100 dark:bg-[#121212] transition-colors">
      <div className="p-6">

        {/* Cabeçalho */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md transition-colors mb-6">
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-[#A78BFA] tracking-tight">
                Gestão de Chamados
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {isAdmin && 'Visualize e gerencie todos os chamados do sistema'}
                {isTecnico && 'Visualize e gerencie os chamados atribuídos a você'}
                {isUsuario && 'Visualize e acompanhe seus chamados'}
              </p>
            </div>

            {/* Botão Novo Chamado */}
            <button
              onClick={() => navigate('/chamados/novo')}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1E40AF] dark:bg-[#2563EB] dark:hover:bg-[#1E3A8A]
                        text-white font-medium rounded-lg shadow-sm hover:shadow-md
                        transition-all duration-200 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Novo Chamado
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 mb-6 transition-colors">
          <div className="flex items-center mb-6">
            <Filter className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Filtros
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Filtro Protocolo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Protocolo
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filtroProtocolo}
                  onChange={(e) => setFiltroProtocolo(e.target.value)}
                  placeholder="Buscar por protocolo..."
                  className="pl-10 w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                          text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                          focus:outline-none focus:ring-2 focus:ring-[#7C3AED] transition-colors"
                />
              </div>
            </div>

            {/* Filtro Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as StatusEnum | '')}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                        text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                        focus:outline-none focus:ring-2 focus:ring-[#A78BFA] transition-colors"
              >
                <option value="">Todos os status</option>
                {Object.values(StatusEnum)
                  .filter((status) => status !== StatusEnum.FECHADO) // Remove Fechado do filtro
                  .map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
              </select>
            </div>

            {/* Filtro Prioridade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prioridade
              </label>
              <select
                value={filtroPrioridade}
                onChange={(e) => setFiltroPrioridade(e.target.value as PrioridadeEnum | '')}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                        text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                        focus:outline-none focus:ring-2 focus:ring-[#DB2777] transition-colors"
              >
                <option value="">Todas as prioridades</option>
                {Object.values(PrioridadeEnum).map((prioridade) => (
                  <option key={prioridade} value={prioridade}>
                    {prioridade}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Botão limpar filtros */}
          {(filtroStatus || filtroPrioridade || filtroProtocolo) && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setFiltroStatus('');
                  setFiltroPrioridade('');
                  setFiltroProtocolo('');
                }}
                className="text-sm text-[#2563EB] hover:text-[#1E40AF] dark:text-[#60A5FA]
                          dark:hover:text-[#93C5FD] font-medium"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                        text-red-800 dark:text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Contador */}
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Exibindo {chamadosFiltrados.length} de {chamados.length} chamados
        </div>

        {/* Kanban - 4 colunas (Fechados unificados com Resolvidos) */}
        <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-2 md:grid-cols-2 gap-4">

          {/* === COLUNA ABERTO === */}
          <KanbanColumn
            title="Aberto"
            colorDot="bg-blue-500"
            badgeColor="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            items={chamadosPorStatus[StatusEnum.ABERTO]}
            usuarios={usuarios}
            navigate={navigate}
            getPrioridadeColor={getPrioridadeColor}
          />

          {/* === EM ANDAMENTO === */}
          <KanbanColumn
            title="Em Andamento"
            colorDot="bg-[#06B6D4]"
            badgeColor="bg-[#06B6D4]/20 text-[#06B6D4]"
            items={chamadosPorStatus[StatusEnum.EM_ANDAMENTO]}
            usuarios={usuarios}
            navigate={navigate}
            getPrioridadeColor={getPrioridadeColor}
          />

          {/* === AGUARDANDO === */}
          <KanbanColumn
            title="Aguardando"
            colorDot="bg-[#A78BFA]"
            badgeColor="bg-[#A78BFA]/20 text-[#A78BFA]"
            items={chamadosPorStatus[StatusEnum.AGUARDANDO]}
            usuarios={usuarios}
            navigate={navigate}
            getPrioridadeColor={getPrioridadeColor}
          />

          {/* === RESOLVIDO (inclui Fechados) === */}
          <KanbanColumn
            title="Resolvido"
            colorDot="bg-[#4ADE80]"
            badgeColor="bg-[#4ADE80]/20 text-[#4ADE80]"
            items={chamadosPorStatus[StatusEnum.RESOLVIDO]}
            usuarios={usuarios}
            navigate={navigate}
            getPrioridadeColor={getPrioridadeColor}
          />
        </div>
      </div>
    </div>
  );

};

export default Chamados;
