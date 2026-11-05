import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MINIMO_SOLUCAO, validarMinimo } from '../lib/validacao';
import ContadorMinimo from '../components/ContadorMinimo';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { useUsuariosPorId } from '../hooks/useUsuariosPorId';
import { useQualidade } from '../hooks/useQualidade';
import { usePermissoes } from '../hooks/usePermissoes';
import { useResponsaveisTI } from '../hooks/useResponsaveisTI';
import { ehRecusaDoResponsavel, mensagemDaRecusaDoResponsavel } from '../lib/responsaveis';
import SeletorDeResponsavelDaTI from '../components/SeletorDeResponsavelDaTI';
import AcessoEncerrado from '../components/AcessoEncerrado';
import OpcaoDeComentarioInterno, { SeloInterno } from '../components/OpcaoDeComentarioInterno';
import { ehRecusaDoInterno, ordenarComentarios } from '../lib/comentarios';
import {
  MENSAGEM_ATRIBUICAO_SALVA_SEM_ACESSO,
  MENSAGEM_SEM_ACESSO,
  RascunhoPreservado,
  ehPerdaDeAcesso,
  rascunhosComConteudo,
} from '../lib/acesso';
import {
  interpretarErroDaReatribuicao,
  opcoesDeResponsavelDaQualidade,
  podeAtenderPelaRota,
  podeReatribuirNaQualidade,
} from '../lib/atendimento';
import {
  CampoEditavel,
  FotoDaEdicao,
  ROTULOS_DOS_CAMPOS,
  camposEmConflito,
  diferencaDaEdicao,
  fotografar,
} from '../lib/edicaoQualidade';
import { setorDoChamado } from '../lib/setor';
import {
  MENSAGEM_CONFLITO_DE_VERSAO,
  MENSAGEM_SEM_VERSAO,
  MENSAGEM_VERSAO_AUSENTE,
  ehConflitoDeVersao,
  ehVersaoAusente,
  escreveSemVersao,
  precondicaoDaEdicaoDaTI,
  precondicaoDaEscrita,
} from '../lib/versao';
import AcoesRapidas from '../components/AcoesRapidas';
import { categoriasService, chamadosService } from '../services/chamadoshsapi';
import { useTheme } from '../context/ThemeContext';
import { corDaPrioridade, corDoStatus } from '../lib/graficos';
import SlaBadge from '../components/SlaBadge';
import Avaliacao from '../components/Avaliacao';
import {
  Aviso,
  Badge,
  BlocoCarregando,
  Button,
  Campo,
  Input,
  Modal,
  Seletor,
  Textarea,
} from '../components/ui';
import {
  MarcaBadge,
  PapelBadge,
  PrioridadeBadge,
  SetorBadge,
  VARIANTE_DE_STATUS,
} from '../components/SelosDeChamado';
import { confirmacaoConfere, podeExcluir } from '../utils/exclusao';
import {
  classificarFalhaDeEscrita,
  type FalhaDeEscrita,
  type OperacaoDeEscrita,
} from '../lib/escrita';
import AvisoDeFalhaDeEscrita from '../components/AvisoDeFalhaDeEscrita';
import { IconeApagar, IconeArquivar, IconeConfereCirculo, IconeDesarquivar, IconeDesfazer, IconeEditar, IconeFechar, IconeIniciar, IconeProibido, IconeRelogio, IconeSalvar, IconeUsuario, IconeVoltar } from '../components/ui/icones';
import {
  Chamado,
  Comentario,
  Historico,
  StatusEnum,
  PrioridadeEnum,
  ChamadoUpdate,
  Categoria,
  SetorDestinoEnum,
} from '../types/api';

