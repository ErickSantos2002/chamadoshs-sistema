import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { CadastrosProvider } from '../context/CadastrosContext';
import CategoriasTab from '../components/cadastros/CategoriasTab';
import SetoresTab from '../components/cadastros/SetoresTab';
import UsuariosTab from '../components/cadastros/UsuariosTab';
import SlaTab from '../components/cadastros/SlaTab';
import Bloqueio from './Bloqueio';
import type { TipoAba } from '../types/cadastros.types';
import { IconeEtiqueta, IconeRelogio, IconeSetor, IconeUsuarios } from '../components/ui/icones';

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

const CadastrosBasicos: React.FC = () => {
  const { user } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<TipoAba>('categorias');

  // ========================================
  // VERIFICAÇÃO DE PERMISSÕES
  // ========================================
  //
  // A tela é da equipe; a aba de Usuários é só do administrador.
  //
  // A divisão não é de conveniência. Editar usuário inclui editar o campo de
  // PERFIL — quem tem essa aba pode se promover a administrador, e aí os dois
  // perfis viram um só. Setores, categorias e prazos de SLA são catálogo de
  // trabalho; conta de gente é controle de acesso.
  //
  // A aba APARECE para o técnico e explica, em vez de sumir — mesma decisão do
  // menu lateral. Quem não vê a aba não sabe que ela existe, e não pede acesso
  // ao que não sabe que há. A proteção continua sendo a API recusar.
  //
  // Quem não é da equipe nem chega aqui: a guarda está na rota.
  const ehAdministrador = user?.role === 'Administrador';

  // ========================================
  // CONFIGURAÇÃO DAS ABAS
  // ========================================

  interface AbaConfig {
    id: TipoAba;
    label: string;
    icon: React.ReactNode;
    component: React.ReactNode;
    visible: boolean;
  }

  const abas: AbaConfig[] = [
    {
      id: 'categorias',
      label: 'Categorias',
      icon: <IconeEtiqueta className="w-4 h-4" />,
      component: <CategoriasTab />,
      visible: true,
    },
    {
      id: 'setores',
      label: 'Setores',
      icon: <IconeSetor className="w-4 h-4" />,
      component: <SetoresTab />,
      visible: true,
    },
    {
      id: 'usuarios',
      label: 'Usuários',
      icon: <IconeUsuarios className="w-4 h-4" />,
      component: ehAdministrador ? (
        <UsuariosTab />
      ) : (
        <Bloqueio area="Usuários" quemTem="administradores" />
      ),
      visible: true,
    },
    {
      id: 'sla',
      label: 'SLA',
      icon: <IconeRelogio className="w-4 h-4" />,
      component: <SlaTab ativo={abaAtiva === 'sla'} />,
      visible: true,
    },
  ];

  // Filtra abas visíveis
  const abasVisiveis = abas.filter((aba) => aba.visible);

  // ========================================
  // RENDER
  // ========================================

  return (
    <CadastrosProvider>
      <div className="h-full flex flex-col p-6 bg-superficie-base">
        {/* Header */}
        <div className="bg-superficie border border-borda rounded-xl shadow-md p-6 transition-colors mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

            {/* Título e Descrição */}
            <div>
              <h1 className="text-3xl font-bold text-info tracking-tight">
                Gestão de Cadastros Básicos
              </h1>

              <p className="text-conteudo-suave mt-1">
                Gerencie categorias, setores e usuários do sistema
              </p>
            </div>

          </div>
        </div>

        {/* Container Principal */}
        <div className="bg-superficie rounded-xl border border-borda shadow-md transition-colors">
          {/* Sistema de Abas */}
          <div className="border-b border-borda">
            <nav className="flex overflow-x-auto -mb-px px-4">
              {abasVisiveis.map((aba) => (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`
            flex items-center gap-2 px-6 py-3 font-medium text-sm
            border-b-2 transition-all duration-200 whitespace-nowrap
            ${
              abaAtiva === aba.id
                ? 'border-sinal text-info-forte dark:text-info-suave'
                : 'border-transparent text-conteudo-tenue hover:text-conteudo hover:border-borda'
            }
          `}
                >
                  {aba.icon}
                  <span>{aba.label}</span>

                  {aba.id === 'usuarios' && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-alerta/15 text-alerta-forte dark:text-alerta-suave rounded-full">
                      Admin
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Conteúdo da Aba Ativa */}
          <div className="p-6">
            {abasVisiveis.map((aba) => (
              <div
                key={aba.id}
                className={`${abaAtiva === aba.id ? 'block' : 'hidden'}`}
              >
                {aba.component}
              </div>
            ))}
          </div>
        </div>
      </div>
    </CadastrosProvider>
  );
};

export default CadastrosBasicos;
