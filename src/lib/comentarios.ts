import type { Comentario } from '../types/api';

/**
 * Comentários internos (API-8, FE-5).
 *
 * Quem pode criar e ler comentário interno é quem administra: administrador
 * por perfil e a equipe da TI (`podeAdministrar`). A API filtra a lista — quem
 * não pode simplesmente não recebe os internos — e recusa com 403 a criação.
 * O front só decide o que OFERECER; a regra é da API.
 *
 * - O padrão é público. Interno é escolha explícita, a cada comentário.
 * - `is_interno` vai sempre, `true` ou `false`: o campo ausente seria o
 *   padrão do backend, e o padrão do backend não é decisão desta tela.
 * - 403 num interno: nada foi salvo, o texto fica, e NADA vira público
 *   sozinho. Publicar é um clique da pessoa, depois de ler o aviso.
 */

export const MENSAGEM_INTERNO_RECUSADO =
  'O comentário interno não foi enviado: você não tem mais permissão para comentários internos. O texto foi mantido.';

export const MENSAGEM_INTERNO_SEM_CONFIRMACAO =
  'Não foi possível confirmar sua permissão para comentários internos agora. O texto foi mantido e não foi enviado.';

export const DICA_DO_INTERNO = 'Visível só para administradores e para a equipe da TI.';
export const DICA_DO_INTERNO_DA_QUALIDADE =
  'Visível só para administradores e para a equipe da Qualidade.';

/**
 * A dica ao lado da opção. O interno é da equipe do setor do chamado
 * (API-13): no chamado da Qualidade quem o lê é a equipe da Qualidade, e a
 * TI não — a dica única, que dizia "equipe da TI" nos dois setores, prometia
 * o contrário do que a API faz.
 */
export function dicaDoInterno(daQualidade: boolean): string {
  return daQualidade ? DICA_DO_INTERNO_DA_QUALIDADE : DICA_DO_INTERNO;
}

/** O comentário interno foi recusado por permissão. */
export function ehRecusaDoInterno(erro: unknown): boolean {
  if (!erro || typeof erro !== 'object') return false;
  return (erro as { response?: { status?: unknown } }).response?.status === 403;
}

const instante = (valor: string | null | undefined): number => {
  const t = valor ? Date.parse(valor) : NaN;
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
};

/**
 * Do mais antigo ao mais novo.
 *
 * A listagem da API não garante ordem (não há ORDER BY), e com os internos
 * filtrados por quem lê, "a ordem em que vieram" deixa de ser uma ordem
 * confiável. O critério é a data de criação e, no empate (dois comentários no
 * mesmo segundo), o `id` — que é a identidade do comentário e também a `key`
 * da lista. A posição no array nunca entra: ela muda a cada resposta.
 * Data inválida vai para o fim, ainda em ordem de `id`. Não altera a entrada.
 */
export function ordenarComentarios(lista: readonly Comentario[]): Comentario[] {
  return [...lista].sort((a, b) => {
    const diferenca = instante(a.created_at) - instante(b.created_at);
    if (diferenca !== 0 && !Number.isNaN(diferenca)) return diferenca;
    return a.id - b.id;
  });
}
