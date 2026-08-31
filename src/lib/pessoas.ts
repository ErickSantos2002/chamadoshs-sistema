import { Chamado, Usuario } from '../types/api';

/**
 * O filtro por pessoa do quadro.
 *
 * A pessoa aqui é o RESPONSÁVEL, não quem abriu. É a pergunta que a equipe faz
 * olhando o quadro — "o que está comigo", "o que sobrou com quem saiu de
 * férias" —, e é a mesma pessoa que o card já mostra na inicial do canto.
 *
 * ── De onde sai a lista ───────────────────────────────────────────────
 *
 * Dos chamados carregados, não do cadastro de usuários. Duas razões:
 *
 *   Uma listagem de usuários traria todo mundo que pode ser responsável,
 *   inclusive quem nunca pegou chamado nenhum — nomes que só devolvem lista
 *   vazia quando escolhidos.
 *
 *   E deixaria de fora quem já saiu da empresa mas ainda aparece como
 *   responsável em chamado antigo: o cadastro devolve só ativos. Esse nome
 *   precisa continuar filtrável enquanto houver chamado no nome dele.
 *
 * O nome vem do índice de usuários, que inclui inativos. Quando ele não tem o
 * id — usuário apagado do banco, índice ainda carregando —, sobra "Usuário
 * #id": é feio, mas é filtrável, e some sozinho quando o índice chega.
 */

/** O valor do "sem responsável" no seletor. Não colide com id nenhum. */
export const SEM_RESPONSAVEL = 'sem';

export interface OpcaoDePessoa {
  valor: string;
  rotulo: string;
}

const nomeDe = (id: number, usuarios: Record<number, Usuario>): string =>
  usuarios[id]?.nome ?? `Usuário #${id}`;

/**
 * As pessoas que aparecem como responsável nos chamados dados, em ordem
 * alfabética, com "Sem responsável" na frente quando existe chamado sem
 * ninguém.
 *
 * "Sem responsável" só entra se houver chamado assim — a opção que devolve
 * lista vazia ensina a não confiar no filtro. Ela vem primeiro de propósito:
 * é a que interessa a quem está distribuindo trabalho, e ordenada pelo nome
 * cairia no meio dos "S".
 */
export function responsaveisDosChamados(
  chamados: Chamado[],
  usuarios: Record<number, Usuario>
): OpcaoDePessoa[] {
  const ids = new Set<number>();
  let temSemResponsavel = false;

  for (const chamado of chamados) {
    if (chamado.tecnico_responsavel_id) {
      ids.add(chamado.tecnico_responsavel_id);
    } else {
      temSemResponsavel = true;
    }
  }

  const pessoas = [...ids]
    .map((id) => ({ valor: String(id), rotulo: nomeDe(id, usuarios) }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));

  return temSemResponsavel
    ? [{ valor: SEM_RESPONSAVEL, rotulo: 'Sem responsável' }, ...pessoas]
    : pessoas;
}

/**
 * O chamado casa com a pessoa escolhida?
 *
 * `''` é "todos" e deixa tudo passar — o filtro desligado não pode esconder
 * chamado.
 */
export function ehDaPessoa(chamado: Chamado, escolhido: string): boolean {
  if (escolhido === '') return true;
  if (escolhido === SEM_RESPONSAVEL) return !chamado.tecnico_responsavel_id;

  return chamado.tecnico_responsavel_id === Number(escolhido);
}
