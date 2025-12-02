import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { StatusEnum, PrioridadeEnum } from '../types/api';
import { Filter, Plus, Search, Loader2 } from 'lucide-react';

const Chamados: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chamados, loading, error } = useChamados();

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<StatusEnum | ''>('');
  const [filtroPrioridade, setFiltroPrioridade] = useState<PrioridadeEnum | ''>('');
  const [filtroProtocolo, setFiltroProtocolo] = useState('');

  // Permissões baseadas em role
  const isAdmin = user?.role === 'Administrador';
  const isTecnico = user?.role === 'Tecnico';
  const isUsuario = user?.role === 'Usuario';

  // Filtra os chamados localmente
  const chamadosFiltrados = chamados.filter((chamado) => {
    if (filtroStatus && chamado.status !== filtroStatus) return false;
    if (filtroPrioridade && chamado.prioridade !== filtroPrioridade) return false;
    if (filtroProtocolo && !chamado.protocolo.toLowerCase().includes(filtroProtocolo.toLowerCase())) return false;
    return true;
  });

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

        {/* Tabela de Chamados */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#2a2a2a] border-b border-gray-200 dark:border-[#2d2d2d]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                    Protocolo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                    Prioridade
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                    Data Abertura
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#2d2d2d]">
                {chamadosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <p className="text-lg">Nenhum chamado encontrado.</p>
                    </td>
                  </tr>
                ) : (
                  chamadosFiltrados.map((chamado) => (
                    <tr
                      key={chamado.id}
                      className="hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                      onClick={() => navigate(`/chamados/${chamado.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          #{chamado.protocolo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                          {chamado.titulo}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                          {chamado.descricao}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            chamado.status
                          )}`}
                        >
                          {chamado.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPrioridadeColor(
                            chamado.prioridade
                          )}`}
                        >
                          {chamado.prioridade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">
                        {formatarData(chamado.data_abertura)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/chamados/${chamado.id}`);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300
                                   font-medium transition-colors"
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chamados;
