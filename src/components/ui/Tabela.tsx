import React from 'react';
import { cn } from '../../lib/utils';
import { IconeSeta, IconeSetaCima } from './icones';

/**
 * A tabela do sistema, nas peças do `Table.jsx` do pacote.
 *
 * ── O que ela resolve ────────────────────────────────────────────────
 *
 * A célula de cabeçalho era a MESMA string escrita em cinco arquivos:
 *
 *     px-4 py-3 text-left text-xs font-medium text-conteudo-suave
 *
 * `CategoriasTab`, `SetoresTab`, `UsuariosTab`, `Auditoria` e
 * `TarefasRecorrentes`. Idênticas hoje, e sem nada que as mantenha assim: a
 * primeira pessoa que ajustar o respiro de uma tabela deixa as outras quatro
 * para trás, e ninguém descobre por leitura.
 *
 * ── `scope="col"` vem de graça, e não vinha ──────────────────────────
 *
 * Nenhuma das seis tabelas do sistema declarava `scope`. Em tabela simples o
 * navegador infere a associação entre célula e cabeçalho, e em tabela larga —
 * a de usuários tem cinco colunas, a da trilha tem seis — a inferência falha
 * e o leitor de tela passa a ler os valores sem dizer de que coluna são.
 * "Ativo · Administrador · 12/08" não diz nada sem o cabeçalho junto.
 *
 * Sendo o cabeçalho um componente, o `scope` deixa de ser algo que alguém
 * precisa lembrar de escrever.
 *
 * ── A rolagem horizontal fica no invólucro ───────────────────────────
 *
 * `Table` embrulha num `div` com `overflow-x: auto`, como o do pacote. Sem
 * isso, uma tabela larga no celular ou numa janela estreita empurra a PÁGINA
 * inteira para o lado — e aí a barra de rolagem horizontal aparece no corpo,
 * não na tabela, e leva a casca junto.
 */

export const Tabela: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className="w-full overflow-x-auto">
    <table className={cn('w-full border-collapse text-left text-sm', className)}>
      {children}
    </table>
  </div>
);

export const TabelaCabecalho: React.FC<{
  children: React.ReactNode;
  /** Fixa o cabeçalho no topo — para tabela dentro de painel que rola. */
  fixo?: boolean;
  className?: string;
}> = ({ children, fixo = false, className }) => (
  <thead
    className={cn(
      'border-b border-borda',
      fixo && 'sticky top-0 bg-superficie-elevada',
      className
    )}
  >
    {children}
  </thead>
);

export const TabelaCorpo: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => <tbody className={className}>{children}</tbody>;

export const TabelaLinha: React.FC<{
  children: React.ReactNode;
  /** Linha que leva a algum lugar: ganha realce e cursor. */
  clicavel?: boolean;
  onClick?: () => void;
  className?: string;
}> = ({ children, clicavel = false, onClick, className }) => (
  <tr
    onClick={onClick}
    className={cn(
      // A régua entre linhas é `--border-muted`, mais fraca que a do cabeçalho:
      // separar linha de linha pede menos peso que separar cabeçalho de corpo,
      // senão a tabela vira uma grade. É a distinção que o `Table.jsx` faz.
      'border-b border-borda-suave last:border-b-0',
      clicavel && 'cursor-pointer transition-colors hover:bg-superficie-elevada',
      className
    )}
  >
    {children}
  </tr>
);

export type DirecaoDeOrdem = 'asc' | 'desc';

export const TabelaCelulaDeCabecalho: React.FC<{
  children: React.ReactNode;
  /** Alinha à direita — para coluna de ações ou de número. */
  aDireita?: boolean;
  /** Torna a coluna ordenável. Sem isto o cabeçalho é texto. */
  aoOrdenar?: () => void;
  /** A direção atual, ou `null` quando a ordem é de outra coluna. */
  ordenadaPor?: DirecaoDeOrdem | null;
  className?: string;
}> = ({ children, aDireita = false, aoOrdenar, ordenadaPor = null, className }) => (
  <th
    // `scope="col"` sempre. É a razão principal de este componente existir:
    // era o que faltava nas seis tabelas do sistema, e é o que amarra cada
    // valor ao nome da coluna para quem não vê a grade.
    scope="col"
    // `aria-sort` só na coluna ordenável, e só uma por tabela pode dizer
    // `ascending`/`descending` — é assim que o leitor de tela anuncia "ordenado
    // por Nome, crescente" em vez de deixar a pessoa adivinhar pela seta.
    //
    // O `Table.jsx` do pacote desenha a seta e NÃO declara `aria-sort`: a
    // ordem existia só para quem vê. Levado à sessão do HelpHS.
    aria-sort={
      aoOrdenar
        ? ordenadaPor === 'asc'
          ? 'ascending'
          : ordenadaPor === 'desc'
            ? 'descending'
            : 'none'
        : undefined
    }
    className={cn(
      'px-4 py-3 text-xs font-medium text-conteudo-suave',
      aDireita ? 'text-right' : 'text-left',
      className
    )}
  >
    {aoOrdenar ? (
      <button
        type="button"
        onClick={aoOrdenar}
        className={cn(
          'flex items-center gap-1 rounded transition-colors hover:text-conteudo',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
          aDireita && 'ml-auto'
        )}
      >
        {children}
        {/* A seta é decorativa: quem não vê recebe a ordem pelo `aria-sort`,
            e anunciar "seta para cima" no meio do nome da coluna atrapalha. */}
        {ordenadaPor === 'asc' && (
          <IconeSetaCima className="h-4 w-4" aria-hidden="true" />
        )}
        {ordenadaPor === 'desc' && (
          <IconeSeta className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    ) : (
      children
    )}
  </th>
);

export const TabelaCelula: React.FC<{
  children: React.ReactNode;
  /** Texto secundário, em `--text-muted`. */
  tenue?: boolean;
  className?: string;
}> = ({ children, tenue = false, className }) => (
  <td
    className={cn(
      'px-4 py-3 text-sm',
      tenue ? 'text-conteudo-tenue' : 'text-conteudo',
      className
    )}
  >
    {children}
  </td>
);

/**
 * A linha de "nada aqui".
 *
 * `colSpan` é obrigatório de propósito: sem ele a célula ocupa uma coluna só e
 * o texto encosta na borda esquerda em vez de centralizar na tabela — que é o
 * defeito que este componente existe para não deixar acontecer de novo.
 */
export const TabelaVazia: React.FC<{
  colunas: number;
  children: React.ReactNode;
}> = ({ colunas, children }) => (
  <tr>
    <td
      colSpan={colunas}
      className="px-4 py-12 text-center text-sm text-conteudo-tenue"
    >
      {children}
    </td>
  </tr>
);

export default Tabela;
