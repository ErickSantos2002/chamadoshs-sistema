import React, { useState } from 'react';
import { Settings, Tag, Building, Users, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { CadastrosProvider } from '../context/CadastrosContext';
import CategoriasTab from '../components/cadastros/CategoriasTab';
import SetoresTab from '../components/cadastros/SetoresTab';
import UsuariosTab from '../components/cadastros/UsuariosTab';
import SlaTab from '../components/cadastros/SlaTab';
import Bloqueio from './Bloqueio';
import type { TipoAba } from '../types/cadastros.types';

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
  // A tela inteira é de administrador: criar, editar e excluir usuário, setor,
  // categoria e prazo de SLA exigem esse perfil na API. O menu já esconde o
  // item, e esta guarda cobre quem chegar digitando a URL.

  const podeGerenciarCadastros = user?.role === 'Administrador';

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
      icon: <Tag className="w-4 h-4" />,
      component: <CategoriasTab />,
      visible: true,
    },
    {
      id: 'setores',
      label: 'Setores',
      icon: <Building className="w-4 h-4" />,
      component: <SetoresTab />,
      visible: true,
    },
    {
      id: 'usuarios',
      label: 'Usuários',
      icon: <Users className="w-4 h-4" />,
      component: <UsuariosTab />,
      visible: true,
    },
    {
      id: 'sla',
      label: 'SLA',
      icon: <Clock className="w-4 h-4" />,
      component: <SlaTab ativo={abaAtiva === 'sla'} />,
      visible: true,
    },
  ];

  // Filtra abas visíveis
  const abasVisiveis = abas.filter((aba) => aba.visible);

  // ========================================
  // RENDER
  // ========================================

  if (!podeGerenciarCadastros) {
    return <Bloqueio />;
  }

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
                ? 'border-blue-600 text-info-forte dark:text-info-suave'
                : 'border-transparent text-conteudo-tenue hover:text-conteudo hover:border-borda dark:hover:border-[#3a3a3a]'
            }
          `}
                >
                  {aba.icon}
                  <span>{aba.label}</span>

                  {aba.id === 'usuarios' && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400 rounded-full">
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
