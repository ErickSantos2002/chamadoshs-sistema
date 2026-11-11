import React from 'react';
import { Button, Seletor } from './ui';
import { opcoesDeResponsavelDaTI } from '../lib/responsaveis';
import type { ListaDeResponsaveisTI } from '../hooks/useResponsaveisTI';

interface SeletorDeResponsavelDaTIProps {
  lista: ListaDeResponsaveisTI;
  /** O responsável gravado agora. */
  atualId: number | null | undefined;
  /** O nome dele, se a tela souber — senão vira "Usuário #id". */
  nomeDoAtual: string | null | undefined;
  /** O valor no campo. Na página é o editado; no modal, o gravado. */
  valor?: number | null;
  ocupado?: boolean;
  aoMudar: (valor: string) => void;
  id?: string;
  /** O nome do campo, como cada tela já o chamava. */
  rotulo?: string;
}

/**
 * O seletor de responsável da TI, na página e no modal — um só, para a regra
 * de "sem lista, sem escolha" não ter duas versões.
 *
 * - Opções: "Sem atribuição", a lista da API-9, e o atual que não está nela
 *   como "(fora da equipe)", desabilitado (`lib/responsaveis`).
 * - Enquanto a lista não chega, ou quando ela falha, o seletor fica travado
 *   no valor atual, e o motivo aparece logo abaixo, como texto — sem toast,
 *   que o interceptor já dá no 403 e que, nos outros casos, sumiria antes de
 *   a pessoa entender por que o campo não abre.
 * - Tentar de novo é um clique. Nada se repete sozinho.
 */
export const SeletorDeResponsavelDaTI: React.FC<SeletorDeResponsavelDaTIProps> = ({
  lista,
  atualId,
  nomeDoAtual,
  valor,
  ocupado = false,
  aoMudar,
  id,
  rotulo = 'Técnico responsável',
}) => {
  const pronta = lista.estado === 'pronta';
  const noCampo = valor === undefined ? atualId : valor;

  return (
    <div className="space-y-1.5">
      <Seletor
        id={id}
        rotulo={rotulo}
        disabled={ocupado || !pronta}
        valor={noCampo ? String(noCampo) : ''}
        aoMudar={aoMudar}
        opcoes={opcoesDeResponsavelDaTI(pronta ? lista.responsaveis : null, atualId, nomeDoAtual)}
      />

      {lista.estado === 'carregando' && (
        <p role="status" className="text-xs text-conteudo-tenue">
          Carregando os responsáveis da TI…
        </p>
      )}

      {pronta && lista.responsaveis.length === 0 && (
        <p role="status" className="text-xs text-conteudo-suave">
          Nenhum responsável da TI está disponível para atribuição agora.
        </p>
      )}

      {lista.estado === 'falhou' && lista.mensagem && (
        <div role="status" className="space-y-1.5">
          <p className="text-xs text-conteudo-suave">{lista.mensagem}</p>
          <Button variante="secundario" tamanho="sm" onClick={() => void lista.recarregar()}>
            Tentar de novo
          </Button>
        </div>
      )}
    </div>
  );
};

export default SeletorDeResponsavelDaTI;
