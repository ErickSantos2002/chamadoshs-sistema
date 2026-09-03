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
      <div className="flex h-full flex-col gap-5">
        {/* Header */}
        <div className="flex shrink-0 flex-col gap-4 rounded-2xl border border-borda bg-superficie px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Título e Descrição */}
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-conteudo">
              Gestão de Cadastros Básicos
            </h1>

            <p className="mt-0.5 text-sm text-conteudo-tenue">
              Gerencie categorias, setores e usuários do sistema
            </p>
          </div>
        </div>

        {/* Container Principal */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-borda bg-superficie">
          {/* Sistema de Abas */}
          <div className="shrink-0 border-b border-borda">
            {/* `role="tablist"` com `tab`/`tabpanel`, e nao quatro botoes
                soltos.
                
                Sem isso o leitor de tela anuncia "Categorias, botao" quatro
                vezes, sem dizer que sao alternativas de um mesmo lugar nem
                qual esta ativa — e a pessoa nao tem como saber que escolher
                uma troca o conteudo abaixo. Com a marcacao, ele anuncia
                "Categorias, aba, selecionada, 1 de 4".
                
                `aria-controls` e o que amarra a aba ao painel: e por ele que o
                leitor sabe QUAL regiao mudou quando a escolha muda. */}
            <nav
              role="tablist"
              aria-label="Cadastros básicos"
              className="-mb-px flex overflow-x-auto px-2"
            >
              {abasVisiveis.map((aba) => (
                <button
                  key={aba.id}
                  type="button"
                  role="tab"
                  id={`aba-${aba.id}`}
                  aria-selected={abaAtiva === aba.id}
                  aria-controls={`painel-${aba.id}`}
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                    abaAtiva === aba.id
                      ? 'border-sinal text-sinal'
                      : 'border-transparent text-conteudo-suave hover:border-borda hover:text-conteudo'
                  }`}
                >
                  {aba.icon}
                  <span>{aba.label}</span>

                  {aba.id === 'usuarios' && (
                    <span className="ml-1 rounded-full bg-alerta/15 px-2 py-0.5 text-[11px] font-semibold text-on-tint-warning">
                      Admin
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Conteúdo da Aba Ativa */}
          <div className="min-h-0 flex-1 overflow-auto">
            {abasVisiveis.map((aba) => (
              <div
                key={aba.id}
                role="tabpanel"
                id={`painel-${aba.id}`}
                aria-labelledby={`aba-${aba.id}`}
                // O painel escondido sai da arvore de acessibilidade junto
                // com o `hidden` da classe: sem isto, o leitor de tela leria o
                // conteudo das quatro abas em sequencia, e a pessoa ouviria a
                // tabela de usuarios enquanto olha para a de categorias.
                hidden={abaAtiva !== aba.id}
                className={`${abaAtiva === aba.id ? 'h-full' : 'hidden'}`}
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
