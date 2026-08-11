import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Moon, Repeat, Settings, Sun, Ticket } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  if (location.pathname === '/login') return null;

  const iconBaseClass = 'w-5 h-5 mr-2 transition-colors';

  const ehAdministrador = user?.role === 'Administrador';
  const ehEquipe = ehAdministrador || user?.role === 'Tecnico';

  // A cor do ícone acompanha o tema por classe do Tailwind. Antes vinha em hexa
  // dentro da URL do ícone, o que obrigava a ler o darkMode aqui e ainda pedir
  // uma imagem nova ao trocar de tema.
  const corDoIcone = (isActive: boolean) =>
    `${iconBaseClass} ${isActive ? 'opacity-100' : 'opacity-70'} text-[#1D4ED8] dark:text-[#D1D1D1]`;

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
      className="hidden lg:flex w-56 
      bg-white/95 dark:bg-[#1e1e1e]/95 
      text-gray-900 dark:text-lightGray 
      shadow-md sticky top-0 flex-col 
      border-r border-gray-200 dark:border-[#2d2d2d] 
      transition-colors"
    >
      <nav className="flex-1 py-6">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-200 text-blue-700 dark:bg-accentGray/50 dark:text-lightGray'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-accentGray/30'
                  }`
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

      {/* Switch de modo noturno */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-accentGray">
        <div className="flex items-center justify-between font-medium text-gray-800 dark:text-lightGray">
          <div className="flex items-center gap-2">
            {darkMode ? (
              // ☀️ Sol amarelo (modo claro)
              <Sun className="w-6 h-6 drop-shadow-md text-yellow-400" aria-hidden="true" />
            ) : (
              // 🌙 Lua azul (modo escuro)
              <Moon className="w-6 h-6 drop-shadow-md text-blue-600" aria-hidden="true" />
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
            <div className="w-12 h-7 bg-gray-400 dark:bg-accentGray rounded-full peer-checked:bg-blue-600 transition-all"></div>
            {/* Bolinha */}
            <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full border shadow-md transition-transform peer-checked:translate-x-5"></div>
          </label>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
