import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Checkbox } from './Checkbox';
import { Switch } from './Switch';

/**
 * O `Checkbox` e o `Switch`, montados de verdade no jsdom.
 *
 * ── Por que não bastam os testes de forma do `kit.test.tsx` ───────────
 *
 * Aquele arquivo usa `renderToStaticMarkup`, que gera HTML sem montar nada:
 * não roda efeito e não tem DOM. E o defeito mais grave que estes dois
 * componentes podem ter é **invisível no HTML**.
 *
 * `indeterminate` não é atributo: não existe `<input indeterminate>`. Só se
 * marca por PROPRIEDADE, num efeito, com `ref`. Um componente que desenha o
 * traço do estado misto e esquece a propriedade produz um HTML idêntico ao
 * correto — e quem usa leitor de tela ouve "não marcado", que é a informação
 * errada.
 *
 * O `Checkbox.jsx` do pacote tem exatamente esse defeito. O aviso veio da
 * sessão do HelpHS, que tropeçou nele. **O desenho certo com o anúncio errado
 * é pior que não ter o estado, porque parece resolvido** — e é por isso que
 * ele merece um teste que monta de verdade em vez de comparar string.
 */

// React exige esta bandeira para `act` fora de um test renderer. Mesma linha
// que `Seletor.test.tsx` usa, pelo mesmo motivo.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const montar = (no: React.ReactNode) => {
  act(() => root.render(no));
};

const caixa = () => host.querySelector<HTMLInputElement>('input[type="checkbox"]')!;

describe('Checkbox', () => {
  it('o estado misto vai para o DOM, e não só para o desenho', () => {
    montar(
      <Checkbox marcado={false} misto aoMudar={() => {}}>
        Marcar todos
      </Checkbox>
    );

    // A propriedade, que é o que o leitor de tela lê como "mixed".
    expect(caixa().indeterminate).toBe(true);
  });

  it('sai do estado misto quando `misto` deixa de valer', () => {
    montar(
      <Checkbox marcado={false} misto aoMudar={() => {}}>
        Marcar todos
      </Checkbox>
    );
    expect(caixa().indeterminate).toBe(true);

    // O efeito precisa reagir à mudança, e não só rodar na montagem: um
    // "marcar todos" sai do misto assim que a última filha é marcada.
    montar(
      <Checkbox marcado misto={false} aoMudar={() => {}}>
        Marcar todos
      </Checkbox>
    );
    expect(caixa().indeterminate).toBe(false);
    expect(caixa().checked).toBe(true);
  });

  it('o rótulo dá nome ao controle', () => {
    montar(
      <Checkbox marcado={false} aoMudar={() => {}}>
        Conta de serviço
      </Checkbox>
    );

    // O input vive DENTRO do <label>, então o texto do label o nomeia sem
    // precisar de `htmlFor` — é o que permite ao componente não exigir `id`.
    const rotulo = caixa().closest('label');
    expect(rotulo).not.toBeNull();
    expect(rotulo!.textContent).toContain('Conta de serviço');
  });

  it('o input continua no DOM, escondido mas focável', () => {
    montar(
      <Checkbox marcado={false} aoMudar={() => {}}>
        Qualquer coisa
      </Checkbox>
    );

    // `sr-only` esconde do olho e mantém na árvore de acessibilidade e na
    // ordem de foco. `display:none` ou `hidden` tirariam o controle do
    // teclado — que é o erro que este teste existe para impedir.
    expect(caixa().className).toContain('sr-only');
    expect(caixa().hidden).toBe(false);
  });

  it('a caixa desenhada reage ao foco do input', () => {
    montar(
      <Checkbox marcado={false} aoMudar={() => {}}>
        Qualquer coisa
      </Checkbox>
    );

    // O `Checkbox.jsx` do pacote não tem isto: o input escondido recebe foco
    // e nada na tela muda. `peer-focus-visible` é o que devolve o anel.
    const desenho = host.querySelector('span[aria-hidden="true"]')!;
    expect(desenho.className).toContain('peer-focus-visible:ring-2');
    expect(caixa().className).toContain('peer');
  });
});

describe('Switch', () => {
  it('anuncia-se como interruptor, e não como caixa de seleção', () => {
    montar(
      <Switch ligado={false} aoMudar={() => {}}>
        Modo escuro
      </Switch>
    );

    // Com `role="switch"` o leitor diz "ligado"/"desligado"; sem ele, diz
    // "marcado"/"não marcado", que é o vocabulário de outro controle.
    expect(caixa().getAttribute('role')).toBe('switch');
  });

  it('o trilho reage ao foco do input', () => {
    montar(
      <Switch ligado={false} aoMudar={() => {}}>
        Modo escuro
      </Switch>
    );

    const trilho = host.querySelector('span[aria-hidden="true"]')!;
    expect(trilho.className).toContain('peer-focus-visible:ring-2');
  });

  it('o botão usa o token, e não branco cravado', () => {
    montar(<Switch ligado aoMudar={() => {}} />);

    // A regra permanente da emenda E7-b, em seis aparições: nunca
    // `--color-white` sobre `--action`. Branco cravado dá 2,69:1 no escuro.
    const marcacao = host.innerHTML;
    expect(marcacao).toContain('var(--text-on-primary)');
    expect(marcacao).not.toContain('bg-white');
  });
});
