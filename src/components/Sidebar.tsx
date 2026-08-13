import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Moon,
  Repeat,
  Settings,
  Sparkles,
  Sun,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

interface SidebarProps {
  aoAbrirNovidades: () => void;
  /** Mostra o ponto no item de novidades quando há versão não vista. */
  temNovidade: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ aoAbrirNovidades, temNovidade }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  if (location.pathname === '/login') return null;

  const iconBaseClass = 'w-5 h-5 mr-2 transition-colors';

  const ehAdministrador = user?.role === 'Administrador';
  const ehEquipe = ehAdministrador || user?.role === 'Tecnico';

  // O ícone herda a cor do item (`currentColor`), então basta o NavLink decidir
  // se está ativo. Antes cada ícone carregava a própria cor, e manter as duas
  // decisões em sincronia era manual.
  const corDoIcone = (isActive: boolean) =>
    cn(iconBaseClass, isActive ? 'opacity-100' : 'opacity-70');

  const menuItems = [
    {
      label: 'Dashboard',
      to: '/dashboard',
      icon: (isActive: boolean) => (
        <LayoutDashboard className={corDoIcone(isActive)} aria-hidden="true" />
      ),
    },
    {
      label: 'Chamados',
      to: '/chamados',
      icon: (isActive: boolean) => (
        <Ticket className={corDoIcone(isActive)} aria-hidden="true" />
      ),
    },
    // Cadastros só para administrador: criar, editar e excluir usuário, setor,
    // categoria e prazo de SLA exigem esse perfil na API. Para o técnico a tela
    // inteira seria só botão que responde 403.
    ...(ehAdministrador
      ? [
          {
            label: 'Cadastros',
            to: '/cadastros',
            icon: (isActive: boolean) => (
              <Settings className={corDoIcone(isActive)} aria-hidden="true" />
            ),
          },
        ]
      : []),
    // Tarefas recorrentes a API libera para administrador e técnico.
    ...(ehEquipe
      ? [
          {
            label: 'Tarefas Recorrentes',
            to: '/tarefas-recorrentes',
            icon: (isActive: boolean) => (
              <Repeat className={corDoIcone(isActive)} aria-hidden="true" />
            ),
          },
        ]
      : []),
  ];

  return (
    <aside
      className="sticky top-0 hidden w-56 flex-col border-r border-borda
                 bg-superficie text-conteudo transition-colors lg:flex"
    >
      <nav className="flex-1 px-2 py-6">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-lg px-3 py-2 font-medium transition-colors',
                    isActive
                      ? 'bg-info/10 text-info'
                      : 'text-conteudo-suave hover:bg-superficie-elevada hover:text-conteudo'
                  )
                }
                end
              >
                {({ isActive }) => (
                  <>
                    {item.icon(isActive)}
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Novidades. Fica junto do rodapé, e não na lista de rotas, porque não
          é uma página — abre um aviso sobre a própria lista. */}
      <div className="border-t border-borda px-2 py-2">
        <button
          type="button"
          onClick={aoAbrirNovidades}
          className="flex w-full items-center rounded-lg px-3 py-2 font-medium text-conteudo-suave
                     transition-colors hover:bg-superficie-elevada hover:text-conteudo
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info"
        >
          <Sparkles className={iconBaseClass} aria-hidden="true" />
          Novidades
          {temNovidade && (
            <span
              className="ml-auto h-2 w-2 rounded-full bg-info"
              aria-label="Há novidades não lidas"
            />
          )}
        </button>
      </div>

      {/* Switch de modo noturno */}
      <div className="border-t border-borda px-4 py-3">
        <div className="flex items-center justify-between font-medium text-conteudo">
          <div className="flex items-center gap-2">
            {darkMode ? (
              // ☀️ Sol amarelo (modo claro)
              <Sun className="w-6 h-6 drop-shadow-md text-alerta" aria-hidden="true" />
            ) : (
              // 🌙 Lua azul (modo escuro)
              <Moon className="w-6 h-6 drop-shadow-md text-info" aria-hidden="true" />
            )}
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={toggleDarkMode}
              className="sr-only peer"
            />
            {/* Trilha */}
            <div className="h-7 w-12 rounded-full bg-superficie-elevada transition-all peer-checked:bg-info"></div>
            {/* Bolinha */}
            <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full border shadow-md transition-transform peer-checked:translate-x-5"></div>
          </label>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
