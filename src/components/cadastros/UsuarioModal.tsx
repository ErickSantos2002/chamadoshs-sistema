import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useCadastros } from '../../context/CadastrosContext';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import HistoricoDaConta from './HistoricoDaConta';
import {
  Button,
  Checkbox,
  Input,
  MensagemDeErro,
  Modal,
  Rotulo,
  RotuloDeCampo,
  Seletor,
} from '../ui';
import { getRoleName } from '../../utils/roleMapper';
import { IconeEscudo, IconeOlho, IconeOlhoFechado, IconeSalvar, IconeSetor } from '../ui/icones';
import type {
  Usuario,
  UsuarioCreate,
  UsuarioUpdate,
  ModalMode,
  ValidationErrors,
} from '../../types/cadastros.types';

/** Liga o botão do rodapé ao formulário, que fica no corpo do modal. */
const ID_DO_FORM = 'form-usuario';

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
        await createUsuario(formData);
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
        toast.success('Usuário atualizado com sucesso!');
      }
      onClose();
    } catch (err: any) {
      
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
      // Este é o formulário mais longo do sistema, e era o que mais sofria com
      // os botões desenhados junto com os campos: para salvar era preciso
      // rolar até o fim. No rodapé do modal eles ficam sempre visíveis.
      rodape={
        <>
          <Button type="button" variante="secundario" onClick={onClose}>
            {isReadOnly ? 'Fechar' : 'Cancelar'}
          </Button>

          {!isReadOnly && (
            // `form` liga o botão ao formulário mesmo estando fora dele.
            <Button type="submit" form={ID_DO_FORM} carregando={loading}>
              <IconeSalvar className="h-4 w-4" aria-hidden="true" />
              Salvar
            </Button>
          )}
        </>
      }
    >
      <div className={mostrarHistorico ? 'grid gap-5 lg:grid-cols-[1fr_18rem]' : undefined}>
        <form id={ID_DO_FORM} onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Username */}
          <div>
            <RotuloDeCampo htmlFor="username" obrigatorio>
              Nome de Usuário
            </RotuloDeCampo>
            <Input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              disabled={isReadOnly}
              className={errors.username ? 'border-perigo' : undefined}
              placeholder="Digite o nome de usuário"
              maxLength={50}
            />
            <MensagemDeErro texto={errors.username} />
          </div>

          {/* Campo Senha (não mostrar no modo view) */}
          {mode !== 'view' && (
            <>
              <div>
                <RotuloDeCampo htmlFor="password" obrigatorio={mode === 'create'}>
                  Senha
                  {mode === 'edit' && (
                    <span className="text-xs font-normal text-conteudo-tenue">
                      {' '}
                      (deixe em branco para manter a atual)
                    </span>
                  )}
                </RotuloDeCampo>
                {/* O `relative` fica aqui, e não no `Input`: o botão do olho é
                    irmão do campo e se posiciona por este contêiner. */}
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    // `new-password` nos DOIS campos deste par.
                    //
                    // Sem ele, o gerenciador de senhas do navegador trata o
                    // campo como login e oferece a senha salva de quem está
                    // logado — que aqui é o ADMINISTRADOR criando a conta de
                    // outra pessoa. Aceita por reflexo, a senha do
                    // administrador vira a senha do usuário novo, e ninguém
                    // percebe: o formulário salva, o toast diz que deu certo,
                    // e a pessoa recebe uma credencial que não é a dela.
                    //
                    // Vale também no modo de edição: ali o campo é "nova senha
                    // (opcional)", que continua sendo uma senha nova.
                    //
                    // Era o ÚNICO formulário de senha do projeto sem o
                    // atributo. `UsuariosTab` (538, 553) e `ModalTrocarSenha`
                    // (97, 109, 121) já acertavam — o que torna este um desvio
                    // isolado, não um padrão do sistema.
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={cn('pr-10', errors.password && 'border-perigo')}
                    placeholder={mode === 'create' ? 'Mínimo 6 caracteres' : 'Nova senha (opcional)'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-conteudo-tenue transition-colors hover:text-conteudo"
                  >
                    {showPassword ? (
                      <IconeOlhoFechado className="h-4 w-4" />
                    ) : (
                      <IconeOlho className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <MensagemDeErro texto={errors.password} />
              </div>

              <div>
                <RotuloDeCampo
                  htmlFor="confirmarSenha"
                  obrigatorio={mode === 'create'}
                >
                  Confirmar Senha
                </RotuloDeCampo>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmarSenha"
                    // O par do campo acima. Corrigir só um deixaria o
                    // gerenciador preenchendo metade do par, que é pior que
                    // preencher os dois: a confirmação passaria a divergir e o
                    // formulário recusaria sem dizer por quê.
                    name="confirmarSenha"
                    autoComplete="new-password"
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
                    className={cn('pr-10', errors.confirmarSenha && 'border-perigo')}
                    placeholder="Digite a senha novamente"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-conteudo-tenue transition-colors hover:text-conteudo"
                  >
                    {showConfirmPassword ? (
                      <IconeOlhoFechado className="h-4 w-4" />
                    ) : (
                      <IconeOlho className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <MensagemDeErro texto={errors.confirmarSenha} />
              </div>
            </>
          )}

          {/* Campo Perfil/Role */}
          <div>
            <RotuloDeCampo htmlFor="role_name" obrigatorio>
              <IconeEscudo className="mr-1 inline h-4 w-4" />
              Perfil
            </RotuloDeCampo>
            <Seletor
              id="role_name"
              rotulo="Perfil"
              disabled={isReadOnly}
              invalido={Boolean(errors.role_name)}
              valor={formData.role_name ?? ''}
              aoMudar={(v) => {
                setFormData((prev) => ({ ...prev, role_name: v }));
                // Mesma cortesia do handleInputChange: escolher limpa o erro.
                setErrors((prev) => {
                  const { role_name: _ignorado, ...resto } = prev;
                  return resto;
                });
              }}
              opcoes={roles.map((role) => ({ valor: role, rotulo: role }))}
            />
            <MensagemDeErro texto={errors.role_name} />
          </div>

          {/* Campo Setor */}
          <div>
            <RotuloDeCampo htmlFor="setor_id">
              <IconeSetor className="mr-1 inline h-4 w-4" />
              Setor
            </RotuloDeCampo>
            <Seletor
              id="setor_id"
              rotulo="Setor"
              disabled={isReadOnly}
              valor={formData.setor_id ? String(formData.setor_id) : ''}
              aoMudar={(v) =>
                setFormData((prev) => ({
                  ...prev,
                  setor_id: v ? Number(v) : undefined,
                }))
              }
              opcoes={[
                { valor: '', rotulo: 'Nenhum' },
                ...setores.map((setor) => ({
                  valor: String(setor.id),
                  rotulo: setor.nome,
                })),
              ]}
            />
          </div>

          {/* Conta de serviço */}
          <div className="rounded-xl border border-borda bg-superficie-elevada p-4">
            {/* Era `accent-sinal` num <input> nativo: o `accent-color` pinta
                o preenchimento e o navegador desenha o resto, então a caixa
                não tinha contorno próprio nem seguia o tema. O `Checkbox` do
                kit desenha a caixa, com o contorno de `--border-control` que a
                emenda E7 criou e o anel de foco que o pacote não mostra. */}
            <Checkbox
              marcado={formData.conta_de_servico ?? false}
              aoMudar={(v) =>
                setFormData((anterior) => ({
                  ...anterior,
                  conta_de_servico: v,
                }))
              }
              desabilitado={isReadOnly}
              dica="Marque para contas que não são pessoas — painel de TV, login de integração. Elas continuam acessando o sistema, mas deixam de aparecer na lista de técnico responsável."
            >
              <span className="font-medium text-conteudo">Conta de serviço</span>
            </Checkbox>
          </div>

          {/* Informações de auditoria (apenas visualização) */}
          {mode === 'view' && usuario && (
            <div className="rounded-xl border border-borda bg-superficie-elevada p-4">
              <h3 className="mb-2 text-sm font-semibold text-conteudo">
                Informações de Auditoria
              </h3>
              <dl className="space-y-1 text-sm">
                <div>
                  <dt className="inline font-medium text-conteudo-tenue">ID:</dt>{' '}
                  <dd className="inline text-conteudo">#{usuario.id}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-conteudo-tenue">Criado em:</dt>{' '}
                  <dd className="inline text-conteudo">
                    {usuario.created_at
                      ? new Date(usuario.created_at).toLocaleString('pt-BR')
                      : 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </form>

        {/* A trilha fica ao lado, não abaixo: quem abre a conta para conferir
            quem mexeu nela precisa ver o cadastro e o histórico juntos. */}
        {/* Este continua `aside`, e é o único dos quatro que continua.

            Aqui o conteúdo É complementar de verdade: o assunto da janela é o
            cadastro, e o histórico é apoio para quem está decidindo sobre ele
            — exatamente o caso que o marco `complementary` descreve.

            O que faltava era o NOME. Marco sem nome numa lista de marcos é uma
            linha escrita "complementar", que não ajuda a escolher. O nome sai
            do próprio `<h3>` que já está na tela, por `aria-labelledby`, para
            não existirem duas fontes do mesmo texto. */}
        {mostrarHistorico && usuario && (
          <aside
            aria-labelledby="historico-da-conta"
            className="lg:border-l lg:border-borda lg:pl-5"
          >
            <Rotulo id="historico-da-conta" como="h3" className="mb-1 block">
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
