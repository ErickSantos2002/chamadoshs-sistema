import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { useQualidade } from '../hooks/useQualidade';
import { chamadosService } from '../services/chamadoshsapi';
import {
  interpretarErroDoAtendimento,
  montarCorpoAtendimento,
  podeAtenderPelaRota,
} from '../lib/atendimento';
import { setorDoChamado } from '../lib/setor';
import {
  MENSAGEM_CONFLITO_DE_VERSAO,
  MENSAGEM_SEM_VERSAO,
  MENSAGEM_VERSAO_AUSENTE,
  ehConflitoDeVersao,
  ehVersaoAusente,
  lerVersao,
  precondicaoDaEscrita,
  versaoAtualDoConflito,
} from '../lib/versao';
import { MINIMO_SOLUCAO, validarMinimo } from '../lib/validacao';
import ContadorMinimo from './ContadorMinimo';
import { Button, RotuloDeCampo, Textarea } from './ui';
import { Chamado, SetorDestinoEnum, StatusDoAtendimento, StatusEnum } from '../types/api';
import type { PropsDeIcone } from './ui/icones';
import { IconeConfereCirculo, IconeDesfazer, IconeIniciar, IconeRelogio } from './ui/icones';

interface AcoesRapidasProps {
  chamado: Chamado;
  /** Recebe o chamado atualizado depois da mudança. */
  aoMudar: (atualizado: Chamado) => void;
  /**
   * O chamado na tela pode estar velho — a API recusou por permissão, por
   * conflito ou porque ele não existe mais. Só no atendimento da Qualidade.
   */
  aoPrecisarRecarregar?: () => void;
}

/**
 * O que dá para fazer a partir de cada status, e com que palavra. É também o
 * mapa de transições da rota de atendimento da Qualidade, que a API guarda
 * idêntico — por isso os dois caminhos usam os mesmos botões.
 */
const TRANSICOES: Partial<
  Record<StatusEnum, Array<{ para: StatusEnum; texto: string; Icone: React.FC<PropsDeIcone> }>>
