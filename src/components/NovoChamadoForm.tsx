import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePermissoes } from '../hooks/usePermissoes';
import { ehAdministrador } from '../lib/permissoes';
import { useChamados } from '../hooks/useChamados';
import { slaConfigsService } from '../services/chamadoshsapi';
import {
  Chamado,
  PrioridadeEnum,
  SLAConfig,
  SetorDestinoEnum,
} from '../types/api';
import { EXPEDIENTE, formatarPrazo } from '../lib/prazo';
import { corDaPrioridade } from '../lib/graficos';
import { useTheme } from '../context/ThemeContext';
import {
  Aviso,
  Button,
  Input,
  Rotulo,
  RotuloDeCampo,
  Seletor,
  Textarea,
} from './ui';
import ContadorMinimo from './ContadorMinimo';
import { cn } from '../lib/utils';
import { IconeEscudoConfere, IconeRelogio } from './ui/icones';
import {
  MINIMO_DESCRICAO,
  MINIMO_TITULO,
  validarMinimo,
} from '../lib/validacao';
import {
  DisponibilidadeQualidade,
  MENSAGEM_SEM_ATENDENTES,
  ORIENTACAO_DA_QUALIDADE,
  consultarQualidade,
  interpretarErroDaQualidade,
  montarCorpoQualidade,
  montarCorpoTI,
  validarQualidade,
} from '../lib/qualidade';

interface NovoChamadoFormProps {
  aoCriar: (chamado: Chamado) => void;
  aoCancelar: () => void;
}

const TITULO_MAXIMO = 200;

/**
 * Formulário de abertura de chamado.
 *
 * Vive separado da página porque é usado nos dois lugares: no modal, aberto a
 * partir do quadro, e na rota `/chamados/novo`, que continua existindo para
 * link direto e para telas estreitas, onde modal é pior que página.
 *
 * Os botões ficam dentro do formulário, e não no rodapé do modal, para o
 * "salvando" continuar sendo estado de um lugar só. Levantar esse estado para
 * fora só para o botão morar noutro lugar cria duas fontes de verdade.
 */
