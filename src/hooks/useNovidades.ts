import { useCallback, useEffect, useState } from 'react';
import { CHAVE_VERSAO_VISTA, temNovidadeNaoVista } from '../lib/novidades';

/**
 * Controla o aviso "O que há de novo?".
 *
 * Ele NÃO abre sozinho. Já abriu, a cada versão nova, na frente de quem tinha
 * entrado para atender um chamado — e aviso que interrompe é aviso que se
 * aprende a fechar sem ler. O convite passou a ser o ponto ao lado da versão,
 * no rodapé do menu: fica lá, não atrapalha, e quem quiser ler clica.
 *
 * A versão vem do `package.json`, embutida no bundle pelo Vite. Nos testes o
 * `define` não roda, daí o fallback — sem ele, qualquer teste que renderize a
 * casca quebraria com "__VERSAO_APP__ is not defined".
 */
const versaoAtual = typeof __VERSAO_APP__ === 'string' ? __VERSAO_APP__ : '';

export function useNovidades() {
  const [aberto, setAberto] = useState(false);
  const [versaoVista, setVersaoVista] = useState<string | null>(null);

  useEffect(() => {
    const vista = localStorage.getItem(CHAVE_VERSAO_VISTA);
    setVersaoVista(vista);

    // Primeira visita: registra a versão em silêncio, para o próximo
    // lançamento ser o primeiro aviso que a pessoa vê. Quem nunca usou o
    // sistema não tem o que comparar.
    if (vista === null && versaoAtual) {
      localStorage.setItem(CHAVE_VERSAO_VISTA, versaoAtual);
      setVersaoVista(versaoAtual);
    }
  }, []);

  /** Fecha e marca como visto — some o modal e o ponto ao lado da versão. */
  const fechar = useCallback(() => {
    setAberto(false);
    if (versaoAtual) {
      localStorage.setItem(CHAVE_VERSAO_VISTA, versaoAtual);
      setVersaoVista(versaoAtual);
    }
  }, []);

  const abrir = useCallback(() => setAberto(true), []);

  return {
    aberto,
    abrir,
    fechar,
    versaoAtual,
    temNovidade: temNovidadeNaoVista(versaoAtual, versaoVista),
  };
}
