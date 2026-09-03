import React from 'react';

export type VarianteColchetes = 'estrutura' | 'sinal';
export type TamanhoColchetes = 'sm' | 'md';

interface ColchetesProps {
  /**
   * `estrutura` usa `--border-strong`; `sinal` usa o degrau 500 da rampa
   * primária. `sinal` é para a tela de login, e só.
   */
  variante?: VarianteColchetes;
  /** `sm` 12px de braço, `md` 16px. */
  tamanho?: TamanhoColchetes;
}

/**
 * Os quatro colchetes de canto — o motivo gráfico do ChamadosHS.
 *
 * Quatro cantos de 1px que marcam uma superfície como PAINEL DE TRABALHO. É a
 * peça que o pacote descreve como "motivo do ChamadosHS": ela não existe no
 * HelpHS, e é uma das cinco coisas que a decisão D2-a preserva aqui como
 * exceção oficial da §8.1.
 *
 * ── Onde pode, e onde não pode ────────────────────────────────────────
 *
 * Só em PAINEL: modal, coluna de quadro, seção, tela de login. O
 * `Colchetes.prompt.md` é explícito no limite, e a razão é aritmética — num
 * painel com oito cards de métrica viram **trinta e dois riscos**, e param de
 * dizer coisa alguma. O motivo funciona porque é raro.
 *
 * ── O pai precisa de `position: relative` ─────────────────────────────
 *
 * Os quatro cantos são absolutos. Sem `relative` no pai, eles se ancoram no
 * ancestral posicionado mais próximo — que costuma ser o `<body>` — e os
 * colchetes aparecem nos cantos da TELA, não do painel. Falha silenciosa e
 * confusa, então está dito aqui e no `prompt`.
 *
 * ── Por que os valores estão em `style`, e não em classe ──────────────
 *
 * É a única peça do kit assim, e é de propósito: o `-1px` de deslocamento
 * precisa casar exatamente com a borda de 1px do painel, para o colchete
 * ficar POR CIMA dela e não ao lado. Em classe isso viraria quatro conjuntos
 * de valores arbitrários (`-left-px -top-px border-l border-t`…) escritos
 * quatro vezes, e o Tailwind não tem como garantir que os quatro continuem
 * iguais. Aqui a diferença entre os cantos é uma linha cada, e o resto é o
 * mesmo objeto.
 *
 * É também o que o `Colchetes.jsx` do pacote faz — mesmos números, mesma
 * estrutura de quatro `<span aria-hidden>`.
 *
 * ── `aria-hidden` nos quatro ──────────────────────────────────────────
 *
 * São decoração pura: não carregam informação que o texto do painel já não
 * dê. Um leitor de tela anunciando quatro elementos vazios por painel seria
 * ruído puro.
 */
export const Colchetes: React.FC<ColchetesProps> = ({
  variante = 'estrutura',
  tamanho = 'sm',
}) => {
  const px = tamanho === 'sm' ? 12 : 16;
  const cor =
    variante === 'sinal'
      ? 'var(--color-primary-500)'
      : 'var(--border-strong)';

  const base: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    width: px,
    height: px,
    borderColor: cor,
    borderStyle: 'solid',
    borderWidth: 0,
  };

  return (
    <>
      <span
        aria-hidden="true"
        style={{ ...base, left: -1, top: -1, borderLeftWidth: 1, borderTopWidth: 1 }}
      />
      <span
        aria-hidden="true"
        style={{ ...base, right: -1, top: -1, borderRightWidth: 1, borderTopWidth: 1 }}
      />
      <span
        aria-hidden="true"
        style={{ ...base, left: -1, bottom: -1, borderLeftWidth: 1, borderBottomWidth: 1 }}
      />
      <span
        aria-hidden="true"
        style={{ ...base, right: -1, bottom: -1, borderRightWidth: 1, borderBottomWidth: 1 }}
      />
    </>
  );
};

export default Colchetes;
