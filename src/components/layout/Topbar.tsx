import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';
import { Avatar } from '../ui';
import { IconeLua, IconeMenu, IconeSair, IconeSeta } from '../ui/icones';

interface TopbarProps {
  /**
   * O título da página, no `<h1>` que a §9 põe aqui.
   *
   * **Nasce vazia e continua vazia até a Fase 11.** As onze páginas desenham o
   * próprio `<h1>` hoje; preencher isto agora daria DOIS `<h1>` na mesma
   * página, que é pior de ouvir num leitor de tela do que o estado atual.
   *
   * Cada tela passa a preencher no commit em que for migrada (Fases 11–16),
   * **soltando no mesmo commit o `<h1>` que tem hoje e rebaixando o cabeçalho
   * próprio para `<h2>`**. É a troca dentro do mesmo commit que garante que
   * nunca haja dois nem zero. A Fase 20 confere: nenhuma página com `<h1>`
   * dentro do `<main>`, todas com `pageTitle`.
   *
   * O texto é o que a página já mostra — migrar não é oportunidade de
   * reescrever rótulo (§30).
   *
   * Mesma decisão do HelpHS: D8 de `COMPARTILHADO/DECISOES.md`.
   */
  pageTitle?: string;
  /** Abre a gaveta no celular. */
  aoAbrirGaveta: () => void;
  /** Recolhe ou devolve a barra lateral no desktop. */
  aoAlternarRecolhida: () => void;
  recolhida: boolean;
}

/**
 * A faixa de 64px no topo.
 *
 * ── O que ela NÃO tem ─────────────────────────────────────────────────
 *
 * O HelpHS traz um sino de notificações aqui. O ChamadosHS não tem
 * notificações — nem endpoint, nem serviço, nem tela — e um sino que abre uma
 * lista sempre vazia é pior que a ausência dele: promete um aviso que nunca
 * vem, e a pessoa para de olhar. Ele volta quando houver o que notificar.
 *
 * ── O que mudou de lugar ──────────────────────────────────────────────
 *
 * O `Header` antigo trazia nome, perfil e um botão "Sair" solto, e o interruptor
 * de tema morava no rodapé da barra lateral — sumindo junto com ela abaixo de
 * `lg`. Os três agora estão no menu do usuário, como no HelpHS: um lugar só
 * para o que é da pessoa, e que existe em toda largura de tela.
 */
