import React, { useState } from 'react';
import { Aviso, Button } from './ui';
import type { FalhaDeEscrita } from '../lib/escrita';

/**
 * A falha de uma escrita, dita junto da operação que falhou (FE-5, C3).
 *
 * Fica dentro da página — no lugar da edição, das ações rápidas ou do modal
 * —, e não no lugar dela: o chamado e o que foi digitado continuam à vista.
 *
 * `aoConferir`, quando vem, é a releitura do chamado: o jeito de saber se
 * uma escrita sem resposta entrou antes de repetir. Um clique, nunca
 * automático.
 */
const TITULOS: Record<FalhaDeEscrita['tipo'], string> = {
  validacao: 'A API recusou os dados',
  recusa: 'Operação recusada',
  incerta: 'Resultado não confirmado',
  outra: 'Não foi possível concluir',
};

const AvisoDeFalhaDeEscrita: React.FC<{
  falha: FalhaDeEscrita;
  aoConferir?: () => Promise<void>;
  className?: string;
}> = ({ falha, aoConferir, className }) => {
  const [conferindo, setConferindo] = useState(false);
  const pedeConferencia = aoConferir && (falha.tipo === 'incerta' || falha.tipo === 'recusa');
  return (
    <Aviso
      variante={falha.tipo === 'validacao' ? 'alerta' : 'perigo'}
      titulo={TITULOS[falha.tipo]}
      className={className}
    >
      <span className="block">{falha.mensagem}</span>
      {pedeConferencia && (
        <Button
          variante="secundario"
          tamanho="sm"
          className="mt-2"
          carregando={conferindo}
          disabled={conferindo}
          onClick={async () => {
            setConferindo(true);
            try {
              await aoConferir!();
            } finally {
              setConferindo(false);
            }
          }}
        >
          Conferir o chamado
        </Button>
      )}
    </Aviso>
  );
};

export default AvisoDeFalhaDeEscrita;
