import React, { useEffect, useMemo, useState } from 'react';
import { slaConfigsService } from '../../services/chamadoshsapi';
import { PrioridadeEnum, SLAConfig } from '../../types/api';
import { EXPEDIENTE, MINUTOS_POR_DIA_UTIL, formatarPrazo } from '../../lib/prazo';
import { cn } from '../../lib/utils';
import { Aviso, BlocoCarregando, Button, Input, Modal, RotuloDeCampo } from '../ui';
import { PrioridadeBadge } from '../SelosDeChamado';
import { IconeEditar, IconeEscudoConfere, IconeRelogio, IconeSino } from '../ui/icones';

interface SlaTabProps {
  /** Indica se a aba SLA está ativa/visível no momento. */
  ativo: boolean;
}

/**
 * O limiar de atenção é fixo no backend (`PERCENTUAL_ATENCAO = 80` em
 * `sla_service.py`). Aparece aqui porque é a regra que faz o selo amarelo
 * surgir no quadro, e quem configura prazo precisa saber que ela existe — mas
 * está marcado como fixo para a tela não sugerir uma edição que não existe.
 */
const PERCENTUAL_ATENCAO = 80;

const ORDEM: PrioridadeEnum[] = [
  PrioridadeEnum.CRITICA,
  PrioridadeEnum.ALTA,
  PrioridadeEnum.MEDIA,
  PrioridadeEnum.BAIXA,
];

/**
 * A barra usa a cor da prioridade, menos em "Baixa": o cinza do selo some
 * contra o trilho, e como "Baixa" tem o maior prazo a barra fica com a largura
 * toda — o prazo mais folgado aparecia como o único sem barra nenhuma.
 * `conteudo-suave` mantém o tom neutro do selo e ainda contrasta.
 */
const BARRA: Record<PrioridadeEnum, string> = {
  [PrioridadeEnum.CRITICA]: 'bg-perigo',
  [PrioridadeEnum.ALTA]: 'bg-alerta',
  [PrioridadeEnum.MEDIA]: 'bg-info',
  [PrioridadeEnum.BAIXA]: 'bg-conteudo-suave',
};

/** Campo de prazo em minutos, com a leitura humana embaixo. */
const CampoDePrazo: React.FC<{
  id: string;
  rotulo: string;
  valor: number;
  aoMudar: (minutos: number) => void;
}> = ({ id, rotulo, valor, aoMudar }) => (
  <div>
    <RotuloDeCampo htmlFor={id}>{rotulo}</RotuloDeCampo>
    <Input
      id={id}
      type="number"
      min={1}
      value={Number.isFinite(valor) ? valor : ''}
      onChange={(e) => aoMudar(Number(e.target.value))}
    />
    <p className="mt-1 text-xs text-conteudo-tenue">
      {formatarPrazo(valor)} · {MINUTOS_POR_DIA_UTIL} min por dia útil
    </p>
  </div>
);

