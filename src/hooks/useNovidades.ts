import { useCallback, useEffect, useState } from 'react';
import {
  CHAVE_VERSAO_VISTA,
  deveAbrirNovidades,
  temNovidadeNaoVista,
} from '../lib/novidades';

/**
 * Controla o aviso "O que há de novo?".
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

    if (deveAbrirNovidades(versaoAtual, vista)) {
      setAberto(true);
      return;
    }

    // Primeira visita: registra a versão em silêncio, para o próximo
    // lançamento ser o primeiro aviso que a pessoa vê. Quem nunca usou o
    // sistema não tem o que comparar.
    if (vista === null && versaoAtual) {
      localStorage.setItem(CHAVE_VERSAO_VISTA, versaoAtual);
      setVersaoVista(versaoAtual);
    }
  }, []);

  /** Fecha e marca como visto — some o modal e o ponto do menu. */
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
