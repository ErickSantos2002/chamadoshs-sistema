import React from 'react';
import { useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './styles/index.css'; // Importa o Tailwind e estilos globais
import AppRoutes from './router';
import AppLayout from './components/layout/AppLayout';
import CentralButton from './components/CentralButton';
import NovidadesModal from './components/NovidadesModal';
import { useNovidades } from './hooks/useNovidades';

// Rotas onde a casca (barra lateral e topo) não deve aparecer.
const noLayoutRoutes = ['/login'];

/**
 * O toast é o mesmo nas duas situações — com casca e sem — então a
 * configuração fica num lugar só. Estava duplicada, e as duas cópias já
 * podiam ter divergido sem ninguém notar.
 *
 * As cores saem de CSS variables porque o react-hot-toast recebe um objeto de
 * estilo em JS e não enxerga classe do Tailwind.
 */
const AvisosFlutuantes: React.FC = () => (
  <Toaster
    position="top-right"
    containerStyle={{ top: 80, zIndex: 9999 }}
    toastOptions={{
      duration: 4000,
      style: {
        background: 'var(--toast-bg)',
        color: 'var(--toast-color)',
        border: '1px solid var(--toast-border)',
      },
      // O ícone sai do token de significado do design system, como o resto do
      // toast. Eram quatro hexadecimais cravados — os últimos do arquivo.
      success: {
        iconTheme: {
          primary: 'var(--color-success-500)',
          secondary: 'var(--color-white)',
        },
      },
      error: {
        iconTheme: {
          primary: 'var(--color-danger-500)',
          secondary: 'var(--color-white)',
        },
      },
    }}
  />
);

const App: React.FC = () => {
  const location = useLocation();
  const hideLayout = noLayoutRoutes.includes(location.pathname);

  // O aviso vive aqui, e não dentro da barra lateral, porque quem abre a
  // gaveta no celular precisa que ele já esteja montado para poder abrir.
  const novidades = useNovidades();

  if (hideLayout) {
    return (
      <>
        <AppRoutes />
        <AvisosFlutuantes />
      </>
    );
  }

  return (
    <>
      <AppLayout
        aoAbrirNovidades={novidades.abrir}
        temNovidade={novidades.temNovidade}
        versao={novidades.versaoAtual}
      >
        <AppRoutes />
      </AppLayout>

      <NovidadesModal
        aberto={novidades.aberto}
        aoFechar={novidades.fechar}
        versaoAtual={novidades.versaoAtual}
      />

      {/* Botão flutuante da Central HS */}
      <CentralButton />

      <AvisosFlutuantes />
    </>
  );
};

export default App;
