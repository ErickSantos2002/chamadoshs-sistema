/**
 * Normaliza o `detail` que a API devolve em erro.
 *
 * O FastAPI usa dois formatos no mesmo campo:
 *
 *   HTTPException     detail: "Chamado não encontrado"
 *   Erro de validação detail: [{ loc: [...], msg: "...", type: "..." }]
 *
 * O front inteiro trata `detail` como texto — são mais de vinte lugares que
 * fazem `setError(err.response.data.detail)`. Com a lista, o estado recebe um
 * array de objetos e o React quebra ao renderizar ("Objects are not valid as a
 * React child"): tela branca, no lugar de uma mensagem de campo inválido.
 *
 * Por isso a normalização mora no interceptor e não em cada chamada: é o único
 * ponto por onde todas passam, e corrigir caso a caso deixaria o próximo
 * `detail` novo quebrando de novo.
 *
 * O `loc` do Pydantic vem como ["body", "titulo"]; interessa o último item, que
 * é o campo. "body" e "query" não dizem nada a quem está olhando a tela.
 */

interface ErroDeValidacao {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
}

function descreverCampo(loc?: (string | number)[]): string | null {
  if (!loc || loc.length === 0) return null;

  const ultimo = loc[loc.length - 1];
  if (typeof ultimo !== 'string') return null;
  if (ultimo === 'body' || ultimo === 'query' || ultimo === 'path') return null;

  return ultimo;
}

export function normalizarDetalhe(detail: unknown): string | undefined {
  if (detail === null || detail === undefined) return undefined;

  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    const mensagens = (detail as ErroDeValidacao[])
      .map((item) => {
        const msg = typeof item?.msg === 'string' ? item.msg : null;
        if (!msg) return null;

        const campo = descreverCampo(item?.loc);
        return campo ? `${campo}: ${msg}` : msg;
      })
      .filter((m): m is string => m !== null);

    return mensagens.length > 0 ? mensagens.join('; ') : undefined;
  }

  // Objeto inesperado: melhor não mostrar nada e deixar a mensagem padrão de
  // quem chamou aparecer, do que imprimir "[object Object]" na tela.
  return undefined;
}
