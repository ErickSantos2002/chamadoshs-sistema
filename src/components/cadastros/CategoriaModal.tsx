import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useCadastros } from '../../context/CadastrosContext';
import { Button, Campo, Input, Modal, Textarea } from '../ui';
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

  // Para levar o foco ao primeiro campo recusado. Ver `handleSubmit`.
  const campoNome = useRef<HTMLInputElement>(null);
  const campoDescricao = useRef<HTMLTextAreaElement>(null);

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

  /**
   * Valida e DEVOLVE os erros, em vez de devolver um booleano.
   *
   * O `setErrors` não deixa o resultado legível na mesma passagem — quem
   * chama precisaria esperar o próximo render para saber QUAL campo falhou, e
   * é justamente nessa hora que o foco tem de ir para ele.
   *
   * É a mesma armadilha da trava por `useState` no reset de senha: pedir ao
   * estado uma resposta que ele só terá depois.
   */
  const validar = (): ValidationErrors => {
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
    return novosErros;
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

    const errosDaVez = validar();
    if (Object.keys(errosDaVez).length > 0) {
      // O foco vai para o PRIMEIRO campo recusado, na ordem do formulário.
      //
      // Sem isto, o formulário recusa e o foco fica onde estava — no botão
      // Salvar, que continua na tela sem explicação. Quem usa leitor de tela
      // ouve o `role="alert"` da mensagem e depois não tem como chegar até o
      // campo senão navegando o formulário inteiro de novo; quem usa teclado
      // sem leitor não recebe nem isso.
      //
      // Era impossível até agora: `Input` e `Textarea` não repassavam `ref`, e
      // a varredura da Fase 8 registrou que, coerentemente, não havia um único
      // `.focus()` de erro em todo o `src`.
      if (errosDaVez.nome) campoNome.current?.focus();
      else campoDescricao.current?.focus();
      return;
    }

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
        <Campo id="nome" rotulo="Nome" obrigatorio erro={errors.nome}>
          <Input
            ref={campoNome}
            name="nome"
            value={formData.nome}
            onChange={handleInputChange}
            disabled={isReadOnly}
            placeholder="Digite o nome da categoria"
            maxLength={100}
            className={errors.nome ? 'border-perigo' : undefined}
          />
        </Campo>

        <Campo
          id="descricao"
          rotulo="Descrição"
          erro={errors.descricao}
          // O contador entra como DICA, e não como um `<p>` solto: assim ele
          // vira `aria-describedby` do campo. Ele é a unica explicacao para
          // "500 caracteres" ser recusado, e solto ele so existia para quem ve.
          dica={
            isReadOnly
              ? undefined
              : `${formData.descricao?.length || 0}/500 caracteres`
          }
        >
          <Textarea
            ref={campoDescricao}
            name="descricao"
            value={formData.descricao}
            onChange={handleInputChange}
            disabled={isReadOnly}
            rows={4}
            placeholder="Digite uma descrição (opcional)"
            maxLength={500}
            className={errors.descricao ? 'border-perigo' : undefined}
          />
        </Campo>

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
