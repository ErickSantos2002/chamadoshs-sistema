import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { GRUPOS_DO_MENU } from '../../lib/navegacao';
import { cn } from '../../lib/utils';
import logo from '../../assets/logo.png';
import icone from '../../assets/HS2.ico';

interface SidebarProps {
  /** Desktop: reduz a barra a 72px, só com os ícones. */
  recolhida: boolean;
  /** Mobile: a gaveta está aberta. */
  gavetaAberta: boolean;
  aoFecharGaveta: () => void;
  aoAbrirNovidades: () => void;
  /** Mostra o ponto ao lado da versão quando há versão não vista. */
  temNovidade: boolean;
  versao: string;
}

/**
 * A navegação do sistema. Uma só, em todas as larguras.
 *
 * ── Por que uma só ────────────────────────────────────────────────────
 *
 * Havia duas: esta barra, que aparecia a partir de `lg`, e a gaveta do
 * `Header`, que era o menu abaixo disso. Duas listas já tinham divergido uma
 * vez — o técnico numa janela estreita não via Cadastros, Auditoria nem
 * Tarefas Recorrentes — e o conserto na época foi fazer as duas lerem
 * `lib/navegacao`. Ficaram dois COMPONENTES lendo uma lista.
 *
 * Agora é um componente só, que muda de forma conforme a largura, como no
 * HelpHS: barra lateral no desktop, gaveta sobre um fundo escuro no celular.
 * A do celular não é outro menu, é este mesmo deslizando para dentro — não há
 * como um dos dois ficar para trás porque não há dois.
 *
 * ── As três formas ────────────────────────────────────────────────────
 *
 *   md+ aberta     w-64, ícone e rótulo, títulos de grupo
 *   md+ recolhida  72px, só ícone, o rótulo vira tooltip ao lado
 *   abaixo de md   gaveta w-64 por cima do conteúdo, com fundo escuro atrás
 *
 * A transição é de `width` e de `transform`, e não de `all`: animar cor junto
 * faz a barra "acender" no meio do movimento. O `transform` entrou na Fase 5 —
 * sem ele a gaveta do celular aparecia de uma vez, e a §9 pede que ela abra em
 * `--duration-drawer`, que são os mesmos 300ms da largura.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  recolhida,
  gavetaAberta,
  aoFecharGaveta,
  aoAbrirNovidades,
  temNovidade,
  versao,
}) => (
  <>
    {/* Fundo escuro da gaveta. Só existe no celular, e só com ela aberta.
        A cor é `--overlay`, do pacote: preto a 60%. Era `bg-black/50` — preto
        cravado, e dez pontos mais claro que o do design system.

        Em VALOR ARBITRÁRIO, e não pela classe utilitária do token — regra
        (d) do D8-a. A classe utilitária passa pelo `color-mix`, que exige
        Chrome 111+; abaixo disso a declaração é inválida em tempo de valor
        computado e a propriedade cai para o INICIAL, que em
        `background-color` é transparente. O véu sumiria sem um erro sequer, e
        a gaveta abriria sobre a tela sem escurecer nada. Aqui o token vai
        direto e vale em qualquer navegador. */}
    {gavetaAberta && (
      <div
        role="button"
        tabIndex={0}
        aria-label="Fechar menu"
        className="fixed inset-0 z-[35] bg-[var(--overlay)] md:hidden"
        onClick={aoFecharGaveta}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') aoFecharGaveta();
        }}
      />
    )}

    <aside
      id="menu-lateral"
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col',
        'border-r border-borda bg-superficie',
        'overflow-hidden transition-[width,transform] duration-300 ease-in-out',
        // Desktop: a largura sai do estado de recolhida.
        recolhida ? 'md:w-[72px]' : 'md:w-64',
        // Mobile: gaveta, sempre na largura cheia.
        'w-64',
        'md:static md:z-auto md:translate-x-0',
        gavetaAberta ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Marca. Sem `border-b`: o traço de baixo do Topbar já corre nesta
          altura, e dois riscos a 64px ficam como uma linha grossa torta. */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center',
          recolhida ? 'justify-center px-0' : 'px-5'
        )}
      >
        <Link
          to="/dashboard"
          onClick={aoFecharGaveta}
          aria-label="Ir para o Dashboard"
          className="flex items-center"
        >
          {recolhida ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-action-tint">
              <img src={icone} alt="" className="h-5 w-5 object-contain" />
            </span>
          ) : (
            <img
              src={logo}
              alt="Health &amp; Safety"
              className="h-7 w-auto object-contain"
            />
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-2 py-3">
        {GRUPOS_DO_MENU.map(({ grupo, itens }) => (
          <div key={grupo}>
            {/* Título do grupo aberto; recolhida, vira um traço curto — o
                nome não caberia em 72px e um rótulo truncado não informa. */}
            {recolhida ? (
              <div className="mx-auto mb-1 w-6 border-t border-borda" />
            ) : (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-conteudo-tenue">
                {grupo}
              </p>
            )}

            <div className="space-y-0.5">
              {itens.map(({ label, to, Icone }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  onClick={aoFecharGaveta}
                  /* Recolhida, o nome também vai para o `title` — é o que a
                     `AppShell.jsx:101` faz. O balão abaixo é visual e não
                     alcança quem navega por teclado nem leitor de tela em
                     modo de varredura; o `title` alcança. */
                  title={recolhida ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center rounded-lg text-sm font-medium transition-colors',
                      recolhida ? 'mx-1 justify-center px-0 py-2.5' : 'gap-3 px-3 py-2',
                      isActive
                        ? [
                            // Tinta e cor do pacote, como em
                            // `AppShell.jsx:114`. Era `bg-sinal/10 text-sinal`:
                            // o mesmo azul, mas a 10% escritos à mão. A tinta é
                            // token, tem valor próprio no tema escuro e não
                            // depende de o Tailwind aceitar opacidade no nome.
                            //
                            // Em VALOR ARBITRÁRIO, e não pelas classes
                            // utilitárias dos dois tokens — regra (d) do
                            // D8-a. Elas passam pelo `color-mix`, e abaixo do
                            // piso de browser o item selecionado perderia
                            // fundo E cor de uma vez: ficaria indistinguível
                            // dos outros, numa barra em que a única pista do
                            // "você está aqui" é essa.
                            'bg-[var(--action-tint)] text-[var(--action)]',
                            // A barra à esquerda entra por dentro do padding,
                            // e não por fora: somada ao `px-3`, ela empurraria
                            // o ícone 2px para a direita só no item ativo.
                            !recolhida &&
                              'border-l-2 border-[var(--action)] pl-[calc(0.75rem-2px)]',
                          ]
                        : [
                            !recolhida &&
                              'border-l-2 border-transparent pl-[calc(0.75rem-2px)]',
                            // Inativo é `--text-muted`, como a §9 pede. Era
                            // `--text-body`, um degrau escuro demais: o que
                            // não está selecionado disputava atenção com o que
                            // está.
                            'text-conteudo-tenue hover:bg-superficie-elevada hover:text-conteudo',
                          ]
                    )
                  }
                >
                  <Icone className="h-5 w-5 shrink-0" aria-hidden="true" />

                  {!recolhida && <span className="truncate">{label}</span>}

                  {/* Recolhida, o nome da área só existe aqui. Sem isto, a
                      barra de 72px é uma coluna de ícones para adivinhar. */}
                  {recolhida && (
                    <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg bg-conteudo px-2.5 py-1.5 text-xs font-medium text-superficie opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                      {label}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Rodapé. A versão é o botão que abre o aviso de novidades — era um
          item "Novidades" na lista de áreas, e ele não é uma área: não leva a
          lugar nenhum, abre um aviso sobre a própria lista. */}
      {!recolhida && (
        <div className="flex shrink-0 flex-col items-center gap-0.5 border-t border-borda px-5 py-4">
          <div className="group relative">
            <button
              type="button"
              onClick={aoAbrirNovidades}
              className="flex items-center gap-1.5 rounded-lg text-xs font-medium text-conteudo-tenue transition-colors hover:text-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sinal"
            >
              ChamadosHS {versao}
              {temNovidade && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-sinal"
                  aria-label="Há novidades não lidas"
                />
              )}
            </button>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-conteudo px-2.5 py-1.5 text-xs font-medium text-superficie opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
              Ver o que há de novo nessa versão
            </span>
          </div>
          <p className="text-[11px] text-conteudo-tenue">
            © 2026 Health &amp; Safety Tech
          </p>
        </div>
      )}
    </aside>
  </>
);

export default Sidebar;
