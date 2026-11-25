import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { prenderTab, primeiroCampoFocavel } from '../../lib/foco';
import { IconeFechar } from './icones';

interface ModalProps {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  /** Rodapé com as ações. Fica fixo enquanto o corpo rola. */
  rodape?: React.ReactNode;
  largura?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Clicar no fundo fecha. **Desligado** por padrão.
   *
   * O padrão é esse porque todo modal deste sistema ou é formulário ou carrega
   * trabalho em andamento, e o clique no fundo é o gesto mais fácil de fazer
   * sem querer que existe numa tela — custava o que a pessoa tinha digitado,
   * sem aviso e sem como recuperar.
   *
   * A prop sobrou para o caso de alguém precisar do comportamento antigo numa
   * janela só de leitura. Hoje ninguém liga, e é bom que continue assim: uma
   * janela que fecha diferente das outras é uma surpresa a cada uso.
   */
  fecharAoClicarFora?: boolean;
}

/**
 * A escada de larguras.
 *
 * Puxada um degrau para baixo, na direção do HelpHS, cuja escada vai de 384px
 * a 768px enquanto esta ia de 448px a 1152px — lado a lado, um diálogo daqui
 * cobria quase a tela e o de lá ocupava metade.
 *
 * Não é a escada do HelpHS ao pé da letra, e o motivo é estrutural: lá o
 * chamado tem PÁGINA de detalhe, e o diálogo mais largo é um formulário
 * simples. Aqui o `ChamadoModal` traz a ficha do chamado em duas colunas
 * dentro de um diálogo, e a 768px do HelpHS as duas colunas se espremem. O
 * topo continua largo por necessidade; o resto desceu.
 */
const LARGURAS = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

/**
 * Modal.
 *
 * O que ele resolve além de aparecer por cima:
 *
 * - Esc fecha. É o primeiro reflexo de quem usa teclado, e sem isso a única
 *   saída é achar o X com o mouse.
 * - O foco vai para dentro ao abrir e volta para quem abriu ao fechar. Sem
 *   isso o Tab continua andando pela página atrás do modal.
 * - O corpo da página para de rolar enquanto está aberto, senão a rolagem do
 *   mouse "atravessa" o modal.
 * - Clique no fundo NÃO fecha. Sai pelo X ou pelo Esc, os dois gestos que a
 *   pessoa faz de propósito. Quem quiser o contrário pede
 *   `fecharAoClicarFora`; o `stopPropagation` do painel continua ali para
 *   esse caso.
 *
 * O corpo rola sozinho e o rodapé fica fixo: em formulário longo, o botão de
 * salvar precisa estar sempre visível.
 */
export const Modal: React.FC<ModalProps> = ({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  rodape,
  largura = 'md',
  fecharAoClicarFora = false,
}) => {
  const painelRef = useRef<HTMLDivElement>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);

  /**
   * `aoFechar` guardado numa ref, e NÃO no array de dependências.
   *
   * Quase todos os pais declaram a função no corpo do componente — ela nasce
   * com identidade nova a cada render. Com ela nas dependências, o efeito
   * inteiro era desmontado e remontado a cada tecla digitada dentro do modal:
   * o foco voltava para o começo, e como o começo era o botão de fechar, o
   * cursor pulava para o X depois do primeiro caractere.
   *
   * A ref é atualizada depois de cada render, então o Esc sempre chama a
   * versão mais recente sem que o efeito precise saber disso.
   */
  const aoFecharRef = useRef(aoFechar);
  useEffect(() => {
    aoFecharRef.current = aoFechar;
  });

  useEffect(() => {
    if (!aberto) return;

    focoAnterior.current = document.activeElement as HTMLElement;

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        aoFecharRef.current();
        return;
      }
      // A armadilha que o docblock acima prometia e o código não entregava.
      // Ver a nota longa em `lib/foco.ts`.
      //
      // Com a faixa de sessão alterada na tela (AUTH-01), ela entra no mesmo
      // ciclo: faixa → modal → faixa. Só o modal de cima a recebe — com dois
      // empilhados, cada um tem o seu ouvinte, e o de baixo não disputa.
      const dialogos = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      const deCima = dialogos[dialogos.length - 1] === painelRef.current;
      const faixa = deCima
        ? document.querySelector<HTMLElement>('[data-aviso-de-sessao]')
        : null;
      prenderTab(e, painelRef.current, faixa);
    };

    document.addEventListener('keydown', aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Primeiro CAMPO, não primeiro focável: o botão de fechar vem antes no
    // documento, e abrir um formulário com o foco no X é convidar quem usa
    // teclado a fechá-lo com Enter.
    (primeiroCampoFocavel(painelRef.current) ?? painelRef.current)?.focus();

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
      focoAnterior.current?.focus();
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div
      // `--altura-aviso-de-sessao` só existe enquanto a faixa de sessão
      // alterada está na tela (`AvisoDeSessaoAlterada`, AUTH-01): o modal
      // desce e encolhe o bastante para o cabeçalho, com o X, não ficar
      // debaixo dela. Sem a faixa a variável não existe, e vale o `0px`.
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 pt-[calc(1rem+var(--altura-aviso-de-sessao,0px))] backdrop-blur-sm"
      // `undefined`, e não uma função que não faz nada: sem manipulador, o
      // React não registra o ouvinte no fundo.
      onClick={fecharAoClicarFora ? aoFechar : undefined}
    >
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        // Recebe o foco quando o modal não tem campo nenhum — de confirmação,
        // de leitura. Negativo para entrar por código e não pela ordem do Tab.
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        // Sem altura mínima: o painel encolhe até o tamanho do conteúdo e para
        // de crescer em 92vh. O mínimo de meia tela existia enquanto as ações
        // ficavam junto dos campos, e o vazio sobrava depois delas, no fim.
        // Com o rodapé fixo ele passaria a separar os dois campos de "Nova
        // Categoria" dos botões por meia tela de nada.
        className={cn(
          'relative flex max-h-[calc(92vh-var(--altura-aviso-de-sessao,0px))] w-full flex-col rounded-xl border border-borda bg-superficie shadow-xl',
          LARGURAS[largura]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-borda px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-conteudo">{titulo}</h2>
            {descricao && <p className="mt-0.5 text-sm text-conteudo-tenue">{descricao}</p>}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="rounded-lg p-1 text-conteudo-tenue transition-colors hover:bg-superficie-elevada hover:text-conteudo"
          >
            <IconeFechar className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* `min-h-0` não é enfeite: item de flex nasce com `min-height: auto`,
            o que o impede de encolher abaixo do próprio conteúdo. Sem isto, um
            formulário longo faz este corpo crescer além do `max-h-[92vh]` do
            painel em vez de rolar — e o que sai da tela é o rodapé, ou seja, o
            botão de salvar. O componente promete rodapé fixo com corpo
            rolando, e essa promessa depende desta classe. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {rodape && (
          <div className="flex justify-end gap-2 border-t border-borda px-5 py-3">{rodape}</div>
        )}
      </div>
    </div>
  );
};

export default Modal;
