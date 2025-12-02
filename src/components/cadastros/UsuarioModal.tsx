import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Users,
  AlertCircle,
  Building,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useCadastros } from '../../context/CadastrosContext';
import { getRoleName } from '../../utils/roleMapper';
import type {
  Usuario,
  UsuarioCreate,
  UsuarioUpdate,
  ModalMode,
  ValidationErrors,
  ROLES,
} from '../../types/cadastros.types';

// ========================================
// INTERFACE DO COMPONENTE
// ========================================

interface UsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode;
  usuario: Usuario | null;
}

// ========================================
// COMPONENTE USUARIO MODAL
// ========================================

const UsuarioModal: React.FC<UsuarioModalProps> = ({
  isOpen,
  onClose,
  mode,
  usuario,
}) => {
  const { setores, createUsuario, updateUsuario } = useCadastros();

  // ========================================
  // ESTADOS LOCAIS
  // ========================================

  const [formData, setFormData] = useState<UsuarioCreate>({
    username: '',
    password: '',
    role_name: 'Usuario',
    setor_id: undefined,
  });

  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);

  // ========================================
  // EFEITOS
  // ========================================

  // Preenche o formulário quando editar/visualizar
  useEffect(() => {
    if (usuario && (mode === 'edit' || mode === 'view')) {
      setFormData({
        username: usuario.nome,
        password: '', // Não mostra senha existente
        role_name: getRoleName(usuario.role_id),
        setor_id: usuario.setor_id,
      });
    } else {
      setFormData({
        username: '',
        password: '',
        role_name: 'Usuario',
        setor_id: undefined,
      });
      setConfirmarSenha('');
    }
    setErrors({});
  }, [usuario, mode]);

  // ========================================
  // VALIDAÇÃO
  // ========================================

  const validar = (): boolean => {
    const novosErros: ValidationErrors = {};

    // Validação de username
    if (!formData.username || formData.username.trim().length < 3) {
      novosErros.username = 'Nome de usuário deve ter pelo menos 3 caracteres';
    }

    if (formData.username && formData.username.trim().length > 50) {
      novosErros.username = 'Nome de usuário não pode ter mais de 50 caracteres';
    }

    // Validação de senha (apenas para criar ou se fornecida ao editar)
    if (mode === 'create') {
      if (!formData.password || formData.password.length < 6) {
        novosErros.password = 'Senha deve ter pelo menos 6 caracteres';
      }

      if (formData.password !== confirmarSenha) {
        novosErros.confirmarSenha = 'As senhas não coincidem';
      }
    } else if (mode === 'edit' && formData.password) {
      // Se está editando e forneceu senha, precisa validar
      if (formData.password.length < 6) {
        novosErros.password = 'Senha deve ter pelo menos 6 caracteres';
      }

      if (formData.password !== confirmarSenha) {
        novosErros.confirmarSenha = 'As senhas não coincidem';
      }
    }

    // Validação de role
    if (!formData.role_name) {
      novosErros.role_name = 'Selecione um perfil';
    }

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // ========================================
  // HANDLERS
  // ========================================

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // Converte setor_id para número
    if (name === 'setor_id') {
      const numValue = value ? parseInt(value) : undefined;
      setFormData((prev) => ({ ...prev, [name]: numValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    
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
        console.log('🔍 FormData sendo enviado:', { ...formData, password: formData.password ? '***' : 'VAZIO' });
        await createUsuario(formData);
        console.log('✅ Usuário criado com sucesso!');
        alert('Usuário criado com sucesso!');
      } else if (mode === 'edit' && usuario) {
        const updateData: UsuarioUpdate = {
          username: formData.username,
          role_name: formData.role_name,
          setor_id: formData.setor_id,
        };
        
        // Só inclui senha se foi fornecida
        if (formData.password) {
          updateData.password = formData.password;
        }

        await updateUsuario(usuario.id, updateData);
        console.log('✅ Usuário atualizado com sucesso!');
        alert('Usuário atualizado com sucesso!');
      }
      onClose();
    } catch (err: any) {
      console.error('❌ Erro ao salvar usuário:', err);
      
      // Trata erro de username duplicado
      if (err.response?.status === 400 && err.response?.data?.detail?.includes('already exists')) {
        setErrors({ username: 'Este nome de usuário já está em uso' });
      } else {
        alert(err.response?.data?.detail || 'Erro ao salvar usuário');
      }
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
      ? 'Novo Usuário'
      : mode === 'edit'
      ? 'Editar Usuário'
      : 'Detalhes do Usuário';

  const roles = ['Administrador', 'Tecnico', 'Usuario'];

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
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
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
            {/* Campo Username */}
            <div className="mb-4">
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Nome de Usuário <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                disabled={isReadOnly}
                className={`
                  w-full px-4 py-2 border rounded-lg
                  bg-white dark:bg-[#2a2a2a]
                  text-gray-900 dark:text-gray-100
                  ${errors.username 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600'
                  }
                  ${isReadOnly
                    ? 'cursor-not-allowed opacity-60'
                    : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
                  }
                  transition-colors
                `}
                placeholder="Digite o nome de usuário"
                maxLength={50}
              />
              {errors.username && (
                <div className="mt-1 flex items-center gap-1 text-red-500 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.username}</span>
                </div>
              )}
            </div>

            {/* Campo Senha (não mostrar no modo view) */}
            {mode !== 'view' && (
              <>
                <div className="mb-4">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Senha {mode === 'create' && <span className="text-red-500">*</span>}
                    {mode === 'edit' && <span className="text-xs text-gray-500"> (deixe em branco para manter a atual)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`
                        w-full px-4 py-2 pr-10 border rounded-lg
                        bg-white dark:bg-[#2a2a2a]
                        text-gray-900 dark:text-gray-100
                        ${errors.password 
                          ? 'border-red-500 dark:border-red-400' 
                          : 'border-gray-300 dark:border-gray-600'
                        }
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                        transition-colors
                      `}
                      placeholder={mode === 'create' ? 'Mínimo 6 caracteres' : 'Nova senha (opcional)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <div className="mt-1 flex items-center gap-1 text-red-500 dark:text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.password}</span>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="confirmarSenha"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Confirmar Senha {mode === 'create' && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmarSenha"
                      value={confirmarSenha}
                      onChange={(e) => {
                        setConfirmarSenha(e.target.value);
                        if (errors.confirmarSenha) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.confirmarSenha;
                            return newErrors;
                          });
                        }
                      }}
                      className={`
                        w-full px-4 py-2 pr-10 border rounded-lg
                        bg-white dark:bg-[#2a2a2a]
                        text-gray-900 dark:text-gray-100
                        ${errors.confirmarSenha 
                          ? 'border-red-500 dark:border-red-400' 
                          : 'border-gray-300 dark:border-gray-600'
                        }
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                        transition-colors
                      `}
                      placeholder="Digite a senha novamente"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmarSenha && (
                    <div className="mt-1 flex items-center gap-1 text-red-500 dark:text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.confirmarSenha}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Campo Perfil/Role */}
            <div className="mb-4">
              <label
                htmlFor="role_name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                <Shield className="w-4 h-4 inline mr-1" />
                Perfil <span className="text-red-500">*</span>
              </label>
              <select
                id="role_name"
                name="role_name"
                value={formData.role_name}
                onChange={handleInputChange}
                disabled={isReadOnly}
                className={`
                  w-full px-4 py-2 border rounded-lg
                  bg-white dark:bg-[#2a2a2a]
                  text-gray-900 dark:text-gray-100
                  ${errors.role_name 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600'
                  }
                  ${isReadOnly
                    ? 'cursor-not-allowed opacity-60'
                    : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
                  }
                  transition-colors
                `}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              {errors.role_name && (
                <div className="mt-1 flex items-center gap-1 text-red-500 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.role_name}</span>
                </div>
              )}
            </div>

            {/* Campo Setor */}
            <div className="mb-6">
              <label
                htmlFor="setor_id"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                <Building className="w-4 h-4 inline mr-1" />
                Setor
              </label>
              <select
                id="setor_id"
                name="setor_id"
                value={formData.setor_id || ''}
                onChange={handleInputChange}
                disabled={isReadOnly}
                className={`
                  w-full px-4 py-2 border rounded-lg
                  bg-white dark:bg-[#2a2a2a]
                  text-gray-900 dark:text-gray-100
                  border-gray-300 dark:border-gray-600
                  ${isReadOnly
                    ? 'cursor-not-allowed opacity-60'
                    : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
                  }
                  transition-colors
                `}
              >
                <option value="">Nenhum</option>
                {setores.map((setor) => (
                  <option key={setor.id} value={setor.id}>
                    {setor.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Informações de auditoria (apenas visualização) */}
            {mode === 'view' && usuario && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Informações de Auditoria
                </h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-medium">ID:</span> #{usuario.id}
                  </div>
                  <div>
                    <span className="font-medium">Criado em:</span>{' '}
                    {usuario.created_at 
                      ? new Date(usuario.created_at).toLocaleString('pt-BR')
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
                    bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600
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

export default UsuarioModal;
