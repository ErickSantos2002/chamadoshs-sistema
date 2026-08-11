import React from 'react';
import { cn } from '../../lib/utils';
import { iniciais } from '../../lib/formato';

interface AvatarProps {
  nome: string | null | undefined;
  /** Texto do title; sem ele, usa o próprio nome. */
  title?: string;
  className?: string;
}

/**
 * Círculo com as iniciais de quem é responsável.
 *
 * A cor sai de um hash do nome, para a mesma pessoa aparecer sempre na mesma
 * cor em toda a interface — é o que permite reconhecer de relance quem está
 * com o chamado sem ler o texto.
 *
 * A paleta é fixa e pequena de propósito: gerar matiz por HSL daria mais
 * variedade, mas produz cores com contraste imprevisível sobre a superfície.
 */
const CORES = [
  'bg-info/20 text-info-forte dark:text-info-suave',
  'bg-sucesso/20 text-sucesso-forte dark:text-sucesso-suave',
  'bg-alerta/20 text-alerta-forte dark:text-alerta-suave',
  'bg-perigo/20 text-perigo-forte dark:text-perigo-suave',
  'bg-purple-500/20 text-purple-700 dark:text-purple-300',
  'bg-teal-500/20 text-teal-700 dark:text-teal-300',
];

function corDoNome(nome: string): string {
  let soma = 0;
  for (let i = 0; i < nome.length; i++) {
    soma = (soma + nome.charCodeAt(i)) % 997;
  }
  return CORES[soma % CORES.length];
}

export const Avatar: React.FC<AvatarProps> = ({ nome, title, className }) => (
  <span
    title={title ?? nome ?? 'Sem responsável'}
    className={cn(
      'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
      'text-[10px] font-bold leading-none',
      nome ? corDoNome(nome) : 'bg-superficie-elevada text-conteudo-tenue',
      className
    )}
  >
    {iniciais(nome)}
  </span>
);

export default Avatar;
