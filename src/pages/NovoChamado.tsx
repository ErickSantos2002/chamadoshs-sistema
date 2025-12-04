import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { PrioridadeEnum, ChamadoCreate } from '../types/api';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

const NovoChamado: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { categorias, criarChamado, carregarCategorias } = useChamados();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<PrioridadeEnum>(PrioridadeEnum.MEDIA);
  const [categoriaId, setCategoriaId] = useState<number | undefined>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('Usuário não autenticado');
      return;
    }

    if (!titulo.trim() || !descricao.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const novoChamado: ChamadoCreate = {
        solicitante_id: user.id,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        prioridade,
        categoria_id: categoriaId,
      };

      const chamadoCriado = await criarChamado(novoChamado);

      // Redireciona para a página de detalhes do chamado criado
      navigate(`/chamados/${chamadoCriado.id}`);
    } catch (err: any) {
      console.error('Erro ao criar chamado:', err);
      setError(err.response?.data?.detail || 'Erro ao criar chamado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-100 dark:bg-[#121212] transition-colors">
      <div className="p-6 max-w-4xl mx-auto">

        {/* Cabeçalho */}
        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 
                        border border-gray-200 dark:border-[#2d2d2d] 
                        rounded-xl shadow-md transition-colors mb-6">

          <div className="px-6 py-4">
            <button
              onClick={() => navigate('/chamados')}
              className="text-[#7C3AED] hover:text-[#6D28D9]
                        dark:text-[#A78BFA] dark:hover:text-[#C4B5FD]
                        mb-2 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>

            <h1 className="text-3xl font-bold text-gray-900 
                          dark:text-[#A78BFA] tracking-tight">
              Novo Chamado
            </h1>

            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Preencha os dados abaixo para abrir um novo chamado
            </p>
          </div>
        </div>

        {/* Formulário */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/95 dark:bg-[#1e1e1e]/95 
                    border border-gray-200 dark:border-[#2d2d2d] 
                    rounded-xl shadow-md p-6 transition-colors"
        >

          {/* Mensagem de erro */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 
                            border border-red-200 dark:border-red-800
                            text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Título */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Título <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={200}
              placeholder="Ex: Problema no sistema de login"
              className="w-full px-4 py-2 border rounded-lg 
                        bg-white dark:bg-[#2a2a2a]
                        text-gray-800 dark:text-gray-200 
                        border-gray-300 dark:border-gray-600
                        focus:outline-none focus:ring-2 
                        focus:ring-[#7C3AED] transition-colors"
              required
            />

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {titulo.length}/200 caracteres
            </p>
          </div>

          {/* Descrição */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descrição <span className="text-red-500">*</span>
            </label>

            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={6}
              placeholder="Descreva detalhadamente o problema ou solicitação..."
              className="w-full px-4 py-2 border rounded-lg 
                        bg-white dark:bg-[#2a2a2a]
                        text-gray-800 dark:text-gray-200 
                        border-gray-300 dark:border-gray-600
                        focus:outline-none focus:ring-2 
                        focus:ring-[#7C3AED] transition-colors resize-none"
              required
            />

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Seja o mais detalhado possível para agilizar o atendimento
            </p>
          </div>

          {/* Grid Categoria + Prioridade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Categoria
              </label>

              <select
                value={categoriaId || ''}
                onChange={(e) => setCategoriaId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-4 py-2 border rounded-lg 
                          bg-white dark:bg-[#2a2a2a]
                          text-gray-800 dark:text-gray-200 
                          border-gray-300 dark:border-gray-600
                          focus:outline-none focus:ring-2 
                          focus:ring-[#7C3AED] transition-colors"
              >
                <option value="">Selecione uma categoria</option>

                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>

              {categorias.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Nenhuma categoria disponível
                </p>
              )}
            </div>

            {/* Prioridade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prioridade <span className="text-red-500">*</span>
              </label>

              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as PrioridadeEnum)}
                className="w-full px-4 py-2 border rounded-lg 
                          bg-white dark:bg-[#2a2a2a]
                          text-gray-800 dark:text-gray-200 
                          border-gray-300 dark:border-gray-600
                          focus:outline-none focus:ring-2 
                          focus:ring-[#DB2777] transition-colors"
                required
              >
                <option value={PrioridadeEnum.BAIXA}>Baixa</option>
                <option value={PrioridadeEnum.MEDIA}>Média</option>
                <option value={PrioridadeEnum.ALTA}>Alta</option>
                <option value={PrioridadeEnum.CRITICA}>Crítica</option>
              </select>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Avalie a urgência do seu chamado
              </p>
            </div>
          </div>

          {/* Guia de Prioridades */}
          <div className="mb-6 p-4 bg-[#EEF2FF] dark:bg-[#312E81]/30 
                          border border-[#C7D2FE] dark:border-[#4338CA]/40 
                          rounded-lg">
            <h3 className="text-sm font-semibold text-[#3730A3] dark:text-[#C7D2FE] mb-2">
              Guia de Prioridades:
            </h3>

            <ul className="text-xs text-[#3730A3] dark:text-[#A5B4FC] space-y-1">
              <li><strong>Baixa:</strong> Problemas menores que não afetam o trabalho</li>
              <li><strong>Média:</strong> Problemas que causam inconveniência mas há alternativas</li>
              <li><strong>Alta:</strong> Problemas que impedem trabalho importante</li>
              <li><strong>Crítica:</strong> Sistema parado ou perda de dados iminente</li>
            </ul>
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end">

            <button
              type="button"
              onClick={() => navigate('/chamados')}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 
                        text-gray-700 dark:text-gray-300 rounded-lg 
                        hover:bg-gray-50 dark:hover:bg-[#2a2a2a]
                        transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading || !titulo.trim() || !descricao.trim()}
              className="px-6 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] 
                        dark:bg-[#A78BFA] dark:hover:bg-[#C4B5FD]
                        text-white font-medium rounded-lg shadow-sm 
                        hover:shadow-md transition-all duration-200
                        disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Criar Chamado
                </>
              )}
            </button>

          </div>
        </form>

      </div>
    </div>
  );
};

export default NovoChamado;
