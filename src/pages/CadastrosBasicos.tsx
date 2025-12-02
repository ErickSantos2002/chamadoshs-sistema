import React, { useState } from 'react';
import { Settings, Tag, Building, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { CadastrosProvider } from '../context/CadastrosContext';
import CategoriasTab from '../components/cadastros/CategoriasTab';
import SetoresTab from '../components/cadastros/SetoresTab';
import UsuariosTab from '../components/cadastros/UsuariosTab';
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

  const podeVerUsuarios = user?.role === 'Administrador';

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
      visible: podeVerUsuarios,
    },
  ];

  // Filtra abas visíveis
  const abasVisiveis = abas.filter((aba) => aba.visible);

  // Se a aba ativa não está visível, muda para a primeira aba visível
  React.useEffect(() => {
    if (!abasVisiveis.find((aba) => aba.id === abaAtiva)) {
      setAbaAtiva(abasVisiveis[0]?.id || 'categorias');
    }
  }, [podeVerUsuarios, abaAtiva, abasVisiveis]);

  // ========================================
  // RENDER
  // ========================================

  return (
    <CadastrosProvider>
      <div className="h-full flex flex-col p-6 bg-gray-100 dark:bg-[#121212]">
        {/* Header */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-[#2d2d2d] rounded-xl shadow-md p-6 transition-colors mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Título e Descrição */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-[#facc15] tracking-tight">
                Gestão de Cadastros Básicos
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Gerencie categorias, setores e usuários do sistema
              </p>
            </div>
          </div>
        </div>

        {/* Container Principal */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 rounded-xl border border-gray-200 dark:border-[#2d2d2d] shadow-md transition-colors">
          {/* Sistema de Abas */}
          <div className="border-b border-gray-200 dark:border-[#2d2d2d]">
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
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-[#3a3a3a]'
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
