import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { useUsuariosPorId } from '../hooks/useUsuariosPorId';
import { chamadosService } from '../services/chamadoshsapi';
import { podeSerResponsavel } from '../utils/roleMapper';
import { Chamado, Comentario } from '../types/api';
import {
  Avatar,
  Aviso,
  BlocoCarregando,
  Button,
  Modal,
  Seletor,
  Textarea,
} from './ui';
import { MarcaBadge, PrioridadeBadge, StatusBadge } from './SelosDeChamado';
import SlaProgresso from './SlaProgresso';
import Avaliacao from './Avaliacao';
import AcoesRapidas from './AcoesRapidas';
import { IconeEnviar, IconeLinkExterno } from './ui/icones';

interface ChamadoModalProps {
  chamadoId: number | null;
  aoFechar: () => void;
  /** Leva para a página inteira, onde ficam as ações. */
  aoAbrirEmPagina: (id: number) => void;
}

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
 *
 * O fundo é o recuado (`superficie-elevada`), não o de card: o painel do modal
 * JÁ é `bg-superficie`, e um bloco da mesma cor do painel não tem moldura
 * nenhuma — só a linha da borda.
 */
const Secao: React.FC<{
  titulo: string;
  destaque?: boolean;
  children: React.ReactNode;
}> = ({ titulo, destaque = false, children }) => (
  <section
    className={
      destaque
        ? 'rounded-xl border border-sucesso/30 bg-sucesso/10 p-4'
        : 'rounded-xl border border-borda bg-superficie-elevada p-4'
    }
  >
    <h3
      className={`mb-2 text-sm font-semibold ${
        destaque ? 'text-on-tint-success' : 'text-conteudo-tenue'
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
 * ── Onde fica a linha entre o modal e a página ────────────────────────
 *
 * O modal LÊ, COMENTA, MOVE O STATUS e ATRIBUI O RESPONSÁVEL. A página faz o
 * resto: editar campos, cancelar e arquivar.
 *
 * A atribuição entrou pelo mesmo raciocínio das ações de status: quem abre um
 * chamado do quadro quase sempre quer empurrá-lo adiante, e "isto é do fulano"
 * é o empurrão mais comum depois de mudar o status. Exigir a página inteira
 * para isso custava uma navegação a cada triagem.
 *
 * A versão anterior deste comentário dizia que status também era só da página,
 * e o motivo era real — resolver pede a solução, e aquilo abria um segundo
 * modal. Modal sobre modal é uma pilha que ninguém sabe fechar na ordem certa.
 * Mas a conclusão estava errada: o problema era a segunda camada, não a ação.
 * Em `AcoesRapidas` a resolução virou um PASSO no mesmo lugar, e aí a objeção
 * some.
 *
 * O que continua fora tem outro motivo: cancelar e arquivar pedem justificativa
 * e são decisões que se lê junto do histórico, não de passagem pelo quadro.
 *
 * A divisão acerta o caso comum: na maioria das vezes a pessoa quer saber do
 * que se trata aquele card e empurrá-lo um passo adiante — e isso custava uma
 * navegação inteira.
 */
export const ChamadoModal: React.FC<ChamadoModalProps> = ({
  chamadoId,
  aoFechar,
  aoAbrirEmPagina,
}) => {
  const { buscarChamado, carregarComentarios, criarComentario, aplicarChamado } =
    useChamados();
  const usuarios = useUsuariosPorId();
  const { user } = useAuth();

  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [novoComentario, setNovoComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [atribuindo, setAtribuindo] = useState(false);

  // Mesma regra das ações de status: atribuir é da equipe, e a API recusa
  // para o solicitante — mostrar o seletor a ele seria oferecer um 403.
  // Cancelado e arquivado ficam de fora pelo mesmo motivo das ações: mexer
  // neles é decisão da página inteira, junto do motivo e do histórico.
  const podeAtribuir =
    (user?.role === 'Administrador' || user?.role === 'Tecnico') &&
    !chamado?.cancelado &&
    !chamado?.arquivado;

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

  /**
   * Toda mudança salva pela janela passa por aqui: atualiza a janela E o
   * quadro atrás dela. As ações salvam direto pelo serviço — de propósito,
   * porque o `atualizarChamado` do contexto acende o `loading` global e a
   * página apagaria o quadro inteiro — mas isso deixava a lista sem saber da
   * mudança: o card resolvido ficava parado na coluna antiga até um F5.
   */
  const registrarMudanca = (atualizado: Chamado) => {
    setChamado(atualizado);
    aplicarChamado(atualizado);
  };

  /**
   * Quem pode aparecer no seletor de responsável.
   *
   * `podeSerResponsavel` é a mesma régua do formulário de edição: equipe, e
   * não conta de serviço — atribuir um chamado ao painel da TV não diz quem
   * resolve. Contas desativadas também ficam de fora: são de quem saiu, e
   * atribuir a elas é jogar o chamado num buraco.
   */
  const atribuiveis = Object.values(usuarios)
    .filter((u) => u.ativo && podeSerResponsavel(u))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const atribuir = async (valor: string) => {
    if (!chamado) return;

    try {
      setAtribuindo(true);
      // `null`, não `undefined`: a API só limpa a atribuição se o campo FOR na
      // requisição — e o axios descarta `undefined` antes de enviar. Com
      // `undefined`, escolher "Sem atribuição" viraria silêncio.
      const atualizado = await chamadosService.atualizar(chamado.id, {
        tecnico_responsavel_id: valor ? Number(valor) : null,
      });
      registrarMudanca(atualizado);
    } catch (err: any) {
      // O 403 já é anunciado pelo interceptor; repetir mostraria duas
      // mensagens para o mesmo erro.
      if (err?.response?.status !== 403) {
        toast.error(
          err?.response?.data?.detail || 'Não foi possível atribuir o responsável.'
        );
      }
    } finally {
      setAtribuindo(false);
    }
  };

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
            <IconeLinkExterno className="h-4 w-4" aria-hidden="true" />
            Abrir em página para editar
          </Button>
        ) : undefined
      }
    >
      {carregando && (
        // Também era silencioso, e este é o pior dos três: é o modal do
        // chamado, a tela mais usada do sistema.
        <BlocoCarregando className="py-12" />
      )}

      {erro && !carregando && (
        <Aviso variante="perigo">{erro}</Aviso>
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
                      <div className="min-w-0 flex-1 rounded-lg border border-borda bg-superficie px-3 py-2">
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

              <div className="mt-3 space-y-2 border-t border-borda pt-3">
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
                    <IconeEnviar className="h-3.5 w-3.5" aria-hidden="true" />
                    Comentar
                  </Button>
                </div>
              </div>
            </Secao>
          </div>

          {/* Ficha */}
          {/* `div`, e nao `aside`. A ficha e o resumo do proprio chamado
              que a janela abre -- e o assunto, e nao algo tangencial a ele.
              Como `complementary` ela virava um marco sem nome dentro de um
              dialogo, prometendo conteudo lateral que nao existe. */}
          <div className="space-y-4 rounded-xl border border-borda bg-superficie-elevada p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={chamado.status} />
              <PrioridadeBadge prioridade={chamado.prioridade} />
              {chamado.arquivado && <MarcaBadge marca="arquivado" />}
              {chamado.cancelado && <MarcaBadge marca="cancelado" />}
            </div>

            <SlaProgresso sla={chamado.sla} status={chamado.status} />

            {/* As ações vêm ANTES da ficha: quem abre um chamado do quadro
                quase sempre quer fazer algo com ele, não conferir a data de
                abertura. O componente some sozinho para quem não pode agir e
                para chamado cancelado ou arquivado. */}
            <AcoesRapidas chamado={chamado} aoMudar={registrarMudanca} />

            <dl className="space-y-3 border-t border-borda pt-4 text-sm">
              <Campo rotulo="Solicitante">
                <span className="flex items-center gap-1.5">
                  <Avatar nome={nome(chamado.solicitante_id)} />
                  <span className="truncate text-conteudo">{nome(chamado.solicitante_id)}</span>
                </span>
              </Campo>

              <Campo rotulo="Responsável">
                {podeAtribuir ? (
                  // Para a equipe o campo É o seletor, sem modo de edição à
                  // parte: escolher salva na hora, como as ações de status. O
                  // valor volta do servidor — o que aparece é o que ficou.
                  <Seletor
                    rotulo="Responsável"
                    disabled={atribuindo}
                    valor={
                      chamado.tecnico_responsavel_id
                        ? String(chamado.tecnico_responsavel_id)
                        : ''
                    }
                    aoMudar={atribuir}
                    opcoes={[
                      { valor: '', rotulo: 'Sem atribuição' },
                      ...atribuiveis.map((u) => ({
                        valor: String(u.id),
                        rotulo: u.nome,
                      })),
                    ]}
                  />
                ) : (
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
                )}
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
            {/* A nota também vai para o quadro: é ela que apaga o selo
                "Avaliar" do card sem exigir recarga. */}
            <Avaliacao
              chamado={chamado}
              aoAvaliar={registrarMudanca}
              className="border-t border-borda pt-4"
            />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ChamadoModal;
