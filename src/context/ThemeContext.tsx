// src/context/ThemeContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

type ThemeContextType = {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkModeOnLogin: () => void; // 👈 nova função
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // 🔹 Estado inicial com persistência
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  // 🔹 Sincroniza com <html> e localStorage sempre que darkMode mudar
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // 🔹 Alterna o modo escuro manualmente (botão)
  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  /**
   * Escuro como padrão para quem nunca escolheu — e só para esses.
   *
   * Antes isto forçava escuro em todo login, então quem preferia o claro era
   * jogado de volta ao escuro a cada entrada: a preferência valia até sair do
   * sistema e não sobrevivia à volta. Agora só decide quando não há escolha
   * gravada; havendo, ela manda.
   */
  const setDarkModeOnLogin = () => {
    if (localStorage.getItem('theme') === null) setDarkMode(true);
  };

  return (
    <ThemeContext.Provider
      value={{ darkMode, toggleDarkMode, setDarkModeOnLogin }}
    >
      {/* A cor da casca sai dos tokens: quem decide o tom é o CSS, não este
          ternário. Antes o claro e o escuro eram duas strings independentes,
          e cada tela precisava repetir a mesma decisão com `dark:`. */}
      <div className={`${darkMode ? 'dark ' : ''}min-h-screen bg-superficie-base text-conteudo`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return context;
};
