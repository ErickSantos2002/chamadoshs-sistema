import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppLayoutProps {
  /** A página atual. */
  children: React.ReactNode;
  aoAbrirNovidades: () => void;
  temNovidade: boolean;
  versao: string;
}

/**
 * A casca: barra lateral, faixa do topo e a área que rola.
 *
 * ── Quem rola ─────────────────────────────────────────────────────────
 *
 * Só o `<main>`. A casca inteira é `h-screen overflow-hidden`, então a barra
 * lateral e o topo ficam parados enquanto a página anda por baixo — sem
 * `sticky` e sem `z-index` disputando com o que a página desenha.
 *
 * O `Header` antigo resolvia isso com `sticky top-0 z-50`, e a consequência
 * aparecia em toda tela que queria um cabeçalho próprio grudado: eram dois
 * elementos disputando o topo.
 *
 * ── Por que `children`, e não `<Outlet />` ────────────────────────────
 *
 * O HelpHS declara as rotas como filhas de uma rota de layout e recebe a
 * página pelo `Outlet`. O ChamadosHS monta as rotas num `<Routes>` só
 * (`router.tsx`), e trocar isso mexeria em roteamento para não mudar nada na
 * tela. A casca recebe a página como filho e o roteamento fica onde está.
 *
 * ── O padding mora aqui ───────────────────────────────────────────────
 *
 * `p-4 md:p-6`, como no HelpHS: 16px no celular, 24px a partir de `md`. As
 * páginas começam coladas na borda e não repetem mais o próprio `p-6` — eram
 * dez cópias da mesma decisão, e mudar o respiro do sistema exigia abrir dez
 * arquivos.
 *
 * A migração teve de ser num passo só: enquanto o padding estivesse aqui E na
 * página, o espaçamento dobrava. Não havia como fazer tela a tela.
 *
 * O fundo também é daqui. Antes cada página pintava `bg-superficie-base` num
 * `<div>` de moldura; agora o `<main>` pinta, e a calha de 24px em volta do
 * conteúdo tem a cor certa — sem isso ela mostraria o fundo da casca por trás
 * e apareceria como um quadro de tom diferente em volta de cada tela.
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  aoAbrirNovidades,
  temNovidade,
  versao,
}) => {
  const [recolhida, setRecolhida] = useState(false);
  const [gavetaAberta, setGavetaAberta] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-superficie-base text-conteudo transition-colors">
      {/* Primeiro elemento focável da página: quem navega por teclado pula a
          lista inteira de áreas em vez de tabular por ela em toda troca de
          tela. Invisível até receber foco. */}
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-sinal focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Pular para o conteúdo principal
      </a>

      <Sidebar
        recolhida={recolhida}
        gavetaAberta={gavetaAberta}
        aoFecharGaveta={() => setGavetaAberta(false)}
        aoAbrirNovidades={aoAbrirNovidades}
        temNovidade={temNovidade}
        versao={versao}
      />

      {/* `min-w-0` para a coluna poder encolher: sem isso, uma tabela larga
          dentro do `<main>` empurra a largura da coluna inteira e a página
          passa a rolar de lado em vez de a tabela rolar dentro do próprio
          quadro. É o padrão de flexbox que morde em toda tela com tabela. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          aoAbrirGaveta={() => setGavetaAberta(true)}
          aoAlternarRecolhida={() => setRecolhida((v) => !v)}
          recolhida={recolhida}
        />

        <main
          id="conteudo-principal"
          className="flex-1 overflow-y-auto bg-superficie-base p-4 md:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
