import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ITENS_DO_MENU } from '../lib/navegacao';
import logo from '../assets/HS2.ico';
import { IconeFechar, IconeLua, IconeMenu, IconeSair, IconeSol } from './ui/icones';


const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation(); // ✅ Antes de usar
  const { darkMode, toggleDarkMode } = useTheme();

  const [menuVisivel, setMenuVisivel] = useState(false);
  const [menuAnimado, setMenuAnimado] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  if (location.pathname === '/login') return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const abrirMenu = () => {
    setMenuVisivel(true);
    setTimeout(() => setMenuAnimado(true), 10);
  };

  const fecharMenu = () => {
    setMenuAnimado(false);
    setTimeout(() => setMenuVisivel(false), 300);
  };

  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        fecharMenu();
      }
    };
    if (menuVisivel) {
      document.addEventListener('mousedown', handleClickFora);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('mousedown', handleClickFora);
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
      document.body.style.overflow = '';
    };
  }, [menuVisivel]);

  const iconBaseClass = 'w-5 h-5 mr-2 transition-colors';

  // Mesma regra da Sidebar: a cor sai da classe do Tailwind, não de um hexa
  // embutido na URL do ícone.
  const corDoIcone = (active: boolean) =>
    `${iconBaseClass} ${active ? 'opacity-100' : 'opacity-70'}`;

  return (
    <>
      {/* HEADER FIXO */}
      <header
        className="sticky top-0 inset-x-0 z-50 
        bg-superficie 
        backdrop-blur-sm shadow-md 
        flex items-center justify-between px-4 py-3 
        transition-colors border-b border-borda"
      >
        <div className="flex items-center gap-4">
          {/* Botão menu mobile */}
          {/* Era o caractere `☰`. Um glifo de texto no lugar de um ícone
              muda de desenho conforme a fonte instalada e não tem nome para
              leitor de tela. */}
          <button
            type="button"
            onClick={abrirMenu}
            aria-label="Abrir menu"
            className="block text-conteudo focus:outline-none lg:hidden"
          >
            <IconeMenu className="h-6 w-6" />
          </button>

          {/* Logo + título */}
          <Link
            to="/dashboard"
            className="hidden lg:flex items-center gap-2 font-bold text-xl text-conteudo hover:scale-105 transition no-underline group"
          >
            <img
              src={logo}
              alt="Logo"
              className="w-6 h-6 transition-transform duration-500 group-hover:rotate-[360deg]"
            />
            <span>ChamadosHS</span>
          </Link>
        </div>

        {/* Infos e botão sair */}
        <div className="flex items-center gap-4 text-sm">
          <span className="group text-conteudo-suave">
            <span>
              {user?.username}{' '}
              <span className="text-xs text-conteudo-tenue">
                ({user?.role})
              </span>
            </span>
          </span>

          {!menuVisivel && (
            <button
              onClick={handleLogout}
              className="bg-info text-white px-3 py-1 rounded-lg font-semibold hover:bg-info-forte transition"
            >
              Sair
            </button>
          )}
        </div>
      </header>

      {/* MENU MOBILE */}
      {menuVisivel && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={fecharMenu}
          />
          <div
            ref={menuRef}
            className={`fixed inset-y-0 left-0 w-[70vw] bg-superficie z-50 shadow-lg px-6 pb-6 flex flex-col transform transition-transform duration-300 ${
              menuAnimado ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Cabeçalho do menu */}
            <div className="flex items-center justify-between py-3 mb-3 border-b border-borda">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Logo" className="w-6 h-6 object-contain" />
                <span className="font-bold text-lg text-conteudo">
                  Menu
                </span>
              </div>
              <button
                type="button"
                onClick={fecharMenu}
                aria-label="Fechar menu"
                className="text-conteudo-suave hover:text-conteudo"
              >
                <IconeFechar className="h-5 w-5" />
              </button>
            </div>

            {/* Navegação */}
            {/* As mesmas áreas da Sidebar, da mesma lista. Este menu tinha a
                própria cópia, gateada em `role === 'Administrador'` e sem
                Auditoria nem Tarefas Recorrentes — então abaixo de `lg` o
                técnico não via nada além de Dashboard e Chamados. */}
            <nav className="flex flex-col gap-4">
              {ITENS_DO_MENU.map(({ label, to, Icone }) => {
                const active = location.pathname === to;

                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={fecharMenu}
                    className={`flex items-center font-medium transition px-2 py-1 rounded-md
                      ${active
                        ? "text-info bg-info/10"
                        : "text-conteudo-suave hover:bg-superficie-elevada hover:text-conteudo"
                      }
                    `}
                  >
                    <Icone className={corDoIcone(active)} aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Rodapé do menu mobile */}
            <div className="mt-auto flex flex-col gap-3 border-t border-borda pt-4">
              <div className="flex items-center justify-between font-medium text-conteudo-suave py-2">
                <div className="flex items-center gap-2">
                  {darkMode ? (
                    <IconeSol className="w-5 h-5 text-alerta" aria-hidden="true" />
                  ) : (
                    <IconeLua className="w-5 h-5 text-info" aria-hidden="true" />
                  )}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={toggleDarkMode}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-superficie-elevada rounded-full peer peer-checked:bg-info transition"></div>
                  <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full border transition peer-checked:translate-x-5"></div>
                </label>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center w-full text-left text-perigo font-medium hover:text-perigo-forte py-2 rounded-lg transition"
              >
                <IconeSair className="w-5 h-5" aria-hidden="true" />
                <span className="ml-2">Sair</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Header;
