import { useEffect } from 'react';
import { useChamados } from './useChamados';
import type { EstadoDaQualidade } from '../context/ChamadosContext';

/**
 * O estado da Qualidade para quem mostra um chamado.
 *
 * `ativo` é "este chamado é da Qualidade". Só com ele a verificação sai: um
 * chamado da TI nunca faz o front sondar a API, e numa API sem a Qualidade
 * nada muda para quem só abre chamados da TI.
 */
export function useQualidade(ativo: boolean): EstadoDaQualidade {
  const { qualidade, verificarQualidade } = useChamados();

  useEffect(() => {
    if (ativo) void verificarQualidade();
  }, [ativo, verificarQualidade]);

  return qualidade;
}
