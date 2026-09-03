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

/**
 * A galeria da casca — SÓ EM DESENVOLVIMENTO.
 *
 * Existe para produzir os screenshots que a §26 exige no Checkpoint 1: a casca
 * só aparece depois do login, o login depende da API, e o front rodando
 * sozinho não passa da tela de login. A galeria monta a casca de verdade, sem
 * token e sem rede, com o estado escolhido pela URL.
 *
 * O Vite troca `import.meta.env.DEV` por `false` literal no build, então o
 * `import()` abaixo morre no tree-shaking e o arquivo não vira pedaço nenhum
 * do bundle de produção. A rota também deixa de ser registrada, e
 * `/dev/galeria` cai no 404 como qualquer endereço que não existe.
 */
const GaleriaDaCasca = import.meta.env.DEV
  ? lazy(() => import('./pages/dev/GaleriaDaCasca'))
  : null;

/**
 * A galeria de COMPONENTES — mesma regra, mesmo motivo, mesmo prazo.
 *
 * A da casca fotografa a moldura; esta fotografa o que vai dentro dela: os
 * primitivos em todos os estados, nos dois temas, com a razão de contraste
 * medida na hora sob cada amostra. É o que fecha o Checkpoint 2 da §26.
 *
 * Sai na Fase 20, junto com a outra.
 */
const GaleriaDeComponentes = import.meta.env.DEV
  ? lazy(() => import('./pages/dev/GaleriaDeComponentes'))
  : null;

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

      {GaleriaDaCasca && (
        <Route path="/dev/galeria" element={<GaleriaDaCasca />} />
      )}

      {GaleriaDeComponentes && (
        <Route path="/dev/componentes" element={<GaleriaDeComponentes />} />
      )}

      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
