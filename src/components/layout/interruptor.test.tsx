import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../context/ThemeContext';
import { Switch } from '../ui/Switch';
import { Topbar } from './Topbar';

/**
 * Onde a bolinha do interruptor cai dentro do trilho.
 *
 * ── O defeito que isto trava ──────────────────────────────────────────
 *
 * A bolinha é `absolute` e não declarava `left`. Sem ele, ela ocupa a posição
 * estática — e a posição estática herda o alinhamento de texto de quem a
 * contém. Dentro de `<label>` (o `Switch` do kit) isso dá certo por acaso,
 * porque o label alinha à esquerda. Dentro de `<button>` (o "Modo escuro" do
 * menu do usuário), que o navegador centraliza por padrão e o preflight do
 * Tailwind não desfaz, a bolinha nascia no MEIO do trilho.
 *
 * Medido no Chrome, trilho de 36px e bolinha de 16px:
 *
 *     desligado   folga esquerda 20px · direita   0px   (à direita no claro)
 *     ligado      folga esquerda 34px · direita −14px   (vazando até a borda do painel)
 *
 * O HelpHS declara o `left` da bolinha, e o `Switch.jsx` do pacote também.
 *
 * ── Por que a conta é feita aqui, e não pelo navegador ────────────────
 *
 * O jsdom não calcula layout nem carrega o CSS do Tailwind. O que dá para
 * travar é a conta que o navegador faria: `left` + deslocamento, pela escala
 * do Tailwind (`4` = 16px). A conta só é honesta se o `left` estiver
 * declarado — por isso a ausência dele é erro, e não zero.
 */
function folgas(caixa: Element) {
  const degrau = (classes: string, prefixo: string) => {
    const achada = classes
      .split(/\s+/)
      .find((c) => new RegExp(`^${prefixo}-[\\d.]+$`).test(c));
    return achada === undefined ? undefined : Number(achada.slice(prefixo.length + 1)) * 4;
  };

  const bolinha = caixa.lastElementChild!;
  const left = degrau(bolinha.className, 'left');
  if (left === undefined) {
    throw new Error(
      'a bolinha não declara left: a posição dela fica à mercê do alinhamento de quem a contém'
    );
  }

  const inicio = left + (degrau(bolinha.className, 'translate-x') ?? 0);
  return {
    esquerda: inicio,
    direita: degrau(caixa.className, 'w')! - inicio - degrau(bolinha.className, 'w')!,
  };
}

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('a bolinha do interruptor', () => {
  it('no "Modo escuro" do menu, fica dentro do trilho nas duas posições', () => {
    act(() =>
      root.render(
        <MemoryRouter>
          <ThemeProvider>
            <Topbar aoAbrirGaveta={() => {}} aoAlternarRecolhida={() => {}} recolhida={false} />
          </ThemeProvider>
        </MemoryRouter>
      )
    );
    act(() => host.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!.click());

    const item = () => host.querySelector<HTMLButtonElement>('[role="menuitemcheckbox"]')!;
    const caixa = () => item().querySelector('span.relative')!;

    // Sem tema gravado, começa no claro: desligado, bolinha à esquerda.
    expect(item().getAttribute('aria-checked')).toBe('false');
    expect(folgas(caixa()).esquerda).toBe(2);

    // Liga sem fechar o menu — é o caminho normal de quem troca de tema.
    act(() => item().click());
    expect(item().getAttribute('aria-checked')).toBe('true');
    expect(folgas(caixa()).direita).toBe(2);
  });

  it('no Switch do kit, fica simétrica no trilho', () => {
    act(() => root.render(<Switch ligado={false} aoMudar={() => {}} />));
    expect(folgas(host.querySelector('span.relative')!).esquerda).toBe(2);

    act(() => root.render(<Switch ligado aoMudar={() => {}} />));
    expect(folgas(host.querySelector('span.relative')!).direita).toBe(2);
  });
});
