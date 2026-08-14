import React from 'react';

/**
 * Os ícones do sistema, desenhados aqui.
 *
 * Antes vinham de um pacote. Um conjunto pronto resolve rápido e cobra o preço
 * de todo mundo usar o mesmo — a interface passa a parecer montada com peças de
 * catálogo, e não desenhada para esta casa. São poucos ícones, e cada um é meia
 * dúzia de coordenadas.
 *
 * Todos herdam `currentColor` e o tamanho vem da classe de quem usa, então o
 * ícone acompanha a cor do texto ao redor sem ninguém sincronizar nada.
 */

export interface PropsDeIcone {
  className?: string;
}

/**
 * Base comum: o traço.
 *
 * Espessura, ponta e junção arredondadas ficam num lugar só. Repetidas em cada
 * ícone, bastaria um esquecimento para um deles sair com a ponta reta e
 * destoar sem que ninguém soubesse dizer por quê.
 */
const Traco: React.FC<PropsDeIcone & { children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

/** Seta para baixo. Abre lista. */
export const IconeSeta: React.FC<PropsDeIcone> = (props) => (
  <Traco {...props}>
    <path d="m6 9 6 6 6-6" />
  </Traco>
);

/** Confere. Marca a opção escolhida. */
export const IconeConfere: React.FC<PropsDeIcone> = (props) => (
  <Traco {...props}>
    <path d="m5 13 4 4L19 7" />
  </Traco>
);