const SlaTab: React.FC<SlaTabProps> = ({ ativo }) => {
  const [configs, setConfigs] = useState<SLAConfig[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [editando, setEditando] = useState<SLAConfig | null>(null);
  const [rascunho, setRascunho] = useState<SLAConfig | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    try {
      setCarregando(true);
      setConfigs(await slaConfigsService.listar());
      setErro(null);
    } catch {
      setErro('Não foi possível carregar os prazos de SLA.');
    } finally {
      setCarregando(false);
    }
  };

  // Recarrega do servidor sempre que a aba se torna ativa, para descartar
  // qualquer edição não salva ao sair e voltar.
  useEffect(() => {
    if (ativo) carregar();
  }, [ativo]);

  const ordenadas = useMemo(
    () =>
      [...configs].sort(
        (a, b) => ORDEM.indexOf(a.prioridade) - ORDEM.indexOf(b.prioridade)
      ),
    [configs]
  );

  // A barra compara os níveis entre si: o maior prazo ocupa a largura toda, e
  // os outros aparecem proporcionais. É o que deixa visível de relance que
  // "Crítica" está mesmo mais apertada que "Baixa".
  const maiorResolucao = useMemo(
    () => Math.max(1, ...configs.map((c) => c.minutos_resolucao)),
    [configs]
  );

  const abrirEdicao = (config: SLAConfig) => {
    setEditando(config);
    setRascunho({ ...config });
  };

  const fecharEdicao = () => {
    setEditando(null);
    setRascunho(null);
  };

  const salvar = async () => {
    if (!rascunho) return;

    if (rascunho.minutos_resposta < 1 || rascunho.minutos_resolucao < 1) {
      setErro('Os prazos precisam ser de pelo menos 1 minuto.');
      return;
    }

    // Responder depois de resolver não descreve atendimento nenhum, e o
    // backend aceitaria sem reclamar.
    if (rascunho.minutos_resposta > rascunho.minutos_resolucao) {
      setErro('O prazo de resposta não pode ser maior que o de resolução.');
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      const atualizada = await slaConfigsService.atualizar(rascunho.prioridade, {
        minutos_resposta: rascunho.minutos_resposta,
        minutos_resolucao: rascunho.minutos_resolucao,
      });

      setConfigs((atuais) =>
        atuais.map((c) => (c.prioridade === atualizada.prioridade ? atualizada : c))
      );
      fecharEdicao();
    } catch (err: any) {
      setErro(err?.response?.data?.detail || 'Não foi possível salvar o prazo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-5 p-6">
      <div className="shrink-0">
        <h2 className="text-sm font-semibold text-conteudo">Prazos de SLA</h2>
        <p className="mt-0.5 text-sm text-conteudo-tenue">
          Tempo máximo de primeira resposta e de resolução, por prioridade.
          Contados em horário útil ({EXPEDIENTE}).
        </p>
      </div>

      {erro && (
        <Aviso variante="perigo" className="shrink-0">{erro}</Aviso>
      )}

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
        {carregando ? (
          // Este bloco era SILENCIOSO: o anel tinha `aria-hidden` e não havia
          // texto nenhum ao lado. Quem usa leitor de tela não ouvia "pouco",
          // não ouvia NADA enquanto a região carregava — e não tinha como
          // distinguir sistema trabalhando de sistema travado.
          <BlocoCarregando className="h-48" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
            {ordenadas.map((config, indice) => (
              <div
                key={config.prioridade}
                className={cn(
                  'flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4',
                  indice > 0 && 'border-t border-borda'
                )}
              >
                <div className="w-24 shrink-0">
                  <PrioridadeBadge prioridade={config.prioridade} />
                </div>

                <div className="flex min-w-[10rem] flex-1 flex-col gap-2">
                  <div
                    className="h-1 w-full overflow-hidden rounded-full bg-superficie-elevada"
                    title={`Resolução em ${formatarPrazo(config.minutos_resolucao)}`}
                  >
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-700',
                        BARRA[config.prioridade]
                      )}
                      style={{
                        width: `${(config.minutos_resolucao / maiorResolucao) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span className="flex items-center gap-1.5 text-conteudo">
                      <IconeRelogio className="h-4 w-4 text-conteudo-tenue" aria-hidden="true" />
                      <span className="text-conteudo-tenue">Resposta</span>
                      <strong className="font-semibold">
                        {formatarPrazo(config.minutos_resposta)}
                      </strong>
                    </span>

                    <span className="flex items-center gap-1.5 text-conteudo">
                      <IconeEscudoConfere className="h-4 w-4 text-conteudo-tenue" aria-hidden="true" />
                      <span className="text-conteudo-tenue">Resolução</span>
                      <strong className="font-semibold">
                        {formatarPrazo(config.minutos_resolucao)}
                      </strong>
                    </span>

                    <span className="flex items-center gap-1.5 text-conteudo-tenue">
                      <IconeSino className="h-4 w-4" aria-hidden="true" />
                      Atenção em {PERCENTUAL_ATENCAO}%
                    </span>
                  </div>
                </div>

                <Button
                  variante="secundario"
                  tamanho="sm"
                  onClick={() => abrirEdicao(config)}
                  aria-label={`Editar prazos de ${config.prioridade}`}
                >
                  <IconeEditar className="h-4 w-4" aria-hidden="true" />
                  Editar
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
          <div className="border-b border-borda px-5 py-4">
            <h3 className="text-sm font-semibold text-conteudo">Como o prazo é contado</h3>
          </div>
          <dl className="space-y-1.5 p-5 text-sm text-conteudo-suave">
            <div>
              <dt className="inline font-medium text-conteudo">Resposta:</dt>{' '}
              <dd className="inline">
                da abertura até o chamado sair de “Aberto”, ou seja, até alguém assumir.
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-conteudo">Resolução:</dt>{' '}
              <dd className="inline">da abertura até o chamado ser resolvido ou fechado.</dd>
            </div>
            <div>
              <dt className="inline font-medium text-conteudo">Atenção:</dt>{' '}
              <dd className="inline">
                ao consumir {PERCENTUAL_ATENCAO}% do prazo, o chamado passa a aparecer em
                amarelo no quadro. Esse percentual é fixo.
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-conteudo">Pausa:</dt>{' '}
              <dd className="inline">
                o tempo em “Aguardando” não conta. Fora do expediente também não —
                um chamado aberto às 16h50 com prazo de 1h vence às 08h50 do dia
                seguinte.
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <Modal
        aberto={editando !== null}
        aoFechar={fecharEdicao}
        titulo={`Prazos de prioridade ${editando?.prioridade ?? ''}`}
        descricao={`Em minutos úteis · ${EXPEDIENTE}`}
        largura="sm"
      >
        {rascunho && (
          <div className="space-y-4">
            <CampoDePrazo
              id="minutos-resposta"
              rotulo="Primeira resposta"
              valor={rascunho.minutos_resposta}
              aoMudar={(minutos) =>
                setRascunho({ ...rascunho, minutos_resposta: minutos })
              }
            />

            <CampoDePrazo
              id="minutos-resolucao"
              rotulo="Resolução"
              valor={rascunho.minutos_resolucao}
              aoMudar={(minutos) =>
                setRascunho({ ...rascunho, minutos_resolucao: minutos })
              }
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variante="secundario" onClick={fecharEdicao}>
                Cancelar
              </Button>
              <Button onClick={salvar} carregando={salvando}>
                Salvar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SlaTab;
