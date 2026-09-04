import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { chamadosService } from '../services/chamadoshsapi';
import { cn } from '../lib/utils';
import { Chamado, StatusEnum } from '../types/api';
import { IconeEstrela } from './ui/icones';

interface AvaliacaoProps {
  chamado: Chamado;
  /** Recebe o chamado atualizado depois de gravar a nota. */
  aoAvaliar?: (atualizado: Chamado) => void;
  /** `sm` para o modal, `md` para a página de detalhe. */
  tamanho?: 'sm' | 'md';
  className?: string;
}

const TAMANHOS = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
};

/**
 * As estrelas de satisfação, e a gravação da nota.
 *
 * ── Por que virou componente ──────────────────────────────────────────
 *
 * Porque agora aparece em dois lugares. A página de detalhe já tinha isto
 * escrito por extenso; repetir no modal criaria a segunda implementação de uma
 * regra de permissão — e foi assim que este projeto acabou com três tabelas de
 * cor de status que discordavam entre si.
 *
 * ── Por que o modal precisa disso ─────────────────────────────────────
 *
 * A avaliação existe desde a primeira versão e quase ninguém usa: 12 de 144
 * chamados nos primeiros nove meses. O motivo não é permissão, é lugar —
 * estava só dentro da página inteira, e o solicitante não tem por que voltar
 * lá depois que o problema acabou. O modal é onde ele já passa.
 *
 * ── Quem pode avaliar ─────────────────────────────────────────────────
 *
 * Só o solicitante, e só depois de resolvido. Técnico e administrador não
 * avaliam no lugar dele: a nota mede a satisfação de quem foi atendido, e nota
 * dada por quem atendeu não mede nada. Reavaliar é permitido — a API
 * sobrescreve —, então quem já deu nota continua vendo estrelas clicáveis.
 */
