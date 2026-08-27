import React from 'react';
import { cn } from '../../lib/utils';
import { iniciais } from '../../lib/formato';
import { paletaCategorica } from '../../lib/graficos';
import { useTheme } from '../../context/ThemeContext';

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
 * ── Por que a paleta categórica, e não as cores de significado ────────
 *
 * A versão anterior usava `sucesso`, `alerta` e `perigo` para tingir iniciais.
 * Isso empresta significado a quem não tem: um avatar vermelho não quer dizer
 * que aquela pessoa é um perigo, mas é o que a cor diz em todo o resto do
 * sistema. E as duas cores que faltavam para completar seis eram roxo e
 * turquesa crus, que não acompanhavam tema nenhum.
 *
 * A paleta categórica existe exatamente para isto: identificar sem significar.
 * Ela já foi verificada por contraste e por separação para daltonismo — e a
 * distinção entre pessoas é o mesmo problema que a distinção entre séries.
 *
 * Não há colisão prática com os gráficos: avatar aparece em card e tabela,
 * série aparece dentro de um painel de gráfico, nunca lado a lado.
 */
function indiceDoNome(nome: string, total: number): number {
  let soma = 0;
  for (let i = 0; i < nome.length; i++) {
    soma = (soma + nome.charCodeAt(i)) % 997;
  }
  return soma % total;
}

export const Avatar: React.FC<AvatarProps> = ({ nome, title, className }) => {
  const { darkMode } = useTheme();
  const paleta = paletaCategorica(darkMode);
  const cor = nome ? paleta[indiceDoNome(nome, paleta.length)] : null;

  return (
    <span
      title={title ?? nome ?? 'Sem responsável'}
      // O texto fica na cor da paleta e o fundo é a mesma cor esmaecida: as
      // cores da paleta já passam em 3:1 contra a superfície, e o fundo a 20%
      // não chega perto de comprometer isso.
      style={cor ? { color: cor, backgroundColor: `${cor}33` } : undefined}
      className={cn(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
        'text-[10px] font-medium leading-none',
        !cor && 'bg-superficie-elevada text-conteudo-tenue',
        className
      )}
    >
      {iniciais(nome)}
    </span>
  );
};

export default Avatar;
