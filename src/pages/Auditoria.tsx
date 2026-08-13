import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, ScrollText } from 'lucide-react';
import { auditoriaService, FiltroDeAuditoria } from '../services/chamadoshsapi';
import { useAuth } from '../hooks/useAuth';
import { useUsuariosPorId } from '../hooks/useUsuariosPorId';
import { descreverEvento, momentoDoEvento } from '../lib/auditoria';
import { Button, Colchetes, Rotulo, Select } from '../components/ui';
import type { EventoDeAuditoria } from '../types/api';

/** Quantas linhas por página. A API aceita até 500; 50 cabe na tela. */
const POR_PAGINA = 50;

const NOME_DO_ALVO: Record<string, string> = {
  usuario: 'Usuário',
  setor: 'Setor',
};

/**
 * Trilha de auditoria dos cadastros.
 *
 * ── O que esta tela responde, e o que ela não responde ────────────────
 *
 * Ela responde “o que fulano andou fazendo”. O painel dentro do modal de
 * usuário responde a pergunta inversa — “o que fizeram com esta conta”. São
 * perguntas diferentes o bastante para justificarem telas diferentes: a
 * primeira parte de uma pessoa e varre alvos; a segunda parte de um alvo e
 * varre pessoas.
 *
 * ── A coluna `origem` ─────────────────────────────────────────────────
 *
 * Parece detalhe técnico e é o motivo de a tela existir agora. Ela grava a
 * ROTA que produziu o evento, e é o único lugar do sistema capaz de revelar um
 * cliente que ninguém lembrava — um Postman salvo, um script, uma integração.
 * Enquanto só aparecer `PATCH …/desativar`, o front é o único que mexe nos
 * cadastros; se aparecer um `PUT` ou um `DELETE`, existe outro.
 *
 * É exatamente o critério que a API usa para decidir se pode remover as rotas
 * antigas sem quebrar alguém em silêncio.
 */
