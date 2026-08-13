import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Send } from 'lucide-react';
import { useChamados } from '../hooks/useChamados';
import { useUsuariosPorId } from '../hooks/useUsuariosPorId';
import { Chamado, Comentario, PrioridadeEnum, StatusEnum } from '../types/api';
import { Avatar, Badge, Button, Modal, Textarea, VarianteBadge } from './ui';
import SlaProgresso from './SlaProgresso';
import Avaliacao from './Avaliacao';

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
 * Bloco com título e moldura.
 *
 * O modal antes empilhava tudo separado só por espaço em branco, e as partes
 * se misturavam: não dava para ver onde a descrição terminava e os comentários
 * começavam. A moldura define o espaço de cada coisa.
 */
const Secao: React.FC<{
  titulo: string;
  destaque?: boolean;
  children: React.ReactNode;
}> = ({ titulo, destaque = false, children }) => (
  <section
    className={
      destaque
        ? 'rounded-lg border border-sucesso/30 bg-sucesso/10 p-4'
        : 'rounded-lg border border-borda bg-superficie p-4'
    }
  >
    <h3
      className={`mb-2 text-xs font-semibold uppercase tracking-wide ${
        destaque ? 'text-sucesso-forte dark:text-sucesso-suave' : 'text-conteudo-tenue'
      }`}
    >
      {titulo}
    </h3>
    {children}
  </section>
);

/** Par rótulo/valor da ficha lateral. */
const Campo: React.FC<{ rotulo: string; children: React.ReactNode }> = ({
  rotulo,
  children,
}) => (
  <div>
    <dt className="text-xs text-conteudo-tenue">{rotulo}</dt>
    <dd className="mt-0.5">{children}</dd>
  </div>
);

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
      rodape={
        chamado ? (
          <Button variante="secundario" onClick={() => aoAbrirEmPagina(chamado.id)}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Abrir em página para editar
          </Button>
        ) : undefined
      }
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
        // Duas colunas em tela larga: a conversa à esquerda, a ficha à direita.
        // Numa coluna só, a descrição estica por todo o modal e a leitura fica
        // ruim, enquanto sobra vazio ao lado.
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Conversa */}
          <div className="space-y-5 lg:col-span-2">
            <Secao titulo="Descrição">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-conteudo">
                {chamado.descricao}
              </p>
            </Secao>

            {chamado.solucao && (
              <Secao titulo="Solução" destaque>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-conteudo">
                  {chamado.solucao}
                </p>
              </Secao>
            )}

            <Secao
              titulo={`Comentários${comentarios.length > 0 ? ` (${comentarios.length})` : ''}`}
            >
              {comentarios.length === 0 ? (
                <p className="text-sm text-conteudo-tenue">Nenhum comentário ainda.</p>
              ) : (
                <ul className="space-y-3">
                  {comentarios.map((c) => (
                    <li key={c.id} className="flex gap-2">
                      <Avatar nome={nome(c.usuario_id)} className="mt-0.5" />
                      <div className="min-w-0 flex-1 rounded-lg bg-superficie-elevada px-3 py-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-conteudo">
                            {nome(c.usuario_id)}
                          </span>
                          <span className="shrink-0 text-xs text-conteudo-tenue">
                            {dataHora(c.created_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-conteudo-suave">
                          {c.comentario}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 space-y-2 border-t border-borda-suave pt-3">
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
            </Secao>
          </div>

          {/* Ficha */}
          <aside className="space-y-4 rounded-lg border border-borda bg-superficie-base/50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variante={VARIANTE_STATUS[chamado.status]}>{chamado.status}</Badge>
              <Badge variante={VARIANTE_PRIORIDADE[chamado.prioridade]}>
                {chamado.prioridade}
              </Badge>
              {chamado.arquivado && <Badge variante="neutro">Arquivado</Badge>}
              {chamado.cancelado && <Badge variante="perigo">Cancelado</Badge>}
            </div>

            <SlaProgresso sla={chamado.sla} status={chamado.status} />

            <dl className="space-y-3 border-t border-borda-suave pt-4 text-sm">
              <Campo rotulo="Solicitante">
                <span className="flex items-center gap-1.5">
                  <Avatar nome={nome(chamado.solicitante_id)} />
                  <span className="truncate text-conteudo">{nome(chamado.solicitante_id)}</span>
                </span>
              </Campo>

              <Campo rotulo="Responsável">
                <span className="flex items-center gap-1.5">
                  <Avatar
                    nome={
                      chamado.tecnico_responsavel_id
                        ? nome(chamado.tecnico_responsavel_id)
                        : null
                    }
                  />
                  <span className="truncate text-conteudo">
                    {nome(chamado.tecnico_responsavel_id)}
                  </span>
                </span>
              </Campo>

              <Campo rotulo="Aberto em">
                <span className="text-conteudo">{dataHora(chamado.data_abertura)}</span>
              </Campo>

              <Campo rotulo="Resolvido em">
                <span className="text-conteudo">{dataHora(chamado.data_resolucao)}</span>
              </Campo>
            </dl>

            {/* A avaliação fica AQUI, e não só na página inteira, porque era o
                lugar que faltava: 12 de 144 chamados avaliados nos primeiros
                nove meses, e o motivo não era permissão — o solicitante não
                tinha por que abrir a página de detalhe depois que o problema
                acabou. O componente some sozinho enquanto o chamado não estiver
                resolvido. */}
            <Avaliacao
              chamado={chamado}
              aoAvaliar={setChamado}
              className="border-t border-borda-suave pt-4"
            />
          </aside>
        </div>
      )}
    </Modal>
  );
};

export default ChamadoModal;
