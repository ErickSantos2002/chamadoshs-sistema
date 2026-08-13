import { useEffect, useState } from 'react';

/**
 * Um instante que se atualiza sozinho, para textos relativos ficarem vivos.
 *
 * Existe porque "há 12s" precisa virar "há 13s" sem que nada novo aconteça no
 * sistema — o dado não mudou, quem mudou foi o agora. Sem isto, o texto
 * congela no valor calculado na última renderização por outro motivo.
 *
 * Pausa com a aba oculta: ninguém está lendo, e um `setInterval` por segundo
 * em segundo plano é bateria gasta para atualizar um texto invisível. Ao
 * voltar, atualiza na hora — senão o primeiro quadro depois de voltar mostra
 * uma idade de minutos atrás.
 */
export function useRelogio(intervaloMs = 1000): number {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    let timer: number | undefined;

    const parar = () => {
      window.clearInterval(timer);
      timer = undefined;
    };

    const comecar = () => {
      if (timer !== undefined) return;
      setAgora(Date.now());
      timer = window.setInterval(() => setAgora(Date.now()), intervaloMs);
    };

    const aoTrocarVisibilidade = () => {
      if (document.hidden) parar();
      else comecar();
    };

    if (!document.hidden) comecar();
    document.addEventListener('visibilitychange', aoTrocarVisibilidade);

    return () => {
      parar();
      document.removeEventListener('visibilitychange', aoTrocarVisibilidade);
    };
  }, [intervaloMs]);

  return agora;
}

export default useRelogio;