> = {
  [StatusEnum.ABERTO]: [
    { para: StatusEnum.EM_ANDAMENTO, texto: 'Iniciar atendimento', Icone: IconeIniciar },
  ],
  [StatusEnum.EM_ANDAMENTO]: [
    { para: StatusEnum.AGUARDANDO, texto: 'Aguardando retorno', Icone: IconeRelogio },
    { para: StatusEnum.RESOLVIDO, texto: 'Marcar como resolvido', Icone: IconeConfereCirculo },
  ],
  [StatusEnum.AGUARDANDO]: [
    { para: StatusEnum.EM_ANDAMENTO, texto: 'Retomar atendimento', Icone: IconeIniciar },
    { para: StatusEnum.RESOLVIDO, texto: 'Marcar como resolvido', Icone: IconeConfereCirculo },
  ],
  [StatusEnum.RESOLVIDO]: [
    { para: StatusEnum.EM_ANDAMENTO, texto: 'Reabrir', Icone: IconeDesfazer },
  ],
  [StatusEnum.FECHADO]: [
    { para: StatusEnum.EM_ANDAMENTO, texto: 'Reabrir', Icone: IconeDesfazer },
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
 *
 * ── Dois caminhos, os mesmos botões ───────────────────────────────────
 *
 * Quem atende um chamado da Qualidade em que é o responsável usa a rota
 * restrita (`PATCH /atendimento`), seja qual for o perfil — as condições estão
 * em `podeAtenderPelaRota`. Todo o resto da equipe segue pelo PUT de sempre.
 * Nunca os dois: quando a rota vale, os botões mudam de caminho, e um erro
 * dela nunca é repetido pelo PUT.
 *
 * ── A versão (FE-4) ───────────────────────────────────────────────────
 *
 * Num chamado da Qualidade, os dois caminhos levam a versão do chamado que
 * está NA TELA — é ela que diz em que a pessoa se baseou ao clicar. Se outra
 * pessoa gravou antes, a API recusa com 409 e nada é sobrescrito: a tela
 * relê o chamado, os botões são refeitos a partir dele e ficam travados até
 * a versão nova chegar, e a solução digitada volta no próximo "resolver".
 * Nada é repetido sozinho: a nova tentativa é um clique novo. Sem versão
 * válida (API anterior à 4), a escrita da Qualidade nem sai. A TI segue sem
 * versão nenhuma.
 */
export const AcoesRapidas: React.FC<AcoesRapidasProps> = ({
  chamado,
  aoMudar,
  aoPrecisarRecarregar,
}) => {
  const { user } = useAuth();
  const { verificarQualidade, marcarAtendimentoIndisponivel, marcarQualidadeIndisponivel } =
    useChamados();
  const qualidade = useQualidade(setorDoChamado(chamado).setor === SetorDestinoEnum.QUALIDADE);
  const [resolvendo, setResolvendo] = useState(false);
  const [solucao, setSolucao] = useState('');
  const [salvando, setSalvando] = useState(false);
  // O `disabled` só chega no próximo desenho; dois cliques no mesmo quadro
  // passariam os dois. A trava é síncrona.
  const travado = useRef(false);
  // Depois de um 409 de versão: a versão que a tela precisa ver antes de
  // liberar os botões de novo, e a solução que a pessoa tinha digitado.
  const [esperandoVersao, setEsperandoVersao] = useState<number | null>(null);
  const rascunhoDaSolucao = useRef<string | null>(null);
  const versaoNaTela = lerVersao(chamado);
  const desatualizado = esperandoVersao !== null && (versaoNaTela ?? 0) < esperandoVersao;

  useEffect(() => {
    if (esperandoVersao !== null && versaoNaTela !== null && versaoNaTela >= esperandoVersao) {
      setEsperandoVersao(null);
    }
  }, [esperandoVersao, versaoNaTela]);

  const pelaRota = podeAtenderPelaRota(chamado, user?.id, qualidade);

  // Mudar status pelo PUT é da equipe. A API recusa para o solicitante, e
  // mostrar o botão a ele seria oferecer um 403.
  const podeAgir = pelaRota || user?.role === 'Administrador' || user?.role === 'Tecnico';

  // Cancelado e arquivado saem do fluxo normal: reabrir um deles é decisão que
  // vive na página inteira, junto do motivo e do histórico.
  const disponiveis =
    podeAgir && !chamado.cancelado && !chamado.arquivado
      ? (TRANSICOES[chamado.status] ?? [])
      : [];

  if (!podeAgir || (!disponiveis.length && !resolvendo)) return null;

  /**
   * O erro da rota restrita. O que foi digitado só se perde quando não há
   * mais o que fazer com ele: rota ou Qualidade fora do ar, ou chamado que
   * mudou por baixo. Rede e validação mantêm o passo aberto, sem repetir.
   */
  /**
   * 409 de versão ou 428, nos dois caminhos: nada foi gravado. A solução
   * digitada fica guardada, a tela relê o chamado e, no 409, os botões
   * esperam a versão nova — um botão do estado velho não pode ser clicado.
   */
  const tratarErroDeVersao = (err: unknown, versaoUsada: number | undefined): boolean => {
    const conflito = ehConflitoDeVersao(err);
    if (!conflito && !ehVersaoAusente(err)) return false;
    toast.error(conflito ? MENSAGEM_CONFLITO_DE_VERSAO : MENSAGEM_VERSAO_AUSENTE);
    if (solucao.trim()) rascunhoDaSolucao.current = solucao;
    if (conflito) {
      setEsperandoVersao(versaoAtualDoConflito(err) ?? (versaoUsada ?? 0) + 1);
    }
    setResolvendo(false);
    aoPrecisarRecarregar?.();
    return true;
  };

  const tratarErroDoAtendimento = (err: unknown, versaoUsada: number | undefined) => {
    if (tratarErroDeVersao(err, versaoUsada)) return;
    const { tipo, mensagem, recarregar } = interpretarErroDoAtendimento(err);
    if (mensagem) toast.error(mensagem);

    if (tipo === 'rota-indisponivel') {
      marcarAtendimentoIndisponivel();
      setResolvendo(false);
    } else if (tipo === 'qualidade-indisponivel') {
      marcarQualidadeIndisponivel();
      setResolvendo(false);
    } else if (tipo === 'sem-permissao') {
      // Quem atende pode ter mudado: relê os atendentes, e as ações somem se
      // a pessoa saiu da lista.
      void verificarQualidade();
    }

    if (recarregar) {
      setResolvendo(false);
      aoPrecisarRecarregar?.();
    }
  };

  const aplicar = async (novoStatus: StatusEnum, textoDaSolucao?: string) => {
    if (travado.current || desatualizado) return;
    // A versão do chamado desta tela, lida dele mesmo. Sem versão válida na
    // Qualidade, nada sai — e o que foi digitado continua no passo.
    const precondicao = precondicaoDaEscrita(chamado);
    if (precondicao === null) {
      toast.error(MENSAGEM_SEM_VERSAO);
      return;
    }
    travado.current = true;
    const viaRota = pelaRota;

    try {
      setSalvando(true);
      const atualizado = viaRota
        ? await chamadosService.atender(
            chamado.id,
            montarCorpoAtendimento(
              novoStatus as StatusDoAtendimento,
              textoDaSolucao,
              precondicao.versao_esperada
            )
          )
        : await chamadosService.atualizar(chamado.id, {
            status: novoStatus,
            ...(textoDaSolucao ? { solucao: textoDaSolucao } : {}),
            ...precondicao,
          });

      aoMudar(atualizado);
      setResolvendo(false);
      setSolucao('');
      rascunhoDaSolucao.current = null;
    } catch (err: any) {
      if (viaRota) {
        tratarErroDoAtendimento(err, precondicao.versao_esperada);
      } else if (tratarErroDeVersao(err, precondicao.versao_esperada)) {
        // Já avisado, e a tela relê.
      } else if (err?.response?.status !== 403) {
        // O 403 já é anunciado pelo interceptor; repetir mostraria duas
        // mensagens para o mesmo erro.
        toast.error(err?.response?.data?.detail || 'Não foi possível mudar o status.');
      }
    } finally {
      travado.current = false;
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

  // Um chamado que mudou pode não permitir mais resolver: o passo some, e a
  // solução digitada fica guardada para quando voltar a permitir.
  const podeResolver = disponiveis.some((t) => t.para === StatusEnum.RESOLVIDO);

  if (resolvendo && podeResolver) {
    return (
      <div className="space-y-3">
        {/* Rótulo, campo e contador são UM bloco: o `RotuloDeCampo` já traz a
            própria folga abaixo, e deixá-lo no `space-y` do passo somava duas
            distâncias entre a pergunta e o campo que a responde. */}
        <div>
          <RotuloDeCampo htmlFor="solucao-rapida">Como foi resolvido</RotuloDeCampo>
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
        </div>

        <div className="flex gap-2">
          <Button
            tamanho="sm"
            onClick={confirmarResolucao}
            carregando={salvando}
            disabled={desatualizado}
            className="flex-1"
          >
            <IconeConfereCirculo className="h-4 w-4" aria-hidden="true" />
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
      {desatualizado && (
        <p role="status" className="text-sm text-conteudo-suave">
          Este chamado mudou. Atualizando os dados antes de liberar as ações…
        </p>
      )}
      {disponiveis.map(({ para, texto, Icone }) => (
        <Button
          key={para}
          variante={para === StatusEnum.RESOLVIDO ? 'sucesso' : 'secundario'}
          tamanho="sm"
          disabled={salvando || desatualizado}
          onClick={() =>
            para === StatusEnum.RESOLVIDO
              ? (setSolucao(rascunhoDaSolucao.current ?? chamado.solucao ?? ''), setResolvendo(true))
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
