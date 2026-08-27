import React from 'react';
import { NOVIDADES, TipoNovidade } from '../data/novidades';
import { Badge, Modal, VarianteBadge } from './ui';

interface NovidadesModalProps {
  aberto: boolean;
  aoFechar: () => void;
  /** Versão em execução, para marcar qual da lista é a atual. */
  versaoAtual: string;
}

const ROTULO: Record<TipoNovidade, string> = {
  novidade: 'Novidade',
  melhoria: 'Melhoria',
  corrigido: 'Corrigido',
};

const VARIANTE: Record<TipoNovidade, VarianteBadge> = {
  novidade: 'info',
  melhoria: 'sucesso',
  corrigido: 'alerta',
};

const formatarData = (iso: string): string => {
  // Data sem hora vira UTC, e no fuso de Brasília isso volta um dia. Montar a
  // partir das partes evita "12/08" virar "11/08" na tela.
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
};

export const NovidadesModal: React.FC<NovidadesModalProps> = ({
  aberto,
  aoFechar,
  versaoAtual,
}) => (
  <Modal
    aberto={aberto}
    aoFechar={aoFechar}
    titulo="O que há de novo?"
    descricao="Mudanças recentes no ChamadosHS"
    largura="md"
  >
    <div className="space-y-5">
      {NOVIDADES.map((versao) => (
        <section key={versao.versao} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-superficie-elevada px-2.5 py-0.5 font-mono text-xs font-semibold text-conteudo">
              v{versao.versao}
            </span>
            <span className="text-xs text-conteudo-tenue">{formatarData(versao.data)}</span>
            {versao.versao === versaoAtual && (
              <Badge variante="sucesso">Versão atual</Badge>
            )}
          </div>

          <ul className="space-y-2">
            {versao.itens.map((item, indice) => (
              <li
                key={indice}
                className="flex flex-col gap-1.5 rounded-lg border border-borda bg-superficie-elevada px-4 py-3 sm:flex-row sm:items-start sm:gap-3"
              >
                <span className="shrink-0">
                  <Badge variante={VARIANTE[item.tipo]}>{ROTULO[item.tipo]}</Badge>
                </span>
                <p className="text-sm leading-relaxed text-conteudo">{item.texto}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  </Modal>
);

export default NovidadesModal;
