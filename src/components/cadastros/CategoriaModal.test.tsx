import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/**
 * O checklist da §29 para `CategoriaModal` — o template de FORMULÁRIO.
 *
 * ── O que este template estabelece ───────────────────────────────────
 *
 * A varredura da Fase 8 achou **zero ocorrências** de `aria-invalid`,
 * `aria-describedby` e `aria-errormessage` em todo o `src`. Treze formulários,
 * nenhum ligando a mensagem de erro ao campo que a causou.
 *
 * Este arquivo trava o padrão que os outros doze vão seguir nas Fases 12–16:
 * o `Campo` amarra rótulo, controle, erro e dica, e a submissão recusada leva
 * o foco ao primeiro campo que falhou.
 *
 * Não são detalhes de acabamento. Um formulário que recusa sem dizer qual
 * campo, sem marcar o campo como inválido e sem mover o foco deixa a pessoa
 * apertando Salvar contra uma parede — e a única pista existe apenas para
 * quem vê a tela.
 */

// React exige esta bandeira para `act` fora de um test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const criar = vi.fn();
const atualizar = vi.fn();

vi.mock('../../context/CadastrosContext', () => ({
  useCadastros: () => ({
    createCategoria: criar,
    updateCategoria: atualizar,
  }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const { default: CategoriaModal } = await import('./CategoriaModal');

let host: HTMLDivElement;
let root: Root;

type PropsDoModal = React.ComponentProps<typeof CategoriaModal>;

const montar = (props: Partial<PropsDoModal> = {}) => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root.render(
      <CategoriaModal
        isOpen
        onClose={() => {}}
        mode="create"
        categoria={null}
        {...props}
      />
    )
  );
};

beforeEach(() => {
  criar.mockReset();
  criar.mockResolvedValue(undefined);
  atualizar.mockReset();
  atualizar.mockResolvedValue(undefined);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const campo = (id: string) =>
  document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;

const digitar = (el: HTMLInputElement | HTMLTextAreaElement, valor: string) => {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
  act(() => {
    setter.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const enviar = () => {
  const form = document.querySelector('form')!;
  act(() => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
};

describe('CategoriaModal — o template de formulário', () => {
  it('o rótulo aponta para o campo, e o campo tem o id que o rótulo cita', () => {
    montar();

    const rotulo = Array.from(document.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('Nome')
    )!;
    expect(rotulo.getAttribute('for')).toBe('nome');
    expect(campo('nome')).not.toBeNull();
  });

  it('campo obrigatório se anuncia como obrigatório', () => {
    montar();
    // O asterisco do rótulo é `aria-hidden`: quem não vê recebe a
    // obrigatoriedade por aqui, ou não recebe de jeito nenhum.
    expect(campo('nome').getAttribute('aria-required')).toBe('true');
    expect(campo('descricao').hasAttribute('aria-required')).toBe(false);
  });

  it('recusado, o campo fica inválido E aponta para o motivo', () => {
    montar();
    digitar(campo('nome'), 'ab'); // mínimo é 3
    enviar();

    expect(criar).not.toHaveBeenCalled();

    const nome = campo('nome');
    expect(nome.getAttribute('aria-invalid')).toBe('true');

    // A associação, que era o buraco: o campo aponta para o `id` da mensagem,
    // e a mensagem existe com esse `id` e o texto certo.
    const descritor = nome.getAttribute('aria-describedby');
    expect(descritor).toContain('nome-erro');

    const mensagem = document.getElementById('nome-erro')!;
    expect(mensagem).not.toBeNull();
    expect(mensagem.textContent).toContain('pelo menos 3 caracteres');
    expect(mensagem.getAttribute('role')).toBe('alert');
  });

  it('recusado, o foco vai para o primeiro campo que falhou', () => {
    montar();
    digitar(campo('nome'), 'ab');

    // Sai do campo antes de enviar, como faz quem clica no botão Salvar.
    act(() => (document.activeElement as HTMLElement)?.blur());
    enviar();

    expect(document.activeElement).toBe(campo('nome'));
  });

  it('o contador é dica do campo, e não um parágrafo solto', () => {
    montar();

    const descricao = campo('descricao');
    const descritor = descricao.getAttribute('aria-describedby');
    expect(descritor).toContain('descricao-dica');

    const dica = document.getElementById('descricao-dica')!;
    expect(dica.textContent).toContain('0/500');

    digitar(descricao, 'abc');
    expect(document.getElementById('descricao-dica')!.textContent).toContain(
      '3/500'
    );
  });

  it('campo válido não mente sobre estar inválido', () => {
    montar();
    // Sem submissão, nada é inválido — `aria-invalid` ausente e não "false",
    // que alguns leitores anunciam mesmo assim.
    expect(campo('nome').hasAttribute('aria-invalid')).toBe(false);
  });

  it('aceito, envia ao contexto uma vez', () => {
    montar();
    digitar(campo('nome'), 'Infraestrutura');
    enviar();

    expect(criar).toHaveBeenCalledTimes(1);
    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Infraestrutura' })
    );
  });

  it('em modo leitura, os campos ficam desabilitados e a dica some', () => {
    montar({
      mode: 'view',
      categoria: {
        id: 1,
        nome: 'Infraestrutura',
        descricao: 'Rede',
        ativo: true,
        created_at: '2026-08-01T10:00:00',
      },
    });

    expect(campo('nome').disabled).toBe(true);
    expect(campo('descricao').disabled).toBe(true);
    // O contador é para quem escreve. Em leitura ele seria ruído descrevendo
    // um limite que ninguém vai atingir.
    expect(document.getElementById('descricao-dica')).toBeNull();
  });
});
