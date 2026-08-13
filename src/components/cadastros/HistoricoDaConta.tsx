import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { usuariosService } from '../../services/chamadoshsapi';
import { descreverEvento, momentoDoEvento } from '../../lib/auditoria';
import { Rotulo } from '../ui';
import type { EventoDeAuditoria } from '../../types/api';

interface HistoricoDaContaProps {
  usuarioId: number;
}

/**
 * Trilha de auditoria de uma conta.
 *
 * ── Sobre o estado vazio ──────────────────────────────────────────────
 *
 * É a parte mais importante deste componente, e a mais fácil de errar.
 *
 * A trilha começou a gravar em 13/08/2026. Uma conta criada antes disso, e
 * editada dez vezes antes disso, aparece aqui sem nenhuma linha. Se a tela
 * dissesse "nenhuma alteração registrada", quem lê concluiria que ninguém
 * mexeu na conta — e essa conclusão seria falsa para toda conta antiga.
 *
 * A diferença entre "não aconteceu" e "não sei" é o que separa um registro de
 * auditoria de um enfeite. A mesma confusão já custou uma investigação neste
 * projeto, quando `eventos_de_conta` apareceu vazia e foi lida como defeito.
 *
 * ── Sobre o erro ──────────────────────────────────────────────────────
 *
 * Falha ao carregar também não pode virar lista vazia. Um painel de auditoria
 * que responde "nada aqui" quando na verdade não conseguiu perguntar é pior
 * que um que não existe.
 */
export const HistoricoDaConta: React.FC<HistoricoDaContaProps> = ({ usuarioId }) => {
  const [eventos, setEventos] = useState<EventoDeAuditoria[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);

    usuariosService
      .eventos(usuarioId)
      .then((linhas) => {
        if (vivo) setEventos(linhas);
      })
      .catch((err: any) => {
        if (vivo) setErro(err.response?.data?.detail || 'Não foi possível carregar o histórico.');
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });

    return () => {
      vivo = false;
    };
  }, [usuarioId]);

  if (carregando) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-conteudo-tenue">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Carregando histórico…
      </p>
    );
  }

  if (erro) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 border border-perigo/40 bg-perigo/10 px-3 py-2 text-sm text-perigo-forte dark:text-perigo-suave"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {erro}
      </div>
    );
  }

  if (!eventos?.length) {
    return (
      <p className="py-6 text-sm text-conteudo-tenue">
        Nenhum evento registrado para esta conta.{' '}
        <span className="text-conteudo-suave">
          O registro começou em 13/08/2026 — alterações anteriores a essa data não foram
          gravadas, e não aparecem aqui.
        </span>
      </p>
    );
  }

  return (
    <ol className="divide-y divide-borda-suave border-y border-borda-suave">
      {eventos.map((evento) => {
        const { titulo, mudanca, autor } = descreverEvento(evento);
        const momento = momentoDoEvento(evento.created_at);

        return (
          <li key={evento.chave} className="flex flex-col gap-1 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-conteudo">{titulo}</span>
              {/* Sem data, não inventa: a coluna é anulável no banco. */}
              <Rotulo>{momento ?? 'data não registrada'}</Rotulo>
            </div>

            {mudanca && (
              <p className="font-mono text-xs text-conteudo-suave">
                {mudanca.de} <span className="text-conteudo-tenue">→</span> {mudanca.para}
              </p>
            )}

            <p className="text-xs text-conteudo-tenue">por {autor}</p>
          </li>
        );
      })}
    </ol>
  );
};

export default HistoricoDaConta;
