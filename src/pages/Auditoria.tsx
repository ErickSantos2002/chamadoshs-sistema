import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, ScrollText } from 'lucide-react';
import { auditoriaService, FiltroDeAuditoria } from '../services/chamadoshsapi';
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

  const [eventos, setEventos] = useState<EventoDeAuditoria[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);

  const [alvo, setAlvo] = useState<'' | 'usuario' | 'setor'>('');
  const [atorId, setAtorId] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    const filtro: FiltroDeAuditoria = {
      alvo: alvo || undefined,
      ator_id: atorId ? Number(atorId) : undefined,
      de: de || undefined,
      ate: ate || undefined,
      skip: pagina * POR_PAGINA,
      limit: POR_PAGINA,
    };

    try {
      setEventos(await auditoriaService.listar(filtro));
    } catch (err: any) {
      setErro(err.response?.data?.detail || 'Não foi possível carregar a trilha.');
      setEventos(null);
    } finally {
      setCarregando(false);
    }
  }, [alvo, atorId, de, ate, pagina]);

  useEffect(() => {
    buscar();
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

        <Button variante="secundario" onClick={buscar} disabled={carregando}>
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

      {erro && (
        <div
          role="alert"
          className="flex items-start gap-2 border border-perigo/40 bg-perigo/10 px-3 py-2 text-sm text-perigo-forte dark:text-perigo-suave"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {erro}
        </div>
      )}

      {/* Lista */}
      <div className="relative min-h-0 flex-1 overflow-auto border border-borda bg-superficie">
        <Colchetes />

        {carregando && !eventos ? (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-conteudo-tenue">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Carregando a trilha…
          </p>
        ) : !eventos?.length ? (
          /* O vazio precisa dizer QUAL vazio é. Sem filtro, vazio significa que
             a trilha ainda não registrou nada — e não que ninguém mexeu em
             cadastro, porque ela só grava do dia 13/08/2026 em diante. Com
             filtro, significa que o recorte não achou. São conclusões
             diferentes, e confundi-las já custou uma investigação aqui. */
          <div className="px-6 py-16 text-center text-sm text-conteudo-tenue">
            {temFiltro ? (
              <>
                Nenhum evento neste recorte.{' '}
                <span className="text-conteudo-suave">Tente ampliar o período.</span>
              </>
            ) : (
              <>
                A trilha ainda não registrou nenhum evento.{' '}
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
