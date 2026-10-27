import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AuthContext } from '../context/AuthContext';
import { ChamadosProvider } from '../context/ChamadosContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useChamados } from '../hooks/useChamados';
import {
  categoriasService,
  chamadosService,
  slaConfigsService,
  usuariosService,
} from '../services/chamadoshsapi';
import { Chamado, PrioridadeEnum, StatusEnum, Usuario } from '../types/api';
import NovoChamadoForm from './NovoChamadoForm';

/**
 * O formulário de abertura, montado sobre o contexto de verdade.
 *
 * ── Por que este arquivo nasceu ANTES da Qualidade ────────────────────
 *
 * O formulário não tinha teste nenhum, e a etapa seguinte acrescenta um
 * segundo modo a ele. A abertura para a TI é a tela mais usada por quem não é
 * da equipe, e a regra da etapa é que ela não mude em NADA: mesmo corpo, mesmas
 * mensagens, na mesma ordem. Sem uma trava escrita antes, "não mudou" seria
 * opinião.
 *
 * Por isso estes casos descrevem o que o formulário FAZ hoje, inclusive o que
 * está errado — e o que está errado fica dito como tal, para ninguém tomar a
 * trava por aprovação:
 *
 *   `tecnico_responsavel_id` vai no corpo para a equipe, e a API o descarta na
 *   abertura TI. A dica "Você fica como técnico responsável." promete o que
 *   não acontece.
 *
 *   O Técnico vê o seletor de solicitante, mas a API só honra a escolha quando
 *   quem abre é Administrador. Para o Técnico ela grava o próprio usuário.
 *
 * Os dois são dívida registrada no CHANGELOG, e consertá-los é outra etapa.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const sessao = (id: number, role: string) =>
  ({
    user: { id, username: 'quem-abre', role },
    token: 'token-de-teste',
    loading: false,
    error: null,
    login: async () => {},
    logout: () => {},
  }) as React.ContextType<typeof AuthContext>;

const USUARIO = sessao(7, 'Usuario');
const TECNICO = sessao(3, 'Tecnico');
const ADMIN = sessao(1, 'Administrador');

const CRIADO = {
  id: 99,
  protocolo: 'CHAM-2026-0099',
  titulo: 'Impressora do RH sem papel',
  descricao: 'x',
  status: StatusEnum.ABERTO,
  prioridade: PrioridadeEnum.MEDIA,
  solicitante_id: 7,
  cancelado: false,
  arquivado: false,
} as unknown as Chamado;

let host: HTMLDivElement;
let root: Root;
let criar: ReturnType<typeof vi.fn>;
let aoCriar: ReturnType<typeof vi.fn>;
let aoCancelar: ReturnType<typeof vi.fn>;
let naLista: number[] = [];

/** O que a lista do contexto contém, para conferir onde o chamado novo foi. */
const Sonda: React.FC = () => {
  naLista = useChamados().chamados.map((c) => c.id);
  return null;
};

const montar = async (quem: React.ContextType<typeof AuthContext>) => {
  await act(async () => {
    root.render(
      <AuthContext.Provider value={quem}>
        <ThemeProvider>
          <ChamadosProvider>
            <Sonda />
            <NovoChamadoForm aoCriar={aoCriar} aoCancelar={aoCancelar} />
          </ChamadosProvider>
        </ThemeProvider>
      </AuthContext.Provider>
    );
  });
};

