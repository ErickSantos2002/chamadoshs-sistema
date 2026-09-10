import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { EventoDeAuditoria } from '../types/api';

/**
 * Os TRÊS vazios da trilha de auditoria.
 *
 * ── O defeito que estes casos existem para não ter de volta ──────────
 *
 * A primeira versão da tela distinguia só dois vazios: *"com filtro"* e *"sem
 * filtro"* — e presumia estar na página 1.
 *
 * Com **exatamente 50 eventos** — o `limit` da consulta — o botão "Próxima"
 * habilita, a página 2 volta vazia, e a tela declarava que **a trilha nunca
 * registrou nada**. Logo depois de a pessoa ter lido 50 linhas dela.
 *
 * Numa tela de auditoria isso é pior que erro de layout: ela existe para ser
 * confiável sobre o passado, e passava a afirmar que o passado está vazio.
 *
 * ── Por que o caso existe agora ──────────────────────────────────────
 *
 * O defeito **já está corrigido** — há três estados, e o de `pagina > 0` diz
 * *"Fim da lista"* com botão de voltar. Nenhum teste o prendia.
 *
 * > **Defeito já corrigido volta calado se ninguém o prender.** Decisão do
 * > operador, Fase 19.
 *
 * O risco é concreto: os três estados moram num ternário aninhado de três
 * ramos, e a ordem deles é o que decide. Trocar `pagina > 0` de lugar, ou
 * simplificar o ternário "porque dois bastam", reintroduz exatamente o defeito
 * — e nada mais acusaria.
 */

const POR_PAGINA = 50;

const listar = vi.fn();
let papel = 'Administrador';

vi.mock('../services/chamadoshsapi', () => ({
  auditoriaService: { listar: (...a: unknown[]) => listar(...a) },
}));
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, username: 'admin', role: papel } }),
}));
vi.mock('../hooks/useUsuariosPorId', () => ({
  useUsuariosPorId: () => ({}),
}));

const { default: Auditoria } = await import('./Auditoria');

/**
 * Evento completo o bastante para `descreverEvento` não quebrar.
 *
 * A primeira versão deste ajudante trazia só os campos que a TELA lê, e dois
 * casos morreram com `Cannot read properties of undefined (reading 'replace')`:
 * `descreverEvento` chama `acao.replace(...)` para montar o título genérico.
 *
 * Fica anotado porque é a mesma lição de sempre num lugar novo: **massa de teste
 * montada a partir do que se lembra da tela cobre a tela, e não o código que ela
 * chama.**
 */
const evento = (i: number): EventoDeAuditoria =>
  ({
    chave: 'e' + i,
    acao: 'criacao',
    alvo_tipo: 'setor',
    alvo_id: i,
    alvo_nome: 'Setor ' + i,
    ator_id: 1,
    ator_nome: 'admin',
    valor_anterior: null,
    valor_novo: null,
    created_at: '2026-09-01T12:00:00Z',
    origem: 'PATCH /setores/' + i,
  }) as unknown as EventoDeAuditoria;

let host: HTMLDivElement;
let root: Root;

const montar = async () => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<Auditoria />);
  });
};

/** Deixa os efeitos assentarem depois de um clique. */
const clicar = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const botao = (texto: string | RegExp) =>
  Array.from(host.querySelectorAll('button')).find((b) =>
    typeof texto === 'string' ? b.textContent?.includes(texto) : texto.test(b.textContent || '')
  );

const textoDaTela = () => (host.textContent || '').replace(/\s+/g, ' ');

beforeEach(() => {
  listar.mockReset();
  papel = 'Administrador';
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('os três vazios da trilha', () => {
  /**
   * O caso do defeito. Uma página CHEIA seguida de uma vazia não é uma trilha
   * sem eventos — é o fim da lista.
   */
  it('página > 0 diz "Fim da lista", e NÃO que a trilha está vazia', async () => {
    listar
      .mockResolvedValueOnce(Array.from({ length: POR_PAGINA }, (_, i) => evento(i)))
      .mockResolvedValue([]);

    await montar();
    const proxima = botao('Próxima');
    expect(proxima, 'sem o botão Próxima não há como chegar à página 2').toBeTruthy();
    expect((proxima as HTMLButtonElement).disabled).toBe(false);

    await clicar(proxima!);

    const texto = textoDaTela();
    expect(texto).toContain('Fim da lista');
    expect(
      texto,
      'a tela afirmou que a trilha nunca registrou nada, depois de 50 linhas lidas'
    ).not.toContain('ainda não registrou');
  });

  /** E o "Fim da lista" oferece a saída — senão a pessoa fica numa tela vazia. */
  it('o fim da lista traz o botão de voltar à página anterior', async () => {
    listar
      .mockResolvedValueOnce(Array.from({ length: POR_PAGINA }, (_, i) => evento(i)))
      .mockResolvedValue([]);

    await montar();
    await clicar(botao('Próxima')!);

    expect(botao(/Voltar à página anterior/)).toBeTruthy();
  });

  /** O segundo vazio: há filtro, e a frase manda ampliar o período. */
  it('com filtro, diz que o RECORTE está vazio', async () => {
    listar.mockResolvedValue([]);
    await montar();

    const de = host.querySelector('#de') as HTMLInputElement;
    expect(de, 'o campo De sumiu — o filtro não é mais alcançável').toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )!.set!;
    await act(async () => {
      setter.call(de, '2026-01-01');
      de.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const texto = textoDaTela();
    expect(texto).toContain('Nenhum evento neste recorte');
    expect(texto).not.toContain('Fim da lista');
  });

  /** O terceiro: sem filtro e na página 1, a trilha está mesmo vazia. */
  it('sem filtro e na página 1, afirma que a trilha não registrou nada', async () => {
    listar.mockResolvedValue([]);
    await montar();

    const texto = textoDaTela();
    expect(texto).toContain('ainda não registrou');
    expect(texto).not.toContain('Fim da lista');
    expect(texto).not.toContain('neste recorte');
  });

  /**
   * E a frase do terceiro vazio muda por PERFIL: para o técnico a consulta foi
   * só de setores, então dizer "nenhum evento" afirmaria também sobre o que ele
   * não pode ver.
   */
  it('para o técnico, o vazio fala só de setores', async () => {
    papel = 'Tecnico';
    listar.mockResolvedValue([]);
    await montar();

    const texto = textoDaTela();
    expect(texto).toContain('Nenhum evento de setor registrado');
    expect(
      texto,
      'a frase afirmou sobre a trilha inteira, e o técnico só consultou setores'
    ).not.toContain('A trilha ainda não registrou');
  });
});
