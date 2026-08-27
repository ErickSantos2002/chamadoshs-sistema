import React, { useEffect, useState } from 'react';
import { usuariosService } from '../../services/chamadoshsapi';
import { descreverEvento, momentoDoEvento } from '../../lib/auditoria';
import {
  NotaDoInicioDaTrilha,
  TrilhaCarregando,
  TrilhaComFalha,
  TrilhaVazia,
} from '../EstadosDaTrilha';
import type { EventoDeAuditoria } from '../../types/api';

interface HistoricoDaContaProps {
  usuarioId: number;
}

/**
 * Trilha de auditoria de uma conta.
 *
 * Responde "o que fizeram com esta conta". A pergunta inversa — "o que fulano
 * andou fazendo" — é a tela de Auditoria.
 *
 * Os estados de carregando, falha e vazio vêm de `EstadosDaTrilha`, junto com o
 * motivo de eles serem escritos com tanto cuidado: a diferença entre "não
 * aconteceu" e "não sei" é o que separa um registro de auditoria de um enfeite,
 * e uma conta anterior a 13/08/2026 chega aqui sem nenhuma linha sem que isso
 * signifique que ninguém mexeu nela.
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
        if (!vivo) return;
        setErro(err.response?.data?.detail || 'Não foi possível carregar o histórico.');
        // Some com o que estava na tela. O modal é reaproveitado entre contas:
        // sem isto, uma falha ao abrir a segunda deixaria as linhas da primeira
        // no ar, embaixo do nome de outra pessoa.
        setEventos(null);
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });

    return () => {
      vivo = false;
    };
  }, [usuarioId]);

  // A falha vem antes de tudo, como na tela de Auditoria: enquanto ela está no
  // ar, nenhuma outra frase pode ocupar o lugar e sugerir uma resposta.
  if (erro) {
    return <TrilhaComFalha folga="densa" mensagem={erro} />;
  }

  if (carregando) {
    return <TrilhaCarregando folga="densa">Carregando histórico…</TrilhaCarregando>;
  }

  if (!eventos?.length) {
    return (
      <TrilhaVazia folga="densa">
        Nenhum evento registrado para esta conta. <NotaDoInicioDaTrilha />
      </TrilhaVazia>
    );
  }

  return (
    // `borda-suave` no tema escuro tem o mesmo valor de `superficie`: usada
    // aqui, a lista ficava sem nenhum divisor visível no escuro.
    <ol className="divide-y divide-borda border-y border-borda">
      {eventos.map((evento) => {
        const { titulo, mudanca, autor } = descreverEvento(evento);
        const momento = momentoDoEvento(evento.created_at);

        return (
          <li key={evento.chave} className="flex flex-col gap-1 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-conteudo">{titulo}</span>
              {/* Sem data, não inventa: a coluna é anulável no banco. */}
              <span className="text-xs text-conteudo-tenue">
                {momento ?? 'data não registrada'}
              </span>
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