const ChamadoDetalhes: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, revalidarIdentidade, identidadeConfirmada } = useAuth();
  const { darkMode } = useTheme();
  const {
    buscarChamado,
    atualizarChamado,
    carregarComentarios,
    criarComentario,
    carregarHistorico,
    deletarChamado,
    aplicarChamado,
    removerChamado,
    verificarQualidade,
    marcarQualidadeIndisponivel,
  } = useChamados();

  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const usuarios = useUsuariosPorId();
  const [categoriaNome, setCategoriaNome] = useState<string>('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  // A última escrita que falhou sem encerrar a página (C3, `lib/escrita`), e
  // as operações que a API recusou com 403 — travadas até a pessoa conferir
  // o chamado ou reabrir a edição. Nada disto vai para o armazenamento.
  const [falhaDeEscrita, setFalhaDeEscrita] = useState<{
    operacao: OperacaoDeEscrita;
    falha: FalhaDeEscrita;
  } | null>(null);
  const [operacoesRecusadas, setOperacoesRecusadas] = useState<ReadonlySet<OperacaoDeEscrita>>(
    () => new Set()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para edição
  const [modoEdicao, setModoEdicao] = useState(false);
  const [novoComentario, setNovoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  // Comentário interno (`lib/comentarios`): público por padrão, e a recusa
  // da API trava o envio até a pessoa escolher publicar.
  const [comentarioInterno, setComentarioInterno] = useState(false);
  const [internoRecusado, setInternoRecusado] = useState(false);

  // Dados de edição. A descrição não está entre eles: é imutável de propósito,
  // preserva o relato original do solicitante.
  const [categoriaEditada, setCategoriaEditada] = useState<
    number | undefined
  >();
  const [statusEditado, setStatusEditado] = useState<StatusEnum>(
    StatusEnum.ABERTO,
  );
  const [prioridadeEditada, setPrioridadeEditada] = useState<PrioridadeEnum>(
    PrioridadeEnum.MEDIA,
  );
  const [tecnicoEditado, setTecnicoEditado] = useState<number | undefined>();
  const [solucaoEditada, setSolucaoEditada] = useState('');

  // Edição da Qualidade (ver `lib/edicaoQualidade`). A referência é o chamado
  // relido ao entrar na edição, e só muda por aqui — uma recarga do contexto
  // não a toca, senão o "mudou desde que você abriu" deixaria de ver mudança.
  const referenciaDaEdicao = useRef<FotoDaEdicao | null>(null);
  const [conflitoNaEdicao, setConflitoNaEdicao] = useState<CampoEditavel[] | null>(null);
  // O conflito veio do 409 de versão (FE-4), e não da comparação antes do PUT:
  // outra escrita entrou entre a releitura e o salvamento.
  const [conflitoDeVersaoNaEdicao, setConflitoDeVersaoNaEdicao] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Estados para modal de resolução
  const [mostrarModalResolucao, setMostrarModalResolucao] = useState(false);
  const [statusAlvo, setStatusAlvo] = useState<StatusEnum>(
    StatusEnum.RESOLVIDO,
  );
  const [solucaoModal, setSolucaoModal] = useState('');
  // A solução digitada numa resolução que a API recusou por versão (FE-4):
  // volta no próximo "resolver", em vez da solução gravada.
  const rascunhoDaResolucao = useRef<string | null>(null);
  // Depois de um 409/428 de versão, enquanto a página relê: as ações do
  // estado velho saem de cena até o chamado novo chegar.
  const [atualizandoAposConflito, setAtualizandoAposConflito] = useState(false);

  // Estados para modais de cancelar e arquivar
  const [mostrarModalCancelar, setMostrarModalCancelar] = useState(false);
  const [mostrarModalArquivar, setMostrarModalArquivar] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  // Exclusão. O protocolo digitado é a trava: o botão só libera quando ele
  // bate com o do chamado. Ver `podeExcluir` para quem chega até aqui.
  const [mostrarModalExcluir, setMostrarModalExcluir] = useState(false);
  const [confirmacaoProtocolo, setConfirmacaoProtocolo] = useState('');

  // Perda de acesso (FE-5, `lib/acesso`). `jaTeveAcesso`: o 404 só quer dizer
  // "deixou de poder ver" se a página já mostrou o chamado — na primeira
  // carga ele é só "não encontrado". `encerrado`: depois da perda, nenhuma
  // resposta atrasada escreve na página.
  const [acessoEncerrado, setAcessoEncerrado] = useState<{
    mensagem: string;
    rascunhos: RascunhoPreservado[];
  } | null>(null);
  const jaTeveAcesso = useRef(false);
  const encerrado = useRef(false);
  // A solução que ficou no passo de resolução do `AcoesRapidas`.
  const rascunhoDoAtendimento = useRef('');

  // A trava do botão de excluir. A comparação mora em `utils/exclusao`, com
  // teste: escrita aqui, ela dava verdadeiro com chamado nulo.
  const protocoloConfere = confirmacaoConfere(
    confirmacaoProtocolo,
    chamado?.protocolo
  );

  // O atendimento da Qualidade. Quando ele vale para quem está vendo, as ações
  // rápidas desta página dão lugar às do `AcoesRapidas`, pela rota restrita —
  // as condições moram em `podeAtenderPelaRota`. Chamado da TI não consulta
  // nada (`useQualidade` só sai com `ativo`).
  const ehDaQualidade = chamado
    ? setorDoChamado(chamado).setor === SetorDestinoEnum.QUALIDADE
    : false;
  const qualidade = useQualidade(ehDaQualidade);
  const atendePelaRota = chamado ? podeAtenderPelaRota(chamado, user?.id, qualidade) : false;

  // ── Permissões (C2) ───────────────────────────────────────────────────
  //
  // Ver o chamado não é poder alterá-lo. O técnico que o lê só pelo vínculo
  // — é o responsável, ou o abriu — recebia "Editar", "Arquivar" e as ações
  // rápidas por ter o perfil Técnico, e cada clique era um 403. Agora:
  //
  // - `alteraComoEquipe`: a regra `pode_alterar_como_equipe` da API —
  //   editar, transições de status, arquivar, desarquivar e cancelar alheio;
  // - `ehSolicitante`: o que é do solicitante — cancelar o que abriu (a
  //   avaliação mora no `Avaliacao`, com a mesma regra);
  // - `podeAdministrarUsuarios`: administrador humano — excluir;
  // - `podeAdministrar`: interno e responsável da TI.
  //
  // Conta de serviço não altera como equipe, qualquer que seja o perfil.
  const {
    podeAdministrar,
    podeAdministrarUsuarios,
    podeAlterarComoEquipe,
    semConfirmacao,
  } = usePermissoes();
  const alteraComoEquipe = podeAlterarComoEquipe(
    chamado,
    ehDaQualidade ? qualidade.atendentes : null
  );
  const ehSolicitante = Boolean(chamado && user && chamado.solicitante_id === user.id);
  // Trocar o responsável da Qualidade é só com a API que valida a troca; sem
  // ela, o campo fica só leitura na edição e o PUT leva o responsável de antes.
  const reatribuiNaQualidade =
    alteraComoEquipe && ehDaQualidade && podeReatribuirNaQualidade(qualidade);

  // Na TI, trocar o responsável é de quem administra (o PUT da TI é
  // `require_equipe_ti`), e a lista é a da API-9, pedida a cada entrada na
  // edição — nunca o `GET /usuarios/` filtrado que morava no contexto (FE-5).
  const reatribuiNaTI = podeAdministrar && !ehDaQualidade && modoEdicao;
  // Cada entrada na edição é uma abertura nova do seletor: pede a lista de novo.
  const [entradaNaEdicao, setEntradaNaEdicao] = useState(0);
  const responsaveisTI = useResponsaveisTI(reatribuiNaTI, entradaNaEdicao);

  // Interno marcado sem permissão — recusado pela API, ou a permissão saiu
  // depois de marcar: não sai, e não vira público sozinho.
  const internoBloqueado = comentarioInterno && (internoRecusado || !podeAdministrar);

  // O que a pessoa digitou, sempre o do último desenho: quem encerra o acesso
  // pode vir de um manipulador antigo, e a cópia dele estaria velha (ou com
  // o comentário que acabou de ser enviado).
  const rascunhosAtuais = useRef<Array<{ rotulo: string; texto: string | null }>>([]);
  rascunhosAtuais.current = [
    { rotulo: 'Seu comentário', texto: novoComentario },
    {
      rotulo: 'A solução que você digitou',
      texto: mostrarModalResolucao ? solucaoModal : rascunhoDaResolucao.current,
    },
    {
      rotulo: 'A solução em edição',
      texto: modoEdicao && solucaoEditada !== (chamado?.solucao ?? '') ? solucaoEditada : null,
    },
    { rotulo: 'O motivo do cancelamento', texto: motivoCancelamento },
  ];

  useEffect(() => {
    if (id) {
      encerrado.current = false;
      jaTeveAcesso.current = false;
      setAcessoEncerrado(null);
      // Outro chamado: a falha e as recusas eram do anterior.
      setFalhaDeEscrita(null);
      setOperacoesRecusadas(new Set());
      carregarDados();
    }
  }, [id]);

  // A primeira leitura falhou com a conta sem confirmação (desativada, por
  // exemplo, numa restauração), e depois a confirmação deu certo por um
  // clique: a página relê, em vez de ficar no aviso da conta de antes. Só
  // na volta de "não confirmada" para "confirmada", e só sem chamado na tela.
  const confirmadaAntes = useRef(identidadeConfirmada);
  useEffect(() => {
    const voltou = identidadeConfirmada === true && confirmadaAntes.current !== true;
    confirmadaAntes.current = identidadeConfirmada;
    if (voltou && id && !chamado && error && !encerrado.current) carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identidadeConfirmada]);

  // As categorias da edição, assim que a escrita de equipe passa a valer. Na
  // primeira carga o chamado ainda não chegou — e sem ele não se sabe se a
  // conta altera como equipe —, então `carregarDados` não as pede; daqui em
  // diante, cada recarga as relê ali.
  useEffect(() => {
    if (!alteraComoEquipe || categorias.length > 0) return;
    let vale = true;
    categoriasService
      .listar(true)
      .then((ativas) => {
        if (vale && !encerrado.current) setCategorias(ativas);
      })
      .catch(() => {});
    return () => {
      vale = false;
    };
  }, [alteraComoEquipe]);

  /**
   * A pessoa deixou de poder ver este chamado. A página para: os dados saem
   * da tela e da memória dela, os modais fecham, o card sai do quadro — sem
   * recarregá-lo. Ficam só os rascunhos, para copiar. Nada é reenviado, e a
   * saída é para a lista, sem volta pelo histórico.
   *
   * `atribuicaoSalva`: a perda veio logo depois de a própria pessoa trocar o
   * responsável — a troca valeu, e é isso que tirou o chamado dela.
   */
  const encerrarAcesso = ({ atribuicaoSalva = false }: { atribuicaoSalva?: boolean } = {}) => {
    if (encerrado.current) return;
    encerrado.current = true;
    setAcessoEncerrado({
      mensagem: atribuicaoSalva ? MENSAGEM_ATRIBUICAO_SALVA_SEM_ACESSO : MENSAGEM_SEM_ACESSO,
      rascunhos: rascunhosComConteudo([
        ...rascunhosAtuais.current,
        // Lido do ref na hora: chega por callback, sem desenho no meio.
        { rotulo: 'A solução do atendimento', texto: rascunhoDoAtendimento.current },
      ]),
    });
    setChamado(null);
    setComentarios([]);
    setHistorico([]);
    setCategoriaNome('');
    referenciaDaEdicao.current = null;
    rascunhoDaResolucao.current = null;
    setModoEdicao(false);
    setConflitoNaEdicao(null);
    setConflitoDeVersaoNaEdicao(false);
    setMostrarModalResolucao(false);
    setMostrarModalCancelar(false);
    setMostrarModalArquivar(false);
    setMostrarModalExcluir(false);
    setNovoComentario('');
    setSolucaoModal('');
    setSolucaoEditada('');
    setMotivoCancelamento('');
    setError(null);
    removerChamado(parseInt(id!));
  };

  /** Um 404 de escrita ou releitura deste chamado: encerra e diz que tratou. */
  const perdeuAcesso = (err: unknown, opcoes?: { atribuicaoSalva?: boolean }): boolean => {
    if (!ehPerdaDeAcesso(err)) return false;
    encerrarAcesso(opcoes);
    return true;
  };

  /**
   * Carrega a página. Diz se o chamado está na tela ao final: as ações da
   * Qualidade só voltam com ele relido.
   */
  const carregarDados = async (
    forcarAPI = false,
    opcoes: { atribuicaoSalva?: boolean } = {}
  ): Promise<boolean> => {
    if (encerrado.current) return false;
    try {
      setLoading(true);
      setError(null);

      const chamadoId = parseInt(id!);

      // Se forçar, buscar diretamente da API, senão buscar do contexto/cache
      let chamadoData;
      if (forcarAPI) {
        const { default: api } = await import('../services/api');
        const response = await api.get(`/chamados/${chamadoId}`);
        chamadoData = response.data;
      } else {
        chamadoData = await buscarChamado(chamadoId);
      }

      if (encerrado.current) return false;
      if (!chamadoData) {
        setError('Chamado não encontrado');
        setLoading(false);
        return false;
      }

      // Carregar comentários e histórico em paralelo
      const [comentariosData, historicoData] = await Promise.all([
        carregarComentarios(chamadoId),
        carregarHistorico(chamadoId),
      ]);
      if (encerrado.current) return false;

      jaTeveAcesso.current = true;
      setChamado(chamadoData);
      setComentarios(ordenarComentarios(comentariosData));
      setHistorico(historicoData);

      // Buscar nome da categoria se existir
      if (chamadoData.categoria_id) {
        try {
          const categoria = await categoriasService.buscar(
            chamadoData.categoria_id,
          );
          setCategoriaNome(categoria.nome);
        } catch (err) {
          console.error('Erro ao buscar categoria:', err);
          setCategoriaNome('Não especificada');
        }
      } else {
        setCategoriaNome('Não especificada');
      }

      // Inicializar estados de edição — menos com a edição aberta neste
      // chamado (TI ou Qualidade). Comentar no meio dela recarrega a página,
      // e repor os campos aqui apagaria o que a pessoa escolheu e poria a
      // mudança de outra pessoa no formulário como se fosse dela. A edição
      // segue contra a mesma referência, e o salvamento confere o conflito.
      const edicaoAberta =
        referenciaDaEdicao.current !== null && chamado?.id === chamadoData.id;
      if (!edicaoAberta) {
        setCategoriaEditada(chamadoData.categoria_id);
        setStatusEditado(chamadoData.status);
        setPrioridadeEditada(chamadoData.prioridade);
        setTecnicoEditado(chamadoData.tecnico_responsavel_id);
        setSolucaoEditada(chamadoData.solucao || '');
      }

      // Categorias para a edição, se pode editar como equipe. Os responsáveis
      // da TI não vêm daqui: ver `useResponsaveisTI`.
      if (alteraComoEquipe) {
        const ativas = await categoriasService.listar(true); // apenas categorias ativas
        if (encerrado.current) return false;
        setCategorias(ativas);
      }

      // Os nomes de solicitante, técnico, autores de comentário e de histórico
      // vêm do índice montado por useUsuariosPorId, numa listagem só.
      return true;
    } catch (err: any) {
      if (encerrado.current) return false;
      // Chamado que estava na tela e agora dá 404: perda de acesso, não erro.
      if (jaTeveAcesso.current && perdeuAcesso(err, opcoes)) return false;
      console.error('Erro ao carregar dados:', err);
      // Releitura de um chamado que já está na tela: a página fica, com o que
      // foi lido por último e o que a pessoa digitou (C3). Só a primeira
      // carga, sem nada para mostrar, vira o aviso no lugar da página.
      if (jaTeveAcesso.current) {
        toast.error('Não foi possível atualizar o chamado agora. A tela mostra a última leitura.');
        return false;
      }
      setError('Erro ao carregar dados do chamado.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /** Os campos da edição a partir de um chamado — todos, ou só os de `campos`. */
  const preencherEdicao = (fonte: Chamado, campos?: CampoEditavel[]) => {
    const vale = (c: CampoEditavel) => !campos || campos.includes(c);
    if (vale('categoria_id')) setCategoriaEditada(fonte.categoria_id ?? undefined);
    if (vale('status')) setStatusEditado(fonte.status);
    if (vale('prioridade')) setPrioridadeEditada(fonte.prioridade);
    if (vale('tecnico_responsavel_id')) setTecnicoEditado(fonte.tecnico_responsavel_id ?? undefined);
    if (vale('solucao')) setSolucaoEditada(fonte.solucao || '');
  };

  /**
   * Entrar na edição. Na TI, sem pedido: a referência é o chamado da página,
   * e os campos partem dele — o que sobrou de uma edição cancelada não volta.
   * O salvamento relê e confere o que mudou desde aqui (T-1). Na Qualidade,
   * relê o chamado antes: a referência precisa ser o que está no servidor
   * agora, e não o que a página carregou há meia hora.
   */
  const iniciarEdicao = async () => {
    if (!chamado) return;
    limparFalha('edicao');
    if (!ehDaQualidade) {
      referenciaDaEdicao.current = fotografar(chamado);
      preencherEdicao(chamado);
      setConflitoNaEdicao(null);
      setConflitoDeVersaoNaEdicao(false);
      setEntradaNaEdicao((n) => n + 1);
      setModoEdicao(true);
      return;
    }

    try {
      setSalvandoEdicao(true);
      const atual = await chamadosService.buscar(chamado.id);
      referenciaDaEdicao.current = fotografar(atual);
      setChamado(atual);
      aplicarChamado(atual);
      preencherEdicao(atual);
      setConflitoNaEdicao(null);
      setConflitoDeVersaoNaEdicao(false);
      setModoEdicao(true);
    } catch (err) {
      if (perdeuAcesso(err)) return;
      toast.error('Não foi possível abrir a edição. Tente de novo.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const cancelarEdicao = () => {
    referenciaDaEdicao.current = null;
    if (falhaDeEscrita?.operacao === 'edicao') setFalhaDeEscrita(null);
    setConflitoNaEdicao(null);
    setConflitoDeVersaoNaEdicao(false);
    setModoEdicao(false);
  };

  /**
   * A edição passa a valer contra `servidor`: ele vira a referência, a página
   * o mostra, e os campos que a pessoa NÃO editou passam ao valor de agora. Os
   * que ela editou ficam com o que ela digitou.
   */
  const rebasearEdicao = (servidor: Chamado, diferenca: ChamadoUpdate) => {
    referenciaDaEdicao.current = fotografar(servidor);
    setChamado(servidor);
    aplicarChamado(servidor);
    const naoEditados = (Object.keys(ROTULOS_DOS_CAMPOS) as CampoEditavel[]).filter(
      (c) => !(c in diferenca)
    );
    preencherEdicao(servidor, naoEditados);
  };

  /**
   * Salvar na Qualidade: só o que mudou, e só se nada do que a pessoa editou
   * mudou no servidor desde a referência. Num conflito nada é salvo, o que ela
   * digitou fica nos campos, e o resto passa a mostrar o valor de agora.
   *
   * O PUT leva a versão da RELEITURA logo antes dele, e não a da abertura da
   * edição: mudança alheia em campo não editado continua convivendo com a
   * edição (FE-3). O que entrar entre a releitura e o PUT a API recusa com
   * 409 (API-4b) — e a resposta é a mesma do conflito acima, sem repetir.
   */
  const salvarEdicaoDaQualidade = async (referencia: FotoDaEdicao) => {
    if (!chamado) return;

    const diferenca = diferencaDaEdicao(referencia, {
      categoria_id: categoriaEditada ?? null,
      status: statusEditado,
      prioridade: prioridadeEditada,
      tecnico_responsavel_id: tecnicoEditado ?? null,
      solucao: solucaoEditada,
    });

    if (Object.keys(diferenca).length === 0) {
      cancelarEdicao();
      return;
    }

    setSalvandoEdicao(true);
    try {
      let servidor: Chamado;
      try {
        servidor = await chamadosService.buscar(chamado.id);
      } catch (err) {
        if (perdeuAcesso(err)) return;
        toast.error(
          'Não foi possível conferir o chamado antes de salvar. O que você editou foi mantido.'
        );
        return;
      }

      const conflitos = camposEmConflito(referencia, fotografar(servidor), diferenca);
      if (conflitos.length > 0) {
        rebasearEdicao(servidor, diferenca);
        setConflitoNaEdicao(conflitos);
        setConflitoDeVersaoNaEdicao(false);
        return;
      }

      // A versão é a do `servidor`, relido agora — do mesmo chamado.
      const precondicao = precondicaoDaEscrita(servidor);
      if (precondicao === null) {
        toast.error(MENSAGEM_SEM_VERSAO);
        return;
      }

      try {
        const atualizado = await chamadosService.atualizar(chamado.id, { ...diferenca, ...precondicao });
        aplicarChamado(atualizado);
      } catch (err) {
        if (perdeuAcesso(err)) return;
        // A edição fica aberta, com o que foi digitado: o erro aparece em
        // aviso, e não no lugar da página inteira.
        if (ehConflitoDeVersao(err)) {
          await tratarConflitoDeVersaoNaEdicao(referencia, diferenca);
          return;
        }
        if (ehVersaoAusente(err)) {
          toast.error(MENSAGEM_VERSAO_AUSENTE);
          return;
        }
        const { mensagem, recarregarAtendentes, indisponivel } = interpretarErroDaReatribuicao(err);
        if (mensagem) toast.error(mensagem);
        if (indisponivel) marcarQualidadeIndisponivel();
        if (recarregarAtendentes) void verificarQualidade();
        return;
      }

      cancelarEdicao();
      // Trocar o responsável pode tirar o chamado de quem trocou (API-5): se
      // a releitura der 404, a troca valeu, e a mensagem diz isso.
      await carregarDados(true, { atribuicaoSalva: 'tecnico_responsavel_id' in diferenca });
    } finally {
      setSalvandoEdicao(false);
    }
  };

  /**
   * 409 no PUT da edição: outra pessoa salvou entre a releitura e o PUT. Nada
   * foi gravado. Relê, mostra o que mudou nos campos editados (pode ser
   * nada: a mudança foi em outro campo) e deixa a decisão com a pessoa — um
   * novo "Salvar" refaz toda a conferência, contra a referência nova.
   */
  const tratarConflitoDeVersaoNaEdicao = async (referencia: FotoDaEdicao, diferenca: ChamadoUpdate) => {
    if (!chamado) return;
    let servidor: Chamado;
    try {
      servidor = await chamadosService.buscar(chamado.id);
    } catch (err) {
      if (perdeuAcesso(err)) return;
      toast.error(
        'Este chamado foi alterado por outra pessoa, e não foi possível recarregá-lo. Nada foi salvo; o que você editou foi mantido.'
      );
      return;
    }
    rebasearEdicao(servidor, diferenca);
    setConflitoNaEdicao(camposEmConflito(referencia, fotografar(servidor), diferenca));
    setConflitoDeVersaoNaEdicao(true);
  };

  /**
   * Uma escrita falhou sem perda de acesso nem conflito de versão (C3): a
   * página fica, a mensagem vai para junto da operação, e o 403 trava a
   * operação e relê a identidade. Nunca reenvia.
   */
  const registrarFalha = (operacao: OperacaoDeEscrita, err: unknown) => {
    const falha = classificarFalhaDeEscrita(err);
    setFalhaDeEscrita({ operacao, falha });
    if (falha.tipo === 'recusa') {
      setOperacoesRecusadas((atual) => new Set(atual).add(operacao));
      void revalidarIdentidade();
    }
  };

  /** Nova tentativa da pessoa: a mensagem anterior sai, e a recusa também. */
  const limparFalha = (operacao: OperacaoDeEscrita) => {
    setFalhaDeEscrita((atual) => (atual?.operacao === operacao ? null : atual));
    setOperacoesRecusadas((atual) => {
      if (!atual.has(operacao)) return atual;
      const proximo = new Set(atual);
      proximo.delete(operacao);
      return proximo;
    });
  };

  /**
   * "Conferir o chamado": relê da API, depois de uma falha incerta ou de uma
   * recusa. É o que mostra se a escrita entrou antes de a pessoa repetir.
   * Fora da edição — lá, reler apagaria os campos editados.
   */
  const conferirChamado = async () => {
    const operacao = falhaDeEscrita?.operacao;
    const ok = await carregarDados(true);
    if (ok && operacao) limparFalha(operacao);
  };

  const handleSalvarEdicao = async () => {
    if (!chamado || !user) return;
    if (operacoesRecusadas.has('edicao')) return;
    setFalhaDeEscrita(null);

    if (ehDaQualidade && referenciaDaEdicao.current) {
      await salvarEdicaoDaQualidade(referenciaDaEdicao.current);
      return;
    }

    await salvarEdicaoDaTI(referenciaDaEdicao.current ?? fotografar(chamado));
  };

  /**
   * Salvar na TI (T-1): só o que mudou, conferido contra o servidor.
   *
   * Antes a edição mandava categoria, status, prioridade e responsável
   * sempre, com o valor de quando a página carregou — e a mudança que outra
   * pessoa gravasse nesse meio tempo, num campo que a pessoa nem tocou, era
   * desfeita em silêncio (o PUT da API grava só o que chega, mas chegava
   * tudo). Agora, como na Qualidade:
   *
   * 1. vai só o que difere da referência (o chamado de quando a edição abriu);
   * 2. antes do PUT o chamado é relido; se um campo que a pessoa editou mudou
   *    no servidor desde a referência, nada é salvo, o que ela digitou fica,
   *    e a tela mostra o que mudou;
   * 3. o PUT leva a versão da releitura, e a API recusa com 409 a escrita
   *    alheia que entrou entre a releitura e o PUT.
   *
   * O que sobra: o PUT da TI não trava a linha na API. Duas gravações no
   * mesmo instante — as duas já dentro da API — ainda passam as duas. Fechar
   * isso é com a API (lock na TI), não com a tela.
   *
   * O responsável só entra com a permissão vigente de trocá-lo; sem ela, não
   * vai — antes ia o de antes, que era o mesmo efeito com risco de desfazer
   * uma troca alheia.
   */
  const salvarEdicaoDaTI = async (referencia: FotoDaEdicao) => {
    if (!chamado) return;

    const diferenca = diferencaDaEdicao(referencia, {
      // `?? null` nos dois campos limpáveis: escolher "Sem categoria" ou "Sem
      // atribuição" deixa o estado local `undefined`, o axios descarta
      // `undefined` antes de enviar, e a API com `exclude_unset` não toca no
      // que não chegou — a limpeza era engolida em silêncio. `null` viaja.
      categoria_id: categoriaEditada ?? null,
      status: statusEditado,
      prioridade: prioridadeEditada,
      tecnico_responsavel_id: podeAdministrar
        ? (tecnicoEditado ?? null)
        : referencia.tecnico_responsavel_id,
      // A solução só vai quando muda de fato, e não vai apagada: reenviar o
      // valor carregado faria um chamado antigo de solução curta ser recusado
      // ao salvar qualquer outro campo.
      solucao: solucaoEditada,
    });

    if (Object.keys(diferenca).length === 0) {
      cancelarEdicao();
      return;
    }

    try {
      setLoading(true);

      let servidor: Chamado;
      try {
        servidor = await chamadosService.buscar(chamado.id);
      } catch (err) {
        if (perdeuAcesso(err)) return;
        toast.error(
          'Não foi possível conferir o chamado antes de salvar. O que você editou foi mantido.'
        );
        return;
      }

      const conflitos = camposEmConflito(referencia, fotografar(servidor), diferenca);
      if (conflitos.length > 0) {
        rebasearEdicao(servidor, diferenca);
        setConflitoNaEdicao(conflitos);
        setConflitoDeVersaoNaEdicao(false);
        return;
      }

      // A versão é a do `servidor`, relido agora — do mesmo chamado.
      await atualizarChamado(chamado.id, { ...diferenca, ...precondicaoDaEdicaoDaTI(servidor) });

      cancelarEdicao();
      await carregarDados(true, { atribuicaoSalva: 'tecnico_responsavel_id' in diferenca });
    } catch (err: any) {
      if (perdeuAcesso(err)) return;
      // 409 de versão: outra pessoa salvou entre a releitura e o PUT. Nada
      // foi gravado; relê e mostra, sem repetir.
      if (ehConflitoDeVersao(err)) {
        await tratarConflitoDeVersaoNaEdicao(referencia, diferenca);
        return;
      }
      // 400 do responsável (API-9: inativo; API-6: fora da TI, conta de
      // serviço). Nada foi gravado. A edição fica aberta com tudo o que foi
      // digitado, o motivo é o `detail` do backend, a lista é relida — e o
      // novo "Salvar" é decisão da pessoa, nunca automático.
      if (ehRecusaDoResponsavel(err)) {
        toast.error(mensagemDaRecusaDoResponsavel(err));
        void responsaveisTI.recarregar();
        return;
      }
      // Qualquer outra recusa: a edição fica aberta, com tudo o que foi
      // digitado, e a mensagem junto dela (C3).
      console.error('Erro ao atualizar chamado:', err);
      registrarFalha('edicao', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * O chamado que o atendimento devolveu: a página, o quadro e o histórico.
   * Sem `carregarDados`: o PATCH já devolve o chamado com o SLA, e recarregar
   * tudo acenderia o carregamento da página inteira por uma mudança de status.
   */
  const aplicarAtendimento = (atualizado: Chamado) => {
    if (encerrado.current) return;
    setChamado(atualizado);
    aplicarChamado(atualizado);
    setStatusEditado(atualizado.status);
    setSolucaoEditada(atualizado.solucao || '');
    carregarHistorico(atualizado.id)
      .then(setHistorico)
      .catch(() => {
        // O histórico fica o de antes; o status na tela já é o novo.
      });
  };

  const handleEnviarComentario = async () => {
    if (!novoComentario.trim() || !chamado || !user || internoBloqueado) return;
    // Sempre explícito: `true` só com a opção marcada por quem pode.
    const interno = comentarioInterno && podeAdministrar;

    try {
      setEnviandoComentario(true);

      await criarComentario({
        chamado_id: chamado.id,
        comentario: novoComentario,
        is_interno: interno,
      });

      setNovoComentario('');
      setComentarioInterno(false);
      await carregarDados(true); // Forçar busca da API
    } catch (err: any) {
      if (perdeuAcesso(err)) return;
      // 403 num interno: a permissão mudou. O texto fica, o envio trava até
      // a pessoa escolher publicar, e a identidade é relida — sem repetir a
      // escrita. O toast do 403 é do interceptor.
      if (interno && ehRecusaDoInterno(err)) {
        setInternoRecusado(true);
        void revalidarIdentidade();
        return;
      }
      if (err?.response?.status === 403) return;
      console.error('Erro ao enviar comentário:', err);
      toast.error(err?.response?.data?.detail || 'Erro ao enviar comentário.');
    } finally {
      setEnviandoComentario(false);
    }
  };


  /**
   * Recusa por versão numa escrita da Qualidade (FE-4): nada foi gravado.
   * Avisa, relê o chamado e só então devolve as ações — feitas a partir do
   * chamado novo. Nunca repete a escrita. `false` é "não foi por versão".
   */
  const recarregarAposRecusaDeVersao = async (err: unknown): Promise<boolean> => {
    const conflito = ehConflitoDeVersao(err);
    if (!conflito && !ehVersaoAusente(err)) return false;
    toast.error(conflito ? MENSAGEM_CONFLITO_DE_VERSAO : MENSAGEM_VERSAO_AUSENTE);
    setAtualizandoAposConflito(true);
    try {
      await carregarDados(true);
    } finally {
      setAtualizandoAposConflito(false);
    }
    return true;
  };

  // Função para mudança rápida de status
  const handleMudancaRapidaStatus = async (novoStatus: StatusEnum) => {
    // Se for resolver ou fechar, abrir modal para solicitar solução
    if (
      novoStatus === StatusEnum.RESOLVIDO ||
      novoStatus === StatusEnum.FECHADO
    ) {
      setStatusAlvo(novoStatus);
      setSolucaoModal(rascunhoDaResolucao.current ?? (chamado?.solucao || ''));
      setMostrarModalResolucao(true);
      return;
    }

    // Para outros status, fazer mudança direta
    if (!chamado || !user) return;
    if (operacoesRecusadas.has('status')) return;
    setFalhaDeEscrita(null);

    // Na Qualidade, a versão do chamado desta página (M-1): se outra pessoa
    // mudou o status depois que ela carregou, a API recusa em vez de desfazer.
    const precondicao = precondicaoDaEscrita(chamado);
    if (precondicao === null) {
      toast.error(MENSAGEM_SEM_VERSAO);
      return;
    }

    try {
      setLoading(true);

      const dadosAtualizacao: ChamadoUpdate = {
        status: novoStatus,
        ...precondicao,
      };

      await atualizarChamado(chamado.id, dadosAtualizacao);
      await carregarDados(true); // Forçar busca da API
    } catch (err: any) {
      if (perdeuAcesso(err)) return;
      if (await recarregarAposRecusaDeVersao(err)) return;
      console.error('Erro ao atualizar status:', err);
      registrarFalha('status', err);
    } finally {
      setLoading(false);
    }
  };

  // Função para confirmar resolução/fechamento com solução
  const handleConfirmarResolucao = async () => {
    // A solução é o que fica de registro do atendimento e o que alguém lê
    // quando o mesmo problema volta. "ok" e "resolvido" não servem a ninguém.
    const problema = validarMinimo(solucaoModal, MINIMO_SOLUCAO, 'Solução');
    if (problema) {
      toast.error(problema);
      return;
    }

    if (!chamado || !user) return;
    if (operacoesRecusadas.has('resolucao')) return;
    setFalhaDeEscrita(null);

    const precondicao = precondicaoDaEscrita(chamado);
    if (precondicao === null) {
      toast.error(MENSAGEM_SEM_VERSAO);
      return;
    }

    try {
      setLoading(true);

      const dadosAtualizacao: ChamadoUpdate = {
        status: statusAlvo,
        solucao: solucaoModal,
        ...precondicao,
      };

      await atualizarChamado(chamado.id, dadosAtualizacao);
      setMostrarModalResolucao(false);
      setSolucaoModal('');
      rascunhoDaResolucao.current = null;
      await carregarDados(true); // Forçar busca da API
    } catch (err: any) {
      if (perdeuAcesso(err)) return;
      // Recusa por versão: o modal fecha (o status pode já não ser o que ele
      // pressupunha) e a solução fica guardada para o próximo "resolver".
      if (ehConflitoDeVersao(err) || ehVersaoAusente(err)) {
        rascunhoDaResolucao.current = solucaoModal;
        setMostrarModalResolucao(false);
        await recarregarAposRecusaDeVersao(err);
        return;
      }
      // O modal fica aberto, com a solução digitada e a mensagem dentro dele
      // (C3). A solução também fica guardada para o próximo "resolver".
      console.error('Erro ao atualizar chamado:', err);
      rascunhoDaResolucao.current = solucaoModal;
      registrarFalha('resolucao', err);
    } finally {
      setLoading(false);
    }
  };

  // Função para cancelar chamado
  const handleCancelarChamado = async () => {
    if (!chamado || !user) return;

    // O motivo do cancelamento é gravado na mesma coluna `solucao`, então
    // obedece ao mesmo mínimo — senão cancelar com "x" passaria por uma porta
    // que resolver com "x" não passa.
    const problema = validarMinimo(motivoCancelamento, MINIMO_SOLUCAO, 'Motivo');
    if (problema) {
      toast.error(problema);
      return;
    }

    // Fora da TI (FE-4), o cancelamento com motivo são DUAS escritas, e não
    // uma transação: cancelar, depois o PUT do motivo com a versão que o
    // cancelamento devolveu — a de antes já não vale, o cancelamento a subiu.
    // Se a segunda falhar, o chamado fica cancelado sem motivo; o motivo fica
    // no campo, e um novo "Confirmar" só registra o motivo.
    if (!escreveSemVersao(chamado)) {
      await cancelarComVersao(chamado);
      return;
    }

    try {
      setProcessando(true);

      // Primeiro cancela o chamado
      await chamadosService.cancelar(chamado.id);

      // Depois atualiza com o motivo (solução)
      await atualizarChamado(chamado.id, { solucao: motivoCancelamento });

      setMostrarModalCancelar(false);
      setMotivoCancelamento('');

      // Redireciona para a página de chamados
      navigate('/chamados', { replace: true });
    } catch (err: any) {
      if (perdeuAcesso(err)) return;
      console.error('Erro ao cancelar chamado:', err);
      toast.error(err?.response?.data?.detail || 'Erro ao cancelar chamado.');
    } finally {
      setProcessando(false);
    }
  };

  /** As duas escritas do cancelamento da Qualidade. Ver `handleCancelarChamado`. */
  const cancelarComVersao = async (alvo: Chamado) => {
    const MOTIVO_NAO_REGISTRADO =
      'O chamado foi cancelado, mas o motivo não foi registrado. O motivo continua no campo: confirme de novo para registrá-lo.';

    setProcessando(true);
    try {
      // Já cancelado (a primeira escrita passou antes): só falta o motivo.
      let cancelado = alvo;
      if (!alvo.cancelado) {
        const precondicao = precondicaoDaEscrita(alvo);
        if (precondicao === null) {
          toast.error(MENSAGEM_SEM_VERSAO);
          return;
        }
        try {
          cancelado = await chamadosService.cancelar(alvo.id, precondicao.versao_esperada);
        } catch (err: any) {
          if (perdeuAcesso(err)) return;
          if (await recarregarAposRecusaDeVersao(err)) return;
          toast.error(err?.response?.data?.detail || 'Erro ao cancelar chamado.');
          return;
        }
        setChamado(cancelado);
        aplicarChamado(cancelado);
      }

      // A versão é a que o cancelamento devolveu, do mesmo chamado. Sem ela,
      // o PUT não sai — com a versão velha ele levaria 409, e sem nenhuma, 428.
      const precondicaoDoMotivo = cancelado.id === alvo.id ? precondicaoDaEscrita(cancelado) : null;
      if (precondicaoDoMotivo === null) {
        toast.error(MOTIVO_NAO_REGISTRADO);
        return;
      }
      try {
        await atualizarChamado(alvo.id, { solucao: motivoCancelamento, ...precondicaoDoMotivo });
      } catch (err: any) {
        if (perdeuAcesso(err)) return;
        toast.error(MOTIVO_NAO_REGISTRADO);
        if (ehConflitoDeVersao(err) || ehVersaoAusente(err)) {
          setAtualizandoAposConflito(true);
          try {
            await carregarDados(true);
          } finally {
            setAtualizandoAposConflito(false);
          }
        }
        return;
      }

      setMostrarModalCancelar(false);
      setMotivoCancelamento('');
      navigate('/chamados', { replace: true });
    } finally {
      setProcessando(false);
    }
  };

  // Função para arquivar chamado
  const handleArquivarChamado = async () => {
    if (!chamado || !user) return;

    // Na Qualidade, as marcas levam a versão do chamado desta página. Na TI,
    // `{}`: a requisição sai sem corpo, como sempre.
    const precondicao = precondicaoDaEscrita(chamado);
    if (precondicao === null) {
      toast.error(MENSAGEM_SEM_VERSAO);
      return;
    }

    try {
      setProcessando(true);

      if (chamado.arquivado) {
        // Desarquivar
        await chamadosService.desarquivar(chamado.id, precondicao.versao_esperada);
      } else {
        // Arquivar
        await chamadosService.arquivar(chamado.id, precondicao.versao_esperada);
      }

      setMostrarModalArquivar(false);

      // Redireciona para a página de chamados
      navigate('/chamados', { replace: true });
    } catch (err: any) {
      if (perdeuAcesso(err)) return;
      if (ehConflitoDeVersao(err) || ehVersaoAusente(err)) {
        setMostrarModalArquivar(false);
        await recarregarAposRecusaDeVersao(err);
        return;
      }
      console.error('Erro ao arquivar/desarquivar chamado:', err);
      toast.error(err?.response?.data?.detail || 'Erro ao processar solicitação.');
    } finally {
      setProcessando(false);
    }
  };

  /**
   * Apaga o chamado de vez.
   *
   * Quem chega aqui já passou por `podeExcluir` (administrador, chamado fora
   * do fluxo) e já digitou o protocolo. `deletarChamado` vem do contexto e
   * também tira o chamado da lista em memória — sem isso o card ficaria no
   * quadro até o próximo carregamento, apontando para uma página que não
   * existe mais.
   */
  const handleExcluirChamado = async () => {
    if (!chamado) return;

    try {
      setProcessando(true);

      await deletarChamado(chamado.id);

      setMostrarModalExcluir(false);
      setConfirmacaoProtocolo('');
      toast.success(`Chamado ${chamado.protocolo} excluído.`);

      // `replace` para o Voltar do navegador não trazer a pessoa de volta a
      // uma página de chamado que já não existe.
      navigate('/chamados', { replace: true });
    } catch (err: any) {
      // O 403 já é anunciado pelo interceptor; repetir mostraria duas
      // mensagens para o mesmo erro.
      if (err?.response?.status !== 403) {
        toast.error(err?.response?.data?.detail || 'Não foi possível excluir o chamado.');
      }
    } finally {
      setProcessando(false);
    }
  };

  // Função para obter os botões de ação baseados no status atual
  const getBotoesAcao = () => {
    if (!alteraComoEquipe || !chamado) return null;

    const botoesComuns = [];

    switch (chamado.status) {

      /* ================== ABERTO ================== */
      case StatusEnum.ABERTO:
        botoesComuns.push(
          <Button variante="primario"
            key="iniciar"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.EM_ANDAMENTO)}>
            <IconeIniciar className="h-4 w-4" />
            Iniciar Atendimento
          </Button>
        );
        break;

      /* ================== EM ANDAMENTO ================== */
      case StatusEnum.EM_ANDAMENTO:
        botoesComuns.push(
          <Button variante="secundario"
            key="aguardando"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.AGUARDANDO)}>
            <IconeRelogio className="h-4 w-4" />
            Aguardando Retorno
          </Button>,

          <Button variante="sucesso"
            key="resolver"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.RESOLVIDO)}>
            <IconeConfereCirculo className="h-4 w-4" />
            Marcar como Resolvido
          </Button>
        );
        break;

      /* ================== AGUARDANDO ================== */
      case StatusEnum.AGUARDANDO:
        botoesComuns.push(
          <Button variante="primario"
            key="retomar"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.EM_ANDAMENTO)}>
            <IconeIniciar className="h-4 w-4" />
            Retomar Atendimento
          </Button>,

          <Button variante="sucesso"
            key="resolver"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.RESOLVIDO)}>
            <IconeConfereCirculo className="h-4 w-4" />
            Marcar como Resolvido
          </Button>
        );
        break;

      /* ================== RESOLVIDO ================== */
      case StatusEnum.RESOLVIDO:
        botoesComuns.push(
          <Button variante="secundario"
            key="reabrir"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.EM_ANDAMENTO)}>
            <IconeDesfazer className="h-4 w-4" />
            Reabrir
          </Button>
        );
        break;

      /* ================== FECHADO (unificado com Resolvido visualmente) ================== */
      case StatusEnum.FECHADO:
        botoesComuns.push(
          <Button variante="secundario"
            key="reabrir"
            onClick={() => handleMudancaRapidaStatus(StatusEnum.EM_ANDAMENTO)}>
            <IconeDesfazer className="h-4 w-4" />
            Reabrir
          </Button>
        );
        break;
    }

    return botoesComuns;
  };


  // Função para exibir o status (Fechado vira Resolvido visualmente)
  const getStatusDisplay = (status: StatusEnum): string => {
    return status === StatusEnum.FECHADO ? 'Resolvido' : status;
  };

  /*
   * O `seloDaCor` saiu daqui na Fase 15, como saiu do `Dashboard` na 13.
   *
   * Ele pintava o selo com a cor de `graficos.ts` — que é a fonte certa para
   * GRÁFICO, e por isso continua alimentando o ponto colorido das opções do
   * `Seletor` logo abaixo. Para SELO, a §16 manda usar o mapa
   * `status → variante`, e o selo pela cor de gráfico era a segunda fonte de
   * verdade que a §5.4 proíbe: as duas podiam divergir, e ninguém saberia qual
   * está certa.
   *
   * O corte é o mesmo dos dois lados: cor de gráfico onde é gráfico ou
   * amostra; `Badge` do mapa onde é estado.
   */

  /** O valor de um campo no chamado da tela, para o aviso de conflito. */
  const valorAtualDoCampo = (campo: CampoEditavel): string => {
    if (!chamado) return '';
    switch (campo) {
      case 'status':
        return chamado.status;
      case 'prioridade':
        return chamado.prioridade;
      case 'categoria_id':
        return (
          categorias.find((c) => c.id === chamado.categoria_id)?.nome ?? 'Sem categoria'
        );
      case 'tecnico_responsavel_id':
        return (
          (chamado.tecnico_responsavel_id && usuarios[chamado.tecnico_responsavel_id]?.nome) ||
          'Sem atribuição'
        );
      case 'solucao':
        return chamado.solucao ? 'outro texto' : 'vazia';
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Formata uma duração em minutos de forma amigável: "2d 3h", "4h 15min", "30min".
  const formatarDuracao = (minutos: number): string => {
    const total = Math.max(0, Math.round(minutos));
    if (total < 1) return 'menos de 1min';
    const dias = Math.floor(total / 1440);
    const horas = Math.floor((total % 1440) / 60);
    const mins = total % 60;
    if (dias > 0) return `${dias}d${horas > 0 ? ` ${horas}h` : ''}`;
    if (horas > 0) return `${horas}h${mins > 0 ? ` ${mins}min` : ''}`;
    return `${mins}min`;
  };

  // Função para limpar valores de enum (remove prefixos como "StatusEnum.", "PrioridadeEnum.", etc.)
  const limparValorEnum = (valor: string | null | undefined): string => {
    if (!valor) return '';

    // Remove prefixos de enum (StatusEnum., PrioridadeEnum., UrgenciaEnum., etc.)
    const semPrefixo = valor.replace(/^(Status|Prioridade|Urgencia)Enum\./, '');

    return semPrefixo;
  };

  // O `getRoleBadgeColor` virou `PapelBadge`, em `SelosDeChamado.tsx`, junto
  // dos outros mapas. A nota de lá conta o que o `switch` estava fazendo: 5%
  // de alfa separando Administrador de Técnico, e um `default` com duas cores
  // de texto na mesma string.

  // Antes de tudo: depois da perda de acesso, nada do chamado aparece — nem
  // o que uma resposta atrasada tenha posto no estado.
  if (acessoEncerrado) {
    return (
      <AcessoEncerrado mensagem={acessoEncerrado.mensagem} rascunhos={acessoEncerrado.rascunhos}>
        {/* `replace`: o Voltar do navegador não traz de volta uma página que
            a pessoa não pode mais abrir. */}
        <Button variante="primario" onClick={() => navigate('/chamados', { replace: true })}>
          Voltar para Chamados
        </Button>
      </AcessoEncerrado>
    );
  }

  if (loading && !chamado) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <BlocoCarregando tamanho="lg">
          <p className="text-sm text-conteudo-suave">Carregando chamado...</p>
        </BlocoCarregando>
      </div>
    );
  }

  if (error || !chamado) {
    return (
      <div className="space-y-5">
        {/*
          Era a decima copia literal do `Aviso`, e a unica que sobreviveu a
          Fase 8 -- porque esta num `return` antecipado, longe do corpo da
          tela, onde a varredura por bloco de erro nao passou.

          Alem da forma, ela perdia o `role="alert"`: a falha de carga
          aparecia so para quem enxerga. A cor tambem era outra, `bg-perigo/10`
          contra os 15% do `--tint-danger` do pacote.
        */}
        <Aviso variante="perigo">{error || 'Chamado não encontrado'}</Aviso>
        <Button variante="primario"
          onClick={() => navigate('/chamados')}>
          Voltar para Chamados
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-5">
        {/* Cabeçalho */}
        <div className="rounded-2xl border border-borda bg-superficie">
          <div className="px-5 py-4">
            {/* Botão Voltar — que e link, e nao botao: vai para uma rota
                fixa (`/chamados`), nao desfaz nada nem volta no historico.
                Mesmo caso do lembrete de tarefas em `Chamados.tsx`. */}
            <Link
              to="/chamados"
              className="mb-2 inline-flex items-center gap-1 rounded text-sm font-medium text-action
                        transition-colors hover:brightness-110
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
              <IconeVoltar className="h-4 w-4" />
              Voltar
            </Link>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              {/* Título e subtítulo */}
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-conteudo">
                  Chamado #{chamado.protocolo}
                </h1>
                <p className="mt-0.5 text-sm text-conteudo-tenue">
                  {chamado.titulo}
                </p>

                {/* Cancelado e arquivado dizem o que aconteceu COM o chamado, e
                    o campo "Status" logo abaixo não os menciona: cancelar não
                    mexe no status, então um chamado cancelado continua exibindo
                    "Aberto" ou "Resolvido" ali.

                    Esta era a única tela que não avisava. O modal, o card do
                    quadro e a tabela do painel já mostravam o selo; aqui, a
                    única pista era a AUSÊNCIA do botão "Cancelar Chamado" — e
                    ninguém percebe um botão que não está lá. Foi assim que um
                    chamado cancelado foi marcado como resolvido sem que quem
                    marcou soubesse do cancelamento. */}
                {(chamado.cancelado || chamado.arquivado) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {chamado.cancelado && <MarcaBadge marca="cancelado" />}
                    {chamado.arquivado && <MarcaBadge marca="arquivado" />}
                    <span className="text-sm text-conteudo-tenue">
                      Fora do fluxo de atendimento — o status abaixo é o que ele
                      tinha quando saiu.
                    </span>
                  </div>
                )}
              </div>

              {/* Botões de ação (editar / salvar / cancelar / arquivar).

                  Em edição, os botões de salvar e cancelar ficam mesmo se a
                  permissão cair no meio: o que foi digitado não some, e quem
                  decide o PUT é a API (C3). */}
              {(alteraComoEquipe || ehSolicitante || modoEdicao) && (
                <div className="flex flex-wrap items-center gap-2">
                  {!modoEdicao ? (
                    <>
                      {/* Botão Cancelar Chamado.

                          Era vermelho VAZADO — moldura e texto, sem
                          preenchimento —, e o pacote não tem essa variante.
                          Ficou como decisão aberta do Checkpoint 3, e o
                          operador decidiu pelo refinamento que está no
                          DECISOES.md: **o gatilho que só abre confirmação é
                          neutro; quem carrega o vermelho é o botão que
                          confirma**, dentro do modal.

                          O gatilho não cancela nada. Ele abre uma janela que
                          ainda exige um motivo escrito e um segundo clique —
                          e é ESSE segundo clique que não tem volta, porque a
                          API tem `arquivar`/`desarquivar` mas não tem
                          descancelar. O vermelho fica onde o compromisso é
                          assumido, e não onde ele é cogitado.

                          (O "Excluir" logo abaixo continua `perigo` no
                          gatilho. É a exceção registrada, e a nota dele
                          explica: é a única ação da página que apaga o
                          chamado, e ela não pode parecer irmã de "Arquivar".) */}
                      {/* Cancelar é da equipe e do solicitante — o deste é
                          ação própria, e não some com a escrita de equipe. */}
                      {!chamado?.cancelado && (alteraComoEquipe || ehSolicitante) && (
                        <Button
                          variante="secundario"
                          onClick={() => setMostrarModalCancelar(true)}
                        >
                          <IconeProibido className="h-4 w-4" />
                          Cancelar Chamado
                        </Button>
                      )}

                      {/* Botão Arquivar/Desarquivar.

                          Era verde quando arquivado e ambar quando nao, e as
                          duas cores saem pela regra registrada no DECISOES.md:
                          "info e alerta sao semanticas de selo e aviso, nao de
                          botao". Arquivar tambem nao e conclusao, entao o verde
                          nao cabia nem por esse lado.

                          `secundario` pela mesma regra que os tres "Desativar":
                          a acao e reversivel -- `arquivar` e `desarquivar` sao
                          um par na API --, e o rotulo ja carrega o sentido. */}
                      {alteraComoEquipe && (
                      <Button
                        variante="secundario"
                        onClick={() => setMostrarModalArquivar(true)}
                      >
                        {chamado?.arquivado ? (
                          <>
                            <IconeDesarquivar className="h-4 w-4" />
                            Desarquivar
                          </>
                        ) : (
                          <>
                            <IconeArquivar className="h-4 w-4" />
                            Arquivar
                          </>
                        )}
                      </Button>
                      )}

                      {/* Botão Excluir.
                          Último da fileira e o único em vermelho cheio: é a
                          única ação da página que não tem volta, e não pode
                          parecer irmã de "Arquivar" nem de "Editar".

                          Quem pode chegar aqui está em `utils/exclusao`, com
                          teste — administrador, e só em chamado que já saiu do
                          fluxo. Administrador HUMANO e confirmado: a API-11
                          tira o `require_admin` da conta de serviço. */}
                      {chamado && podeAdministrarUsuarios && podeExcluir(chamado, user?.role) && (
                        <Button variante="perigo"
                          onClick={() => setMostrarModalExcluir(true)}>
                          <IconeApagar className="h-4 w-4" />
                          Excluir
                        </Button>
                      )}

                      {/* Botão Editar */}
                      {alteraComoEquipe && (
                        <Button
                          variante="secundario"
                          onClick={iniciarEdicao}
                          carregando={salvandoEdicao}
                        >
                          <IconeEditar className="h-4 w-4" />
                          Editar Detalhes
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Botão Cancelar Edição */}
                      <Button
                        variante="secundario"
                        onClick={cancelarEdicao}
                        disabled={salvandoEdicao}
                      >
                        <IconeFechar className="h-4 w-4" />
                        Cancelar
                      </Button>

                      {/* Botão Salvar */}
                      <Button variante="sucesso"
                        onClick={handleSalvarEdicao}
                        disabled={operacoesRecusadas.has('edicao')}
                        carregando={salvandoEdicao}>
                        <IconeSalvar className="h-4 w-4" />
                        Salvar
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conflito na edição da Qualidade: nada foi salvo. Fica dentro da
            página, e não no lugar dela — o que foi digitado está logo abaixo. */}
        {modoEdicao && conflitoNaEdicao && (conflitoNaEdicao.length > 0 || conflitoDeVersaoNaEdicao) && (
          <Aviso variante="alerta" titulo="Este chamado mudou enquanto você editava">
            {conflitoNaEdicao.length > 0 ? (
              <>
                Mudou desde que você abriu a edição:{' '}
                {conflitoNaEdicao
                  .map((campo) => `${ROTULOS_DOS_CAMPOS[campo]} (agora: ${valorAtualDoCampo(campo)})`)
                  .join(', ')}
                .
              </>
            ) : (
              <>Outra pessoa salvou este chamado enquanto você salvava, em campos que você não editou.</>
            )}{' '}
            Nada foi salvo. O que você editou continua nos campos: confira e salve de novo.
          </Aviso>
        )}

        {/* Falha de escrita que não encerra a página (C3): junto da edição, ou
            junto das ações rápidas. A da resolução fica dentro do modal. */}
        {falhaDeEscrita &&
          ((falhaDeEscrita.operacao === 'edicao' && modoEdicao) ||
            (falhaDeEscrita.operacao === 'status' && !modoEdicao)) && (
            <AvisoDeFalhaDeEscrita
              falha={falhaDeEscrita.falha}
              aoConferir={falhaDeEscrita.operacao === 'status' ? conferirChamado : undefined}
            />
          )}

        {/* Botões de Ação Rápida */}
        {(alteraComoEquipe || atendePelaRota) && !modoEdicao && (
          <div className="rounded-xl border border-borda bg-superficie p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-conteudo">
                Ações Rápidas:
              </span>
              {/* Um caminho ou outro, nunca os dois. O da Qualidade não
                  aparece em cancelado nem arquivado; o da equipe segue como
                  sempre foi (D-12). */}
              {atendePelaRota ? (
                <AcoesRapidas
                  chamado={chamado}
                  aoMudar={aplicarAtendimento}
                  aoPrecisarRecarregar={() => carregarDados(true)}
                  aoGuardarRascunho={(texto) => {
                    rascunhoDoAtendimento.current = texto;
                  }}
                />
              ) : atualizandoAposConflito ? (
                <p role="status" className="text-sm text-conteudo-suave">
                  Este chamado mudou. Atualizando os dados antes de liberar as ações…
                </p>
              ) : (
                // Recusadas com 403 (C3): os botões ficam à vista, travados.
                <fieldset
                  disabled={operacoesRecusadas.has('status')}
                  className="contents"
                  aria-label="Mudança de status"
                >
                  {getBotoesAcao()}
                </fieldset>
              )}
            </div>
          </div>
        )}

        {/*
          ── LISTA DE DEFINIÇÕES ─────────────────────────────────────────

          Este painel tem nove pares "nome do campo → valor", e os nove nomes
          eram `<label>`. Nenhum deles apontava para nada.

          Um `<label>` sem `for` e sem controle dentro é **inerte**: não cria
          relação nenhuma. Quem lê a tela com os olhos junta "Protocolo" ao
          `#4187` pela proximidade e pelo tamanho da fonte; quem navega por
          leitor de tela ouve "Protocolo" e, num item à parte, "#4187", sem
          nada dizendo que um é o nome do outro. É o mesmo defeito de família
          que a Fase 11 achou nos campos de formulário — o sinal certo pelo
          mecanismo errado —, só que aqui o mecanismo não existia.

          Quatro dos nove ficam mais delicados: em modo de edição eles passam a
          ter um `Seletor` do lado. A saída óbvia seria pôr `htmlFor` nesses
          quatro, e ela é uma armadilha: o id só existe em modo de edição, e
          fora dele o rótulo apontaria para um id inexistente — o ponteiro
          quebrado que já está travado por teste no `Campo`. Um `<label>`
          ENVOLVENDO o `Seletor` também não serve: o `Seletor` já se nomeia
          sozinho (`aria-label={rotulo}`, sem rótulo visível), e envolver
          criaria um segundo nome para o mesmo controle, que é a segunda fonte
          de verdade da §5.4.

          `<dl>`/`<dt>`/`<dd>` resolve os nove de uma vez, e é o que este bloco
          sempre foi: a relação nome→valor passa a ser estrutural, sem ponteiro
          para manter; o `Seletor` continua com o nome dele; e nada muda de
          lugar na tela, porque `<dt>` e `<dd>` já são bloco e o preflight do
          Tailwind zera a margem de 40px que o `<dd>` traria do navegador.
        */}
        {/* Informações do Chamado */}
        <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
          {/* TÍTULO DA SEÇÃO */}
          <div className="border-b border-borda px-5 py-4">
            <h2 className="text-sm font-semibold text-conteudo">
              Informações do Chamado
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-6 p-5 md:grid-cols-2">
            {/* ========================== COLUNA ESQUERDA ========================== */}
            {/*
              `dl` e nao `div`: ver a nota LISTA DE DEFINICOES logo acima do
              cabecalho deste painel. Sao duas listas, uma por coluna, porque
              `dl > div > div > dt` nao e valido — o `div` de agrupamento so
              vale como filho DIRETO do `dl`.
            */}
            <dl className="space-y-5">
              {/* Solicitante */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  <IconeUsuario className="mr-1 inline h-3.5 w-3.5" />
                  Solicitante
                </dt>

                <dd className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-conteudo">
                    {usuarios[chamado.solicitante_id]?.nome ||
                      `Usuário #${chamado.solicitante_id}`}
                  </p>

                  {usuarios[chamado.solicitante_id] && (
                    <PapelBadge roleId={usuarios[chamado.solicitante_id].role_id} />
                  )}
                </dd>
              </div>

              {/* Status */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Status
                </dt>

                <dd>
                  {modoEdicao ? (
                    <Seletor
                      rotulo="Status"
                      valor={statusEditado}
                      aoMudar={(v) => setStatusEditado(v as StatusEnum)}
                      opcoes={Object.values(StatusEnum)
                        .filter((status) => status !== StatusEnum.FECHADO) // Remove Fechado do dropdown
                        .map((status) => ({
                          valor: status,
                          rotulo: status,
                          cor: corDoStatus(getStatusDisplay(status), darkMode),
                        }))}
                    />
                  ) : (
                    /*
                      Rotulo e variante vem de fontes DIFERENTES de proposito, e
                      isso e a pergunta aberta registrada no DECISOES.md:
                      `getStatusDisplay` mostra "Resolvido" para o status
                      FECHADO, enquanto o mapa da secao 16 pinta FECHADO de
                      `discreto` e RESOLVIDO de `sucesso`. Um chamado fechado e
                      um resolvido leem a mesma palavra em cores diferentes.
                      A secao 30 proibe reescrever rotulo que a tela ja mostra,
                      entao os dois ficam como estao ate o produto decidir.
                    */
                    <Badge variante={VARIANTE_DE_STATUS[chamado.status]}>
                      {getStatusDisplay(chamado.status)}
                    </Badge>
                  )}
                </dd>
              </div>

              {/* Categoria */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Categoria
                </dt>

                <dd>
                  {modoEdicao ? (
                    <Seletor
                      rotulo="Categoria"
                      valor={categoriaEditada ? String(categoriaEditada) : ''}
                      aoMudar={(v) => setCategoriaEditada(v ? Number(v) : undefined)}
                      opcoes={[
                        { valor: '', rotulo: 'Sem categoria' },
                        ...categorias.map((categoria) => ({
                          valor: String(categoria.id),
                          rotulo: categoria.nome,
                        })),
                      ]}
                    />
                  ) : (
                    <p className="text-sm text-conteudo">
                      {categoriaNome}
                    </p>
                  )}
                </dd>
              </div>

              {/* Setor de destino. Sempre, inclusive TI, e só leitura também
                  em modo de edição: mudar o setor de um chamado não é desta
                  fase. `semPrefixo` porque o `<dt>` já diz o que é. */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Setor de destino
                </dt>

                <dd>
                  <SetorBadge chamado={chamado} semPrefixo />
                </dd>
              </div>

              {/* Data Abertura */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Data de Abertura
                </dt>

                <dd className="text-sm text-conteudo">
                  {formatarData(chamado.data_abertura)}
                </dd>
              </div>

              {/* Tempo em aberto (tempo útil de SLA: horas úteis, descontando pausas em Aguardando) */}
              {chamado.sla && (
                <div>
                  <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                    Tempo em aberto
                  </dt>

                  <dd>
                    <p className="text-sm text-conteudo">
                      {formatarDuracao(chamado.sla.minutos_resolucao_consumidos)}
                      {chamado.status !== StatusEnum.RESOLVIDO &&
                        chamado.status !== StatusEnum.FECHADO && (
                          <span className="ml-2 text-xs text-conteudo-tenue">
                            (em andamento)
                          </span>
                        )}
                    </p>
                    <p className="text-xs text-conteudo-tenue mt-0.5">
                      tempo útil de atendimento
                      {chamado.sla.minutos_pausados > 0
                        ? `, descontado ${formatarDuracao(chamado.sla.minutos_pausados)} em Aguardando`
                        : ''}
                    </p>
                  </dd>
                </div>
              )}
            </dl>

            {/* ========================== COLUNA DIREITA ========================== */}
            <dl className="space-y-5">
              {/* Técnico Responsável */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Técnico Responsável
                </dt>

                <dd>
                  {modoEdicao && ehDaQualidade ? (
                    reatribuiNaQualidade ? (
                      // Sem "Sem atribuição": na Qualidade o responsável é
                      // obrigatório. Quem já está e saiu da lista continua
                      // como escolha atual até alguém trocar.
                      <Seletor
                        rotulo="Técnico responsável"
                        valor={tecnicoEditado ? String(tecnicoEditado) : ''}
                        aoMudar={(v) => v && setTecnicoEditado(Number(v))}
                        opcoes={opcoesDeResponsavelDaQualidade(
                          qualidade.atendentes,
                          chamado.tecnico_responsavel_id,
                          (chamado.tecnico_responsavel_id &&
                            usuarios[chamado.tecnico_responsavel_id]?.nome) ||
                            `Usuário #${chamado.tecnico_responsavel_id}`
                        )}
                      />
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-conteudo">
                          {(chamado.tecnico_responsavel_id &&
                            usuarios[chamado.tecnico_responsavel_id]?.nome) ||
                            'Sem atribuição'}
                        </p>
                        <p className="mt-0.5 text-xs text-conteudo-tenue">
                          A troca de responsável da Qualidade não está disponível agora.
                        </p>
                      </div>
                    )
                  ) : modoEdicao && reatribuiNaTI ? (
                    <SeletorDeResponsavelDaTI
                      lista={responsaveisTI}
                      atualId={chamado.tecnico_responsavel_id}
                      nomeDoAtual={
                        chamado.tecnico_responsavel_id
                          ? usuarios[chamado.tecnico_responsavel_id]?.nome
                          : null
                      }
                      valor={tecnicoEditado ?? null}
                      aoMudar={(v) => setTecnicoEditado(v ? Number(v) : undefined)}
                    />
                  ) : modoEdicao ? (
                    // Edita o resto, mas o responsável da TI só quem
                    // administra troca. O PUT leva o de agora, que a API aceita.
                    <div>
                      <p className="text-sm font-medium text-conteudo">
                        {chamado.tecnico_responsavel_id
                          ? usuarios[chamado.tecnico_responsavel_id]?.nome ||
                            `Usuário #${chamado.tecnico_responsavel_id}`
                          : 'Sem atribuição'}
                      </p>
                      <p className="mt-0.5 text-xs text-conteudo-tenue">
                        A troca do responsável da TI é de administradores e da equipe da TI.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      {chamado.tecnico_responsavel_id ? (
                        <>
                          <p className="text-sm font-medium text-conteudo">
                            {/* `usuarios` inclui os inativos: o responsável
                                que saiu continua com nome. Sem nome, o id —
                                nunca um nome inventado. */}
                            {usuarios[chamado.tecnico_responsavel_id]?.nome ||
                              `Usuário #${chamado.tecnico_responsavel_id}`}
                          </p>

                          {usuarios[chamado.tecnico_responsavel_id] && (
                            <PapelBadge
                              roleId={usuarios[chamado.tecnico_responsavel_id].role_id}
                            />
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-conteudo">
                          Sem atribuição
                        </p>
                      )}
                    </div>
                  )}
                </dd>
              </div>

              {/* Prioridade */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Prioridade
                </dt>

                <dd>
                  {modoEdicao ? (
                    <Seletor
                      rotulo="Prioridade"
                      valor={prioridadeEditada}
                      aoMudar={(v) => setPrioridadeEditada(v as PrioridadeEnum)}
                      opcoes={Object.values(PrioridadeEnum).map((prioridade) => ({
                        valor: prioridade,
                        rotulo: prioridade,
                        cor: corDaPrioridade(prioridade, darkMode),
                      }))}
                    />
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <PrioridadeBadge prioridade={chamado.prioridade} />
                      <SlaBadge sla={chamado?.sla} />
                    </div>
                  )}
                </dd>
              </div>

              {/* Protocolo */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Protocolo
                </dt>

                <dd className="font-mono text-sm text-conteudo">
                  #{chamado.protocolo}
                </dd>
              </div>

              {/* Última Atualização */}
              <div>
                <dt className="mb-1.5 block text-xs font-medium text-conteudo-tenue">
                  Última Atualização
                </dt>

                <dd className="text-sm text-conteudo">
                  {chamado.updated_at
                    ? formatarData(chamado.updated_at)
                    : 'Não atualizado'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Descrição */}
        <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
          <div className="border-b border-borda px-5 py-4">
            <h2 className="text-sm font-semibold text-conteudo">
              Descrição
              {modoEdicao && (
                <span className="ml-2 text-xs font-normal text-conteudo-tenue">
                  (não editável - preserva o relato original do solicitante)
                </span>
              )}
            </h2>
          </div>

          <div className="p-5">
            {modoEdicao ? (
              /* `readOnly` e nao `disabled`, e a diferenca nao e cosmetica.
               *
               * Este campo EXIBE o relato original do solicitante — ele e
               * imutavel de proposito, e o rotulo acima diz isso. Mas
               * `disabled` tira o elemento da ordem de tabulacao E impede
               * selecionar o texto: justamente o texto que o tecnico precisa
               * reler e citar enquanto escreve a solucao, logo abaixo.
               *
               * `readOnly` mantem o campo focavel e o conteudo copiavel, e
               * continua recusando digitacao. `aria-readonly` vai junto porque
               * nem todo leitor de tela expoe o `readOnly` nativo.
               *
               * Achado pela varredura da Fase 8 e adiado ate aqui, que e a
               * fase desta tela. */
              <Textarea
                value={chamado.descricao}
                readOnly
                aria-readonly="true"
                aria-label="Descrição do chamado, não editável"
                rows={4}
                className="bg-superficie-elevada text-conteudo-suave"
              />
            ) : (
              <p className="text-sm text-conteudo whitespace-pre-wrap break-words overflow-wrap-anywhere">
                {chamado.descricao}
              </p>
            )}
          </div>
        </div>

        {/* Solução */}
        {(modoEdicao || chamado.solucao) && (
          <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
            <div className="border-b border-borda px-5 py-4">
              <h2 className="text-sm font-semibold text-conteudo">
                Solução
              </h2>
            </div>

            <div className="p-5">
              {modoEdicao ? (
                <Textarea
                  aria-label="Solução"
                  value={solucaoEditada}
                  onChange={(e) => setSolucaoEditada(e.target.value)}
                  rows={4}
                  placeholder="Descreva a solução aplicada..."
                />
              ) : (
                <p className="text-sm text-conteudo whitespace-pre-wrap break-words overflow-wrap-anywhere">
                  {chamado.solucao || 'Sem solução registrada'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Avaliação
            As estrelas e a regra de quem pode avaliar vivem no componente
            <Avaliacao />, que esta tela e o modal do quadro usam. Estavam
            escritas por extenso aqui; ao levá-las para o modal, repetir a
            regra criaria a segunda implementação de uma permissão — que é
            como este projeto acabou com três tabelas de cor de status que
            discordavam entre si. */}
        {(chamado.status === StatusEnum.RESOLVIDO ||
          chamado.status === StatusEnum.FECHADO) && (
          <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
            <div className="border-b border-borda px-5 py-4">
              <h2 className="text-sm font-semibold text-conteudo">
                Avaliação do Atendimento
              </h2>
            </div>
            <div className="p-5">
              <Avaliacao chamado={chamado} aoAvaliar={setChamado} tamanho="md" />
            </div>
          </div>
        )}

        {/* Comentários */}
        <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
          <div className="border-b border-borda px-5 py-4">
            <h2 className="text-sm font-semibold text-conteudo">
              Comentários {comentarios.length > 0 && `(${comentarios.length})`}
            </h2>
          </div>

          <div className="p-5">
            {/* Formulário de novo comentário */}
            <div className="mb-5">
              {/* O rotulo era so o placeholder, que SOME no primeiro
                  caractere digitado — o item da secao 29 que diz que nenhum
                  campo pode depender dele. O mesmo campo no ChamadoModal ja
                  passava pelo primitivo; era esta tela que estava atras. */}
              <Textarea
                aria-label="Novo comentário"
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                rows={3}
                placeholder="Adicione um comentário..."
              />

              <div className="mt-2">
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
                  desabilitado={enviandoComentario}
                />
              </div>

              <Button
                variante="primario"
                className="mt-2"
                onClick={handleEnviarComentario}
                carregando={enviandoComentario}
                disabled={!novoComentario.trim() || internoBloqueado}
              >
                Enviar Comentário
              </Button>
            </div>

            {/* Lista de comentários.
                Sem rolagem própria: tinha um teto de 600px, herdado de
                quando a página inteira rolava. Com o `<main>` da casca já
                rolando, aquilo dava duas barras verticais coladas e
                prendia a roda do mouse aqui dentro. */}
            <div className="space-y-4">
              {comentarios.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-conteudo-tenue">
                  Nenhum comentário ainda.
                </div>
              ) : (
                comentarios.map((comentario) => {
                  const usuario = usuarios[comentario.usuario_id];

                  // Um fundo SÓ. O cartão carregava dois — o `bg-white/80` da
                  // era pré-paleta e o `bg-superficie/80` que veio substituí-lo
                  // sem que o antigo saísse. Com duas classes de fundo, quem
                  // decide é a ordem do CSS gerado, não a do atributo: venceu o
                  // branco, e no tema escuro o cartão aparecia claro com o nome
                  // ilegível por cima.
                  return (
                    <div
                      key={comentario.id}
                      // O interno ganha a marca na borda E o selo com texto:
                      // a cor sozinha não diz nada a quem não a distingue.
                      className={`rounded-xl border bg-superficie-elevada p-4 ${
                        comentario.is_interno
                          ? 'border-alerta/30 border-l-4 border-l-alerta'
                          : 'border-borda'
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-conteudo">
                            {usuario?.nome || `Usuário #${comentario.usuario_id}`}
                          </span>

                          {usuario && <PapelBadge roleId={usuario.role_id} />}
                          {comentario.is_interno && <SeloInterno />}
                        </div>

                        <span className="whitespace-nowrap text-xs text-conteudo-tenue">
                          {formatarData(comentario.created_at)}
                        </span>
                      </div>

                      <p className="text-sm text-conteudo-suave whitespace-pre-wrap break-words overflow-wrap-anywhere">
                        {comentario.comentario}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Histórico */}
        <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
          <div className="border-b border-borda px-5 py-4">
            <h2 className="text-sm font-semibold text-conteudo">
              Histórico {historico.length > 0 && `(${historico.length})`}
            </h2>
          </div>

          {/* Lista de histórico. Mesma história do bloco de comentários:
              o teto de 500px saiu, quem rola é o `<main>`. */}
          <div className="space-y-3 p-5">
            {historico.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-conteudo-tenue">
                Nenhum histórico registrado.
              </div>
            ) : (
              historico.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 border-l-2
                          border-sinal py-2 pl-4"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-conteudo">
                      {item.acao}
                    </p>

                    {item.descricao && (
                      <p className="text-sm text-conteudo-suave">
                        {item.descricao}
                      </p>
                    )}

                    {item.status_anterior && item.status_novo && (
                      <p className="text-sm text-conteudo-tenue">
                        {limparValorEnum(item.status_anterior)} →{' '}
                        {limparValorEnum(item.status_novo)}
                      </p>
                    )}
                  </div>

                  <span className="whitespace-nowrap text-xs text-conteudo-tenue">
                    {formatarData(item.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Resolução/Fechamento */}
      {mostrarModalResolucao && (
        <Modal
          aberto={mostrarModalResolucao}
          aoFechar={() => {
            setMostrarModalResolucao(false);
            setSolucaoModal("");
          }}
          titulo={
            statusAlvo === StatusEnum.RESOLVIDO
              ? "Resolver Chamado"
              : "Fechar Chamado"
          }
          descricao="Descreva a solução aplicada para este chamado"
          largura="md"
          rodape={
            <>
              <Button
                variante="secundario"
                onClick={() => {
                  setMostrarModalResolucao(false);
                  setSolucaoModal("");
                }}
              >
                Cancelar
              </Button>

              <Button variante="sucesso"
                onClick={handleConfirmarResolucao}
                disabled={
                  validarMinimo(solucaoModal, MINIMO_SOLUCAO, 'Solução') !== null ||
                  operacoesRecusadas.has('resolucao')
                }>
                <IconeConfereCirculo className="h-4 w-4" />
                {statusAlvo === StatusEnum.RESOLVIDO
                  ? "Marcar como Resolvido"
                  : "Fechar Chamado"}
              </Button>
            </>
          }
        >
          {/* O asterisco era um `<span>` solto dentro do rotulo: lido em voz
              alta ele vira "Solucao asterisco", que nao comunica
              obrigatoriedade a ninguem. O `Campo` poe `aria-required` no
              controle, que e onde ela e procurada.
              
              E o rotulo passa a APONTAR para o campo: o <label> nao tinha
              `htmlFor` e o textarea nao tinha `id`, entao clicar no texto
              "Solucao" nao focava nada. */}
          <Campo
            id="solucao-resolucao"
            rotulo="Solução"
            obrigatorio
            dica="É o que alguém vai ler quando o mesmo problema voltar."
          >
            <Textarea
              value={solucaoModal}
              onChange={(e) => setSolucaoModal(e.target.value)}
              rows={6}
              placeholder="Descreva detalhadamente a solução aplicada..."
              className="resize-none"
            />
          </Campo>

          <ContadorMinimo valor={solucaoModal} minimo={MINIMO_SOLUCAO} />

          {falhaDeEscrita?.operacao === 'resolucao' && (
            <AvisoDeFalhaDeEscrita
              falha={falhaDeEscrita.falha}
              aoConferir={conferirChamado}
              className="mt-3"
            />
          )}
        </Modal>
      )}

      {/* Modal de Cancelar Chamado */}
      {mostrarModalCancelar && (
        <Modal
          aberto={mostrarModalCancelar}
          aoFechar={() => {
            setMostrarModalCancelar(false);
            setMotivoCancelamento('');
          }}
          titulo="Cancelar Chamado"
          descricao="Descreva o motivo do cancelamento deste chamado"
          largura="md"
          rodape={
            <>
              <Button
                variante="secundario"
                onClick={() => {
                  setMostrarModalCancelar(false);
                  setMotivoCancelamento('');
                }}
                disabled={processando}
              >
                Não, voltar
              </Button>
              <Button variante="perigo"
                onClick={handleCancelarChamado}
                disabled={
                  processando ||
                  validarMinimo(motivoCancelamento, MINIMO_SOLUCAO, 'Motivo') !== null
                }>
                <IconeProibido className="h-4 w-4" />
                {processando ? 'Cancelando...' : 'Sim, cancelar'}
              </Button>
            </>
          }
        >
          <div className="mb-4 rounded-xl border border-perigo/30 bg-perigo/10 p-4">
            <p className="text-sm text-on-tint-danger">
              Esta ação irá marcar o chamado como cancelado. O chamado não será excluído, mas não aparecerá mais na listagem padrão.
            </p>
          </div>

          {/* Mesmo par do modal de resolver: rotulo que aponta para o campo,
              e obrigatoriedade no controle em vez de num asterisco solto.
              
              O anel de foco era `focus:ring-perigo` aqui e `ring-sinal` nos
              outros — a quinta variacao de anel de campo do projeto. Passa a
              ser `--focus-ring`, como todos: quem navega por teclado nao
              deveria descobrir o assunto do modal pela cor do anel. */}
          <Campo
            id="motivo-cancelamento"
            rotulo="Motivo do Cancelamento"
            obrigatorio
            dica="Fica registrado no chamado como o desfecho dele."
          >
            <Textarea
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              rows={6}
              placeholder="Descreva o motivo pelo qual este chamado está sendo cancelado..."
              className="resize-none"
            />
          </Campo>

          <ContadorMinimo valor={motivoCancelamento} minimo={MINIMO_SOLUCAO} />
        </Modal>
      )}

      {/* Modal de Excluir Chamado.
          A trava é digitar o protocolo. Um "Sim, excluir" simples — o padrão
          dos outros modais desta tela — resolve para ações que se desfazem,
          e nenhuma outra aqui apaga dados. Digitar obriga a ler o que está na
          caixa vermelha, e é impossível de fazer por reflexo. */}
      {mostrarModalExcluir && chamado && (
        <Modal
          aberto={mostrarModalExcluir}
          aoFechar={() => {
            setMostrarModalExcluir(false);
            setConfirmacaoProtocolo('');
          }}
          titulo="Excluir Chamado"
          descricao={`Chamado #${chamado.protocolo}`}
          largura="sm"
          rodape={
            <>
              <Button
                variante="secundario"
                onClick={() => {
                  setMostrarModalExcluir(false);
                  setConfirmacaoProtocolo('');
                }}
                disabled={processando}
              >
                Não, voltar
              </Button>
              <Button variante="perigo"
                onClick={handleExcluirChamado}
                disabled={processando || !protocoloConfere}>
                <IconeApagar className="h-4 w-4" />
                {processando ? 'Excluindo...' : 'Excluir'}
              </Button>
            </>
          }
        >
          {/* Diz o que se perde, não o que a ação se chama. "Esta ação é
              irreversível" é frase de aviso que ninguém lê; nomear os
              comentários e o histórico faz a pessoa pensar no que havia
              ali dentro. */}
          <div className="mb-4 rounded-xl border border-perigo/30 bg-perigo/10 p-4">
            <p className="text-sm text-on-tint-danger">
              O chamado, os {comentarios.length} comentários e as{' '}
              {historico.length} entradas de histórico dele deixam de
              existir. Não há como desfazer, e não há cópia em outro lugar.
            </p>
          </div>

          {/* Este era o unico dos seis que ja tinha `htmlFor` e `id`. O que
              faltava era o contorno: `border-borda` da 1,23:1, e os primitivos
              foram para `--border-control` na Fase 8. */}
          <Campo
            id="confirmacao-protocolo"
            rotulo={
              <>
                Digite <span className="font-mono">{chamado.protocolo}</span> para
                confirmar
              </>
            }
          >
            <Input
              type="text"
              value={confirmacaoProtocolo}
              onChange={(e) => setConfirmacaoProtocolo(e.target.value)}
              autoComplete="off"
              autoFocus
              placeholder={chamado.protocolo}
              className="font-mono"
            />
          </Campo>
        </Modal>
      )}

      {/* Modal de Arquivar/Desarquivar Chamado */}
      {mostrarModalArquivar && (
        <Modal
          aberto={mostrarModalArquivar}
          aoFechar={() => setMostrarModalArquivar(false)}
          titulo={chamado?.arquivado ? 'Desarquivar Chamado' : 'Arquivar Chamado'}
          descricao={
            chamado?.arquivado
              ? 'Este chamado voltará a aparecer na listagem padrão.'
              : 'Este chamado será ocultado da listagem padrão.'
          }
          largura="sm"
          rodape={
            <>
              <Button
                variante="secundario"
                onClick={() => setMostrarModalArquivar(false)}
                disabled={processando}
              >
                Cancelar
              </Button>
              {/* A cor deixa de depender do estado.
                  
                  Era verde para desarquivar e ambar para arquivar, com texto
                  branco cravado — `bg-sucesso` com branco da 2,54:1, e a
                  catraca NAO o via: a classe estava dentro de um literal
                  interpolado, que o scanner exclui de proposito para nao
                  repetir o falso positivo da Fase 7.
                  
                  Agora e `primario` nos dois casos. Arquivar e reversivel — o
                  botao ao lado desarquiva —, entao pela regra do operador nao
                  pede vermelho; e e a acao principal do modal, entao nao pode
                  ser neutra como o Cancelar ao lado, que sumiria contra ela.
                  Quem carrega a diferenca e o rotulo, que ja muda. */}
              <Button
                variante="primario"
                onClick={handleArquivarChamado}
                disabled={processando}
              >
                {chamado?.arquivado ? (
                  <>
                    <IconeDesarquivar className="h-4 w-4" />
                    {processando ? 'Desarquivando...' : 'Sim, desarquivar'}
                  </>
                ) : (
                  <>
                    <IconeArquivar className="h-4 w-4" />
                    {processando ? 'Arquivando...' : 'Sim, arquivar'}
                  </>
                )}
              </Button>
            </>
          }
        >
          <div className={`rounded-xl border p-4 ${chamado?.arquivado ? 'border-sucesso/30 bg-sucesso/10' : 'border-alerta/30 bg-alerta/10'}`}>
            <p className={`text-sm ${chamado?.arquivado ? 'text-on-tint-success' : 'text-on-tint-warning'}`}>
              {chamado?.arquivado
                ? 'O chamado será restaurado e voltará a aparecer na listagem principal.'
                : 'O chamado não será excluído, apenas ocultado da visualização padrão. Você poderá visualizá-lo novamente usando os filtros.'}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ChamadoDetalhes;
