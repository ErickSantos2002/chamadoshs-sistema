// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChamadosProvider } from './context/ChamadosContext';
import './styles/index.css'; // Importa o Tailwind e estilos globais

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <ChamadosProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ChamadosProvider>
        </AuthProvider>
      </ThemeProvider>
  </React.StrictMode>,
);
