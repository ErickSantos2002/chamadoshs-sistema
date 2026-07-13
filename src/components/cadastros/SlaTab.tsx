import React, { useEffect, useState } from 'react';
import { slaConfigsService } from '../../services/chamadoshsapi';
import { SLAConfig } from '../../types/api';

/** Converte minutos úteis em algo legível (8h úteis/dia). */
const formatarMinutos = (minutos: number): string => {
  if (minutos < 60) return `${minutos} min`;
  const horas = minutos / 60;
  if (minutos % 480 === 0) {
    const dias = minutos / 480;
    return `${horas}h úteis (${dias} dia${dias > 1 ? 's' : ''} útil${dias > 1 ? 'eis' : ''})`;
  }
  return `${horas}h úteis`;
};

interface SlaTabProps {
  /** Indica se a aba SLA está ativa/visível no momento. */
  ativo: boolean;
}

const SlaTab: React.FC<SlaTabProps> = ({ ativo }) => {
  const [configs, setConfigs] = useState<SLAConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = async () => {
    try {
      setLoading(true);
      setConfigs(await slaConfigsService.listar());
      setErro(null);
    } catch {
      setErro('Não foi possível carregar os prazos de SLA.');
    } finally {
      setLoading(false);
    }
  };

  // Recarrega os prazos do servidor sempre que a aba se torna ativa, para
  // descartar qualquer edição não salva ao sair e voltar (evita mostrar
  // um valor "sujo" que não reflete o que está persistido no banco).
  useEffect(() => {
    if (ativo) {
      carregar();
    }
  }, [ativo]);

  const alterarCampo = (
    prioridade: string,
    campo: 'minutos_resposta' | 'minutos_resolucao',
    valor: number
  ) => {
    setConfigs((prev) =>
      prev.map((c) => (c.prioridade === prioridade ? { ...c, [campo]: valor } : c))
    );
  };

  const salvar = async (config: SLAConfig) => {
    try {
      setSalvando(config.prioridade);
      setErro(null);
      await slaConfigsService.atualizar(config.prioridade, {
        minutos_resposta: config.minutos_resposta,
        minutos_resolucao: config.minutos_resolucao,
      });
    } catch {
      setErro(`Erro ao salvar os prazos de ${config.prioridade}.`);
      await carregar();
    } finally {
      setSalvando(null);
    }
  };

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Carregando prazos...</p>;
  }

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Prazos em <strong>minutos úteis</strong>. O relógio só corre de seg a sex, das 8h às
        17h, com pausa de 12h às 13h — ou seja, <strong>1 dia útil = 480 minutos</strong>.
        Alterar um prazo recalcula o SLA de todos os chamados, inclusive os antigos.
      </p>

      {erro && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {erro}
        </div>
      )}

      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="py-2 text-sm text-gray-600 dark:text-gray-300">Prioridade</th>
            <th className="py-2 text-sm text-gray-600 dark:text-gray-300">Resposta (min)</th>
            <th className="py-2 text-sm text-gray-600 dark:text-gray-300">Resolução (min)</th>
            <th className="py-2 text-sm text-gray-600 dark:text-gray-300"></th>
          </tr>
        </thead>
        <tbody>
          {configs.map((config) => (
            <tr
              key={config.prioridade}
              className="border-b border-gray-100 dark:border-gray-700"
            >
              <td className="py-3 font-medium text-gray-900 dark:text-white">
                {config.prioridade}
              </td>
              <td className="py-3">
                <input
                  type="number"
                  min={1}
                  value={config.minutos_resposta}
                  onChange={(e) =>
                    alterarCampo(config.prioridade, 'minutos_resposta', Number(e.target.value))
                  }
                  className="w-24 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <span className="ml-2 text-xs text-gray-400">
                  {formatarMinutos(config.minutos_resposta)}
                </span>
              </td>
              <td className="py-3">
                <input
                  type="number"
                  min={1}
                  value={config.minutos_resolucao}
                  onChange={(e) =>
                    alterarCampo(config.prioridade, 'minutos_resolucao', Number(e.target.value))
                  }
                  className="w-24 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <span className="ml-2 text-xs text-gray-400">
                  {formatarMinutos(config.minutos_resolucao)}
                </span>
              </td>
              <td className="py-3">
                <button
                  onClick={() => salvar(config)}
                  disabled={salvando === config.prioridade}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded"
                >
                  {salvando === config.prioridade ? 'Salvando...' : 'Salvar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SlaTab;
