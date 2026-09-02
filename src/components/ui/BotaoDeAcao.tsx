import React from 'react';
import { cn } from '../../lib/utils';

export type TomDeAcao = 'neutro' | 'info' | 'alerta' | 'sucesso' | 'perigo';

/**
 * A cor entra no HOVER, não no repouso.
 *
 * Uma tabela de cadastros tem quatro ações por linha; com vinte linhas são
 * oitenta glifos coloridos disputando a atenção de quem só queria achar um
 * nome. Em repouso todos ficam no mesmo cinza discreto e o que distingue um do
 * outro é o desenho — olho, lápis, chave, liga-desliga são diferentes o
 * bastante. A cor aparece quando a pessoa aponta, junto do tooltip, que é
 * quando ela de fato pergunta "o que este faz?".
 *
 * Isso também tira a cor do papel de único portador de significado, que ela
 * nunca deveria ter: quem não distingue as cores lê o tooltip igual.
 */
const TONS: Record<TomDeAcao, string> = {
  neutro: 'hover:bg-superficie-elevada hover:text-conteudo',
  info: 'hover:bg-info/10 hover:text-info-forte dark:hover:text-info-suave',
  alerta: 'hover:bg-alerta/10 hover:text-alerta-forte dark:hover:text-alerta-suave',
  sucesso: 'hover:bg-sucesso/10 hover:text-sucesso-forte dark:hover:text-sucesso-suave',
  perigo: 'hover:bg-perigo/10 hover:text-perigo-forte dark:hover:text-perigo-suave',
};

interface BotaoDeAcaoProps {
  /**
   * O que o botão faz, em uma ou duas palavras. Vira o tooltip.
   *
   * Obrigatório de propósito, e é o ponto deste componente. Antes, cada aba de
   * Cadastros escrevia o próprio `<button>` na mão, e o `title` foi esquecido
   * em seis dos onze — quem usa mouse via uma fileira de ícones sem nenhuma
   * explicação. Sendo prop exigida, o compilador não deixa passar: não há
   * botão de ação sem tooltip porque não é possível escrever um.
   */
  titulo: string;
  /**
   * O rótulo para leitor de tela, quando o tooltip é curto demais para servir
   * sozinho. "Desativar" numa tabela de vinte linhas não diz desativar quem —
   * aqui vai "Desativar Maria". Sem isto, cai no `titulo`.
   */
  descricao?: string;
  /** A cor que o botão assume no hover. Neutro quando a ação não altera nada. */
  tom?: TomDeAcao;
  onClick: () => void;
  /** O ícone. Sem classe de cor: ele herda a do botão, que muda no hover. */
  children: React.ReactNode;
}

/**
 * Botão de ação das tabelas de cadastro — um ícone, um tooltip, um tom.
 *
 * Existe porque os onze botões destas telas eram blocos copiados entre três
 * arquivos, e a cópia já tinha divergido: em Usuários, Setores e Categorias, o
 * botão de editar declarava azul no `<button>` e âmbar no ícone. Como a classe
 * do ícone vence, os três renderizavam âmbar — e a fileira inteira saía da
 * mesma cor, indistinguível.
 */
export const BotaoDeAcao: React.FC<BotaoDeAcaoProps> = ({
  titulo,
  descricao,
  tom = 'neutro',
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={titulo}
    aria-label={descricao ?? titulo}
    className={cn(
      'rounded-lg p-2 text-conteudo-tenue transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sinal',
      TONS[tom]
    )}
  >
    {children}
  </button>
);

export default BotaoDeAcao;
