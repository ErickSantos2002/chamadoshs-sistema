import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { Chamado, ChamadoCreate, PrioridadeEnum } from '../types/api';
import { Button, Input, Select, Textarea } from './ui';
import ContadorMinimo from './ContadorMinimo';
import {
  MINIMO_DESCRICAO,
  MINIMO_TITULO,
  validarMinimo,
} from '../lib/validacao';

interface NovoChamadoFormProps {
  aoCriar: (chamado: Chamado) => void;
  aoCancelar: () => void;
}

const TITULO_MAXIMO = 200;

/**
 * Formulário de abertura de chamado.
 *
 * Vive separado da página porque é usado nos dois lugares: no modal, aberto a
 * partir do quadro, e na rota `/chamados/novo`, que continua existindo para
 * link direto e para telas estreitas, onde modal é pior que página.
 *
 * Os botões ficam dentro do formulário, e não no rodapé do modal, para o
 * "salvando" continuar sendo estado de um lugar só. Levantar esse estado para
 * fora só para o botão morar noutro lugar cria duas fontes de verdade.
 */
export const NovoChamadoForm: React.FC<NovoChamadoFormProps> = ({ aoCriar, aoCancelar }) => {
  const { user } = useAuth();
  const { categorias, usuarios, criarChamado, carregarCategorias, carregarUsuarios } =
    useChamados();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<PrioridadeEnum>(PrioridadeEnum.MEDIA);
  const [categoriaId, setCategoriaId] = useState<number | undefined>();
  const [solicitanteId, setSolicitanteId] = useState<number | undefined>();

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Quem é da equipe abre chamado em nome de outra pessoa e já fica como
  // responsável. Quem não é abre só para si.
  const ehEquipe = user?.role === 'Tecnico' || user?.role === 'Administrador';

  useEffect(() => {
    carregarCategorias();
    if (ehEquipe) carregarUsuarios();
  }, [carregarCategorias, carregarUsuarios, ehEquipe]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setErro('Usuário não autenticado.');
      return;
    }

    const problema =
      validarMinimo(titulo, MINIMO_TITULO, 'Título') ??
      validarMinimo(descricao, MINIMO_DESCRICAO, 'Descrição');

    if (problema) {
      setErro(problema);
      return;
    }

    if (ehEquipe && !solicitanteId) {
      setErro('Selecione o solicitante.');
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      const novo: ChamadoCreate = {
        solicitante_id: ehEquipe ? solicitanteId! : user.id,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        prioridade,
        categoria_id: categoriaId,
        tecnico_responsavel_id: ehEquipe ? user.id : undefined,
      };

      aoCriar(await criarChamado(novo));
    } catch (err: any) {
      console.error('Erro ao criar chamado:', err);
      setErro(err.response?.data?.detail || 'Erro ao criar chamado. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const rotulo = 'mb-1.5 block text-sm font-medium text-conteudo-suave';
  const obrigatorio = <span className="text-perigo">*</span>;

  return (
    <form onSubmit={enviar} className="space-y-4">
      {erro && (
        <div className="rounded-lg border border-perigo/30 bg-perigo/10 px-4 py-3 text-sm text-perigo-forte dark:text-perigo-suave">
          {erro}
        </div>
      )}

      <div>
        <label htmlFor="titulo" className={rotulo}>
          Título {obrigatorio}
        </label>
        <Input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={TITULO_MAXIMO}
          placeholder="Ex: Impressora do financeiro não conecta"
          required
        />
        <ContadorMinimo
          valor={titulo}
          minimo={MINIMO_TITULO}
          maximo={TITULO_MAXIMO}
        />
      </div>

      <div>
        <label htmlFor="descricao" className={rotulo}>
          Descrição {obrigatorio}
        </label>
        <Textarea
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={5}
          placeholder="O que aconteceu, desde quando, e o que já foi tentado."
          required
        />
        <ContadorMinimo valor={descricao} minimo={MINIMO_DESCRICAO} />
      </div>

      {ehEquipe && (
        <div>
          <label htmlFor="solicitante" className={rotulo}>
            Solicitante {obrigatorio}
          </label>
          <Select
            id="solicitante"
            className="w-full"
            value={solicitanteId ?? ''}
            onChange={(e) =>
              setSolicitanteId(e.target.value ? Number(e.target.value) : undefined)
            }
            required
          >
            <option value="">Selecione o solicitante</option>
            {usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nome}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-conteudo-tenue">
            Você fica como técnico responsável.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="categoria" className={rotulo}>
            Categoria
          </label>
          <Select
            id="categoria"
            className="w-full"
            value={categoriaId ?? ''}
            onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Sem categoria</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="prioridade" className={rotulo}>
            Prioridade
          </label>
          <Select
            id="prioridade"
            className="w-full"
            value={prioridade}
            onChange={(e) => setPrioridade(e.target.value as PrioridadeEnum)}
          >
            {Object.values(PrioridadeEnum).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variante="secundario" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" carregando={salvando}>
          Abrir chamado
        </Button>
      </div>
    </form>
  );
};

export default NovoChamadoForm;
