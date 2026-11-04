import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { usePermissoes } from '../../hooks/usePermissoes';
import { useAuth } from '../../hooks/useAuth';
import { ehAdministrador, ehTecnico, integraEquipeTI } from '../../lib/permissoes';
import { Aviso, Button } from '../ui';

/**
 * A revalidação das permissões falhou (rede, servidor): diz que as funções
 * de administração estão suspensas e oferece a nova tentativa — um clique,
 * nunca um laço. Só para quem administraria: a quem não administra, a falha
 * não tira nada.
 *
 * Na restauração (F5) o `integra_equipe_ti` não vem do armazenamento — de
 * propósito, ver `AuthContext` —, então o técnico ainda não sabe se é da TI.
 * Esse também vê o aviso: para o técnico da TI, sem ele a Gestão sumia sem
 * explicação e sem a nova tentativa.
 *
 * Desde o fechamento da FE-5 (C2/C4) todo técnico vê: a escrita de equipe
 * num chamado também fica suspensa enquanto a confirmação falha, e o técnico
 * da Qualidade — fora da TI — perdia os botões sem saber por quê. Quem é só
 * solicitante não vê: a falha não lhe tira nada.
 *
 * Um 403 do `/auth/me` não é rede: a mensagem diz que a API recusou.
 */
const AvisoDePermissoesSuspensas: React.FC = () => {
  const { user, revalidarIdentidade } = useAuth();
  const { semConfirmacao, confirmacaoRecusada, revalidando } = usePermissoes();
  const [tentando, setTentando] = useState(false);
  if (!semConfirmacao || !(ehAdministrador(user) || integraEquipeTI(user) || ehTecnico(user))) {
    return null;
  }
  return (
    <div className="mb-4">
      <Aviso variante="alerta">
        <span className="block">
          {confirmacaoRecusada
            ? 'A API recusou a confirmação da sua conta. As funções de administração e de equipe ficam suspensas; se persistir, fale com o administrador do sistema.'
            : 'Não foi possível confirmar suas permissões. As funções de administração ficam suspensas até a confirmação.'}
        </span>
        <Button
          variante="secundario"
          tamanho="sm"
          className="mt-2"
          carregando={tentando || revalidando}
          disabled={tentando || revalidando}
          onClick={async () => {
            setTentando(true);
            try {
              await revalidarIdentidade();
            } finally {
              setTentando(false);
            }
          }}
        >
          Confirmar de novo
        </Button>
      </Aviso>
    </div>
  );
};

