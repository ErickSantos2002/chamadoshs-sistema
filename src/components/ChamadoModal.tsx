import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { useUsuariosPorId } from '../hooks/useUsuariosPorId';
import { useQualidade } from '../hooks/useQualidade';
import { usePermissoes } from '../hooks/usePermissoes';
import { useResponsaveisTI } from '../hooks/useResponsaveisTI';
import { chamadosService } from '../services/chamadoshsapi';
import { ehRecusaDoResponsavel, mensagemDaRecusaDoResponsavel } from '../lib/responsaveis';
import {
  MENSAGEM_SEM_ACESSO,
  RascunhoPreservado,
  ehPerdaDeAcesso,
  rascunhosComConteudo,
} from '../lib/acesso';
import {
  MENSAGEM_ATRIBUICAO_MUDOU,
  interpretarErroDaReatribuicao,
  opcoesDeResponsavelDaQualidade,
  podeReatribuirNaQualidade,
} from '../lib/atendimento';
import { MENSAGEM_INCERTA, classificarFalhaDeEscrita } from '../lib/escrita';
import { setorDoChamado } from '../lib/setor';
import {
  MENSAGEM_SEM_VERSAO,
  MENSAGEM_VERSAO_AUSENTE,
  ehConflitoDeVersao,
  ehVersaoAusente,
  maisRecente,
  precondicaoDaEscrita,
} from '../lib/versao';
import { Chamado, Comentario, SetorDestinoEnum } from '../types/api';
import {
  Avatar,
  Aviso,
  BlocoCarregando,
  Button,
  Modal,
  Seletor,
  Textarea,
} from './ui';
import { MarcaBadge, PrioridadeBadge, SetorBadge, StatusBadge } from './SelosDeChamado';
import SlaProgresso from './SlaProgresso';
import Avaliacao from './Avaliacao';
import AcoesRapidas from './AcoesRapidas';
import { IconeEnviar, IconeLinkExterno } from './ui/icones';
import { SeletorDeResponsavelDaTI } from './SeletorDeResponsavelDaTI';
import AcessoEncerrado from './AcessoEncerrado';
import OpcaoDeComentarioInterno, { SeloInterno } from './OpcaoDeComentarioInterno';
import { ehRecusaDoInterno, ordenarComentarios } from '../lib/comentarios';

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
  const {
    chamados,
    buscarChamado,
    carregarComentarios,
    criarComentario,
    aplicarChamado,
    removerChamado,
    verificarQualidade,
    marcarQualidadeIndisponivel,
  } = useChamados();
  const usuarios = useUsuariosPorId();
  const { revalidarIdentidade } = useAuth();
  const { podeAdministrar, podeAlterarComoEquipe, semConfirmacao } = usePermissoes();

  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [novoComentario, setNovoComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  // Comentário interno (`lib/comentarios`): público por padrão, e a recusa
  // da API trava o envio até a pessoa escolher publicar.
  const [comentarioInterno, setComentarioInterno] = useState(false);
  const [internoRecusado, setInternoRecusado] = useState(false);
  const internoBloqueado = comentarioInterno && (internoRecusado || !podeAdministrar);
  const [atribuindo, setAtribuindo] = useState(false);
  // O `disabled` do seletor só chega no próximo desenho: a trava é síncrona.
  const atribuindoRef = useRef(false);

  // O chamado saiu do alcance de quem o via (FE-5, `lib/acesso`). O id fica
  // num ref para as respostas atrasadas — e a releitura que a remoção do card
  // provoca no efeito de carga — não o trazerem de volta à janela.
  const [acessoEncerrado, setAcessoEncerrado] = useState<RascunhoPreservado[] | null>(null);
  const encerradoPara = useRef<number | null>(null);
  // O chamado da janela AGORA. Uma escrita do chamado anterior que responde
  // depois da troca chega ao quadro, mas não à janela (FE-5 + API-12).
  const idDaJanela = useRef(chamadoId);
  idDaJanela.current = chamadoId;
  // A solução que ficou no passo de resolução do `AcoesRapidas`.
  const rascunhoDoAtendimento = useRef('');

  // Na Qualidade o seletor é outro: os atendentes, sem "Sem atribuição", e só
  // quando a API sabe validar a troca. Fora disso o campo fica só leitura.
  const ehDaQualidade = chamado
    ? setorDoChamado(chamado).setor === SetorDestinoEnum.QUALIDADE
    : false;
  const qualidade = useQualidade(ehDaQualidade);

  // Mesma regra das ações de status: atribuir é da equipe — a regra
  // `pode_alterar_como_equipe` da API, e não o perfil (C2). O solicitante, o
  // técnico que lê só pelo vínculo e a conta de serviço levariam um 403.
  // Cancelado e arquivado ficam de fora pelo mesmo motivo das ações: mexer
  // neles é decisão da página inteira, junto do motivo e do histórico.
  const podeAtribuir =
    podeAlterarComoEquipe(chamado, ehDaQualidade ? qualidade.atendentes : null) &&
    !chamado?.cancelado &&
    !chamado?.arquivado;
  const reatribuiNaQualidade = podeAtribuir && ehDaQualidade && podeReatribuirNaQualidade(qualidade);

  // Na TI, reatribuir é de quem administra (API-6: `require_equipe_ti` no
  // PUT da TI). Ser técnico não basta: o da Qualidade vê o chamado da TI só
  // para ler. A lista é da API-9, pedida a cada abertura (FE-5).
  const reatribuiNaTI =
    Boolean(chamado) && !ehDaQualidade && podeAdministrar && !chamado?.cancelado && !chamado?.arquivado;
  // Uma abertura por chamado escolhido no quadro — e não a cada releitura,
  // que tira o chamado da tela por um instante e o devolve.
  const [abertura, setAbertura] = useState(0);
  useEffect(() => {
    if (chamadoId !== null) setAbertura((n) => n + 1);
    // Outro chamado começa público, sem recusa herdada.
    setComentarioInterno(false);
    setInternoRecusado(false);
    // Outro chamado (ou a janela fechada): a perda de acesso era do anterior.
    if (encerradoPara.current !== chamadoId) {
      encerradoPara.current = null;
      setAcessoEncerrado(null);
    }
  }, [chamadoId]);
  const responsaveisTI = useResponsaveisTI(reatribuiNaTI, abertura);

  // As funções do contexto mudam de identidade a cada mudança da lista
  // (`buscarChamado` depende dela). O efeito de carga as lê daqui, para
  // depender só do chamado escolhido — ver a nota abaixo.
  const buscarRef = useRef(buscarChamado);
  buscarRef.current = buscarChamado;
  const comentariosRef = useRef(carregarComentarios);
  comentariosRef.current = carregarComentarios;

  /**
   * Carrega o chamado escolhido — uma vez por abertura.
   *
   * ── Por que só `chamadoId` ────────────────────────────────────────────
   *
   * O efeito dependia de `buscarChamado`, que muda a cada mudança da lista
   * do quadro. Qualquer `aplicarChamado` — mudar o status aqui mesmo, outro
   * card salvo, a lista relida — refazia a carga: o chamado saía da tela por
   * um instante, o comentário digitado era apagado, e o passo de resolução
   * do `AcoesRapidas` era desmontado com a solução dentro (FE-5).
   *
   * Política de rascunhos: o que foi digitado vale para ESTA abertura deste
   * chamado. Fica enquanto o mesmo chamado é atualizado; sai quando o
   * comentário é enviado, quando outro chamado é aberto e quando a janela é
   * fechada. Nada é guardado no navegador nem no servidor. A versão nova que
   * chegar ao quadro entra pelo efeito seguinte, sem tocar nos rascunhos.
   */
  useEffect(() => {
    if (chamadoId === null) return;
    // Encerrado, fica encerrado: nenhuma releitura depois da perda de acesso.
    if (encerradoPara.current === chamadoId) return;

    let cancelado = false;

    // O chamado anterior sai da tela antes da busca começar, senão o modal
    // mostra os dados de um card enquanto carrega os de outro.
    setChamado(null);
    setComentarios([]);
    setNovoComentario('');
    setErro(null);
    setCarregando(true);

    Promise.all([buscarRef.current(chamadoId), comentariosRef.current(chamadoId)])
      .then(([dados, lista]) => {
        if (cancelado) return;
        if (!dados) {
          setErro('Chamado não encontrado.');
          return;
        }
        setChamado(dados);
        setComentarios(ordenarComentarios(lista));
      })
      .catch(() => {
        if (!cancelado) setErro('Erro ao carregar o chamado.');
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    // Fechar o modal (ou abrir outro) no meio da busca: a resposta é descartada.
    return () => {
      cancelado = true;
    };
  }, [chamadoId]);

  // O mesmo chamado, mais novo, na lista do quadro (relida, ou salva por
  // outro caminho): a janela passa a mostrá-lo, e os rascunhos ficam. Uma
  // versão menor não desfaz a da janela (`maisRecente`). Outros cards não
  // mudam a identidade deste, e não chegam aqui.
  const doQuadro = chamadoId === null ? undefined : chamados.find((c) => c.id === chamadoId);
  useEffect(() => {
    if (!doQuadro || encerradoPara.current === doQuadro.id) return;
    setChamado((atual) =>
      atual && atual.id === doQuadro.id && atual !== doQuadro ? maisRecente(atual, doQuadro) : atual
    );
  }, [doQuadro]);

  const comentar = async () => {
    if (!chamado || !novoComentario.trim() || internoBloqueado) return;
    // Sempre explícito: `true` só com a opção marcada por quem pode.
    const interno = comentarioInterno && podeAdministrar;

    try {
      setEnviando(true);
      await criarComentario({
        chamado_id: chamado.id,
        comentario: novoComentario.trim(),
        is_interno: interno,
      });
      setNovoComentario('');
      setComentarioInterno(false);
      setComentarios(ordenarComentarios(await carregarComentarios(chamado.id)));
    } catch (err: any) {
      if (ehPerdaDeAcesso(err)) {
        encerrarAcesso(chamado.id);
        return;
      }
      // 403 num interno: o texto fica, o envio trava até a pessoa escolher
      // publicar, e a identidade é relida. Nada se repete. O toast do 403 é
      // do interceptor; a janela continua mostrando o chamado.
      if (interno && ehRecusaDoInterno(err)) {
        setInternoRecusado(true);
        void revalidarIdentidade();
        return;
      }
      if (err?.response?.status === 403) return;
      toast.error(err?.response?.data?.detail || 'Erro ao enviar o comentário.');
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
    // Resposta de uma escrita que saiu antes da perda de acesso.
    if (encerradoPara.current === atualizado.id) return;
    // A janela só troca pelo mesmo chamado: a resposta atrasada de outro não
    // toma o lugar do que está aberto.
    setChamado((atual) => (atual && atual.id === atualizado.id ? atualizado : atual));
    aplicarChamado(atualizado);
  };

  /**
   * A pessoa deixou de poder ver este chamado (`lib/acesso`). A janela para
   * de mostrá-lo — dados, comentários, ações — e tira o card do quadro. Fica
   * só o comentário que ela tinha digitado, para copiar. Nada é reenviado.
   */
  const encerrarAcesso = (id: number) => {
    // O 404 é de um chamado que a janela já deixou: só o card sai do quadro.
    if (idDaJanela.current !== id) {
      removerChamado(id);
      return;
    }
    encerradoPara.current = id;
    setAcessoEncerrado(
      rascunhosComConteudo([
        { rotulo: 'Seu comentário', texto: novoComentario },
        { rotulo: 'A solução do atendimento', texto: rascunhoDoAtendimento.current },
      ])
    );
    setChamado(null);
    setComentarios([]);
    setNovoComentario('');
    setErro(null);
    removerChamado(id);
  };

  /**
   * O atendimento foi recusado por algo que a tela não sabia — permissão,
   * conflito, chamado que sumiu. Relê da API, sem passar pelo cache do
   * contexto, que é justamente o que pode estar velho. Diz às ações se deu:
   * sem o chamado relido, elas não voltam.
   */
  const recarregar = async (): Promise<boolean> => {
    if (!chamado) return false;
    const id = chamado.id;
    try {
      registrarMudanca(await chamadosService.buscar(id));
      return encerradoPara.current !== id;
    } catch (err) {
      if (encerradoPara.current === id) return false;
      if (ehPerdaDeAcesso(err)) encerrarAcesso(id);
      else setErro('Erro ao carregar o chamado.');
      return false;
    }
  };

  /**
   * Troca o responsável de um chamado da TI. Quem aparece no seletor é a
   * lista da API-9 (`lib/responsaveis`), e só ela — o filtro de perfil que
   * morava aqui oferecia quem o PUT recusava. Escolher quem já está não sai.
   *
   * Leva a versão do chamado desta janela (API-12): se outra pessoa mudou o
   * chamado depois que ele foi mostrado, a API recusa com 409 e nada é
   * gravado. A janela relê o chamado e a lista, o seletor volta a mostrar o
   * responsável de agora, e a troca é uma escolha nova — nunca repetida.
   */
  const atribuir = async (valor: string) => {
    if (!chamado || atribuindoRef.current) return;
    if ((valor ? Number(valor) : null) === (chamado.tecnico_responsavel_id ?? null)) return;

    const precondicao = precondicaoDaEscrita(chamado);
    if (precondicao === null) {
      toast.error(MENSAGEM_SEM_VERSAO);
      return;
    }

    atribuindoRef.current = true;
    try {
      setAtribuindo(true);
      // `null`, não `undefined`: a API só limpa a atribuição se o campo FOR na
      // requisição — e o axios descarta `undefined` antes de enviar. Com
      // `undefined`, escolher "Sem atribuição" viraria silêncio.
      const atualizado = await chamadosService.atualizar(chamado.id, {
        tecnico_responsavel_id: valor ? Number(valor) : null,
        ...precondicao,
      });
      registrarMudanca(atualizado);
    } catch (err: any) {
      if (ehPerdaDeAcesso(err)) {
        encerrarAcesso(chamado.id);
        return;
      }
      if (ehConflitoDeVersao(err) || ehVersaoAusente(err)) {
        toast.error(ehConflitoDeVersao(err) ? MENSAGEM_ATRIBUICAO_MUDOU : MENSAGEM_VERSAO_AUSENTE);
        void responsaveisTI.recarregar();
        void recarregar();
        return;
      }
      if (classificarFalhaDeEscrita(err).tipo === 'incerta') {
        // Pode ter entrado. Nada é reenviado; a janela relê para mostrar.
        toast.error(MENSAGEM_INCERTA);
        void recarregar();
        return;
      }
      // 400 do responsável (inativo, fora da TI, conta de serviço): a lista
      // na tela estava velha. Diz o motivo do backend, relê a lista, e a
      // nova escolha é um clique novo — o PUT não se repete.
      if (ehRecusaDoResponsavel(err)) {
        toast.error(mensagemDaRecusaDoResponsavel(err));
        void responsaveisTI.recarregar();
        return;
      }
      // O 403 já é anunciado pelo interceptor; repetir mostraria duas
      // mensagens para o mesmo erro.
      if (err?.response?.status !== 403) {
        toast.error(
          err?.response?.data?.detail || 'Não foi possível atribuir o responsável.'
        );
      }
    } finally {
      atribuindoRef.current = false;
      setAtribuindo(false);
    }
  };

  /**
   * Troca o responsável de um chamado da Qualidade. Escolher quem já está não
   * sai: não há mudança, e a API não precisa ser consultada para isso.
   *
   * Leva a versão do chamado desta janela (FE-4): se outra pessoa trocou o
   * responsável — ou mudou qualquer coisa — depois que ela abriu, a API
   * recusa com 409, a janela relê e a troca não é repetida.
   */
  const atribuirNaQualidade = async (valor: string) => {
    if (!chamado || !valor || Number(valor) === chamado.tecnico_responsavel_id) return;

    const precondicao = precondicaoDaEscrita(chamado);
    if (precondicao === null) {
      toast.error(MENSAGEM_SEM_VERSAO);
      return;
    }

    try {
      setAtribuindo(true);
      const atualizado = await chamadosService.atualizar(chamado.id, {
        tecnico_responsavel_id: Number(valor),
        ...precondicao,
      });
      registrarMudanca(atualizado);
    } catch (err) {
      if (ehPerdaDeAcesso(err)) {
        encerrarAcesso(chamado.id);
        return;
      }
      const { mensagem, recarregarAtendentes, indisponivel, recarregarChamado } =
        interpretarErroDaReatribuicao(err);
      if (mensagem) toast.error(mensagem);
      if (indisponivel) marcarQualidadeIndisponivel();
      if (recarregarAtendentes) void verificarQualidade();
      if (recarregarChamado) void recarregar();
    } finally {
      setAtribuindo(false);
    }
  };

  return (
    <Modal
      aberto={chamadoId !== null}
      aoFechar={aoFechar}
      largura="xl"
      titulo={acessoEncerrado ? 'Chamado indisponível' : chamado ? chamado.titulo : 'Carregando…'}
      descricao={acessoEncerrado ? undefined : chamado?.protocolo}
      rodape={
        acessoEncerrado ? (
          <Button variante="secundario" onClick={aoFechar}>
            Fechar
          </Button>
        ) : chamado ? (
          <Button variante="secundario" onClick={() => aoAbrirEmPagina(chamado.id)}>
            <IconeLinkExterno className="h-4 w-4" aria-hidden="true" />
            Abrir em página para editar
          </Button>
        ) : undefined
      }
    >
      {acessoEncerrado && (
        <AcessoEncerrado mensagem={MENSAGEM_SEM_ACESSO} rascunhos={acessoEncerrado} />
      )}

      {carregando && !acessoEncerrado && (
        // Também era silencioso, e este é o pior dos três: é o modal do
        // chamado, a tela mais usada do sistema.
        <BlocoCarregando className="py-12" />
      )}

      {erro && !carregando && !acessoEncerrado && (
        <Aviso variante="perigo">{erro}</Aviso>
      )}

      {chamado && !carregando && !acessoEncerrado && (
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
                      <div
                        // Marca na borda E selo com texto: cor sozinha não basta.
                        className={`min-w-0 flex-1 rounded-lg border bg-superficie px-3 py-2 ${
                          c.is_interno ? 'border-alerta/30 border-l-4 border-l-alerta' : 'border-borda'
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-medium text-conteudo">
                            {nome(c.usuario_id)}
                            {c.is_interno && <SeloInterno />}
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
                <OpcaoDeComentarioInterno
                  pode={podeAdministrar}
                  interno={comentarioInterno}
                  bloqueado={internoBloqueado}
                  aoMudar={setComentarioInterno}
                  semConfirmacao={semConfirmacao && !internoRecusado}
                  aoConfirmarDeNovo={() => void revalidarIdentidade()}
                  aoTornarPublico={() => {
                    setComentarioInterno(false);
                    setInternoRecusado(false);
                  }}
                  desabilitado={enviando}
                />
                <div className="flex justify-end">
                  <Button
                    tamanho="sm"
                    onClick={comentar}
                    carregando={enviando}
                    disabled={!novoComentario.trim() || internoBloqueado}
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
              {/* Sempre, inclusive TI: o cartão só marca a exceção, e é aqui
                  que se confere para onde o chamado foi. */}
              <SetorBadge chamado={chamado} />
              {chamado.arquivado && <MarcaBadge marca="arquivado" />}
              {chamado.cancelado && <MarcaBadge marca="cancelado" />}
            </div>

            <SlaProgresso sla={chamado.sla} status={chamado.status} />

            {/* As ações vêm ANTES da ficha: quem abre um chamado do quadro
                quase sempre quer fazer algo com ele, não conferir a data de
                abertura. O componente some sozinho para quem não pode agir e
                para chamado cancelado ou arquivado. */}
            <AcoesRapidas
              chamado={chamado}
              aoMudar={registrarMudanca}
              aoPrecisarRecarregar={recarregar}
              aoGuardarRascunho={(texto) => {
                rascunhoDoAtendimento.current = texto;
              }}
            />

            <dl className="space-y-3 border-t border-borda pt-4 text-sm">
              <Campo rotulo="Solicitante">
                <span className="flex items-center gap-1.5">
                  <Avatar nome={nome(chamado.solicitante_id)} />
                  <span className="truncate text-conteudo">{nome(chamado.solicitante_id)}</span>
                </span>
              </Campo>

              <Campo rotulo="Responsável">
                {reatribuiNaQualidade ? (
                  <Seletor
                    rotulo="Responsável"
                    disabled={atribuindo}
                    valor={
                      chamado.tecnico_responsavel_id
                        ? String(chamado.tecnico_responsavel_id)
                        : ''
                    }
                    aoMudar={atribuirNaQualidade}
                    opcoes={opcoesDeResponsavelDaQualidade(
                      qualidade.atendentes,
                      chamado.tecnico_responsavel_id,
                      nome(chamado.tecnico_responsavel_id)
                    )}
                  />
                ) : reatribuiNaTI ? (
                  // Para quem administra o campo É o seletor, sem modo de
                  // edição à parte: escolher salva na hora, como as ações de
                  // status. O valor volta do servidor — o que aparece é o que
                  // ficou. Sem a lista da API-9, nada para escolher: o atual
                  // continua à vista, e o seletor fica travado.
                  <SeletorDeResponsavelDaTI
                    rotulo="Responsável"
                    lista={responsaveisTI}
                    atualId={chamado.tecnico_responsavel_id}
                    nomeDoAtual={
                      chamado.tecnico_responsavel_id
                        ? usuarios[chamado.tecnico_responsavel_id]?.nome
                        : null
                    }
                    ocupado={atribuindo}
                    aoMudar={atribuir}
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
