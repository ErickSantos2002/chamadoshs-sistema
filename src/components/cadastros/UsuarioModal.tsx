import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useCadastros } from '../../context/CadastrosContext';
import { useAuth } from '../../hooks/useAuth';
import HistoricoDaConta from './HistoricoDaConta';
import { Button, Modal, Rotulo } from '../ui';
import { getRoleName } from '../../utils/roleMapper';
import { IconeAlerta, IconeEscudo, IconeOlho, IconeOlhoFechado, IconeSalvar, IconeSetor } from '../ui/icones';
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
  const { user } = useAuth();

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
        conta_de_servico: usuario.conta_de_servico ?? false,
      });
    } else {
      setFormData({
        username: '',
        password: '',
        role_name: 'Usuario',
        setor_id: undefined,
        conta_de_servico: false,
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
        toast.success('Usuário criado com sucesso!');
      } else if (mode === 'edit' && usuario) {
        const updateData: UsuarioUpdate = {
          username: formData.username,
          role_name: formData.role_name,
          setor_id: formData.setor_id,
          conta_de_servico: formData.conta_de_servico ?? false,
        };
        
        // Só inclui senha se foi fornecida
        if (formData.password) {
          updateData.password = formData.password;
        }

        await updateUsuario(usuario.id, updateData);
        console.log('✅ Usuário atualizado com sucesso!');
        toast.success('Usuário atualizado com sucesso!');
      }
      onClose();
    } catch (err: any) {
      console.error('❌ Erro ao salvar usuário:', err);
      
      // Trata erro de username duplicado
      if (err.response?.status === 400 && err.response?.data?.detail?.includes('already exists')) {
        setErrors({ username: 'Este nome de usuário já está em uso' });
      } else {
        toast.error(err.response?.data?.detail || 'Erro ao salvar usuário');
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

  /**
   * A trilha só aparece para administrador e para conta que já existe.
   *
   * Restrito porque a API restringe: ela diz quem fez o quê com a conta de
   * quem, e isso é informação de administração. Sem a checagem daqui, o painel
   * apareceria para técnico e responderia 403 — um erro na tela onde deveria
   * haver nada.
   */
  const mostrarHistorico = Boolean(usuario) && mode !== 'create' && user?.role === 'Administrador';
  const modalTitle =
    mode === 'create'
      ? 'Novo Usuário'
      : mode === 'edit'
      ? 'Editar Usuário'
      : 'Detalhes do Usuário';

  const roles = ['Administrador', 'Tecnico', 'Usuario'];

  return (
    // `lg` quando há histórico: o painel fica ao lado do formulário, e em
    // `sm` cada linha da trilha quebrava em três. Na criação não há trilha
    // ainda, e o modal estreito é melhor para um formulário sozinho.
    <Modal
      aberto={isOpen}
      aoFechar={onClose}
      titulo={modalTitle}
      largura={mostrarHistorico ? 'lg' : 'sm'}
    >
      <div className={mostrarHistorico ? 'grid gap-6 lg:grid-cols-[1fr_18rem]' : undefined}>
      <form onSubmit={handleSubmit}>
            {/* Campo Username */}
            <div className="mb-4">
              <label
                htmlFor="username"
                className="block text-sm font-medium text-conteudo-suave mb-2"
              >
                Nome de Usuário <span className="text-perigo">*</span>
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
                  bg-superficie
                  text-conteudo
                  ${errors.username 
                    ? 'border-perigo' 
                    : 'border-borda'
                  }
                  ${isReadOnly
                    ? 'cursor-not-allowed opacity-60'
                    : 'focus:outline-none focus:border-sinal focus:ring-1 focus:ring-sinal'
                  }
                  transition-colors
                `}
                placeholder="Digite o nome de usuário"
                maxLength={50}
              />
              {errors.username && (
                <div className="mt-1 flex items-center gap-1 text-perigo dark:text-perigo-suave text-sm">
                  <IconeAlerta className="w-4 h-4" />
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
                    className="block text-sm font-medium text-conteudo-suave mb-2"
                  >
                    Senha {mode === 'create' && <span className="text-perigo">*</span>}
                    {mode === 'edit' && <span className="text-xs text-conteudo-tenue"> (deixe em branco para manter a atual)</span>}
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
                        bg-superficie
                        text-conteudo
                        ${errors.password 
                          ? 'border-perigo' 
                          : 'border-borda'
                        }
                        focus:outline-none focus:border-sinal focus:ring-1 focus:ring-sinal
                        transition-colors
                      `}
                      placeholder={mode === 'create' ? 'Mínimo 6 caracteres' : 'Nova senha (opcional)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-conteudo-tenue hover:text-conteudo"
                    >
                      {showPassword ? <IconeOlhoFechado className="w-4 h-4" /> : <IconeOlho className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <div className="mt-1 flex items-center gap-1 text-perigo dark:text-perigo-suave text-sm">
                      <IconeAlerta className="w-4 h-4" />
                      <span>{errors.password}</span>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="confirmarSenha"
                    className="block text-sm font-medium text-conteudo-suave mb-2"
                  >
                    Confirmar Senha {mode === 'create' && <span className="text-perigo">*</span>}
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
                        bg-superficie
                        text-conteudo
                        ${errors.confirmarSenha 
                          ? 'border-perigo' 
                          : 'border-borda'
                        }
                        focus:outline-none focus:border-sinal focus:ring-1 focus:ring-sinal
                        transition-colors
                      `}
                      placeholder="Digite a senha novamente"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-conteudo-tenue hover:text-conteudo"
                    >
                      {showConfirmPassword ? <IconeOlhoFechado className="w-4 h-4" /> : <IconeOlho className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmarSenha && (
                    <div className="mt-1 flex items-center gap-1 text-perigo dark:text-perigo-suave text-sm">
                      <IconeAlerta className="w-4 h-4" />
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
                className="block text-sm font-medium text-conteudo-suave mb-2"
              >
                <IconeEscudo className="w-4 h-4 inline mr-1" />
                Perfil <span className="text-perigo">*</span>
              </label>
              <select
                id="role_name"
                name="role_name"
                value={formData.role_name}
                onChange={handleInputChange}
                disabled={isReadOnly}
                className={`
                  w-full px-4 py-2 border rounded-lg
                  bg-superficie
                  text-conteudo
                  ${errors.role_name 
                    ? 'border-perigo' 
                    : 'border-borda'
                  }
                  ${isReadOnly
                    ? 'cursor-not-allowed opacity-60'
                    : 'focus:outline-none focus:border-sinal focus:ring-1 focus:ring-sinal'
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
                <div className="mt-1 flex items-center gap-1 text-perigo dark:text-perigo-suave text-sm">
                  <IconeAlerta className="w-4 h-4" />
                  <span>{errors.role_name}</span>
                </div>
              )}
            </div>

            {/* Campo Setor */}
            <div className="mb-6">
              <label
                htmlFor="setor_id"
                className="block text-sm font-medium text-conteudo-suave mb-2"
              >
                <IconeSetor className="w-4 h-4 inline mr-1" />
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
                  bg-superficie
                  text-conteudo
                  border-borda
                  ${isReadOnly
                    ? 'cursor-not-allowed opacity-60'
                    : 'focus:outline-none focus:border-sinal focus:ring-1 focus:ring-sinal'
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

            {/* Conta de serviço */}
            <div className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="conta_de_servico"
                  checked={formData.conta_de_servico ?? false}
                  onChange={(e) =>
                    setFormData((anterior) => ({
                      ...anterior,
                      conta_de_servico: e.target.checked,
                    }))
                  }
                  disabled={isReadOnly}
                  className={`
                    mt-0.5 w-4 h-4 rounded
                    border-borda
                    text-sinal focus:ring-2 focus:ring-sinal
                    ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                  `}
                />
                <span>
                  <span className="block text-sm font-medium text-conteudo-suave">
                    Conta de serviço
                  </span>
                  <span className="block text-xs text-conteudo-tenue mt-0.5">
                    Marque para contas que não são pessoas — painel de TV, login de
                    integração. Elas continuam acessando o sistema, mas deixam de
                    aparecer na lista de técnico responsável.
                  </span>
                </span>
              </label>
            </div>

            {/* Informações de auditoria (apenas visualização) */}
            {mode === 'view' && usuario && (
              <div className="mb-6 p-4 bg-superficie-elevada rounded-lg">
                <h3 className="text-sm font-medium text-conteudo-suave mb-2">
                  Informações de Auditoria
                </h3>
                <div className="space-y-2 text-sm text-conteudo-suave">
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
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variante="secundario" onClick={onClose}>
                {isReadOnly ? 'Fechar' : 'Cancelar'}
              </Button>

              {!isReadOnly && (
                <Button type="submit" carregando={loading}>
                  <IconeSalvar className="h-4 w-4" aria-hidden="true" />
                  Salvar
                </Button>
              )}
            </div>
      </form>

        {/* A trilha fica ao lado, não abaixo: quem abre a conta para conferir
            quem mexeu nela precisa ver o cadastro e o histórico juntos. */}
        {mostrarHistorico && usuario && (
          <aside className="lg:border-l lg:border-borda lg:pl-6">
            <Rotulo como="h3" className="mb-1 block">
              Histórico da conta
            </Rotulo>
            <HistoricoDaConta usuarioId={usuario.id} />
          </aside>
        )}
      </div>
    </Modal>
  );
};

export default UsuarioModal;
