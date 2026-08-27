import React from 'react';
import { INICIO_DA_TRILHA } from '../lib/auditoria';
import { IconeAlerta, IconeCarregando } from './ui/icones';

/**
 * Os três estados intermediários da trilha de auditoria — carregando, falhou,
 * vazia — ditos do mesmo jeito nos dois lugares que a mostram.
 *
 * A tela de Auditoria e o painel de histórico dentro do modal de usuário
 * respondem perguntas inversas ("o que fulano fez" contra "o que fizeram com
 * esta conta"), mas os três estados são os mesmos. Estavam escritos duas vezes,
 * e as cópias já tinham divergido em dois pontos — nenhum cosmético:
 *
 *  - a data em que a trilha começou a gravar era um literal em cada arquivo;
 *  - a frase que separa "não consegui perguntar" de "nada aconteceu" existia só
 *    na tela cheia. No painel, uma falha de rede aparecia como um erro seco
 *    embaixo do título "Histórico da conta", e a leitura mais provável ali é
 *    "esta conta não tem nada" — exatamente a conclusão falsa que já custou uma
 *    investigação neste projeto, quando `eventos_de_conta` apareceu vazia e foi
 *    lida como defeito.
 *
 * A única coisa que muda entre os dois é a folga. Tela inteira tem espaço para
 * respirar; modal não tem.
 */

/** `ampla` ocupa o painel de uma tela; `densa` cabe dentro de um modal. */
export type Folga = 'ampla' | 'densa';

export const TrilhaCarregando: React.FC<{
  folga?: Folga;
  children: React.ReactNode;
}> = ({ folga = 'ampla', children }) => (
  <p
    className={`flex items-center gap-2 text-sm text-conteudo-tenue ${
      folga === 'ampla' ? 'h-48 justify-center' : 'py-6'
    }`}
  >
    <IconeCarregando className="h-4 w-4 animate-spin" aria-hidden="true" />
    {children}
  </p>
);

/**
 * Falha ao consultar — e não uma lista vazia.
 *
 * O erro é um ESTADO, não um aviso somado aos outros: enquanto ele está na
 * tela, nada mais pode aparecer no lugar. Um painel de auditoria que responde
 * "nada aqui" quando na verdade não conseguiu perguntar é pior que um que não
 * existe, porque a resposta parece uma afirmação sobre o passado da empresa.
 */
export const TrilhaComFalha: React.FC<{ mensagem: string; folga?: Folga }> = ({
  mensagem,
  folga = 'ampla',
}) => (
  <div
    role="alert"
    className={`flex gap-2 text-sm text-perigo-forte dark:text-perigo-suave ${
      folga === 'ampla'
        ? 'h-48 items-center justify-center px-6'
        : 'items-start rounded-lg border border-perigo/40 bg-perigo/10 px-3 py-2'
    }`}
  >
    <IconeAlerta className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
    <span>
      {mensagem}
      <span className="mt-1 block text-conteudo-tenue">
        Isto não quer dizer que não há eventos — quer dizer que não foi possível
        consultar.
      </span>
    </span>
  </div>
);

export const TrilhaVazia: React.FC<{
  folga?: Folga;
  children: React.ReactNode;
}> = ({ folga = 'ampla', children }) => (
  <div
    className={`text-sm text-conteudo-tenue ${
      folga === 'ampla' ? 'flex h-48 items-center justify-center px-6 text-center' : 'py-6'
    }`}
  >
    {/* O vazio da tela cheia centraliza um bloco só: sem esta div, cada trecho
        do conteúdo viraria um item do flex e eles se enfileirariam lado a
        lado. */}
    <div>{children}</div>
  </div>
);

/**
 * A ressalva que acompanha todo vazio da trilha.
 *
 * Sem ela, "nenhum evento" é uma afirmação sobre a conta. Com ela, é uma
 * afirmação sobre a janela de tempo que a trilha alcança — que é a única que o
 * sistema pode fazer com honestidade.
 */
export const NotaDoInicioDaTrilha: React.FC = () => (
  <span className="text-conteudo-suave">
    O registro começou em {INICIO_DA_TRILHA} — alterações anteriores a essa data não
    foram gravadas, e não aparecem aqui.
  </span>
);
