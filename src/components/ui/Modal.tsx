import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { primeiroCampoFocavel } from '../../lib/foco';
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
}

const LARGURAS = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
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
 * - Clique no fundo fecha, mas clique dentro não — o `stopPropagation` está no
 *   painel, não no fundo.
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
      if (e.key === 'Escape') aoFecharRef.current();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={aoFechar}
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
          'relative flex max-h-[92vh] w-full flex-col border border-borda bg-superficie shadow-2xl',
          LARGURAS[largura]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-borda px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-conteudo">{titulo}</h2>
            {descricao && <p className="mt-0.5 text-sm text-conteudo-tenue">{descricao}</p>}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="p-1 text-conteudo-tenue transition-colors hover:bg-superficie-elevada hover:text-conteudo"
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