export const Avaliacao: React.FC<AvaliacaoProps> = ({
  chamado,
  aoAvaliar,
  tamanho = 'sm',
  className,
}) => {
  const { user } = useAuth();
  const [salvando, setSalvando] = useState(false);
  const [sobre, setSobre] = useState<number | null>(null);

  /**
   * A nota em voo, em DOIS lugares, e cada um faz uma coisa.
   *
   * O estado desenha: é ele que desabilita as cinco estrelas e apaga o brilho.
   * A REF trava: é ela que impede a segunda chamada.
   *
   * Precisa dos dois pelo mesmo motivo do reset de senha da `UsuariosTab`:
   * `setSalvando(true)` não atualiza `salvando` no mesmo tique, e o `disabled`
   * só chega ao DOM no render seguinte. Um duplo clique de mouse são dois
   * eventos em milissegundos, antes de qualquer pintura — os dois liam `false`
   * e os dois passavam.
   *
   * Aqui a consequência é pior que lá. Duas gravações partem em paralelo, nada
   * garante a ordem, e **quem vence é a última RESPOSTA a chegar, não o último
   * clique**: dá para clicar 5, mudar para 4, e ficar com 5 registrado. A nota
   * gravada deixa de ser a que a pessoa deu.
   */
  const notaEmVoo = useRef(false);

  /**
   * Descarte de resposta superada.
   *
   * O caminho real é a resposta que chega DEPOIS que o componente saiu da
   * tela: a avaliação aparece dentro do `ChamadoModal`, e fechar a janela com
   * a gravação em voo é trivial. Sem esta marca, o `aoAvaliar` do pai e o
   * `toast` disparam para uma tela que a pessoa já deixou.
   *
   * ── Por que NÃO há um contador de sequência aqui ─────────────────────
   *
   * Foi a primeira ideia, e ela é inerte. Dentro de uma montagem a trava
   * acima garante que só existe uma requisição em voo, então dois números de
   * sequência nunca convivem. Entre montagens, o fechamento antigo segura as
   * refs ANTIGAS — e a `montado` delas já é `false`, então quem pega o caso é
   * esta marca, e o contador nunca chegaria a divergir.
   *
   * Fica escrito porque a linha pareceria uma proteção a mais, e não é: seria
   * mais uma engrenagem sem caminho que chega até ela.
   */
  const montado = useRef(true);
  useEffect(() => () => {
    montado.current = false;
  }, []);

  const nota = chamado.avaliacao ?? null;

  const encerrado =
    chamado.status === StatusEnum.RESOLVIDO || chamado.status === StatusEnum.FECHADO;
  const podeAvaliar =
    encerrado && !chamado.cancelado && chamado.solicitante_id === user?.id;

  const salvar = async (valor: number) => {
    // A trava vem ANTES de tudo, e lê a REF e não o estado — ver a nota na
    // declaração. As estrelas desabilitadas são o aviso visual; esta linha é o
    // que de fato impede a segunda gravação.
    if (notaEmVoo.current) return;
    notaEmVoo.current = true;

    try {
      setSalvando(true);

      // Endpoint próprio do solicitante. O PUT usado pelo resto da tela exige
      // perfil de técnico ou administrador e devolvia 403 justamente para quem
      // deveria avaliar.
      const atualizado = await chamadosService.avaliar(chamado.id, valor);

      // A gravação chegou ao fim depois que a tela saiu: não há a quem avisar,
      // e o pai já seguiu adiante.
      if (!montado.current) return;

      aoAvaliar?.(atualizado);
      toast.success('Obrigado pela avaliação!');
    } catch (err: any) {
      // Mesma regra do sucesso: erro de requisição cuja tela já fechou não
      // vira aviso numa tela que a pessoa nem estava olhando.
      if (!montado.current) return;

      const status = err?.response?.status;

      if (status === 409) {
        toast.error('Só é possível avaliar depois que o chamado é resolvido.');
      } else if (status !== 403) {
        // O 403 já é anunciado pelo interceptor do api.ts; avisar de novo aqui
        // mostraria duas mensagens para o mesmo erro.
        toast.error(err?.response?.data?.detail || 'Erro ao salvar avaliação.');
      }
    } finally {
      // A trava solta sempre, inclusive nos dois `return` acima: se o
      // componente voltar, ele precisa aceitar nota de novo. `setSalvando` só
      // corre montado, porque desmontado ele não tem o que desenhar.
      notaEmVoo.current = false;
      if (montado.current) setSalvando(false);
    }
  };

  // Nada a mostrar antes de o chamado encerrar: pedir nota de um atendimento
  // em andamento não faz sentido, e ocupa espaço no modal com uma seção vazia.
  if (!encerrado || chamado.cancelado) return null;

  const estrela = (acesa: boolean) => (
    <IconeEstrela
      className={cn(
        TAMANHOS[tamanho],
        'transition-colors',
        acesa ? 'fill-alerta text-alerta' : 'text-conteudo-tenue'
      )}
      aria-hidden="true"
    />
  );

  if (!podeAvaliar) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        {nota ? (
          <>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n}>{estrela(n <= nota)}</span>
            ))}
            <span className="ml-1 rounded bg-superficie-elevada px-2 py-0.5 text-[11px] text-conteudo-tenue">
              {nota} de 5
            </span>
          </>
        ) : (
          <p className="text-sm text-conteudo-tenue">Aguardando avaliação do solicitante</p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5" onMouseLeave={() => setSobre(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => salvar(n)}
            onMouseEnter={() => setSobre(n)}
            disabled={salvando}
            // O rótulo diz a nota inteira, não "estrela 3": quem usa leitor de
            // tela não vê o preenchimento das anteriores.
            aria-label={`Avaliar com ${n} de 5`}
            className="rounded-lg transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            {estrela(sobre !== null ? n <= sobre : n <= (nota ?? 0))}
          </button>
        ))}

        {nota && (
          <span className="ml-1 rounded bg-superficie-elevada px-2 py-0.5 text-[11px] text-conteudo-tenue">
            {nota} de 5
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-conteudo-tenue">
        {nota
          ? 'Clique nas estrelas para alterar sua avaliação'
          : 'Como foi o atendimento? Sua nota ajuda a melhorar.'}
      </p>
    </div>
  );
};

export default Avaliacao;
