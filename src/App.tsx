import React from 'react';
import { useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './styles/index.css'; // Importa o Tailwind e estilos globais
import AppRoutes from './router';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CentralButton from './components/CentralButton';
import NovidadesModal from './components/NovidadesModal';
import { useNovidades } from './hooks/useNovidades';

// Rotas onde o layout (Header/Sidebar) não deve aparecer (ex: login)
const noLayoutRoutes = ['/login'];

const App: React.FC = () => {
  const location = useLocation();
  const hideLayout = noLayoutRoutes.includes(location.pathname);

  // O aviso vive aqui, e não na Sidebar, porque a Sidebar some abaixo de
  // `lg` — quem usa no celular nunca veria novidade nenhuma.
  const novidades = useNovidades();

  if (hideLayout) {
    // 🔥 Quando for rota sem layout, renderiza só as rotas
    return (
      <>
        <AppRoutes />
        <Toaster
          position="top-right"
          containerStyle={{
            top: 80,
            zIndex: 9999,
          }}
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--toast-bg)',
              color: 'var(--toast-color)',
              border: '1px solid var(--toast-border)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="h-screen flex flex-col bg-superficie-base text-conteudo transition-colors">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            aoAbrirNovidades={novidades.abrir}
            temNovidade={novidades.temNovidade}
          />
          <main className="flex-1 overflow-auto bg-superficie-base transition-colors">
            <AppRoutes />
          </main>
        </div>
      </div>

      <NovidadesModal
        aberto={novidades.aberto}
        aoFechar={novidades.fechar}
        versaoAtual={novidades.versaoAtual}
      />

      {/* Botão Flutuante Central HS */}
      <CentralButton />

      <Toaster
        position="top-right"
        containerStyle={{
          top: 80,
          zIndex: 9999,
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-color)',
            border: '1px solid var(--toast-border)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
};

export default App;
