import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

/**
 * Outra aba deste navegador entrou com outra conta (AUTH-01). A sessão do
 * navegador é uma só: esta aba continuaria mostrando a conta antiga e
 * operando com a nova. Ela para — nada sai dela, ver a guarda em
 * `services/api.ts` — e diz por quê. O que foi digitado continua na tela,
 * para ser copiado antes de recarregar.
 *
 * ── Por cima dos modais, e fora do `<main>` ──────────────────────────
 *
 * Nasceu dentro do conteúdo da página, e a homologação em navegador mostrou
 * o custo: com o formulário de novo chamado aberto no modal, o aviso e o
 * botão ficavam atrás do fundo escurecido — quem estava no modal só sabia da
 * troca depois de tentar enviar, e só alcançava o botão fechando o modal.
 *
 * Agora é uma faixa fixa no topo, num portal no `<body>`, uma camada acima
 * do `Modal` (`z-50`) e abaixo dos toasts. Faixa, e não tela cheia: o que
 * foi digitado precisa continuar visível e selecionável para ser copiado.
 *
 * Por cima do modal ela cobria o cabeçalho dele, com o X. A altura da faixa
 * vai então para `--altura-aviso-de-sessao`, e o `Modal` desce essa medida.
 *
 * O foco vai para a FAIXA, não para o botão: quem estava digitando não pode
 * recarregar a página com o Enter ou o espaço da palavra seguinte. Da faixa,
 * um Tab chega ao botão.
 *
 * Com um modal aberto, o Tab e o Shift+Tab andam num ciclo só — faixa →
 * modal → faixa —, sem cair na página atrás do véu. Quem cuida disso é a
 * armadilha de foco do `Modal` (`prenderTab`, em `lib/foco.ts`), que recebe
 * a faixa como região vizinha: aqui não há tratamento de tecla nenhum, para
 * não haver dois donos do mesmo Tab.
 *
 * Sem troca de sessão nada é montado: os modais ficam como sempre.
 */
export const AvisoDeSessaoAlterada: React.FC = () => {
  const { sessaoAlterada } = useAuth();
  const faixa = useRef<HTMLDivElement>(null);
  const conta = sessaoAlterada?.conta;

  useEffect(() => {
    if (conta) faixa.current?.focus();
  }, [conta]);

  // A altura da faixa vai para uma variável CSS que o `Modal` lê: com ela o
  // modal aberto desce e o cabeçalho dele — o X de fechar — não fica coberto.
  // Ao sumir a faixa, a variável sai e os modais voltam ao lugar de sempre.
  useLayoutEffect(() => {
    const no = faixa.current;
    if (!conta || !no) return;
    const raiz = document.documentElement;
    const medir = () => raiz.style.setProperty('--altura-aviso-de-sessao', `${no.offsetHeight}px`);
    medir();
    const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(medir) : null;
    observador?.observe(no);
    return () => {
      observador?.disconnect();
      raiz.style.removeProperty('--altura-aviso-de-sessao');
    };
  }, [conta]);

  if (!sessaoAlterada) return null;
  return createPortal(
    <div
      ref={faixa}
      tabIndex={-1}
      data-aviso-de-sessao=""
      role="region"
      aria-label="Sessão alterada em outra aba"
      className="fixed inset-x-0 top-0 z-[70] p-3 outline-none md:p-4"
    >
      {/* Fundo opaco por baixo da tinta do aviso: sobre o modal escurecido, a
          tinta translúcida sozinha deixaria o texto sem contraste. */}
      <div className="mx-auto max-w-3xl rounded-lg bg-superficie shadow-xl">
        <Aviso variante="perigo">
          <span className="block">
            A conta “{sessaoAlterada.conta}” entrou neste navegador em outra aba. Esta aba ficou
            parada para não misturar as duas contas: nada do que está aqui será enviado. Copie o
            que precisar e recarregue a página.
          </span>
          <Button
            variante="secundario"
            tamanho="sm"
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            Recarregar a página
          </Button>
        </Aviso>
      </div>
    </div>,
    document.body
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
          <AvisoDeSessaoAlterada />
          <AvisoDePermissoesSuspensas />
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