interface AppLayoutProps {
  /** A página atual. */
  children: React.ReactNode;
  /**
   * O título que vai para o `<h1>` da faixa do topo. Repassado sem tocar.
   *
   * Nasce vazio de propósito — ver o comentário da prop em `Topbar.tsx`. Nada
   * o passa hoje, `App.tsx` inclusive: quem começa a preencher é cada página,
   * no commit em que for migrada nas Fases 11–16.
   */
  pageTitle?: string;
  /**
   * Estado inicial da barra lateral e da gaveta.
   *
   * Existem para a GALERIA DE DESENVOLVIMENTO (`/dev/galeria`, que só existe
   * em `dev`) poder fotografar cada estado da casca por URL, sem depender de
   * clique. `App.tsx` não passa nenhuma das duas, e o padrão é o de sempre —
   * barra recolhida, gaveta fechada. Em produção nada muda.
   *
   * A alternativa era a galeria montar a própria composição de `Sidebar` +
   * `Topbar`. Seria uma SEGUNDA casca, e screenshot de cópia não prova nada
   * sobre a casca de verdade — que é justamente o que a §26 manda conferir.
   * Duas props opcionais custam menos e não mentem.
   */
  recolhidaInicial?: boolean;
  gavetaAbertaInicial?: boolean;
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
  pageTitle,
  recolhidaInicial = true,
  gavetaAbertaInicial = false,
  aoAbrirNovidades,
  temNovidade,
  versao,
}) => {
  /**
   * A barra começa recolhida, e isso não é preferência de estilo.
   *
   * A tela mais importante do sistema é o quadro de chamados numa TV da sala,
   * em paisagem — a mesma que já obrigou a consertar o login cortado e que
   * motivou o auto-refresh de 10 minutos. O quadro tem seis colunas de 268px
   * no mínimo, e a barra aberta ocupa 256px: é quase uma coluna inteira
   * empurrada para fora da tela, num painel onde ninguém está para arrastar
   * a rolagem de lado.
   *
   * Recolhida ela mede 72px e mantém todos os ícones alcançáveis, então quem
   * usa no desktop não perde caminho nenhum — é um clique para abrir, e a
   * escolha vale enquanto a pessoa navega. Volta a recolher no recarregamento,
   * que é justamente o que a TV precisa.
   */
  const [recolhida, setRecolhida] = useState(recolhidaInicial);
  // A Gestão no menu só para quem administra, e só depois do `/auth/me` (F5-3).
  const { podeAdministrar } = usePermissoes();
  const [gavetaAberta, setGavetaAberta] = useState(gavetaAbertaInicial);

  return (
    <div className="flex h-screen overflow-hidden bg-superficie-base text-conteudo transition-colors">
      {/* Primeiro elemento focável da página: quem navega por teclado pula a
          lista inteira de áreas em vez de tabular por ela em toda troca de
          tela. Invisível até receber foco. */}
      {/* A cor do texto sai de `--text-on-primary`, e não de um branco cravado.
          Medido: branco sobre `--sinal` dá 5,29:1 no tema claro e **2,69:1 no
          escuro**, onde `--sinal` inverte para o degrau claro da rampa. Era o
          mesmo defeito do D5-a, no elemento onde ele custa mais caro: este
          link é o PRIMEIRO foco de toda página, e existe para quem navega por
          teclado — a única pessoa que o vê era a que não conseguia lê-lo.

          Passou pelo Checkpoint 1 porque a conferência da §26 mediu o token
          `--action`, não as classes que as telas escrevem por cima dele.

          Com o token: 5,29:1 no claro e 5,11:1 no escuro.

          ── E o `focus:` daqui é PROPOSITAL — não troque por `focus-visible:`
          ───────────────────────────────────────────────────────────

          O guia do pacote pede `focus-visible` com anel de 2px, e o resto do
          sistema obedece. **Aqui não**, e o motivo é o que este link é.

          Um atalho de pular conteúdo existe para APARECER quando recebe foco.
          Se aparecesse só em `:focus-visible`, um foco que o navegador julgasse
          não merecer indicador o deixaria invisível — e um atalho invisível que
          recebe Tab é pior que atalho nenhum: a pessoa tabula, o foco está em
          lugar nenhum visível, e o próximo Tab já passou.

          `focus:` é o que garante que ele se mostre em qualquer caminho de
          foco. Está registrado como exceção do item 9 do checklist do
          `adocao.md`, com este motivo. */}
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-sinal focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--text-on-primary)]"
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
        mostrarGestao={podeAdministrar}
      />

      {/* `min-w-0` para a coluna poder encolher: sem isso, uma tabela larga
          dentro do `<main>` empurra a largura da coluna inteira e a página
          passa a rolar de lado em vez de a tabela rolar dentro do próprio
          quadro. É o padrão de flexbox que morde em toda tela com tabela. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          pageTitle={pageTitle}
          aoAbrirGaveta={() => setGavetaAberta(true)}
          aoAlternarRecolhida={() => setRecolhida((v) => !v)}
          recolhida={recolhida}
        />

        <main
          id="conteudo-principal"
          className="flex-1 overflow-y-auto bg-superficie-base p-4 md:p-6"
        >
          <AvisoDePermissoesSuspensas />
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
