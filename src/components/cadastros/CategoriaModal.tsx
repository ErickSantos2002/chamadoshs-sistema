import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useCadastros } from '../../context/CadastrosContext';
import { Button, Input, MensagemDeErro, Modal, RotuloDeCampo, Textarea } from '../ui';
import { IconeSalvar } from '../ui/icones';
import type {
  Categoria,
  CategoriaCreate,
  CategoriaUpdate,
  ModalMode,
  ValidationErrors,
} from '../../types/cadastros.types';

/** Liga o botão do rodapé ao formulário, que fica no corpo do modal. */
const ID_DO_FORM = 'form-categoria';

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
        toast.success('Categoria criada com sucesso!');
      } else if (mode === 'edit' && categoria) {
        const updateData: CategoriaUpdate = {
          nome: formData.nome,
          descricao: formData.descricao,
        };
        await updateCategoria(categoria.id, updateData);
        toast.success('Categoria atualizada com sucesso!');
      }
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar categoria');
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
    <Modal
      aberto={isOpen}
      aoFechar={onClose}
      titulo={modalTitle}
      largura="sm"
      // As ações vão para o rodapé fixo do modal, e não para dentro do corpo
      // que rola. O botão de salvar precisa estar sempre visível — é a promessa
      // que o componente Modal faz no próprio cabeçalho, e que este modal
      // desfazia ao desenhar os botões junto com os campos.
      rodape={
        <>
          <Button type="button" variante="secundario" onClick={onClose}>
            {isReadOnly ? 'Fechar' : 'Cancelar'}
          </Button>

          {!isReadOnly && (
            // `form` liga o botão ao formulário mesmo estando fora dele. Sem
            // isto, mover o botão para o rodapé quebraria o envio.
            <Button type="submit" form={ID_DO_FORM} carregando={loading}>
              <IconeSalvar className="h-4 w-4" aria-hidden="true" />
              Salvar
            </Button>
          )}
        </>
      }
    >
      <form id={ID_DO_FORM} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <RotuloDeCampo htmlFor="nome" obrigatorio>
            Nome
          </RotuloDeCampo>
          <Input
            id="nome"
            name="nome"
            value={formData.nome}
            onChange={handleInputChange}
            disabled={isReadOnly}
            placeholder="Digite o nome da categoria"
            maxLength={100}
            className={errors.nome ? 'border-perigo' : undefined}
          />
          <MensagemDeErro texto={errors.nome} />
        </div>

        <div>
          <RotuloDeCampo htmlFor="descricao">Descrição</RotuloDeCampo>
          <Textarea
            id="descricao"
            name="descricao"
            value={formData.descricao}
            onChange={handleInputChange}
            disabled={isReadOnly}
            rows={4}
            placeholder="Digite uma descrição (opcional)"
            maxLength={500}
            className={errors.descricao ? 'border-perigo' : undefined}
          />
          <MensagemDeErro texto={errors.descricao} />
          {!isReadOnly && (
            <p className="mt-1 text-xs text-conteudo-tenue">
              {formData.descricao?.length || 0}/500 caracteres
            </p>
          )}
        </div>

        {mode === 'view' && categoria && (
          <div className="rounded-xl border border-borda bg-superficie-elevada p-4">
            <h3 className="mb-2 text-sm font-semibold text-conteudo">
              Informações de Auditoria
            </h3>
            <dl className="space-y-1 text-sm">
              <div>
                <dt className="inline font-medium text-conteudo-tenue">ID:</dt>{' '}
                <dd className="inline text-conteudo">#{categoria.id}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-conteudo-tenue">Criado em:</dt>{' '}
                <dd className="inline text-conteudo">
                  {categoria.created_at
                    ? new Date(categoria.created_at).toLocaleString('pt-BR')
                    : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default CategoriaModal;
