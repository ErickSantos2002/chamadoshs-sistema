import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { BlocoCarregando } from './components/ui';

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
 * ── O QUE SAI NA FASE 20 ─────────────────────────────────────────────
 *
 * Esta é a lista, e ela mora aqui para não haver duas:
 *
 *   1. `pages/dev/GaleriaDaCasca.tsx` e a rota `/dev/galeria`
 *   2. `pages/dev/GaleriaDeComponentes.tsx` e a rota `/dev/componentes`
 *   3. **o gancho de tema por URL em `main.tsx`** — o bloco `?tema=` que
 *      escreve a classe e o `data-tema-pronto` antes da primeira pintura
 *
 * As três são andaimes de captura, e as três já são inertes em produção pelo
 * `import.meta.env.DEV`. Sair da Fase 20 é tirar o andaime do código-fonte,
 * não do bundle — no bundle elas nunca estiveram.
 *
 * O terceiro item entrou na lista em 04/09/2026, quando o gancho deixou de
 * valer só para `/dev/` e passou a valer para qualquer caminho com `?tema=`,
 * para as dezesseis capturas do Checkpoint 3. Ficou mais útil e mais largo, e
 * por isso mais importante de não esquecer aqui.
 *
 * Quem tirar: `scripts/canario-css.js`, `scripts/sonda-captura.js` e
 * `docs/design-system-migration/checkpoint-3/protocolo-de-captura.md` dependem
 * do item 3, e saem junto ou perdem o sentido.
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
    {/* O anel era 64px com só a borda de BAIXO pintada — um quarto de arco.
        Passa a ser o anel de três quartos do pacote, em `lg` (32px), que é o
        tamanho que o `Spinner.prompt.md` reserva para vazio de página. */}
    <BlocoCarregando tamanho="lg">
      <p className="text-conteudo-suave">Carregando...</p>
    </BlocoCarregando>
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