/** Digita como o React enxerga: pelo setter nativo e um evento `input`. */
const digitar = async (id: string, valor: string) => {
  const campo = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
  expect(campo, `campo #${id} não apareceu`).toBeTruthy();
  const prototipo = Object.getPrototypeOf(campo);
  const setter = Object.getOwnPropertyDescriptor(prototipo, 'value')!.set!;
  await act(async () => {
    setter.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

/** Abre o `Seletor` pelo id do gatilho e escolhe a opção pelo texto. */
const escolher = async (id: string, opcao: string) => {
  const gatilho = document.getElementById(id);
  expect(gatilho, `seletor #${id} não apareceu`).toBeTruthy();
  await act(async () => {
    gatilho!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  const alvo = Array.from(document.querySelectorAll('[role="option"]')).find(
    (o) => o.textContent?.trim() === opcao
  );
  expect(alvo, `opção "${opcao}" não apareceu`).toBeTruthy();
  await act(async () => {
    alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const botao = (texto: string) =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto);

/** Envia pelo botão, como a pessoa: é o que passa pelo `required` nativo. */
const enviar = async () => {
  await act(async () => {
    botao('Abrir chamado')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const mensagem = () => document.querySelector('[role="alert"]')?.textContent ?? null;

const DESCRICAO_OK = 'A impressora do RH parou de puxar papel desde ontem.';

const preencherTI = async () => {
  await digitar('titulo', 'Impressora do RH sem papel');
  await digitar('descricao', DESCRICAO_OK);
};

beforeEach(() => {
  criar = vi.fn().mockResolvedValue(CRIADO);
  vi.spyOn(chamadosService, 'criar').mockImplementation(criar);
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([
    { id: 4, nome: 'Impressoras', ativo: true },
  ] as never);
  vi.spyOn(usuariosService, 'listar').mockResolvedValue([
    { id: 7, nome: 'Gabriel', role_id: 3, ativo: true },
    { id: 8, nome: 'Lidisay', role_id: 3, ativo: true },
  ] as Usuario[]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(slaConfigsService, 'listar').mockResolvedValue([]);
  vi.spyOn(console, 'error').mockImplementation(() => {});

  aoCriar = vi.fn();
  aoCancelar = vi.fn();
  naLista = [];

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('abertura TI — o corpo enviado', () => {
  it('Usuario: abre para si, sem responsável', async () => {
    await montar(USUARIO);
    await preencherTI();
    await enviar();

    expect(criar).toHaveBeenCalledTimes(1);
    expect(criar.mock.calls[0][0]).toStrictEqual({
      solicitante_id: 7,
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
      prioridade: PrioridadeEnum.MEDIA,
      categoria_id: undefined,
      tecnico_responsavel_id: undefined,
    });
  });

  /**
   * A chave existe, com `undefined`. É o que o axios descarta antes de
   * enviar, e o formato exato é parte do que não pode mudar.
   */
  it('as seis chaves, e nenhuma outra — sem setor_destino', async () => {
    await montar(USUARIO);
    await preencherTI();
    await enviar();

    expect(Object.keys(criar.mock.calls[0][0]).sort()).toEqual(
      [
        'categoria_id',
        'descricao',
        'prioridade',
        'solicitante_id',
        'tecnico_responsavel_id',
        'titulo',
      ].sort()
    );
    expect(criar.mock.calls[0][0]).not.toHaveProperty('setor_destino');
  });

  it('Técnico: o solicitante escolhido e ele mesmo como responsável', async () => {
    await montar(TECNICO);
    await preencherTI();
    await escolher('solicitante', 'Lidisay');
    await enviar();

    expect(criar.mock.calls[0][0]).toStrictEqual({
      solicitante_id: 8,
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
      prioridade: PrioridadeEnum.MEDIA,
      categoria_id: undefined,
      tecnico_responsavel_id: 3,
    });
  });

  it('Administrador: o mesmo corpo da equipe', async () => {
    await montar(ADMIN);
    await preencherTI();
    await escolher('solicitante', 'Gabriel');
    await enviar();

    expect(criar.mock.calls[0][0]).toStrictEqual({
      solicitante_id: 7,
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
      prioridade: PrioridadeEnum.MEDIA,
      categoria_id: undefined,
      tecnico_responsavel_id: 1,
    });
  });

  it('categoria e prioridade escolhidas entram no corpo', async () => {
    await montar(USUARIO);
    await preencherTI();
    await escolher('categoria', 'Impressoras');
    await escolher('prioridade', PrioridadeEnum.ALTA);
    await enviar();

    expect(criar.mock.calls[0][0]).toMatchObject({
      categoria_id: 4,
      prioridade: PrioridadeEnum.ALTA,
    });
  });

  it('título e descrição vão aparados', async () => {
    await montar(USUARIO);
    await digitar('titulo', '   Impressora do RH sem papel   ');
    await digitar('descricao', `  ${DESCRICAO_OK}  `);
    await enviar();

    expect(criar.mock.calls[0][0]).toMatchObject({
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
    });
  });
});

describe('abertura TI — os campos', () => {
  it('prioridade nasce Média e categoria nasce vazia', async () => {
    await montar(USUARIO);
    expect(document.getElementById('prioridade')?.textContent).toContain('Média');
    expect(document.getElementById('categoria')?.textContent).toContain('Sem categoria');
  });

  it('título tem teto de 200 e os dois textos são obrigatórios no navegador', async () => {
    await montar(USUARIO);
    const titulo = document.getElementById('titulo') as HTMLInputElement;
    expect(titulo.maxLength).toBe(200);
    expect(titulo.required).toBe(true);
    expect((document.getElementById('descricao') as HTMLTextAreaElement).required).toBe(true);
  });

  it('Usuario não vê o seletor de solicitante nem a dica', async () => {
    await montar(USUARIO);
    expect(document.getElementById('solicitante')).toBeNull();
    expect(document.body.textContent).not.toContain('Você fica como técnico responsável.');
  });

  it('a equipe vê o seletor de solicitante e a dica', async () => {
    for (const quem of [TECNICO, ADMIN]) {
      await montar(quem);
      expect(document.getElementById('solicitante'), quem.user!.role).toBeTruthy();
      expect(document.body.textContent).toContain('Você fica como técnico responsável.');
    }
  });
});

describe('abertura TI — validação, na ordem', () => {
  it('campo vazio: o navegador barra antes, e nada é enviado', async () => {
    await montar(USUARIO);
    await enviar();
    expect(criar).not.toHaveBeenCalled();
    expect(mensagem()).toBeNull();
  });

  // Espaços passam pelo `required` nativo; é aqui que a regra do formulário
  // entra, e o título vem antes da descrição.
  it('título só de espaços: "Título é obrigatório."', async () => {
    await montar(USUARIO);
    await digitar('titulo', '   ');
    await digitar('descricao', '   ');
    await enviar();
    expect(mensagem()).toBe('Título é obrigatório.');
    expect(criar).not.toHaveBeenCalled();
  });

  it('título curto: quantos caracteres faltam', async () => {
    await montar(USUARIO);
    await digitar('titulo', 'Impressor');
    await digitar('descricao', DESCRICAO_OK);
    await enviar();
    expect(mensagem()).toBe('Título precisa de mais 1 caractere.');
  });

  it('título bom, descrição curta: a descrição', async () => {
    await montar(USUARIO);
    await digitar('titulo', 'Impressora do RH sem papel');
    await digitar('descricao', 'Parou de novo');
    await enviar();
    expect(mensagem()).toBe('Descrição precisa de mais 7 caracteres.');
  });

  it('descrição só de espaços: "Descrição é obrigatório."', async () => {
    await montar(USUARIO);
    await digitar('titulo', 'Impressora do RH sem papel');
    await digitar('descricao', '    ');
    await enviar();
    expect(mensagem()).toBe('Descrição é obrigatório.');
  });

  it('a equipe sem solicitante: "Selecione o solicitante." depois dos textos', async () => {
    await montar(TECNICO);
    await digitar('titulo', 'Impressor');
    await digitar('descricao', DESCRICAO_OK);
    await enviar();
    expect(mensagem()).toBe('Título precisa de mais 1 caractere.');

    await digitar('titulo', 'Impressora do RH sem papel');
    await enviar();
    expect(mensagem()).toBe('Selecione o solicitante.');
    expect(criar).not.toHaveBeenCalled();
  });
});

describe('abertura TI — depois do envio', () => {
  it('sucesso: devolve o chamado a quem abriu e põe no topo da lista', async () => {
    await montar(USUARIO);
    await preencherTI();
    await enviar();

    expect(aoCriar).toHaveBeenCalledWith(CRIADO);
    expect(naLista[0]).toBe(99);
  });

  it('erro da API: mostra o detail que ela mandou', async () => {
    criar.mockRejectedValue({ response: { status: 400, data: { detail: 'Categoria inativa' } } });
    await montar(USUARIO);
    await preencherTI();
    await enviar();

    expect(mensagem()).toBe('Categoria inativa');
    expect(aoCriar).not.toHaveBeenCalled();
  });

  it('erro sem detail: a mensagem genérica', async () => {
    criar.mockRejectedValue(new Error('rede'));
    await montar(USUARIO);
    await preencherTI();
    await enviar();

    expect(mensagem()).toBe('Erro ao criar chamado. Tente novamente.');
  });

  it('o que foi digitado continua lá depois do erro', async () => {
    criar.mockRejectedValue(new Error('rede'));
    await montar(USUARIO);
    await preencherTI();
    await enviar();

    expect((document.getElementById('titulo') as HTMLInputElement).value).toBe(
      'Impressora do RH sem papel'
    );
    expect((document.getElementById('descricao') as HTMLTextAreaElement).value).toBe(DESCRICAO_OK);
  });

  it('"Cancelar" chama aoCancelar e não envia', async () => {
    await montar(USUARIO);
    await act(async () => {
      botao('Cancelar')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(aoCancelar).toHaveBeenCalledTimes(1);
    expect(criar).not.toHaveBeenCalled();
  });
});
