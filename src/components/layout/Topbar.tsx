import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';
import { Avatar } from '../ui';
import { IconeLua, IconeMenu, IconeSair, IconeSeta } from '../ui/icones';

interface TopbarProps {
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

      <div className="flex-1" />

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

            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-conteudo-suave transition-colors hover:bg-superficie-elevada hover:text-conteudo"
              onClick={toggleDarkMode}
              aria-pressed={darkMode}
            >
              <IconeLua className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 text-left">Modo escuro</span>
              {/* Interruptor. O trilho é `primary` e não `sinal` porque aqui
                  ele é PREENCHIMENTO, não texto: é o mesmo azul do HelpHS. */}
              <span
                className={cn(
                  'relative h-5 w-9 rounded-full transition-colors duration-200',
                  darkMode ? 'bg-primary' : 'bg-borda'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
                    darkMode ? 'translate-x-4' : 'translate-x-0.5'
                  )}
                />
              </span>
            </button>

            <div className="mt-1 border-t border-borda pt-1">
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-perigo transition-colors hover:bg-superficie-elevada"
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
