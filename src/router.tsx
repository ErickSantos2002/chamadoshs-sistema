import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy loading de páginas para melhor performance
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Chamados = lazy(() => import('./pages/Chamados'));
const ChamadoDetalhes = lazy(() => import('./pages/ChamadoDetalhes'));
const NovoChamado = lazy(() => import('./pages/NovoChamado'));
const CadastrosBasicos = lazy(() => import('./pages/CadastrosBasicos'));
const TarefasRecorrentes = lazy(() => import('./pages/TarefasRecorrentes'));
const Auditoria = lazy(() => import('./pages/Auditoria'));
const NotFound = lazy(() => import('./pages/NotFound'));

import ProtectedRoute from './components/ProtectedRoute';

// Loading Fallback Component
const PageLoader: React.FC = () => (
  // `min-h-full`, e não `min-h-screen`: isto aparece DENTRO do `<main>`,
  // que já desconta a faixa do topo e o próprio padding. Com a altura da
  // viewport inteira, toda troca de rota com pedaço ainda não baixado
  // criava uma barra de rolagem e jogava o spinner abaixo do centro.
  <div className="flex min-h-full items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-sinal mx-auto"></div>
      <p className="mt-4 text-conteudo-suave">Carregando...</p>
    </div>
  </div>
);

const AppRoutes: React.FC = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/chamados"
        element={
          <ProtectedRoute>
            <Chamados />
          </ProtectedRoute>
        }
      />

      <Route
        path="/chamados/novo"
        element={
          <ProtectedRoute>
            <NovoChamado />
          </ProtectedRoute>
        }
      />

      <Route
        path="/chamados/:id"
        element={
          <ProtectedRoute>
            <ChamadoDetalhes />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cadastros"
        element={
          <ProtectedRoute
            perfil={['Administrador', 'Tecnico']}
            area="Cadastros"
            quemTem="administradores e técnicos"
          >
            <CadastrosBasicos />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tarefas-recorrentes"
        element={
          <ProtectedRoute
            perfil={['Administrador', 'Tecnico']}
            area="Tarefas Recorrentes"
            quemTem="administradores e técnicos"
          >
            <TarefasRecorrentes />
          </ProtectedRoute>
        }
      />

      {/* A trilha é leitura: diz quem mexeu em quê, sem dar poder. Vai para a
          equipe, ao contrário da aba de Usuários dentro de Cadastros. */}
      <Route
        path="/auditoria"
        element={
          <ProtectedRoute
            perfil={['Administrador', 'Tecnico']}
            area="Auditoria"
            quemTem="administradores e técnicos"
          >
            <Auditoria />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
