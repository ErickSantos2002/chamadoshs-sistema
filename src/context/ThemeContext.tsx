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

    // ── A leitura abaixo existe para forçar REPINTURA ────────────────
    //
    // Trocar a classe muda as variáveis, e o estilo computado acompanha —
    // medido nas duas direções, no mesmo nó, sem remontar. **O que não
    // acompanha é o pixel.**
    //
    // Reproduzido em produção em 10/09/2026, no painel do menu do usuário:
    //
    //     html: "dark"   --superficie: "19 34 56"
    //     PAINEL_BG computado: "rgb(19, 34, 56)"
    //     e a tela mostrando o painel BRANCO
    //
    // Abrir o DevTools fazia o painel virar navy sozinho, sem nada mudar no
    // estilo — que é a assinatura de invalidação de pintura que não aconteceu.
    //
    // Por que só o painel: ele vive no `<header>`, que é estático. Os cartões
    // vivem no `<main class="overflow-y-auto">`, um contêiner de rolagem que o
    // navegador costuma promover a camada própria — e camada promovida é
    // repintada. A do cabeçalho, não.
    //
    // ── O que esta linha NÃO tem ───────────────────────────────
    //
    // **Prova.** Este ambiente não consegue observar pintura: a aba do agente
    // reporta `hidden`, e aba oculta não pinta. Pior — **qualquer observação
    // destrói o fenômeno**, porque capturar tela e abrir o DevTools forçam o
    // repaint que o defeito consiste em não ter.
    //
    // Então isto entra como **hipótese de baixo risco**, e não como conserto
    // provado. A verificação é manual, está na tabela das catracas em
    // VÃOS CONHECIDOS, e a receita é: abrir o menu no claro, ligar o modo
    // escuro sem fechar, olhar o painel.
    //
    // Custo se não resolver: uma leitura de layout por troca de tema. Custo se
    // resolver: o mesmo. Não há perda de foco, ao contrário de remontar o
    // painel por `key`, que era a outra saída e leva o foco embora do botão
    // que a pessoa acabou de clicar.
    void root.offsetHeight;
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
      <div className={`${darkMode ? 'dark ' : ''}h-full bg-superficie-base text-conteudo`}>
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
