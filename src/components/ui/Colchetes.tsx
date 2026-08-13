import React from 'react';
import { cn } from '../../lib/utils';

interface ColchetesProps {
  /**
   * `estrutura` (padrão) — traço discreto, para painel que fica aberto o dia
   * inteiro e não deve competir com o conteúdo.
   *
   * `sinal` — na cor da marca, para a tela que a pessoa vê por cinco segundos
   * e onde o motivo precisa se apresentar. Em volume baixo ele desaparece:
   * na cor de estrutura o colchete dá 2,47:1 contra o painel, o que basta
   * para um canto de card e não basta para carregar a identidade de uma tela.
   */
  variante?: 'estrutura' | 'sinal';
  /** Comprimento do traço. */
  tamanho?: 'sm' | 'md';
  /** Acende os quatro na entrada, uma vez. */
  animado?: boolean;
}

/**
 * Os quatro colchetes de canto do painel.
 *
 * É o motivo que atravessa todas as telas e liga o sistema à tela de login.
 * Traço de 1px, sem brilho constante: o login dura cinco segundos e pode se
 * dar ao luxo de uma entrada; o quadro de chamados fica aberto oito horas, e
 * o que pisca nele vira irritação por volta das dez da manhã.
 *
 * Só entra em PAINEL — modal, coluna, seção. Se cada card pequeno tiver os
 * seus, um painel com oito cards vira trinta e dois riscos e o traço deixa de
 * significar "isto é uma superfície" para virar textura.
 *
 * Puramente decorativo: `aria-hidden` porque não há o que anunciar, e
 * `pointer-events-none` para não roubar clique da borda do painel. Exige que
 * o elemento pai tenha `relative`.
 */
export const Colchetes: React.FC<ColchetesProps> = ({
  variante = 'estrutura',
  tamanho = 'sm',
  animado = false,
}) => {
  const base = cn(
    'pointer-events-none absolute',
    tamanho === 'sm' ? 'h-3 w-3' : 'h-4 w-4',
    variante === 'sinal' ? 'border-sinal' : 'border-borda-forte',
    animado && 'animate-acender'
  );

  return (
    <>
      <span aria-hidden="true" className={cn(base, '-left-px -top-px border-l border-t')} />
      <span aria-hidden="true" className={cn(base, '-right-px -top-px border-r border-t')} />
      <span aria-hidden="true" className={cn(base, '-bottom-px -left-px border-b border-l')} />
      <span aria-hidden="true" className={cn(base, '-bottom-px -right-px border-b border-r')} />
    </>
  );
};

export default Colchetes;
