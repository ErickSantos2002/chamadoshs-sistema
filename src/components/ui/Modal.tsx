import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

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

  useEffect(() => {
    if (!aberto) return;

    focoAnterior.current = document.activeElement as HTMLElement;

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };

    document.addEventListener('keydown', aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Foca o primeiro campo, ou o painel se não houver nenhum.
    const focavel = painelRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])'
    );
    focavel?.focus();

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
      focoAnterior.current?.focus();
    };
  }, [aberto, aoFechar]);

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
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'flex max-h-[92vh] min-h-[50vh] w-full flex-col rounded-xl border border-borda bg-superficie shadow-2xl',
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
            className="rounded-lg p-1 text-conteudo-tenue transition-colors hover:bg-superficie-elevada hover:text-conteudo"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {rodape && (
          <div className="flex justify-end gap-2 border-t border-borda px-5 py-3">{rodape}</div>
        )}
      </div>
    </div>
  );
};

export default Modal;
