import type { EventoDeAuditoria } from '../types/api';

/**
 * Traduz uma linha da trilha de auditoria para o que uma pessoa lê.
 *
 * A API grava `acao` em vocabulário de máquina — `alteracao_de_conta_de_servico`
 * — porque é o que serve para consultar e agrupar. A tela é o outro lado dessa
 * escolha: quem abre o histórico de uma conta quer saber o que aconteceu com
 * ela, não o nome da constante.
 */

/**
 * Os títulos mudam com o alvo, e não só a palavra.
 *
 * A mesma ação `criacao` é "Conta criada" numa linha de usuário e "Setor
 * criado" numa de setor — não dá para montar por concatenação sem errar
 * concordância. Dois mapas explícitos custam menos que um gerador de frase.
 *
 * As chaves são o vocabulário que a API grava; `alvo_tipo` vale `usuario` ou
 * `setor`.
 */
const TITULOS_USUARIO: Record<string, string> = {
  criacao: 'Conta criada',
  desativacao: 'Conta desativada',
  reativacao: 'Conta reativada',
  alteracao_de_nome: 'Nome alterado',
  alteracao_de_perfil: 'Perfil alterado',
  alteracao_de_setor: 'Setor alterado',
  alteracao_de_conta_de_servico: 'Marcação de conta de serviço alterada',
};

const TITULOS_SETOR: Record<string, string> = {
  criacao: 'Setor criado',
  desativacao: 'Setor desativado',
  reativacao: 'Setor reativado',
  alteracao_de_nome: 'Nome alterado',
  alteracao_de_descricao: 'Descrição alterada',
};

/**
 * Explícita por tipo, e vazia para o desconhecido.
 *
 * A primeira versão era `alvoTipo === 'setor' ? SETOR : USUARIO`, ou seja,
 * "tudo que não é setor é pessoa". Enquanto existem dois tipos dá no mesmo — e
 * no dia em que a API gravar um terceiro, ele herdaria em silêncio os títulos
 * de conta. Um evento de categoria apareceria como "Conta criada".
 *
 * Devolvendo vazio, o desconhecido cai em `tituloGenerico` e aparece como o
 * que é. A comparação do `proprio`, mais abaixo, exige `'usuario'` pelo mesmo
 * princípio: só pessoa tem "o próprio".
 */
function tabelaDoAlvo(alvoTipo: string): Record<string, string> {
  if (alvoTipo === 'usuario') return TITULOS_USUARIO;
  if (alvoTipo === 'setor') return TITULOS_SETOR;
  return {};
}

/**
 * Ação desconhecida vira frase legível em vez de sumir ou aparecer crua.
 *
 * A API pode ganhar eventos novos sem que este arquivo saiba — e um painel de
 * auditoria que esconde o que não reconhece é pior que inútil: some justamente
 * o evento novo, que é o mais provável de interessar.
 */
export function tituloGenerico(acao: string): string {
  const texto = acao.replace(/_/g, ' ').trim();
  if (!texto) return 'Evento sem descrição';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export interface EventoDescrito {
  titulo: string;
  /** A mudança em si, quando a linha carrega valores. */
  mudanca?: { de: string; para: string };
  /** Quem fez, já resolvido para "o próprio" quando for o caso. */
  autor: string;
}

/**
 * Descreve um evento.
 *
 * `alvo_id === ator_id` é o que separa "trocou a própria senha" de "teve a
 * senha redefinida por um administrador". São eventos com significados
 * distintos para quem audita — o primeiro é rotina, o segundo é intervenção —
 * e a API os grava com a mesma `acao`, deixando a distinção no par de ids.
 */
export function descreverEvento(evento: EventoDeAuditoria): EventoDescrito {
  // Só faz sentido comparar ator com alvo quando o alvo é uma pessoa. Setor de
  // id 3 e usuário de id 3 existem ao mesmo tempo, e sem esta checagem o
  // evento de um setor cairia em "o próprio usuário" por coincidência de id.
  const proprio = evento.alvo_tipo === 'usuario' && evento.ator_id === evento.alvo_id;

  const titulo =
    evento.acao === 'alteracao_de_senha'
      ? proprio
        ? 'Senha alterada pelo próprio usuário'
        : 'Senha redefinida por administrador'
      : tabelaDoAlvo(evento.alvo_tipo)[evento.acao] ?? tituloGenerico(evento.acao);

  // Só é mudança quando há os dois lados. `valor_novo` sozinho não diz de onde
  // veio, e mostrar "→ Tecnico" sem o antes sugere que antes não havia nada.
  const mudanca =
    evento.valor_anterior != null && evento.valor_novo != null
      ? { de: evento.valor_anterior, para: evento.valor_novo }
      : undefined;

  const autor = proprio ? 'o próprio usuário' : evento.ator_nome ?? 'usuário removido';

  return { titulo, mudanca, autor };
}

/**
 * Data e hora de um evento, no fuso de quem está lendo.
 *
 * Devolve `null` quando a linha não tem data. A coluna é anulável no banco, e
 * inventar "agora" para uma linha sem carimbo seria mentir num painel cuja
 * única função é dizer quando as coisas aconteceram.
 */
export function momentoDoEvento(iso?: string | null): string | null {
  if (!iso) return null;

  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