export const NovoChamadoForm: React.FC<NovoChamadoFormProps> = ({ aoCriar, aoCancelar }) => {
  const { user } = useAuth();
  const { podeEscolherSolicitante: escolheSolicitante, confirmando, semConfirmacao } =
    usePermissoes();
  const { darkMode } = useTheme();
  const { categorias, usuarios, criarChamado, carregarCategorias, carregarUsuarios } =
    useChamados();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<PrioridadeEnum>(PrioridadeEnum.MEDIA);
  const [categoriaId, setCategoriaId] = useState<number | undefined>();
  const [solicitanteId, setSolicitanteId] = useState<number | undefined>();

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Abrir em nome de outra pessoa é do administrador humano confirmado — a
  // regra da API (`podeEscolherSolicitante`). Técnico, conta de serviço
  // administradora, usuário comum e quem ainda não teve a identidade
  // confirmada abrem para si: a API grava quem abriu, e a tela não oferece uma
  // escolha que ela ignora. O perfil do `localStorage` não decide isto.
  // Só o corpo da TI ainda lê o perfil: `tecnico_responsavel_id`, que a API
  // descarta na abertura (ver `montarCorpoTI`).
  const ehEquipe = user?.role === 'Tecnico' || user?.role === 'Administrador';
  // O administrador pelo perfil cuja condição de pessoa ainda não se sabe
  // (confirmando, ou a confirmação falhou): a escolha não aparece, e a tela
  // diz por quê. A nova tentativa é a do aviso do layout.
  const solicitanteAguardaConfirmacao =
    !escolheSolicitante && ehAdministrador(user) && (confirmando || semConfirmacao);

  // Prazos por prioridade, para quem abre o chamado ver o que a escolha
  // significa. Sem isso a prioridade vira palpite: "Alta" e "Média" são
  // rótulos sem consequência visível até o chamado já estar aberto.
  const [prazos, setPrazos] = useState<SLAConfig[]>([]);

  useEffect(() => {
    carregarCategorias();
    if (escolheSolicitante) carregarUsuarios();
  }, [carregarCategorias, carregarUsuarios, escolheSolicitante]);

  useEffect(() => {
    // Falhar aqui não impede abrir chamado: sem os prazos, o bloco some e o
    // formulário continua funcionando.
    slaConfigsService
      .listar()
      .then(setPrazos)
      .catch(() => setPrazos([]));
  }, []);

  const prazoEscolhido = useMemo(
    () => prazos.find((p) => p.prioridade === prioridade),
    [prazos, prioridade]
  );

  // ── A Qualidade ──────────────────────────────────────────────────────
  //
  // A API decide se ela existe: a consulta de atendentes é a pergunta, e só
  // `disponivel` libera o setor (ver `lib/qualidade`) — sem ninguém que
  // atenda, a Qualidade fica desabilitada com o motivo, e a API recusaria a
  // abertura de todo modo (409).
  //
  // Quem abre não escolhe o responsável (1.9.0): o chamado nasce aguardando
  // atribuição, e a equipe da Qualidade o distribui. O campo saiu, e no lugar
  // dele fica a orientação.
  //
  // O setor de atendimento é escolha de quem abre, e nasce sem nenhum
  // marcado (1.8.0): não há padrão, nem pelo perfil de quem abre, nem pela
  // categoria. Até a escolha, o formulário mostra só ela — os campos dependem
  // do setor. Título e categoria ficam guardados ao trocar de setor: quem
  // volta encontra o que digitou. Só o setor marcado decide o que vai no
  // corpo.
  const [setor, setSetor] = useState<SetorDestinoEnum | null>(null);
  const [disponibilidade, setDisponibilidade] =
    useState<DisponibilidadeQualidade>('verificando');

  const naQualidade = setor === SetorDestinoEnum.QUALIDADE;
  const idDoMotivo = useId();

  // Cada consulta leva um número, e só a última escreve. A corrida existe na
  // mesma instância: no StrictMode o efeito roda, é limpo e roda de novo, e a
  // primeira resposta pode chegar depois da segunda.
  const consulta = useRef(0);

  const consultar = useCallback(async () => {
    const minha = ++consulta.current;
    const resposta = await consultarQualidade();
    if (minha !== consulta.current) return null;
    setDisponibilidade(resposta.estado);
    return resposta;
  }, []);

  useEffect(() => {
    consultar();
    return () => {
      consulta.current++;
    };
  }, [consultar]);

  // A escolha aparece sempre, com a Qualidade desabilitada e o motivo quando
  // a API não a oferece: é obrigatória, e quem já está na Qualidade volta
  // para a TI por ela.
  const qualidadeLiberada = disponibilidade === 'disponivel';
  const motivoQualidade = qualidadeLiberada
    ? null
    : disponibilidade === 'verificando'
      ? 'Verificando se a Qualidade está disponível…'
      : disponibilidade === 'sem-atendentes'
        ? MENSAGEM_SEM_ATENDENTES
        : 'A abertura para a Qualidade está indisponível no momento.';

  const trocarSetor = (novo: SetorDestinoEnum) => {
    setSetor(novo);
    setErro(null);
  };

  const enviarQualidade = async (usuarioId: number) => {
    // Nunca vira TI: sem a Qualidade, o envio dela simplesmente não sai.
    if (!qualidadeLiberada) return;

    const problema = validarQualidade({
      descricao,
      escolheSolicitante,
      solicitanteId,
    });
    if (problema) {
      setErro(problema);
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      const novo = montarCorpoQualidade({
        descricao,
        prioridade,
        solicitante_id: escolheSolicitante ? solicitanteId! : usuarioId,
      });

      aoCriar(await criarChamado(novo));
    } catch (err) {
      console.error('Erro ao criar chamado:', err);
      const { mensagem, recarregarAtendentes, indisponivel } = interpretarErroDaQualidade(err);
      setErro(mensagem);

      if (indisponivel) setDisponibilidade('indisponivel');

      // A Qualidade pode ter ficado sem quem atenda: a consulta refeita
      // desabilita o setor, com o motivo. Nada é reenviado.
      if (recarregarAtendentes) await consultar();
    } finally {
      setSalvando(false);
    }
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setErro('Usuário não autenticado.');
      return;
    }

    if (setor === null) {
      setErro('Escolha o setor de atendimento.');
      return;
    }

    if (naQualidade) {
      await enviarQualidade(user.id);
      return;
    }

    const problema =
      validarMinimo(titulo, MINIMO_TITULO, 'Título') ??
      validarMinimo(descricao, MINIMO_DESCRICAO, 'Descrição');

    if (problema) {
      setErro(problema);
      return;
    }

    if (escolheSolicitante && !solicitanteId) {
      setErro('Selecione o solicitante.');
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      const novo = montarCorpoTI({
        ehEquipe,
        escolheSolicitante,
        usuarioId: user.id,
        solicitanteId,
        titulo,
        descricao,
        prioridade,
        categoriaId,
      });

      aoCriar(await criarChamado(novo));
    } catch (err: any) {
      console.error('Erro ao criar chamado:', err);
      setErro(err.response?.data?.detail || 'Erro ao criar chamado. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };


  return (
    <form onSubmit={enviar} className="space-y-4">
      {erro && (
        <Aviso variante="perigo">{erro}</Aviso>
      )}

      {/* Rádio nativo, e não o `Seletor`: são duas opções sempre à vista, e o
          grupo de mesmo `name` já dá as setas do teclado e o anúncio "1 de 2"
          sem nada escrito aqui. O `required` vale para o grupo: o navegador
          barra o envio sem setor, e `enviar` confere de novo. */}
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-conteudo">
          Setor de atendimento{' '}
          <span aria-hidden="true" className="text-on-tint-danger">
            *
          </span>
        </legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {[
            { valor: SetorDestinoEnum.TI, rotulo: 'TI', liberado: true },
            { valor: SetorDestinoEnum.QUALIDADE, rotulo: 'Qualidade', liberado: qualidadeLiberada },
          ].map((opcao) => {
            const marcado = setor === opcao.valor;
            return (
              <label
                key={opcao.valor}
                className={cn(
                  'inline-flex items-center gap-2 text-sm text-conteudo-suave',
                  opcao.liberado ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                )}
              >
                {/* O desenho é o do `Checkbox`, em círculo: input `peer`
                    escondido, e o anel de foco no que se vê. */}
                <input
                  type="radio"
                  name={`setor-destino${idDoMotivo}`}
                  value={opcao.valor}
                  className="peer sr-only"
                  checked={marcado}
                  required
                  disabled={!opcao.liberado}
                  aria-describedby={
                    !opcao.liberado && motivoQualidade ? idDoMotivo : undefined
                  }
                  onChange={() => trocarSetor(opcao.valor)}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                    marcado ? 'border-sinal' : 'border-borda-control bg-superficie',
                    'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--focus-ring)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-superficie'
                  )}
                >
                  {marcado && <span className="h-2 w-2 rounded-full bg-sinal" />}
                </span>
                {opcao.rotulo}
              </label>
            );
          })}
        </div>
        {motivoQualidade && (
          <p id={idDoMotivo} className="mt-1 text-xs text-conteudo-tenue">
            {motivoQualidade}
          </p>
        )}
        {setor === null && (
          <p className="mt-1 text-xs text-conteudo-tenue">
            Escolha quem vai atender o chamado para preencher o restante.
          </p>
        )}
      </fieldset>

      {setor !== null && (
        <>
          {!naQualidade && (
            <div>
              <RotuloDeCampo htmlFor="titulo" obrigatorio>Título</RotuloDeCampo>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={TITULO_MAXIMO}
                placeholder="Ex: Impressora do financeiro não conecta"
                required
              />
              <ContadorMinimo
                valor={titulo}
                minimo={MINIMO_TITULO}
                maximo={TITULO_MAXIMO}
              />
            </div>
          )}

          <div>
            <RotuloDeCampo htmlFor="descricao" obrigatorio>Descrição</RotuloDeCampo>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={5}
              placeholder="O que aconteceu, desde quando, e o que já foi tentado."
              required
            />
            <ContadorMinimo valor={descricao} minimo={MINIMO_DESCRICAO} />
          </div>

          {escolheSolicitante && (
            <div>
              <RotuloDeCampo htmlFor="solicitante" obrigatorio>Solicitante</RotuloDeCampo>
              {/* A lista mais longa do sistema — trinta e poucos nomes. É onde a
                  busca por digitação do seletor mais vale: digitar "ga" chega em
                  Gabriel sem rolar. O `required` nativo saiu junto com o <select>,
                  e não faz falta: `enviar` já recusa com "Selecione o solicitante". */}
              <Seletor
                id="solicitante"
                rotulo="Solicitante"
                valor={solicitanteId ? String(solicitanteId) : ''}
                aoMudar={(v) => setSolicitanteId(v ? Number(v) : undefined)}
                opcoes={[
                  { valor: '', rotulo: 'Selecione o solicitante' },
                  ...usuarios.map((usuario) => ({
                    valor: String(usuario.id),
                    rotulo: usuario.nome,
                  })),
                ]}
              />
              {/* A dica "Você fica como técnico responsável." saiu: na abertura
                  da TI a API descarta o responsável do corpo, e o chamado nasce
                  sem atribuição — a dica prometia o que não acontece. */}
            </div>
          )}

          {solicitanteAguardaConfirmacao && (
            <p className="text-xs text-conteudo-tenue" role="status">
              A escolha do solicitante aparece quando suas permissões forem confirmadas. Até lá, o
              chamado é aberto em seu nome.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {naQualidade ? (
              // No lugar do campo "Responsável" (até a 1.8.1): quem abre não
              // escolhe mais quem atende. Texto, e não campo desabilitado —
              // não há o que preencher, só o que saber.
              <div>
                <p className="mb-1.5 text-sm font-medium text-conteudo">Responsável</p>
                <p className="rounded-lg border border-borda bg-superficie-elevada px-3 py-2 text-sm text-conteudo-suave">
                  {ORIENTACAO_DA_QUALIDADE}
                </p>
              </div>
            ) : (
              <div>
                <RotuloDeCampo htmlFor="categoria">Categoria</RotuloDeCampo>
                <Seletor
                  id="categoria"
                  rotulo="Categoria"
                  valor={categoriaId ? String(categoriaId) : ''}
                  aoMudar={(v) => setCategoriaId(v ? Number(v) : undefined)}
                  opcoes={[
                    { valor: '', rotulo: 'Sem categoria' },
                    ...categorias.map((categoria) => ({
                      valor: String(categoria.id),
                      rotulo: categoria.nome,
                    })),
                  ]}
                />
              </div>
            )}

            <div>
              <RotuloDeCampo htmlFor="prioridade">Prioridade</RotuloDeCampo>
              {/* A mesma cor que a prioridade tem nos gráficos e nos filtros. */}
              <Seletor
                id="prioridade"
                rotulo="Prioridade"
                valor={prioridade}
                aoMudar={(v) => setPrioridade(v as PrioridadeEnum)}
                opcoes={Object.values(PrioridadeEnum).map((p) => ({
                  valor: p,
                  rotulo: p,
                  cor: corDaPrioridade(p, darkMode),
                }))}
              />
            </div>
          </div>

          {prazoEscolhido && (
            <div className="rounded-xl border border-borda bg-superficie-elevada p-4">
              <Rotulo como="p">
                O que a prioridade {prazoEscolhido.prioridade} compromete
              </Rotulo>

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
                <span className="flex items-center gap-1.5 text-conteudo">
                  <IconeRelogio className="h-4 w-4 text-conteudo-tenue" aria-hidden="true" />
                  <span className="text-conteudo-tenue">Alguém assume em até</span>
                  <strong className="font-semibold">
                    {formatarPrazo(prazoEscolhido.minutos_resposta)}
                  </strong>
                </span>

                <span className="flex items-center gap-1.5 text-conteudo">
                  <IconeEscudoConfere className="h-4 w-4 text-conteudo-tenue" aria-hidden="true" />
                  <span className="text-conteudo-tenue">Resolvido em até</span>
                  <strong className="font-semibold">
                    {formatarPrazo(prazoEscolhido.minutos_resolucao)}
                  </strong>
                </span>
              </div>

              <p className="mt-2 text-xs text-conteudo-tenue">
                Contado em horário útil ({EXPEDIENTE}), descontando o tempo em que o
                chamado ficar aguardando resposta sua.
              </p>
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variante="secundario" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" carregando={salvando} disabled={naQualidade && !qualidadeLiberada}>
          Abrir chamado
        </Button>
      </div>
    </form>
  );
};

export default NovoChamadoForm;