const Auditoria: React.FC = () => {
  const usuarios = useUsuariosPorId();
  const { user } = useAuth();

  /**
   * A API restringe a trilha de CONTAS a administrador.
   *
   * Para o técnico ela devolve só os eventos de setor quando nenhum alvo é
   * pedido, e recusa com 403 quando `alvo=usuario`. Duas consequências para
   * esta tela, e as duas seriam mentira silenciosa se ignoradas: um filtro
   * chamado "Todos" que traz só metade, e uma opção no seletor que só sabe
   * dar erro.
   */
  const ehAdministrador = user?.role === 'Administrador';

  const [eventos, setEventos] = useState<EventoDeAuditoria[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);
  // Contador que o botão Atualizar incrementa. `buscar` depende dele, então a
  // releitura passa pelo mesmo efeito que já tem a guarda de cancelamento —
  // em vez de um caminho paralelo sem proteção.
  const [recarga, setRecarga] = useState(0);

  const [alvo, setAlvo] = useState<'' | 'usuario' | 'setor'>('');
  const [atorId, setAtorId] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  // Técnico consulta setores explicitamente, em vez de mandar "todos" e receber
  // só metade sem saber.
  const alvoEfetivo: '' | 'usuario' | 'setor' = ehAdministrador ? alvo : 'setor';

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    const filtro: FiltroDeAuditoria = {
      alvo: alvoEfetivo || undefined,
      ator_id: atorId ? Number(atorId) : undefined,
      de: de || undefined,
      ate: ate || undefined,
      skip: pagina * POR_PAGINA,
      limit: POR_PAGINA,
    };

    return auditoriaService.listar(filtro);
    // `recarga` entra nas dependências de propósito: é o que faz o botão
    // Atualizar refazer a busca sem duplicar o caminho.
  }, [alvoEfetivo, atorId, de, ate, pagina, recarga]);

  /**
   * Guarda de cancelamento.
   *
   * Os filtros continuam clicáveis durante a busca, então há como ter duas
   * requisições no ar. Sem esta bandeira, a mais lenta chega por último e
   * sobrescreve a mais nova — o formulário passa a dizer uma coisa e a tabela
   * outra, numa tela cuja função é ser confiável sobre o passado.
   */
  useEffect(() => {
    let atual = true;

    buscar()
      .then((linhas) => {
        if (!atual) return;
        setEventos(linhas);
        setErro(null);
      })
      .catch((err: any) => {
        if (!atual) return;
        setErro(err.response?.data?.detail || 'Não foi possível carregar a trilha.');
        setEventos(null);
      })
      .finally(() => {
        if (atual) setCarregando(false);
      });

    return () => {
      atual = false;
    };
  }, [buscar]);

  /** Trocar filtro volta para a primeira página. */
  const aoFiltrar = (aplicar: () => void) => {
    aplicar();
    setPagina(0);
  };

  const limpar = () => {
    setAlvo('');
    setAtorId('');
    setDe('');
    setAte('');
    setPagina(0);
  };

  const temFiltro = Boolean(alvo || atorId || de || ate);
  // A API devolve exatamente `limit` quando ainda há mais. Uma página curta é o
  // sinal de fim — não existe contagem total, e pedi-la custaria uma segunda
  // varredura das duas tabelas a cada troca de página.
  const talvezTenhaMais = (eventos?.length ?? 0) === POR_PAGINA;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ScrollText className="h-6 w-6 text-conteudo-tenue" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-conteudo">Auditoria de cadastros</h1>
        </div>

        <Button
          variante="secundario"
          onClick={() => setRecarga((n) => n + 1)}
          disabled={carregando}
        >
          <RefreshCw
            className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="relative border border-borda bg-superficie p-4">
        <Colchetes />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Rotulo como="label" htmlFor="alvo" className="mb-1.5 block">
              Tipo de cadastro
            </Rotulo>
            {ehAdministrador ? (
              <Select
                id="alvo"
                value={alvo}
                onChange={(e) =>
                  aoFiltrar(() => setAlvo(e.target.value as '' | 'usuario' | 'setor'))
                }
                className="w-full"
              >
                <option value="">Todos</option>
                <option value="usuario">Usuários</option>
                <option value="setor">Setores</option>
              </Select>
            ) : (
              /* Sem seletor para o técnico, e com o motivo dito. Oferecer
                 "Usuários" seria oferecer um 403; oferecer "Todos" seria
                 chamar de todos uma lista que traz só metade. O silêncio
                 pareceria defeito — a frase evita a dúvida. */
              <div className="border border-borda bg-superficie-base px-3 py-2 text-sm text-conteudo">
                Setores
                <span className="mt-0.5 block text-xs text-conteudo-tenue">
                  Eventos de contas de usuário são restritos a administradores.
                </span>
              </div>
            )}
          </div>

          <div>
            <Rotulo como="label" htmlFor="ator" className="mb-1.5 block">
              Quem fez
            </Rotulo>
            <Select
              id="ator"
              value={atorId}
              onChange={(e) => aoFiltrar(() => setAtorId(e.target.value))}
              className="w-full"
            >
              <option value="">Qualquer pessoa</option>
              {Object.values(usuarios)
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
            </Select>
          </div>

          <div>
            <Rotulo como="label" htmlFor="de" className="mb-1.5 block">
              De
            </Rotulo>
            <input
              id="de"
              type="date"
              value={de}
              onChange={(e) => aoFiltrar(() => setDe(e.target.value))}
              className="w-full border border-borda bg-superficie-base px-3 py-2 text-sm text-conteudo
                         transition-colors focus:border-sinal focus:outline-none focus:ring-1 focus:ring-sinal"
            />
          </div>

          <div>
            <Rotulo como="label" htmlFor="ate" className="mb-1.5 block">
              Até
            </Rotulo>
            <input
              id="ate"
              type="date"
              value={ate}
              onChange={(e) => aoFiltrar(() => setAte(e.target.value))}
              className="w-full border border-borda bg-superficie-base px-3 py-2 text-sm text-conteudo
                         transition-colors focus:border-sinal focus:outline-none focus:ring-1 focus:ring-sinal"
            />
          </div>
        </div>

        {temFiltro && (
          <div className="mt-3">
            <Button variante="fantasma" tamanho="sm" onClick={limpar}>
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="relative min-h-0 flex-1 overflow-auto border border-borda bg-superficie">
        <Colchetes />

        {/* O erro é um ESTADO, não um aviso somado aos outros.
            Antes ele era uma faixa acima da lista, e a lista continuava
            desenhando o painel de vazio — a tela dizia "não consegui perguntar"
            e "nada foi registrado" ao mesmo tempo. A segunda é uma afirmação
            sobre o passado da empresa, feita por quem acabou de admitir que não
            sabe. É a confusão que este projeto já pagou uma vez, quando
            `eventos_de_conta` apareceu vazia e foi lida como defeito. */}
        {erro ? (
          <div
            role="alert"
            className="flex items-start gap-2 px-6 py-16 text-sm text-perigo-forte dark:text-perigo-suave"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {erro}
              <span className="mt-1 block text-conteudo-tenue">
                Isto não quer dizer que não há eventos — quer dizer que não foi
                possível consultar.
              </span>
            </span>
          </div>
        ) : carregando && !eventos ? (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-conteudo-tenue">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Carregando a trilha…
          </p>
        ) : !eventos?.length ? (
          /* O vazio precisa dizer QUAL vazio é, e são TRÊS, não dois.
             A primeira versão só distinguia "com filtro" de "sem filtro", e
             presumia estar na página 1. Com exatamente 50 eventos, o botão
             Próxima habilita, a página 2 volta vazia e a tela declarava que a
             trilha nunca registrou nada — logo depois de você ter lido 50
             linhas dela. */
          <div className="px-6 py-16 text-center text-sm text-conteudo-tenue">
            {pagina > 0 ? (
              <>
                Fim da lista.{' '}
                <span className="text-conteudo-suave">
                  Não há mais eventos além dos que você já viu.
                </span>
                <span className="mt-3 block">
                  <Button
                    variante="secundario"
                    tamanho="sm"
                    onClick={() => setPagina((p) => Math.max(0, p - 1))}
                  >
                    Voltar à página anterior
                  </Button>
                </span>
              </>
            ) : temFiltro ? (
              <>
                Nenhum evento neste recorte.{' '}
                <span className="text-conteudo-suave">Tente ampliar o período.</span>
              </>
            ) : (
              <>
                {/* Para o técnico a consulta foi só de setores, então dizer
                    "nenhum evento" afirmaria também sobre o que ele não pode
                    ver. A frase precisa caber no que a pergunta alcançou. */}
                {ehAdministrador
                  ? 'A trilha ainda não registrou nenhum evento.'
                  : 'Nenhum evento de setor registrado.'}{' '}
                <span className="text-conteudo-suave">
                  Ela grava a partir de 13/08/2026 — alterações anteriores a essa data não
                  existem aqui.
                </span>
              </>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-superficie-elevada">
              <tr>
                {['Quando', 'Quem', 'O quê', 'Cadastro', 'Origem'].map((coluna) => (
                  <th
                    key={coluna}
                    className="border-b border-borda px-4 py-2 text-left font-mono text-rotulo uppercase text-conteudo-tenue"
                  >
                    {coluna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {eventos.map((evento) => {
                const { titulo, mudanca, autor } = descreverEvento(evento);
                const momento = momentoDoEvento(evento.created_at);

                return (
                  <tr key={evento.chave} className="border-b border-borda-suave">
                    <td className="whitespace-nowrap px-4 py-2.5 align-top font-mono text-xs text-conteudo-suave">
                      {momento ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 align-top text-conteudo">{autor}</td>
                    <td className="px-4 py-2.5 align-top">
                      <span className="text-conteudo">{titulo}</span>
                      {mudanca && (
                        <span className="mt-0.5 block font-mono text-xs text-conteudo-suave">
                          {mudanca.de} <span className="text-conteudo-tenue">→</span>{' '}
                          {mudanca.para}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <Rotulo>{NOME_DO_ALVO[evento.alvo_tipo] ?? evento.alvo_tipo}</Rotulo>
                      <span className="block text-conteudo">
                        {evento.alvo_nome ?? `#${evento.alvo_id}`}
                      </span>
                    </td>
                    {/* A rota que gravou. É o que denuncia cliente que ninguém
                        lembrava — um PUT ou DELETE aqui significa que algo além
                        do front mexe nos cadastros. */}
                    <td className="px-4 py-2.5 align-top font-mono text-xs text-conteudo-tenue">
                      {evento.origem ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {(pagina > 0 || talvezTenhaMais) && (
        <div className="flex items-center justify-between gap-3">
          <Rotulo>Página {pagina + 1}</Rotulo>
          <div className="flex gap-2">
            <Button
              variante="secundario"
              tamanho="sm"
              onClick={() => setPagina((p) => Math.max(0, p - 1))}
              disabled={pagina === 0 || carregando}
            >
              Anterior
            </Button>
            <Button
              variante="secundario"
              tamanho="sm"
              onClick={() => setPagina((p) => p + 1)}
              disabled={!talvezTenhaMais || carregando}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auditoria;
