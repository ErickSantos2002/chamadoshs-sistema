import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../context/ThemeContext';
import { ITENS_DO_MENU } from '../../lib/navegacao';
import AppLayout from './AppLayout';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/**
 * O contrato da casca, em números.
 *
 * ── Por que isto existe ───────────────────────────────────────────────
 *
 * A casca foi refeita para ficar igual à do HelpHS, e "igual" aqui são
 * medidas: 64px de topo, 256px de barra aberta, 72px recolhida. Isso é o tipo
 * de coisa que só o olho encontra — e só se o olho estiver naquela tela, na
 * largura certa, no dia em que alguém mexeu.
 *
 * Não há biblioteca de renderização neste projeto; o que há é
 * `renderToStaticMarkup`, que é o suficiente para o que se quer travar: a
 * FORMA. Efeito não roda e clique não acontece, então nada aqui testa
 * comportamento — testa que as medidas e a estrutura continuam as combinadas.
 *
 * O caso que mais importa é o último: UM menu. Este sistema já teve dois, e
 * eles divergiram — um técnico numa janela estreita não via metade do sistema.
 */

const casca = (elemento: React.ReactElement) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <ThemeProvider>{elemento}</ThemeProvider>
    </MemoryRouter>
  );

const barra = (props: Partial<Parameters<typeof Sidebar>[0]> = {}) =>
  casca(
    <Sidebar
      recolhida={false}
      gavetaAberta={false}
      aoFecharGaveta={() => {}}
      aoAbrirNovidades={() => {}}
      temNovidade={false}
      versao="9.9.9"
      {...props}
    />
  );

describe('barra lateral', () => {
  it('mede 256px aberta e 72px recolhida, como a do HelpHS', () => {
    expect(barra()).toContain('md:w-64');
    expect(barra({ recolhida: true })).toContain('md:w-[72px]');
  });

  it('no celular é uma gaveta de 256px que entra pela esquerda', () => {
    const fechada = barra({ gavetaAberta: false });
    expect(fechada).toContain('w-64');
    expect(fechada).toContain('-translate-x-full');
    // Fechada não desenha o fundo escuro — ele cobriria a tela inteira.
    // O nome mudou na Fase 5: `bg-black/50` virou `bg-overlay`, que é o
    // `--overlay` do pacote — preto a 60%, e não a 50% cravados. O que este
    // caso trava é o mesmo de antes: o fundo só existe com a gaveta aberta.
    expect(fechada).not.toContain('bg-overlay');

    const aberta = barra({ gavetaAberta: true });
    expect(aberta).toContain('translate-x-0');
    expect(aberta).toContain('bg-overlay');
  });

  it('mostra as cinco áreas do sistema, agrupadas', () => {
    const html = barra();

    for (const item of ITENS_DO_MENU) {
      expect(html, `${item.label} sumiu do menu`).toContain(item.label);
      expect(html, `${item.to} sumiu do menu`).toContain(`href="${item.to}"`);
    }

    expect(html).toContain('Principal');
    expect(html).toContain('Gest');
  });

  /**
   * Recolhida, o rótulo não desaparece — vira tooltip. Sem isso a barra de
   * 72px é uma coluna de ícones para adivinhar.
   */
  it('recolhida, o nome da área continua alcançável', () => {
    const html = barra({ recolhida: true });

    for (const item of ITENS_DO_MENU) {
      expect(html, `${item.label} sumiu no modo recolhido`).toContain(item.label);
      // O balão de hover é visual: não existe para quem chega pelo teclado
      // nem para leitor de tela em varredura. O `title` existe para os dois,
      // e é o que a `AppShell.jsx` do pacote põe no item recolhido.
      expect(html, `${item.label} sem title no modo recolhido`).toContain(
        `title="${item.label}"`
      );
    }
    expect(html).toContain('group-hover:opacity-100');
  });

  it('a versão abre o aviso de novidades, e o ponto só aparece quando há', () => {
    expect(barra()).toContain('ChamadosHS 9.9.9');
    expect(barra({ temNovidade: false })).not.toContain('novidades não lidas');
    expect(barra({ temNovidade: true })).toContain('novidades não lidas');
  });
});

describe('faixa do topo', () => {
  const topo = (recolhida = false) =>
    casca(
      <Topbar
        aoAbrirGaveta={() => {}}
        aoAlternarRecolhida={() => {}}
        recolhida={recolhida}
      />
    );

  it('mede 64px de altura, como a do HelpHS', () => {
    expect(topo()).toContain('h-16');
  });

  it('o botão diz o que vai fazer com a barra', () => {
    expect(topo(false)).toContain('Recolher menu');
    expect(topo(true)).toContain('Expandir menu');
  });

  /**
   * O HelpHS tem um sino aqui. O ChamadosHS não tem notificações, e um sino
   * que abre uma lista sempre vazia promete um aviso que nunca vem.
   */
  it('não tem sino de notificações', () => {
    expect(topo().toLowerCase()).not.toContain('notifica');
  });
});

describe('casca', () => {
  const html = casca(
    <AppLayout aoAbrirNovidades={() => {}} temNovidade={false} versao="9.9.9">
      <p>conteúdo da página</p>
    </AppLayout>
  );

  it('a casca não rola; quem rola é o conteúdo', () => {
    expect(html).toContain('h-screen overflow-hidden');
    expect(html).toContain('overflow-y-auto');
  });

  /**
   * O espaçamento e o fundo moram no `<main>`, não nas páginas.
   *
   * Eram dez cópias do mesmo `p-6`, uma por tela. Se alguma voltar a aplicar o
   * próprio, o espaçamento daquela tela dobra — e isso não quebra nada, só
   * fica errado, que é o tipo de defeito que sobrevive a revisão.
   */
  it('o espaçamento e o fundo do conteúdo são da casca', () => {
    expect(html).toContain('p-4 md:p-6');
    expect(html).toContain('bg-superficie-base');
  });

  /**
   * `min-w-0` na coluna do conteúdo. Sem ele, uma tabela larga empurra a
   * largura da coluna inteira e a página passa a rolar de lado, em vez de a
   * tabela rolar dentro do próprio quadro.
   */
  it('a coluna do conteúdo pode encolher', () => {
    expect(html).toContain('min-w-0');
  });

  it('quem navega por teclado pula o menu', () => {
    expect(html).toContain('Pular para o conteúdo principal');
    expect(html).toContain('id="conteudo-principal"');
  });

  it('desenha a página que recebe', () => {
    expect(html).toContain('conteúdo da página');
  });

  /**
   * O defeito que a lista única de `lib/navegacao` veio consertar era duas
   * listas. A casca nova vai além: um componente só, que muda de forma
   * conforme a largura. Se voltar a haver dois `<nav>`, voltaram as duas
   * verdades — e uma delas vai ficar para trás.
   */
  it('existe um menu, e um só', () => {
    expect(html.match(/<nav\b/g) ?? []).toHaveLength(1);
  });
});
