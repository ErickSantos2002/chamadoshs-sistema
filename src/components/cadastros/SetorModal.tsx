import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useCadastros } from '../../context/CadastrosContext';
import { Button, Input, Modal, Textarea } from '../ui';
import { IconeAlerta, IconeSalvar } from '../ui/icones';
import type {
  Setor,
  SetorCreate,
  SetorUpdate,
  ModalMode,
  ValidationErrors,
} from '../../types/cadastros.types';

const ROTULO = 'mb-1.5 block text-sm font-medium text-conteudo-suave';

/** Erro de campo. Nada é renderizado quando não há erro. */
const MensagemDeErro: React.FC<{ texto?: string }> = ({ texto }) =>
  texto ? (
    <p className="mt-1 flex items-center gap-1 text-sm text-perigo">
      <IconeAlerta className="h-4 w-4 shrink-0" aria-hidden="true" />
      {texto}
    </p>
  ) : null;

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
        toast.success('Setor criado com sucesso!');
      } else if (mode === 'edit' && setor) {
        const updateData: SetorUpdate = {
          nome: formData.nome,
          descricao: formData.descricao,
        };
        await updateSetor(setor.id, updateData);
        console.log('✅ Setor atualizado com sucesso!');
        toast.success('Setor atualizado com sucesso!');
      }
      onClose();
    } catch (err: any) {
      console.error('❌ Erro ao salvar setor:', err);
      toast.error(err.response?.data?.detail || 'Erro ao salvar setor');
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
    <Modal
      aberto={isOpen}
      aoFechar={onClose}
      titulo={modalTitle}
      largura="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="nome" className={ROTULO}>
            Nome <span className="text-perigo">*</span>
          </label>
          <Input
            id="nome"
            name="nome"
            value={formData.nome}
            onChange={handleInputChange}
            disabled={isReadOnly}
            placeholder="Digite o nome do setor"
            maxLength={100}
            className={errors.nome ? 'border-perigo' : undefined}
          />
          <MensagemDeErro texto={errors.nome} />
        </div>

        <div>
          <label htmlFor="descricao" className={ROTULO}>
            Descrição
          </label>
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

        {mode === 'view' && setor && (
          <div className="rounded-lg bg-superficie-elevada p-4">
            <h3 className="mb-2 text-sm font-medium text-conteudo-suave">
              Informações de Auditoria
            </h3>
            <dl className="space-y-1 text-sm text-conteudo-suave">
              <div>
                <dt className="inline font-medium">ID:</dt>{' '}
                <dd className="inline">#{setor.id}</dd>
              </div>
              <div>
                <dt className="inline font-medium">Criado em:</dt>{' '}
                <dd className="inline">
                  {setor.created_at
                    ? new Date(setor.created_at).toLocaleString('pt-BR')
                    : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>
        )}

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
    </Modal>
  );
};

export default SetorModal;
