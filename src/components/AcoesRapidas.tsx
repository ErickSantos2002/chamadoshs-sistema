import React, { useState } from 'react';
import { CheckCircle, Clock, PlayCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { chamadosService } from '../services/chamadoshsapi';
import { MINIMO_SOLUCAO, validarMinimo } from '../lib/validacao';
import ContadorMinimo from './ContadorMinimo';
import { Button, Rotulo, Textarea } from './ui';
import { Chamado, StatusEnum } from '../types/api';

interface AcoesRapidasProps {
  chamado: Chamado;
  /** Recebe o chamado atualizado depois da mudança. */
  aoMudar: (atualizado: Chamado) => void;
}

/** O que dá para fazer a partir de cada status, e com que palavra. */
const TRANSICOES: Partial<
  Record<StatusEnum, Array<{ para: StatusEnum; texto: string; Icone: typeof PlayCircle }>>
> = {
  [StatusEnum.ABERTO]: [
    { para: StatusEnum.EM_ANDAMENTO, texto: 'Iniciar atendimento', Icone: PlayCircle },
  ],
  [StatusEnum.EM_ANDAMENTO]: [
    { para: StatusEnum.AGUARDANDO, texto: 'Aguardando retorno', Icone: Clock },
    { para: StatusEnum.RESOLVIDO, texto: 'Marcar como resolvido', Icone: CheckCircle },
  ],
  [StatusEnum.AGUARDANDO]: [
    { para: StatusEnum.EM_ANDAMENTO, texto: 'Retomar atendimento', Icone: PlayCircle },
    { para: StatusEnum.RESOLVIDO, texto: 'Marcar como resolvido', Icone: CheckCircle },
  ],
  [StatusEnum.RESOLVIDO]: [
    { para: StatusEnum.EM_ANDAMENTO, texto: 'Reabrir', Icone: RotateCcw },
  ],
  [StatusEnum.FECHADO]: [
    { para: StatusEnum.EM_ANDAMENTO, texto: 'Reabrir', Icone: RotateCcw },
  ],
};

/**
 * As ações de status, onde o chamado estiver aberto.
 *
 * ── Por que a resolução é um PASSO, e não outro modal ─────────────────
 *
 * Resolver exige registrar a solução, e a primeira versão desta interação
 * abria um segundo modal para isso. Foi justamente o motivo de eu ter deixado
 * as ações de fora do modal do quadro: modal sobre modal é uma pilha que
 * ninguém sabe fechar na ordem certa — o Esc fica ambíguo, o foco se perde
 * entre as duas camadas e o fundo de um cobre o outro.
 *
 * A saída não é proibir a ação no modal; é a resolução substituir os botões
 * NO MESMO lugar, como um segundo passo. Uma camada só, Esc com um significado
 * só, e a pessoa não sai de onde estava.
 *
 * ── Por que a solução continua obrigatória ────────────────────────────
 *
 * Ela é o que fica de registro e o que alguém lê quando o mesmo problema
 * volta. Facilitar o caminho não é motivo para aceitar "ok" como solução, e o
 * mínimo vale igual aqui e na página inteira.
 */
export const AcoesRapidas: React.FC<AcoesRapidasProps> = ({ chamado, aoMudar }) => {
  const { user } = useAuth();
  const [resolvendo, setResolvendo] = useState(false);
  const [solucao, setSolucao] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Mudar status é da equipe. A API recusa para o solicitante, e mostrar o
  // botão a ele seria oferecer um 403.
  const podeAgir = user?.role === 'Administrador' || user?.role === 'Tecnico';

  // Cancelado e arquivado saem do fluxo normal: reabrir um deles é decisão que
  // vive na página inteira, junto do motivo e do histórico.
  const disponiveis =
    podeAgir && !chamado.cancelado && !chamado.arquivado
      ? (TRANSICOES[chamado.status] ?? [])
      : [];

  if (!disponiveis.length && !resolvendo) return null;

  const aplicar = async (novoStatus: StatusEnum, textoDaSolucao?: string) => {
    try {
      setSalvando(true);
      const atualizado = await chamadosService.atualizar(chamado.id, {
        status: novoStatus,
        ...(textoDaSolucao ? { solucao: textoDaSolucao } : {}),
      });

      aoMudar(atualizado);
      setResolvendo(false);
      setSolucao('');
    } catch (err: any) {
      // O 403 já é anunciado pelo interceptor; repetir mostraria duas
      // mensagens para o mesmo erro.
      if (err?.response?.status !== 403) {
        toast.error(err?.response?.data?.detail || 'Não foi possível mudar o status.');
      }
    } finally {
      setSalvando(false);
    }
  };

  const confirmarResolucao = () => {
    const problema = validarMinimo(solucao, MINIMO_SOLUCAO, 'Solução');
    if (problema) {
      toast.error(problema);
      return;
    }
    aplicar(StatusEnum.RESOLVIDO, solucao);
  };

  if (resolvendo) {
    return (
      <div className="space-y-2">
        <Rotulo como="label" htmlFor="solucao-rapida" className="block">
          Como foi resolvido
        </Rotulo>
        <Textarea
          id="solucao-rapida"
          rows={4}
          value={solucao}
          onChange={(e) => setSolucao(e.target.value)}
          disabled={salvando}
          placeholder="O que foi feito para resolver"
          autoFocus
        />
        <ContadorMinimo valor={solucao} minimo={MINIMO_SOLUCAO} />

        <div className="flex gap-2">
          <Button
            tamanho="sm"
            onClick={confirmarResolucao}
            carregando={salvando}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            Resolver
          </Button>
          <Button
            variante="secundario"
            tamanho="sm"
            onClick={() => setResolvendo(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {disponiveis.map(({ para, texto, Icone }) => (
        <Button
          key={para}
          variante={para === StatusEnum.RESOLVIDO ? 'sucesso' : 'secundario'}
          tamanho="sm"
          disabled={salvando}
          onClick={() =>
            para === StatusEnum.RESOLVIDO
              ? (setSolucao(chamado.solucao ?? ''), setResolvendo(true))
              : aplicar(para)
          }
        >
          <Icone className="h-4 w-4" aria-hidden="true" />
          {texto}
        </Button>
      ))}
    </div>
  );
};

export default AcoesRapidas;
