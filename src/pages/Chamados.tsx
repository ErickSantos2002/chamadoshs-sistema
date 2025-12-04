import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { StatusEnum, PrioridadeEnum, Chamado, Usuario } from '../types/api';
import { Filter, Plus, Search, Loader2, User } from 'lucide-react';
import { usuariosService } from '../services/chamadoshsapi';

const Chamados: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chamados, loading, error } = useChamados();

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
  const chamadosPorStatus = useMemo(() => {
    const grupos: Record<StatusEnum, Chamado[]> = {
      [StatusEnum.ABERTO]: [],
      [StatusEnum.EM_ANDAMENTO]: [],
      [StatusEnum.AGUARDANDO]: [],
      [StatusEnum.RESOLVIDO]: [],
      [StatusEnum.FECHADO]: [],
    };

    chamadosFiltrados.forEach((chamado) => {
      grupos[chamado.status].push(chamado);
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
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400';
    }
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-[#facc15] tracking-tight">
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
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
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Filtros
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Filtro de Protocolo */}
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
                           focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Filtro de Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as StatusEnum | '')}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                         text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                         focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="">Todos os status</option>
                {Object.values(StatusEnum).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Prioridade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prioridade
              </label>
              <select
                value={filtroPrioridade}
                onChange={(e) => setFiltroPrioridade(e.target.value as PrioridadeEnum | '')}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#2a2a2a]
                         text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600
                         focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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

          {/* Botão de Limpar Filtros */}
          {(filtroStatus || filtroPrioridade || filtroProtocolo) && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setFiltroStatus('');
                  setFiltroPrioridade('');
                  setFiltroProtocolo('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400
                         dark:hover:text-blue-300 font-medium"
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

        {/* Contador de chamados */}
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Exibindo {chamadosFiltrados.length} de {chamados.length} chamados
        </div>

        {/* Layout Kanban */}
        <div className="grid grid-cols-1 xl:grid-cols-5 lg:grid-cols-3 md:grid-cols-2 gap-4">
            {/* Coluna Aberto */}
            <div>
              <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md transition-colors">
                {/* Cabeçalho da Coluna */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-[#2d2d2d]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                      Aberto
                    </h3>
                    <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                      {chamadosPorStatus[StatusEnum.ABERTO].length}
                    </span>
                  </div>
                </div>
                {/* Cards */}
                <div className="p-3 space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                  {chamadosPorStatus[StatusEnum.ABERTO].length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      Nenhum chamado
                    </p>
                  ) : (
                    chamadosPorStatus[StatusEnum.ABERTO].map((chamado) => (
                      <div
                        key={chamado.id}
                        onClick={() => navigate(`/chamados/${chamado.id}`)}
                        className="bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-600
                                 rounded-lg p-3 cursor-pointer hover:shadow-lg hover:border-blue-400
                                 dark:hover:border-blue-500 transition-all duration-200"
                      >
                        {/* Protocolo */}
                        <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">
                          #{chamado.protocolo}
                        </div>
                        {/* Título */}
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {chamado.titulo}
                        </h4>
                        {/* Solicitante */}
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <User className="w-3 h-3" />
                          <span className="truncate">
                            {usuarios[chamado.solicitante_id]?.nome || `Usuário #${chamado.solicitante_id}`}
                          </span>
                        </div>
                        {/* Prioridade */}
                        <div className="flex items-center justify-end">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPrioridadeColor(chamado.prioridade)}`}>
                            {chamado.prioridade}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Em Andamento */}
            <div>
              <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md transition-colors">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-[#2d2d2d]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                      Em Andamento
                    </h3>
                    <span className="px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full">
                      {chamadosPorStatus[StatusEnum.EM_ANDAMENTO].length}
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                  {chamadosPorStatus[StatusEnum.EM_ANDAMENTO].length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      Nenhum chamado
                    </p>
                  ) : (
                    chamadosPorStatus[StatusEnum.EM_ANDAMENTO].map((chamado) => (
                      <div
                        key={chamado.id}
                        onClick={() => navigate(`/chamados/${chamado.id}`)}
                        className="bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-600
                                 rounded-lg p-3 cursor-pointer hover:shadow-lg hover:border-amber-400
                                 dark:hover:border-amber-500 transition-all duration-200"
                      >
                        <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">
                          #{chamado.protocolo}
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {chamado.titulo}
                        </h4>
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <User className="w-3 h-3" />
                          <span className="truncate">
                            {usuarios[chamado.solicitante_id]?.nome || `Usuário #${chamado.solicitante_id}`}
                          </span>
                        </div>
                        <div className="flex items-center justify-end">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPrioridadeColor(chamado.prioridade)}`}>
                            {chamado.prioridade}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Aguardando */}
            <div>
              <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md transition-colors">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-[#2d2d2d]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                      Aguardando
                    </h3>
                    <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 rounded-full">
                      {chamadosPorStatus[StatusEnum.AGUARDANDO].length}
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                  {chamadosPorStatus[StatusEnum.AGUARDANDO].length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      Nenhum chamado
                    </p>
                  ) : (
                    chamadosPorStatus[StatusEnum.AGUARDANDO].map((chamado) => (
                      <div
                        key={chamado.id}
                        onClick={() => navigate(`/chamados/${chamado.id}`)}
                        className="bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-600
                                 rounded-lg p-3 cursor-pointer hover:shadow-lg hover:border-gray-400
                                 dark:hover:border-gray-500 transition-all duration-200"
                      >
                        <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">
                          #{chamado.protocolo}
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {chamado.titulo}
                        </h4>
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <User className="w-3 h-3" />
                          <span className="truncate">
                            {usuarios[chamado.solicitante_id]?.nome || `Usuário #${chamado.solicitante_id}`}
                          </span>
                        </div>
                        <div className="flex items-center justify-end">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPrioridadeColor(chamado.prioridade)}`}>
                            {chamado.prioridade}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Resolvido */}
            <div>
              <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md transition-colors">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-[#2d2d2d]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      Resolvido
                    </h3>
                    <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                      {chamadosPorStatus[StatusEnum.RESOLVIDO].length}
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                  {chamadosPorStatus[StatusEnum.RESOLVIDO].length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      Nenhum chamado
                    </p>
                  ) : (
                    chamadosPorStatus[StatusEnum.RESOLVIDO].map((chamado) => (
                      <div
                        key={chamado.id}
                        onClick={() => navigate(`/chamados/${chamado.id}`)}
                        className="bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-600
                                 rounded-lg p-3 cursor-pointer hover:shadow-lg hover:border-green-400
                                 dark:hover:border-green-500 transition-all duration-200"
                      >
                        <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">
                          #{chamado.protocolo}
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {chamado.titulo}
                        </h4>
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <User className="w-3 h-3" />
                          <span className="truncate">
                            {usuarios[chamado.solicitante_id]?.nome || `Usuário #${chamado.solicitante_id}`}
                          </span>
                        </div>
                        <div className="flex items-center justify-end">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPrioridadeColor(chamado.prioridade)}`}>
                            {chamado.prioridade}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Fechado */}
            <div>
              <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md transition-colors">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-[#2d2d2d]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                      Fechado
                    </h3>
                    <span className="px-2 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full">
                      {chamadosPorStatus[StatusEnum.FECHADO].length}
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                  {chamadosPorStatus[StatusEnum.FECHADO].length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      Nenhum chamado
                    </p>
                  ) : (
                    chamadosPorStatus[StatusEnum.FECHADO].map((chamado) => (
                      <div
                        key={chamado.id}
                        onClick={() => navigate(`/chamados/${chamado.id}`)}
                        className="bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-600
                                 rounded-lg p-3 cursor-pointer hover:shadow-lg hover:border-indigo-400
                                 dark:hover:border-indigo-500 transition-all duration-200"
                      >
                        <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">
                          #{chamado.protocolo}
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {chamado.titulo}
                        </h4>
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <User className="w-3 h-3" />
                          <span className="truncate">
                            {usuarios[chamado.solicitante_id]?.nome || `Usuário #${chamado.solicitante_id}`}
                          </span>
                        </div>
                        <div className="flex items-center justify-end">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPrioridadeColor(chamado.prioridade)}`}>
                            {chamado.prioridade}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Chamados;
