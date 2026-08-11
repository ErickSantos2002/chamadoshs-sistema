import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { useCadastros } from '../../context/CadastrosContext';
import type {
  Categoria,
  CategoriaCreate,
  CategoriaUpdate,
  ModalMode,
  ValidationErrors,
} from '../../types/cadastros.types';

// ========================================
// INTERFACE DO COMPONENTE
// ========================================

interface CategoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode;
  categoria: Categoria | null;
}

// ========================================
// COMPONENTE CATEGORIA MODAL
// ========================================

const CategoriaModal: React.FC<CategoriaModalProps> = ({
  isOpen,
  onClose,
  mode,
  categoria,
}) => {
  const { createCategoria, updateCategoria } = useCadastros();

  // ========================================
  // ESTADOS LOCAIS
  // ========================================

  const [formData, setFormData] = useState<CategoriaCreate>({
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
    if (categoria && (mode === 'edit' || mode === 'view')) {
      setFormData({
        nome: categoria.nome,
        descricao: categoria.descricao || '',
      });
    } else {
      setFormData({
        nome: '',
        descricao: '',
      });
    }
    setErrors({});
  }, [categoria, mode]);

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
        await createCategoria(formData);
        console.log('✅ Categoria criada com sucesso!');
        alert('Categoria criada com sucesso!');
      } else if (mode === 'edit' && categoria) {
        const updateData: CategoriaUpdate = {
          nome: formData.nome,
          descricao: formData.descricao,
        };
        await updateCategoria(categoria.id, updateData);
        console.log('✅ Categoria atualizada com sucesso!');
        alert('Categoria atualizada com sucesso!');
      }
      onClose();
    } catch (err: any) {
      console.error('❌ Erro ao salvar categoria:', err);
      alert(err.response?.data?.detail || 'Erro ao salvar categoria');
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
      ? 'Nova Categoria'
      : mode === 'edit'
      ? 'Editar Categoria'
      : 'Detalhes da Categoria';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-superficie rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-borda">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-info-forte dark:text-info-suave" />
              <h2 className="text-xl font-semibold text-conteudo">
                {modalTitle}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-superficie-elevada transition-colors"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5 text-conteudo-tenue" />
            </button>
          </div>

          {/* Conteúdo */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Campo Nome */}
            <div className="mb-4">
              <label
                htmlFor="nome"
                className="block text-sm font-medium text-conteudo-suave mb-2"
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
                  bg-superficie
                  text-conteudo
                  ${errors.nome 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-borda'
                  }
                  ${isReadOnly
                    ? 'cursor-not-allowed opacity-60'
                    : 'focus:outline-none focus:ring-2 focus:ring-info'
                  }
                  transition-colors
                `}
                placeholder="Digite o nome da categoria"
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
                className="block text-sm font-medium text-conteudo-suave mb-2"
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
                  bg-superficie
                  text-conteudo
                  ${errors.descricao 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-borda'
                  }
                  ${isReadOnly
                    ? 'cursor-not-allowed opacity-60'
                    : 'focus:outline-none focus:ring-2 focus:ring-info'
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
                <div className="mt-1 text-xs text-conteudo-tenue">
                  {formData.descricao?.length || 0}/500 caracteres
                </div>
              )}
            </div>

            {/* Informações de auditoria (apenas visualização) */}
            {mode === 'view' && categoria && (
              <div className="mb-6 p-4 bg-superficie-elevada rounded-lg">
                <h3 className="text-sm font-medium text-conteudo-suave mb-2">
                  Informações de Auditoria
                </h3>
                <div className="space-y-2 text-sm text-conteudo-suave">
                  <div>
                    <span className="font-medium">ID:</span> #{categoria.id}
                  </div>
                  <div>
                    <span className="font-medium">Criado em:</span>{' '}
                    {categoria.created_at
                      ? new Date(categoria.created_at).toLocaleString('pt-BR')
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
                className="px-4 py-2 text-sm font-medium text-conteudo-suave
                  bg-superficie
                  border border-borda
                  rounded-lg hover:bg-superficie-elevada
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
                    bg-info hover:bg-info-forte dark:bg-blue-500 dark:hover:bg-blue-600
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

export default CategoriaModal;
