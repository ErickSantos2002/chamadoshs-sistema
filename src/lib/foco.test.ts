import { describe, expect, it } from 'vitest';
import { primeiroCampoFocavel } from './foco';

/** Monta um painel de modal com a mesma ordem de elementos do componente. */
function painel(corpo: string): HTMLElement {
  const raiz = document.createElement('div');
  raiz.innerHTML = `
    <div class="cabecalho">
      <h2>Resetar senha</h2>
      <button type="button" aria-label="Fechar">X</button>
    </div>
    <div class="corpo">${corpo}</div>
    <div class="rodape">
      <button type="button">Cancelar</button>
      <button type="button">Confirmar</button>
    </div>
  `;
  return raiz;
}

describe('primeiroCampoFocavel', () => {
  it('ignora o botão de fechar e vai para o primeiro campo', () => {
    // O X vem antes no documento. Era ele que o modal focava, e por isso o
    // cursor pulava para lá — foi o defeito relatado na troca de senha.
    const raiz = painel(`
      <input id="nova" type="password" />
      <input id="confirmar" type="password" />
    `);

    expect(primeiroCampoFocavel(raiz)?.id).toBe('nova');
  });

  it('devolve null quando não há campo, para o painel ficar com o foco', () => {
    // Modal de confirmação. Focar "Confirmar" faria um Enter distraído
    // executar a ação destrutiva.
    const raiz = painel('<p>Tem certeza que deseja excluir?</p>');

    expect(primeiroCampoFocavel(raiz)).toBeNull();
  });

  it('pula campo desabilitado', () => {
    const raiz = painel(`
      <input id="travado" type="text" disabled />
      <input id="livre" type="text" />
    `);

    expect(primeiroCampoFocavel(raiz)?.id).toBe('livre');
  });

  it('pula campo escondido', () => {
    const raiz = painel(`
      <input id="oculto" type="hidden" value="42" />
      <input id="visivel" type="text" />
    `);

    expect(primeiroCampoFocavel(raiz)?.id).toBe('visivel');
  });

  it('pula campo removido da ordem de tabulação', () => {
    const raiz = painel(`
      <input id="fora" type="text" tabindex="-1" />
      <input id="dentro" type="text" />
    `);

    expect(primeiroCampoFocavel(raiz)?.id).toBe('dentro');
  });

  it('aceita select e textarea, não só input', () => {
    expect(primeiroCampoFocavel(painel('<select id="s"></select>'))?.id).toBe('s');
    expect(primeiroCampoFocavel(painel('<textarea id="t"></textarea>'))?.id).toBe('t');
  });

  it('respeita a ordem do documento entre tipos diferentes', () => {
    const raiz = painel(`
      <textarea id="primeiro"></textarea>
      <input id="segundo" type="text" />
    `);

    expect(primeiroCampoFocavel(raiz)?.id).toBe('primeiro');
  });

  it('não quebra com raiz nula', () => {
    // O painel só existe depois da montagem; o efeito roda com a ref podendo
    // estar vazia.
    expect(primeiroCampoFocavel(null)).toBeNull();
  });
});
