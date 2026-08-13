import { useEffect, useRef, useState } from 'react';
import { EstadoDoSistema, INTERVALO_MS, consultarSaude } from '../lib/saude';

/**
 * Mantém o estado do sistema atualizado enquanto a tela estiver à vista.
 *
 * ── Por que pausa com a aba oculta ────────────────────────────────────
 *
 * Sem isso, cada aba aberta bate na API uma vez por minuto o dia inteiro por
 * um indicador que ninguém está olhando. Numa equipe com o sistema aberto em
 * segundo plano a manhã toda, isso é tráfego puro contra um endpoint público.
 *
 * Ao voltar para a aba, consulta na hora: o estado guardado pode ter meia hora
 * e mostrar "sistema ativo" sobre um sistema que caiu faz vinte minutos.
 *
 * ── Por que `setTimeout` encadeado, e não `setInterval` ───────────────
 *
 * Com `setInterval`, uma consulta lenta não adia a seguinte — elas se
 * acumulam. Encadeando, a próxima só é marcada quando a anterior termina.
 */
export interface SaudeDoSistema {
  estado: EstadoDoSistema;
  /** Quando a última consulta respondeu. `null` enquanto nenhuma respondeu. */
  verificadoEm: Date | null;
}

export function useSaudeDoSistema(): SaudeDoSistema {
  const [estado, setEstado] = useState<EstadoDoSistema>('verificando');
  const [verificadoEm, setVerificadoEm] = useState<Date | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;

    const agendar = () => {
      timer.current = window.setTimeout(rodar, INTERVALO_MS);
    };

    const rodar = async () => {
      if (document.hidden) {
        // Não consulta escondido, mas continua acordando: assim a retomada
        // não depende só do evento de visibilidade.
        agendar();
        return;
      }

      const resultado = await consultarSaude();

      // A consulta pode terminar depois de a tela sair — atualizar aqui daria
      // aviso de estado em componente desmontado.
      if (!vivo.current) return;

      setEstado(resultado);
      setVerificadoEm(new Date());
      agendar();
    };

    const aoVoltar = () => {
      if (document.hidden) return;
      window.clearTimeout(timer.current);
      rodar();
    };

    rodar();
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      vivo.current = false;
      window.clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, []);

  return { estado, verificadoEm };
}

export default useSaudeDoSistema;
