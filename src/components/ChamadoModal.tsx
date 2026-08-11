import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Send } from 'lucide-react';
import { useChamados } from '../hooks/useChamados';
import { useUsuariosPorId } from '../hooks/useUsuariosPorId';
import { Chamado, Comentario, PrioridadeEnum, StatusEnum } from '../types/api';
import { Avatar, Badge, Button, Modal, Textarea, VarianteBadge } from './ui';
import SlaProgresso from './SlaProgresso';

interface ChamadoModalProps {
  chamadoId: number | null;
  aoFechar: () => void;
  /** Leva para a página inteira, onde ficam as ações. */
  aoAbrirEmPagina: (id: number) => void;
}

const VARIANTE_STATUS: Record<StatusEnum, VarianteBadge> = {
  [StatusEnum.ABERTO]: 'info',
  [StatusEnum.EM_ANDAMENTO]: 'info',
  [StatusEnum.AGUARDANDO]: 'neutro',
  [StatusEnum.RESOLVIDO]: 'sucesso',
  [StatusEnum.FECHADO]: 'sucesso',
};

const VARIANTE_PRIORIDADE: Record<PrioridadeEnum, VarianteBadge> = {
  [PrioridadeEnum.CRITICA]: 'perigo',
  [PrioridadeEnum.ALTA]: 'alerta',
  [PrioridadeEnum.MEDIA]: 'info',
  [PrioridadeEnum.BAIXA]: 'neutro',
};

const dataHora = (valor?: string | null): string =>
  valor
    ? new Date(valor).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

/**
 * Espiada rápida no chamado, sem sair do quadro.
 *
 * O modal LÊ e COMENTA; a página INTERAGE. Mudar status, editar, resolver,
 * cancelar e arquivar continuam só na página — cada uma dessas ações abre a
 * própria confirmação, e confirmação dentro de modal vira modal sobre modal,
 * que ninguém sabe fechar na ordem certa.
 *
 * A divisão também acerta o caso comum: na maioria das vezes a pessoa só quer
 * saber do que se trata aquele card, e isso hoje custa uma navegação inteira.
 */
export const ChamadoModal: React.FC<ChamadoModalProps> = ({
  chamadoId,
  aoFechar,
  aoAbrirEmPagina,
}) => {
  const { buscarChamado, carregarComentarios, criarComentario } = useChamados();
  const usuarios = useUsuariosPorId();

  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [novoComentario, setNovoComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (chamadoId === null) return;

    let cancelado = false;

    // O chamado anterior sai da tela antes da busca começar, senão o modal
    // mostra os dados de um card enquanto carrega os de outro.
    setChamado(null);
    setComentarios([]);
    setNovoComentario('');
    setErro(null);
    setCarregando(true);

    Promise.all([buscarChamado(chamadoId), carregarComentarios(chamadoId)])
      .then(([dados, lista]) => {
        if (cancelado) return;
        if (!dados) {
          setErro('Chamado não encontrado.');
          return;
        }
        setChamado(dados);
        setComentarios(lista);
      })
      .catch(() => {
        if (!cancelado) setErro('Erro ao carregar o chamado.');
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    // Fechar o modal no meio da busca não deve escrever num componente morto.
    return () => {
      cancelado = true;
    };
  }, [chamadoId, buscarChamado, carregarComentarios]);

  const comentar = async () => {
    if (!chamado || !novoComentario.trim()) return;

    try {
      setEnviando(true);
      await criarComentario({
        chamado_id: chamado.id,
        comentario: novoComentario.trim(),
        is_interno: false,
      });
      setNovoComentario('');
      setComentarios(await carregarComentarios(chamado.id));
    } catch {
      setErro('Erro ao enviar o comentário.');
    } finally {
      setEnviando(false);
    }
  };

  const nome = (id?: number | null): string =>
    id ? (usuarios[id]?.nome ?? `Usuário #${id}`) : 'Não atribuído';

  return (
    <Modal
      aberto={chamadoId !== null}
      aoFechar={aoFechar}
      largura="xl"
      titulo={chamado ? chamado.titulo : 'Carregando…'}
      descricao={chamado?.protocolo}
    >
      {carregando && (
        <div className="flex items-center justify-center py-12 text-conteudo-tenue">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        </div>
      )}

      {erro && !carregando && (
        <div className="rounded-lg border border-perigo/30 bg-perigo/10 px-4 py-3 text-sm text-perigo-forte dark:text-perigo-suave">
          {erro}
        </div>
      )}

      {chamado && !carregando && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variante={VARIANTE_STATUS[chamado.status]}>{chamado.status}</Badge>
            <Badge variante={VARIANTE_PRIORIDADE[chamado.prioridade]}>
              {chamado.prioridade}
            </Badge>
            {chamado.arquivado && <Badge variante="neutro">Arquivado</Badge>}
            {chamado.cancelado && <Badge variante="perigo">Cancelado</Badge>}
          </div>

          <SlaProgresso sla={chamado.sla} status={chamado.status} />

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-conteudo-tenue">Solicitante</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-conteudo">
                <Avatar nome={nome(chamado.solicitante_id)} />
                <span className="truncate">{nome(chamado.solicitante_id)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-conteudo-tenue">Responsável</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-conteudo">
                <Avatar
                  nome={chamado.tecnico_responsavel_id ? nome(chamado.tecnico_responsavel_id) : null}
                />
                <span className="truncate">{nome(chamado.tecnico_responsavel_id)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-conteudo-tenue">Aberto em</dt>
              <dd className="mt-0.5 text-conteudo">{dataHora(chamado.data_abertura)}</dd>
            </div>
            <div>
              <dt className="text-xs text-conteudo-tenue">Resolvido em</dt>
              <dd className="mt-0.5 text-conteudo">{dataHora(chamado.data_resolucao)}</dd>
            </div>
          </dl>

          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-conteudo-tenue">
              Descrição
            </h3>
            <p className="whitespace-pre-wrap break-words text-sm text-conteudo">
              {chamado.descricao}
            </p>
          </div>

          {chamado.solucao && (
            <div className="rounded-lg border border-sucesso/30 bg-sucesso/10 p-3">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-sucesso-forte dark:text-sucesso-suave">
                Solução
              </h3>
              <p className="whitespace-pre-wrap break-words text-sm text-conteudo">
                {chamado.solucao}
              </p>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-conteudo-tenue">
              Comentários {comentarios.length > 0 && `(${comentarios.length})`}
            </h3>

            {comentarios.length === 0 ? (
              <p className="text-sm text-conteudo-tenue">Nenhum comentário ainda.</p>
            ) : (
              <ul className="space-y-3">
                {comentarios.map((c) => (
                  <li key={c.id} className="flex gap-2">
                    <Avatar nome={nome(c.usuario_id)} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-conteudo">
                          {nome(c.usuario_id)}
                        </span>
                        <span className="text-xs text-conteudo-tenue">
                          {dataHora(c.created_at)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm text-conteudo-suave">
                        {c.comentario}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 space-y-2">
              <Textarea
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                rows={2}
                placeholder="Escrever um comentário…"
                aria-label="Novo comentário"
              />
              <div className="flex justify-end">
                <Button
                  tamanho="sm"
                  onClick={comentar}
                  carregando={enviando}
                  disabled={!novoComentario.trim()}
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Comentar
                </Button>
              </div>
            </div>
          </div>

          {/* Toda ação que muda o chamado mora na página. */}
          <div className="border-t border-borda pt-3">
            <Button variante="secundario" onClick={() => aoAbrirEmPagina(chamado.id)}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Abrir em página para editar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ChamadoModal;
