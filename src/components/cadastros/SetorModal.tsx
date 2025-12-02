import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Building,
  AlertCircle,
} from 'lucide-react';
import { useCadastros } from '../../context/CadastrosContext';
import type {
  Setor,
  SetorCreate,
  SetorUpdate,
  ModalMode,
  ValidationErrors,
} from '../../types/cadastros.types';

// ========================================
// INTERFACE DO COMPONENTE
// ========================================

interface SetorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode;
  setor: Setor | null;
}

// ========================================
// COMPONENTE SETOR MODAL
// ========================================

const SetorModal: React.FC<SetorModalProps> = ({
  isOpen,
  onClose,
  mode,
  setor,
}) => {
  const { createSetor, updateSetor } = useCadastros();

  // ========================================
  // ESTADOS LOCAIS
  // ========================================

  const [formData, setFormData] = useState<SetorCreate>({
    nome: '',
    descricao: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);

  // ========================================
  // EFEITOS
  // ========================================

  // Preenche o formulário quando editar/visualizar
  useEffect(() => {
    if (setor && (mode === 'edit' || mode === 'view')) {
      setFormData({
        nome: setor.nome,
        descricao: setor.descricao || '',
      });
    } else {
      setFormData({
        nome: '',
        descricao: '',
      });
    }
    setErrors({});
  }, [setor, mode]);

  // ========================================
  // VALIDAÇÃO
  // ========================================

  const validar = (): boolean => {
    const novosErros: ValidationErrors = {};

    if (!formData.nome || formData.nome.trim().length < 3) {
      novosErros.nome = 'Nome deve ter pelo menos 3 caracteres';
    }

    if (formData.nome && formData.nome.trim().length > 100) {
      novosErros.nome = 'Nome não pode ter mais de 100 caracteres';
    }

    if (formData.descricao && formData.descricao.trim().length > 500) {
      novosErros.descricao = 'Descrição não pode ter mais de 500 caracteres';
    }

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // ========================================
  // HANDLERS
  // ========================================

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Limpa o erro do campo quando o usuário começa a digitar
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validar()) return;

    setLoading(true);
    try {
      if (mode === 'create') {
        await createSetor(formData);
        console.log('✅ Setor criado com sucesso!');
        alert('Setor criado com sucesso!');
      } else if (mode === 'edit' && setor) {
        const updateData: SetorUpdate = {
          nome: formData.nome,
          descricao: formData.descricao,
        };
        await updateSetor(setor.id, updateData);
        console.log('✅ Setor atualizado com sucesso!');
        alert('Setor atualizado com sucesso!');
      }
      onClose();
    } catch (err: any) {
      console.error('❌ Erro ao salvar setor:', err);
      alert(err.response?.data?.detail || 'Erro ao salvar setor');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const modalTitle =
    mode === 'create'
      ? 'Novo Setor'
      : mode === 'edit'
      ? 'Editar Setor'
      : 'Detalhes do Setor';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {modalTitle}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Conteúdo */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Campo Nome */}
            <div className="mb-4">
              <label
                htmlFor="nome"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                disabled={isReadOnly}
                className={`
                  w-full px-4 py-2 border rounded-lg
                  bg-white dark:bg-[#2a2a2a]
                  text-gray-900 dark:text-gray-100
                  ${errors.nome 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600'
                  }
                  ${isReadOnly
                    ? 'cursor-not-allowed opacity-60'
                    : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
                  }
                  transition-colors
                `}
                placeholder="Digite o nome do setor"
                maxLength={100}
              />
              {errors.nome && (
                <div className="mt-1 flex items-center gap-1 text-red-500 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.nome}</span>
                </div>
              )}
            </div>

            {/* Campo Descrição */}
            <div className="mb-6">
              <label
                htmlFor="descricao"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Descrição
              </label>
              <textarea
                id="descricao"
                name="descricao"
                value={formData.descricao}
                onChange={handleInputChange}
                disabled={isReadOnly}
                rows={4}
                className={`
                  w-full px-4 py-2 border rounded-lg
                  bg-white dark:bg-[#2a2a2a]
                  text-gray-900 dark:text-gray-100
                  ${errors.descricao 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600'
                  }
                  ${isReadOnly
                    ? 'cursor-not-allowed opacity-60'
                    : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
                  }
                  transition-colors resize-none
                `}
                placeholder="Digite uma descrição (opcional)"
                maxLength={500}
              />
              {errors.descricao && (
                <div className="mt-1 flex items-center gap-1 text-red-500 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.descricao}</span>
                </div>
              )}
              {!isReadOnly && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formData.descricao?.length || 0}/500 caracteres
                </div>
              )}
            </div>

            {/* Informações de auditoria (apenas visualização) */}
            {mode === 'view' && setor && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Informações de Auditoria
                </h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-medium">ID:</span> #{setor.id}
                  </div>
                  <div>
                    <span className="font-medium">Criado em:</span>{' '}
                    {setor.criado_em 
                      ? new Date(setor.criado_em).toLocaleString('pt-BR')
                      : 'N/A'
                    }
                  </div>
                  <div>
                    <span className="font-medium">Atualizado em:</span>{' '}
                    {setor.atualizado_em 
                      ? new Date(setor.atualizado_em).toLocaleString('pt-BR')
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                  bg-white dark:bg-[#2a2a2a]
                  border border-gray-300 dark:border-gray-600
                  rounded-lg hover:bg-gray-50 dark:hover:bg-[#333333]
                  transition-colors"
              >
                {isReadOnly ? 'Fechar' : 'Cancelar'}
              </button>
              
              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={loading}
                  className={`
                    px-4 py-2 text-sm font-medium text-white
                    bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600
                    rounded-lg transition-colors
                    flex items-center gap-2
                    ${loading ? 'opacity-60 cursor-not-allowed' : ''}
                  `}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetorModal;
