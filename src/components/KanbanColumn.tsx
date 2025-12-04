import { User } from "lucide-react";
import { Chamado, PrioridadeEnum, Usuario } from "../types/api";

interface KanbanColumnProps {
  title: string;
  colorDot: string;
  badgeColor: string;
  items: Chamado[];
  usuarios: Record<number, Usuario>;
  navigate: (path: string) => void;
  getPrioridadeColor: (p: PrioridadeEnum) => string;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  colorDot,
  badgeColor,
  items,
  usuarios,
  navigate,
  getPrioridadeColor,
}) => {
  return (
    <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md transition-colors">

      {/* Cabeçalho */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#2d2d2d]">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${colorDot}`}></span>
            {title}
          </h3>

          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badgeColor}`}>
            {items.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="p-3 space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Nenhum chamado
          </p>
        ) : (
          items.map((chamado) => (
            <div
              key={chamado.id}
              onClick={() => navigate(`/chamados/${chamado.id}`)}
              className="bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-600
                         rounded-lg p-3 cursor-pointer hover:shadow-lg transition-all duration-200"
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
                  {usuarios[chamado.solicitante_id]?.nome ||
                    `Usuário #${chamado.solicitante_id}`}
                </span>
              </div>

              {/* Prioridade */}
              <div className="flex items-center justify-end">
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${getPrioridadeColor(
                    chamado.prioridade
                  )}`}
                >
                  {chamado.prioridade}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
