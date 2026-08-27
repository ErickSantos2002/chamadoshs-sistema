import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useChamados } from '../hooks/useChamados';
import { slaConfigsService } from '../services/chamadoshsapi';
import { Chamado, ChamadoCreate, PrioridadeEnum, SLAConfig } from '../types/api';
import { EXPEDIENTE, formatarPrazo } from '../lib/prazo';
import { corDaPrioridade } from '../lib/graficos';
import { useTheme } from '../context/ThemeContext';
import { Button, Input, Rotulo, RotuloDeCampo, Seletor, Textarea } from './ui';
import ContadorMinimo from './ContadorMinimo';
import { IconeEscudoConfere, IconeRelogio } from './ui/icones';
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
  const { darkMode } = useTheme();
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

  // Prazos por prioridade, para quem abre o chamado ver o que a escolha
  // significa. Sem isso a prioridade vira palpite: "Alta" e "Média" são
  // rótulos sem consequência visível até o chamado já estar aberto.
  const [prazos, setPrazos] = useState<SLAConfig[]>([]);

  useEffect(() => {
    carregarCategorias();
    if (ehEquipe) carregarUsuarios();
  }, [carregarCategorias, carregarUsuarios, ehEquipe]);

  useEffect(() => {
    // Falhar aqui não impede abrir chamado: sem os prazos, o bloco some e o
    // formulário continua funcionando.
    slaConfigsService
      .listar()
      .then(setPrazos)
      .catch(() => setPrazos([]));
  }, []);

  const prazoEscolhido = useMemo(
    () => prazos.find((p) => p.prioridade === prioridade),
    [prazos, prioridade]
  );

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


  return (
    <form onSubmit={enviar} className="space-y-4">
      {erro && (
        <div className="rounded-lg border border-perigo/30 bg-perigo/10 px-4 py-3 text-sm text-perigo-forte dark:text-perigo-suave">
          {erro}
        </div>
      )}

      <div>
        <RotuloDeCampo htmlFor="titulo" obrigatorio>Título</RotuloDeCampo>
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
        <RotuloDeCampo htmlFor="descricao" obrigatorio>Descrição</RotuloDeCampo>
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
          <RotuloDeCampo htmlFor="solicitante" obrigatorio>Solicitante</RotuloDeCampo>
          {/* A lista mais longa do sistema — trinta e poucos nomes. É onde a
              busca por digitação do seletor mais vale: digitar "ga" chega em
              Gabriel sem rolar. O `required` nativo saiu junto com o <select>,
              e não faz falta: `enviar` já recusa com "Selecione o solicitante". */}
          <Seletor
            id="solicitante"
            rotulo="Solicitante"
            valor={solicitanteId ? String(solicitanteId) : ''}
            aoMudar={(v) => setSolicitanteId(v ? Number(v) : undefined)}
            opcoes={[
              { valor: '', rotulo: 'Selecione o solicitante' },
              ...usuarios.map((usuario) => ({
                valor: String(usuario.id),
                rotulo: usuario.nome,
              })),
            ]}
          />
          <p className="mt-1 text-xs text-conteudo-tenue">
            Você fica como técnico responsável.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <RotuloDeCampo htmlFor="categoria">Categoria</RotuloDeCampo>
          <Seletor
            id="categoria"
            rotulo="Categoria"
            valor={categoriaId ? String(categoriaId) : ''}
            aoMudar={(v) => setCategoriaId(v ? Number(v) : undefined)}
            opcoes={[
              { valor: '', rotulo: 'Sem categoria' },
              ...categorias.map((categoria) => ({
                valor: String(categoria.id),
                rotulo: categoria.nome,
              })),
            ]}
          />
        </div>

        <div>
          <RotuloDeCampo htmlFor="prioridade">Prioridade</RotuloDeCampo>
          {/* A mesma cor que a prioridade tem nos gráficos e nos filtros. */}
          <Seletor
            id="prioridade"
            rotulo="Prioridade"
            valor={prioridade}
            aoMudar={(v) => setPrioridade(v as PrioridadeEnum)}
            opcoes={Object.values(PrioridadeEnum).map((p) => ({
              valor: p,
              rotulo: p,
              cor: corDaPrioridade(p, darkMode),
            }))}
          />
        </div>
      </div>

      {prazoEscolhido && (
        <div className="rounded-xl border border-borda bg-superficie-elevada p-4">
          <Rotulo como="p">
            O que a prioridade {prazoEscolhido.prioridade} compromete
          </Rotulo>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
            <span className="flex items-center gap-1.5 text-conteudo">
              <IconeRelogio className="h-4 w-4 text-conteudo-tenue" aria-hidden="true" />
              <span className="text-conteudo-tenue">Alguém assume em até</span>
              <strong className="font-semibold">
                {formatarPrazo(prazoEscolhido.minutos_resposta)}
              </strong>
            </span>

            <span className="flex items-center gap-1.5 text-conteudo">
              <IconeEscudoConfere className="h-4 w-4 text-conteudo-tenue" aria-hidden="true" />
              <span className="text-conteudo-tenue">Resolvido em até</span>
              <strong className="font-semibold">
                {formatarPrazo(prazoEscolhido.minutos_resolucao)}
              </strong>
            </span>
          </div>

          <p className="mt-2 text-xs text-conteudo-tenue">
            Contado em horário útil ({EXPEDIENTE}), descontando o tempo em que o
            chamado ficar aguardando resposta sua.
          </p>
        </div>
      )}

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
