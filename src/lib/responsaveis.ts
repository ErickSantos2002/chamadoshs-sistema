/**
 * Quem pode receber um chamado da TI — a lista que a API-9 devolve, e só ela.
 *
 * ── A fonte de verdade é a rota ───────────────────────────────────────
 *
 * Até a FE-4 o seletor era montado aqui: `GET /usuarios/` dos ativos,
 * filtrado por perfil e por conta de serviço. Oferecia quem o PUT recusava —
 * técnico de outro setor, administrador de fora da TI — porque a regra de
 * verdade mora na API (`SETORES_TI_IDS`, `integra_equipe_ti`, `ativo`) e o
 * front não a conhece. Desde a API-9, `GET /chamados/responsaveis-ti` devolve
 * exatamente quem o PUT aceita como NOVO responsável, já filtrado e ordenado.
 *
 * Por isso nada aqui decide elegibilidade. Sem a lista válida não há
 * fallback: nem `GET /usuarios/`, nem o filtro antigo. Uma lista inventada
 * oferece quem a API recusa — que é o defeito que a API-9 veio fechar.
 */
import type { OpcaoDoSeletor } from '../components/ui/Seletor';

export interface ResponsavelTI {
  id: number;
  nome: string;
}

/** A resposta não é a lista do contrato `[{id, nome}]`. */
export class ListaDeResponsaveisInvalida extends Error {
  constructor() {
    super('A lista de responsáveis da TI veio num formato inesperado.');
    this.name = 'ListaDeResponsaveisInvalida';
  }
}

/**
 * Confere o mínimo do contrato e devolve só `id` e `nome`. Qualquer item fora
 * do formato invalida a lista inteira: uma lista pela metade esconderia quem
 * ficou de fora sem dizer que ficou. A ordem é a da API, que já vem por nome.
 */
export function validarResponsaveisTI(dados: unknown): ResponsavelTI[] | null {
  if (!Array.isArray(dados)) return null;
  const vistos = new Set<number>();
  const lista: ResponsavelTI[] = [];
  for (const item of dados) {
    if (!item || typeof item !== 'object') return null;
    const { id, nome } = item as { id?: unknown; nome?: unknown };
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) return null;
    if (typeof nome !== 'string' || nome.trim() === '') return null;
    if (vistos.has(id)) return null;
    vistos.add(id);
    lista.push({ id, nome });
  }
  return lista;
}

export type MotivoDaFalhaDaLista =
  | 'sessao'
  | 'sem-permissao'
  | 'indisponivel'
  | 'incompativel'
  | 'falhou';

export const MENSAGENS_DA_LISTA: Record<Exclude<MotivoDaFalhaDaLista, 'sessao'>, string> = {
  'sem-permissao':
    'Você não tem permissão para ver os responsáveis da TI. O responsável atual foi mantido.',
  indisponivel:
    'A lista de responsáveis da TI não está disponível nesta versão do sistema. O responsável atual foi mantido.',
  incompativel:
    'A lista de responsáveis da TI veio num formato que esta tela não reconhece. O responsável atual foi mantido.',
  falhou:
    'Não foi possível carregar os responsáveis da TI. O responsável atual foi mantido; tente de novo.',
};

/**
 * Por que a lista não veio. Nenhum motivo leva a fallback: todos bloqueiam a
 * escolha de um novo responsável e mantêm o atual.
 *
 * - 401: a sessão acabou; o interceptor global leva ao login.
 * - 403: o interceptor já mostrou o toast; aqui só a mensagem no lugar.
 * - 404/405: a rota não existe nesta API.
 * - 422: API-8 ou anterior — a rota cai em `/chamados/{chamado_id}` e o
 *   `responsaveis-ti` não é um id. É o contrato errado, não um erro do campo.
 * - resposta fora do contrato: incompatível.
 * - 5xx, rede, o resto: falhou.
 */
export function motivoDaFalhaDaLista(erro: unknown): MotivoDaFalhaDaLista {
  if (erro instanceof ListaDeResponsaveisInvalida) return 'incompativel';
  const status = (erro as { response?: { status?: number } } | null)?.response?.status;
  if (status === 401) return 'sessao';
  if (status === 403) return 'sem-permissao';
  if (status === 404 || status === 405) return 'indisponivel';
  if (status === 422) return 'incompativel';
  return 'falhou';
}

export const ROTULO_FORA_DA_EQUIPE = '(fora da equipe)';
export const ROTULO_SEM_ATRIBUICAO = 'Sem atribuição';

/**
 * As opções do seletor de responsável da TI.
 *
 * - "Sem atribuição" primeiro: desatribuir continua permitido.
 * - Depois a lista da API, na ordem dela.
 * - O responsável atual que não está na lista — inativo, de fora da TI, ou
 *   de quem a lista não pôde ser lida — aparece como valor atual com
 *   "(fora da equipe)", DESABILITADO: é informação, não escolha. O id não
 *   muda sozinho, e a ausência na lista não vira "Sem atribuição".
 *
 * `lista` nula é a lista que não veio: só o atual, para continuar visível.
 */
export function opcoesDeResponsavelDaTI(
  lista: ReadonlyArray<ResponsavelTI> | null,
  atualId: number | null | undefined,
  nomeDoAtual: string | null | undefined
): OpcaoDoSeletor[] {
  const opcoes: OpcaoDoSeletor[] = [{ valor: '', rotulo: ROTULO_SEM_ATRIBUICAO }];
  const naLista = lista ?? [];
  const atualEstaNaLista = atualId != null && naLista.some((r) => r.id === atualId);

  if (atualId != null && !atualEstaNaLista) {
    opcoes.push({
      valor: String(atualId),
      rotulo: `${nomeDoAtual || `Usuário #${atualId}`} ${ROTULO_FORA_DA_EQUIPE}`,
      desabilitada: true,
    });
  }

  for (const r of naLista) opcoes.push({ valor: String(r.id), rotulo: r.nome });
  return opcoes;
}

/** O 400 do PUT que recusa o responsável escolhido (API-6, API-9). */
export function ehRecusaDoResponsavel(erro: unknown): boolean {
  const r = (erro as { response?: { status?: number; data?: { detail?: unknown } } } | null)
    ?.response;
  return r?.status === 400 && typeof r.data?.detail === 'string' && /respons|conta de servi/i.test(r.data.detail);
}

/** O `detail` seguro do backend, ou uma mensagem própria. */
export function mensagemDaRecusaDoResponsavel(erro: unknown): string {
  const detalhe = (erro as { response?: { data?: { detail?: unknown } } } | null)?.response?.data
    ?.detail;
  const texto = typeof detalhe === 'string' && detalhe.trim() ? detalhe.trim() : null;
  return `${texto ?? 'O responsável escolhido não pode receber este chamado.'} Nada foi salvo; a lista de responsáveis foi atualizada — escolha de novo.`;
}
