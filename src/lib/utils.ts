/**
 * Junta nomes de classe, descartando o que for falso.
 *
 * Existe para o padrão que aparece em todo componente com variante:
 *
 *   cn('px-2 py-1', ativo && 'bg-info', { 'opacity-50': desabilitado })
 *
 * Sem isso, a alternativa é template string com ternário aninhado, que é
 * como as telas antigas fazem — e o motivo de várias terem `undefined` ou
 * `false` impressos no meio do `class` do HTML.
 *
 * Escrito à mão de propósito: `clsx` faria o mesmo, mas isto são vinte
 * linhas sem dependência nova, num projeto que acabou de tirar uma
 * dependência externa do caminho crítico.
 *
 * Não resolve conflito entre classes do Tailwind (`p-2` e `p-4` juntas
 * continuam ambas na saída, e vence a que o CSS gerou por último). Quem
 * precisa sobrescrever passa a classe por último E usa a mesma família.
 */
export type ValorDeClasse =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, boolean | null | undefined>
  | ValorDeClasse[];

export function cn(...valores: ValorDeClasse[]): string {
  const partes: string[] = [];

  for (const valor of valores) {
    if (!valor) continue;

    if (typeof valor === 'string' || typeof valor === 'number') {
      partes.push(String(valor));
      continue;
    }

    if (Array.isArray(valor)) {
      const aninhado = cn(...valor);
      if (aninhado) partes.push(aninhado);
      continue;
    }

    if (typeof valor === 'object') {
      for (const [classe, ativo] of Object.entries(valor)) {
        if (ativo) partes.push(classe);
      }
    }
  }

  return partes.join(' ');
}