export const Topbar: React.FC<TopbarProps> = ({
  pageTitle,
  aoAbrirGaveta,
  aoAlternarRecolhida,
  recolhida,
}) => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Clique fora fecha. Sem isto o menu fica aberto atrás do próximo clique da
  // pessoa, que é o comportamento que faz um dropdown parecer travado.
  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(false);
      }
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  // Esc também fecha — é o reflexo de quem está no teclado.
  useEffect(() => {
    if (!menuAberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuAberto(false);
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [menuAberto]);

  const sair = () => {
    logout();
    navigate('/login');
  };

  const botaoDeIcone =
    'rounded-lg p-2 text-conteudo-suave transition-colors hover:bg-superficie-elevada hover:text-conteudo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sinal';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-borda bg-superficie px-4 md:px-6">
      {/* Os dois botões são o mesmo desenho e fazem coisas diferentes conforme
          a largura: no desktop recolhe a barra, no celular abre a gaveta. */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={cn('hidden md:flex', botaoDeIcone)}
          onClick={aoAlternarRecolhida}
          aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={!recolhida}
          aria-controls="menu-lateral"
        >
          <IconeMenu className="h-5 w-5" />
        </button>

        <button
          type="button"
          className={cn('md:hidden', botaoDeIcone)}
          onClick={aoAbrirGaveta}
          aria-label="Abrir menu de navegação"
          aria-controls="menu-lateral"
        >
          <IconeMenu className="h-5 w-5" />
        </button>
      </div>

      {/* Vazia, um espaçador; preenchida, o `<h1>` da §9. Não desenho um
          `<h1>` vazio: cabeçalho sem texto é ruído para leitor de tela, e a
          página ainda tem o dela. */}
      {pageTitle ? (
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-conteudo">
          {pageTitle}
        </h1>
      ) : (
        <div className="flex-1" />
      )}

      <div className="relative flex items-center gap-2" ref={menuRef}>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors',
            'hover:bg-superficie-elevada focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sinal',
            menuAberto && 'bg-superficie-elevada'
          )}
          onClick={() => setMenuAberto((v) => !v)}
          aria-label={`Menu do usuário — ${user?.username ?? ''}`}
          aria-expanded={menuAberto}
          aria-haspopup="menu"
        >
          <Avatar nome={user?.username} className="h-8 w-8 text-xs" />
          <span className="hidden text-left md:block">
            <span className="block text-sm font-medium leading-tight text-conteudo-suave">
              {user?.username}
            </span>
            <span className="block text-xs leading-tight text-conteudo-tenue">
              {user?.role}
            </span>
          </span>
          <IconeSeta className="hidden h-4 w-4 text-conteudo-tenue md:block" />
        </button>

        {menuAberto && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 rounded-xl border border-borda bg-superficie py-1 shadow-xl"
          >
            {/* Nome e perfil. O HelpHS mostra o e-mail na segunda linha; aqui
                o usuário logado não tem e-mail — o que há é o perfil, e ele
                explica o que a pessoa alcança no sistema. */}
            <div className="border-b border-borda px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-conteudo">
                {user?.username}
              </p>
              <p className="truncate text-xs text-conteudo-tenue">{user?.role}</p>
            </div>

            {/* `menuitemcheckbox` com `aria-checked`, e nao `menuitem` com
                `aria-pressed`.

                Dentro de um menu, esta e a funcao que a ARIA reserva para uma
                opcao que liga e desliga — o leitor anuncia "marcado"/"nao
                marcado" no vocabulario de menu. `aria-pressed` e de botao de
                alternancia solto, e num menu ele descreve o controle errado.

                E o interruptor ao lado NAO e o `Switch` do kit, de proposito:
                aquele contem um `<input>`, e input dentro de button e HTML
                invalido — seriam dois controles para uma acao so. Aqui a linha
                inteira ja e o controle, e o desenho ao lado e decoracao que
                mostra o estado. */}
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={darkMode}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-conteudo-suave transition-colors hover:bg-superficie-elevada hover:text-conteudo"
              onClick={toggleDarkMode}
            >
              <IconeLua className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 text-left">Modo escuro</span>
              {/* O desenho do interruptor era feito aqui, à mão. Passa a ser
                  o `Switch` do kit, e três coisas mudam.

                  O trilho DESLIGADO era `bg-borda` com o botão em branco
                  cravado: no tema claro isso é branco sobre slate-200, 1,15:1
                  — o botão sumia contra o trilho, e a posição dele é a
                  informação principal de um interruptor. Agora o trilho é
                  `--surface-elevated` com contorno `--border-control`, que é
                  o que faz o trilho existir como forma.

                  O botão era `bg-white` cravado. Passa a `--text-on-primary`,
                  pela regra permanente que a emenda E7-b fechou: nunca branco
                  cravado sobre `--action`. Aqui o trilho ligado era o degrau
                  500 absoluto, que não inverte, então não era o caso da
                  regra — mas usar o token é o que impede que vire o caso
                  quando alguém trocar o degrau.

                  E o botão inteiro deixa de ser um `<button aria-pressed>`
                  para conter um `<input role="switch">`: o leitor de tela
                  passa a dizer "ligado"/"desligado" em vez de "pressionado". */}
              <span
                aria-hidden="true"
                className="relative inline-block h-5 w-9 shrink-0"
              >
                <span
                  className={cn(
                    'absolute inset-0 rounded-full border transition-colors duration-200',
                    darkMode
                      ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]'
                      : 'border-borda-control bg-superficie-elevada'
                  )}
                />
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-[var(--text-on-primary)] shadow transition-transform duration-200',
                    darkMode ? 'translate-x-4' : 'translate-x-0.5'
                  )}
                />
              </span>
            </button>

            <div className="mt-1 border-t border-borda pt-1">
              <button
                type="button"
                role="menuitem"
                // Vermelho do par `on-tint`, e não o degrau 500 cru.
                // Medido nas quatro combinações — o item repousa sobre
                // `--surface` e passa a `--surface-elevated` no hover:
                //
                //   text-perigo (o de antes)   3,76 · 4,25 · 3,44 · 3,60   todas reprovam
                //   --on-tint-danger           6,47 · 5,78 · 5,91 · 4,90   todas passam
                //
                // `perigo-forte` seria o palpite óbvio e é o errado: dá
                // 6,47 no claro e **2,47 no escuro**, porque é degrau fixo.
                // Quem resolve é o token que inverte por tema — 700 no
                // claro, 400 no escuro. É a mesma lição do D5-a.
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-on-tint-danger transition-colors hover:bg-superficie-elevada"
                onClick={sair}
              >
                <IconeSair className="h-4 w-4 shrink-0" aria-hidden="true" />
                Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
