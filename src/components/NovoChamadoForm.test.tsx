import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { act, StrictMode } from 'react';
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
let atendentes: MockInstance<typeof chamadosService.listarAtendentesQualidade>;

const erroHttp = (status: number, detail?: string) => ({
  isAxiosError: true,
  response: { status, data: detail === undefined ? {} : { detail } },
});

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

/**
 * Desmonta e monta de novo. Para casos em laço: `root.render` com a mesma
 * árvore só reconcilia, e o efeito da consulta não roda outra vez — o laço
 * conferiria o primeiro caso repetidas vezes.
 */
const remontar = async (quem: React.ContextType<typeof AuthContext>) => {
  act(() => root.unmount());
  root = createRoot(host);
  await montar(quem);
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
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  // Por padrão a API é a do ar hoje, que não conhece a rota e responde 422.
  // É contra ela que os casos da TI acima foram escritos.
  atendentes = vi
    .spyOn(chamadosService, 'listarAtendentesQualidade')
    .mockRejectedValue(erroHttp(422));

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

// ════════════════════════════════════════════════════════════════════════
// A QUALIDADE
// ════════════════════════════════════════════════════════════════════════

const ATENDENTES = [
  { id: 21, nome: 'Ana Qualidade' },
  { id: 22, nome: 'Bruno Qualidade' },
];

const DESCRICAO_Q = 'Desvio na calibração da balança 3 do laboratório.';

const qualidadeDisponivel = (lista = ATENDENTES) => atendentes.mockResolvedValue(lista);

const grupo = () => document.querySelector('fieldset');
const radio = (rotulo: string) =>
  Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]')).find(
    (r) => r.closest('label')?.textContent?.trim().startsWith(rotulo)
  );

const marcar = async (rotulo: string) => {
  const alvo = radio(rotulo);
  expect(alvo, `rádio "${rotulo}" não apareceu`).toBeTruthy();
  await act(async () => {
    alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

/** As opções de um `Seletor`, lidas com a lista aberta e fechada em seguida. */
const opcoesDo = async (id: string): Promise<string[]> => {
  const gatilho = document.getElementById(id)!;
  await act(async () => {
    gatilho.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  const textos = Array.from(document.querySelectorAll('[role="option"]')).map(
    (o) => o.textContent?.trim() ?? ''
  );
  await act(async () => {
    gatilho.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  return textos;
};

const corpoEnviado = () => criar.mock.calls[criar.mock.calls.length - 1][0];

describe('disponibilidade — o que a consulta decide', () => {
  it('consulta os atendentes ao montar', async () => {
    await montar(USUARIO);
    expect(atendentes).toHaveBeenCalledTimes(1);
  });

  /** A API do ar hoje: o formulário é exatamente o de antes. */
  it('backend sem a rota (404, 405, 422): sem escolha de setor', async () => {
    for (const [i, status] of [404, 405, 422].entries()) {
      atendentes.mockRejectedValue(erroHttp(status));
      await remontar(USUARIO);
      expect(atendentes, String(status)).toHaveBeenCalledTimes(i + 1);
      expect(grupo(), String(status)).toBeNull();
      expect(document.querySelector('input[type="radio"]'), String(status)).toBeNull();
      expect(document.getElementById('titulo'), String(status)).toBeTruthy();
    }
  });

  it('503: sem escolha de setor, e sem dizer que faltam atendentes', async () => {
    atendentes.mockRejectedValue(erroHttp(503));
    await montar(USUARIO);
    expect(grupo()).toBeNull();
    expect(document.body.textContent).not.toContain('Nenhum atendente');
    expect(vi.mocked(console.warn)).toHaveBeenCalled();
  });

  it('rede, timeout e 5xx: sem escolha de setor', async () => {
    for (const erro of [
      new Error('Network Error'),
      { code: 'ECONNABORTED' },
      erroHttp(500),
      erroHttp(502),
    ]) {
      atendentes.mockRejectedValue(erro);
      await remontar(USUARIO);
      expect(grupo(), JSON.stringify(erro)).toBeNull();
    }
  });

  it('401: sem escolha de setor, e o formulário não quebra', async () => {
    atendentes.mockRejectedValue(erroHttp(401));
    await montar(USUARIO);
    expect(grupo()).toBeNull();
    expect(document.getElementById('titulo')).toBeTruthy();
  });

  it('200 com atendentes: a escolha aparece, com TI marcado', async () => {
    qualidadeDisponivel();
    await montar(USUARIO);
    expect(grupo()?.querySelector('legend')?.textContent).toContain('Setor de destino');
    expect(radio('TI')?.checked).toBe(true);
    expect(radio('Qualidade')?.checked).toBe(false);
    expect(radio('Qualidade')?.disabled).toBe(false);
    // Os dois no mesmo grupo nativo: setas do teclado andam entre eles.
    expect(radio('TI')?.name).toBeTruthy();
    expect(radio('TI')?.name).toBe(radio('Qualidade')?.name);
  });

  it('200 vazio: Qualidade aparece desabilitada, com o motivo', async () => {
    qualidadeDisponivel([]);
    await montar(USUARIO);
    const qualidade = radio('Qualidade')!;
    expect(qualidade.disabled).toBe(true);
    expect(document.body.textContent).toContain('Nenhum atendente da Qualidade cadastrado');
    // O motivo está ligado ao rádio, e não só perto dele.
    const ids = qualidade.getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(ids.map((i) => document.getElementById(i)?.textContent).join(' ')).toContain(
      'Nenhum atendente da Qualidade cadastrado'
    );
  });

  it('200 vazio: a TI segue abrindo normalmente', async () => {
    qualidadeDisponivel([]);
    await montar(USUARIO);
    await preencherTI();
    await enviar();
    expect(corpoEnviado()).not.toHaveProperty('setor_destino');
    expect(corpoEnviado().titulo).toBe('Impressora do RH sem papel');
  });

  /**
   * A resposta de uma consulta já substituída não escreve nada. O caso real é
   * o `StrictMode` do desenvolvimento: o efeito roda, é limpo e roda de novo
   * NA MESMA instância. A primeira consulta fica pendurada, a segunda responde
   * antes; quando a primeira enfim chega, é ignorada.
   *
   * Remontar o formulário não serviria de prova: o React já descarta o que uma
   * instância desmontada escreve, com ou sem o contador.
   */
  it('resposta de uma consulta substituída é descartada', async () => {
    let soltarPrimeira: (v: never) => void = () => {};
    atendentes
      .mockImplementationOnce(() => new Promise((r) => (soltarPrimeira = r)))
      .mockResolvedValueOnce([]);

    await act(async () => {
      root.render(
        <StrictMode>
          <AuthContext.Provider value={USUARIO}>
            <ThemeProvider>
              <ChamadosProvider>
                <NovoChamadoForm aoCriar={aoCriar} aoCancelar={aoCancelar} />
              </ChamadosProvider>
            </ThemeProvider>
          </AuthContext.Provider>
        </StrictMode>
      );
    });
    expect(atendentes).toHaveBeenCalledTimes(2);
    expect(radio('Qualidade')?.disabled).toBe(true);

    await act(async () => soltarPrimeira(ATENDENTES as never));
    expect(radio('Qualidade')?.disabled).toBe(true);
  });

  it('desmontar com a consulta pendente não quebra nada', async () => {
    let soltar: (v: never) => void = () => {};
    atendentes.mockImplementationOnce(() => new Promise((r) => (soltar = r)));
    const erroDoReact = vi.mocked(console.error);

    await montar(USUARIO);
    act(() => root.unmount());
    await act(async () => soltar(ATENDENTES as never));

    expect(erroDoReact).not.toHaveBeenCalled();
    root = createRoot(host);
  });
});

describe('TI com a Qualidade disponível — o corpo não muda', () => {
  beforeEach(() => {
    qualidadeDisponivel();
  });

  it('Usuario: o mesmo corpo de antes', async () => {
    await montar(USUARIO);
    await preencherTI();
    await enviar();
    expect(corpoEnviado()).toStrictEqual({
      solicitante_id: 7,
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
      prioridade: PrioridadeEnum.MEDIA,
      categoria_id: undefined,
      tecnico_responsavel_id: undefined,
    });
  });

  it('Administrador: o mesmo corpo de antes', async () => {
    await montar(ADMIN);
    await preencherTI();
    await escolher('solicitante', 'Gabriel');
    await enviar();
    expect(corpoEnviado()).toStrictEqual({
      solicitante_id: 7,
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
      prioridade: PrioridadeEnum.MEDIA,
      categoria_id: undefined,
      tecnico_responsavel_id: 1,
    });
  });

  it('as mensagens da TI são as de sempre, e a dica continua', async () => {
    await montar(TECNICO);
    expect(document.body.textContent).toContain('Você fica como técnico responsável.');
    await digitar('titulo', 'Impressor');
    await digitar('descricao', DESCRICAO_OK);
    await enviar();
    expect(mensagem()).toBe('Título precisa de mais 1 caractere.');
    await digitar('titulo', 'Impressora do RH sem papel');
    await enviar();
    expect(mensagem()).toBe('Selecione o solicitante.');
  });
});

describe('modo Qualidade — os campos', () => {
  beforeEach(() => {
    qualidadeDisponivel();
  });

  it('sem título, sem categoria e sem a dica da TI', async () => {
    await montar(TECNICO);
    await marcar('Qualidade');
    expect(document.getElementById('titulo')).toBeNull();
    expect(document.getElementById('categoria')).toBeNull();
    expect(document.body.textContent).not.toContain('Você fica como técnico responsável.');
  });

  it('descrição, prioridade e responsável na tela; prioridade nasce Média', async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    expect(document.getElementById('descricao')).toBeTruthy();
    expect(document.getElementById('prioridade')?.textContent).toContain('Média');
    expect(document.getElementById('responsavel')).toBeTruthy();
  });

  it('responsável: só os atendentes da API, sem "Sem atribuição", sem escolha automática', async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    expect(document.getElementById('responsavel')?.textContent).toContain(
      'Selecione o responsável'
    );
    const opcoes = await opcoesDo('responsavel');
    expect(opcoes).not.toContain('Sem atribuição');
    expect(opcoes.filter((o) => o !== 'Selecione o responsável')).toEqual([
      'Ana Qualidade',
      'Bruno Qualidade',
    ]);
  });

  it('o rótulo visível aponta para o seletor de responsável', async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    const rotulo = document.querySelector('label[for="responsavel"]');
    expect(rotulo?.textContent).toContain('Responsável');
  });

  it('a equipe continua vendo o solicitante, pela regra de hoje', async () => {
    for (const quem of [TECNICO, ADMIN]) {
      await remontar(quem);
      await marcar('Qualidade');
      expect(document.getElementById('solicitante'), quem.user!.role).toBeTruthy();
    }
  });
});

describe('modo Qualidade — o corpo enviado', () => {
  beforeEach(() => {
    qualidadeDisponivel();
  });

  it('Usuario: as cinco chaves do contrato, sem título nem categoria', async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    await digitar('descricao', DESCRICAO_Q);
    await escolher('responsavel', 'Bruno Qualidade');
    await enviar();

    expect(corpoEnviado()).toStrictEqual({
      setor_destino: 'QUALIDADE',
      descricao: DESCRICAO_Q,
      prioridade: PrioridadeEnum.MEDIA,
      solicitante_id: 7,
      tecnico_responsavel_id: 22,
    });
    expect('titulo' in corpoEnviado()).toBe(false);
    expect('categoria_id' in corpoEnviado()).toBe(false);
  });

  it('Administrador escolhe o solicitante', async () => {
    await montar(ADMIN);
    await marcar('Qualidade');
    await digitar('descricao', DESCRICAO_Q);
    await escolher('solicitante', 'Lidisay');
    await escolher('responsavel', 'Ana Qualidade');
    await escolher('prioridade', PrioridadeEnum.ALTA);
    await enviar();

    expect(corpoEnviado()).toStrictEqual({
      setor_destino: 'QUALIDADE',
      descricao: DESCRICAO_Q,
      prioridade: PrioridadeEnum.ALTA,
      solicitante_id: 8,
      tecnico_responsavel_id: 21,
    });
  });

  /** A regra de hoje, preservada: a API é quem decide se honra a escolha. */
  it('Técnico manda o solicitante escolhido, como na TI', async () => {
    await montar(TECNICO);
    await marcar('Qualidade');
    await digitar('descricao', DESCRICAO_Q);
    await escolher('solicitante', 'Gabriel');
    await escolher('responsavel', 'Ana Qualidade');
    await enviar();
    expect(corpoEnviado()).toMatchObject({ solicitante_id: 7, tecnico_responsavel_id: 21 });
  });

  it('título e categoria digitados antes na TI não vão junto', async () => {
    await montar(USUARIO);
    await preencherTI();
    await escolher('categoria', 'Impressoras');
    await marcar('Qualidade');
    await escolher('responsavel', 'Ana Qualidade');
    await enviar();
    expect(Object.keys(corpoEnviado()).sort()).toEqual(
      ['descricao', 'prioridade', 'setor_destino', 'solicitante_id', 'tecnico_responsavel_id'].sort()
    );
  });

  it('201: devolve o chamado e põe no topo da lista do contexto', async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    await digitar('descricao', DESCRICAO_Q);
    await escolher('responsavel', 'Ana Qualidade');
    await enviar();
    expect(aoCriar).toHaveBeenCalledWith(CRIADO);
    expect(naLista[0]).toBe(99);
  });
});

describe('modo Qualidade — validação', () => {
  beforeEach(() => {
    qualidadeDisponivel();
  });

  it('descrição curta: a mensagem da TI', async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    await digitar('descricao', 'Parou de novo');
    await escolher('responsavel', 'Ana Qualidade');
    await enviar();
    expect(mensagem()).toBe('Descrição precisa de mais 7 caracteres.');
    expect(criar).not.toHaveBeenCalled();
  });

  it('sem responsável: "Selecione o responsável."', async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    await digitar('descricao', DESCRICAO_Q);
    await enviar();
    expect(mensagem()).toBe('Selecione o responsável.');
    expect(criar).not.toHaveBeenCalled();
  });

  it('a equipe sem solicitante: antes do responsável', async () => {
    await montar(ADMIN);
    await marcar('Qualidade');
    await digitar('descricao', DESCRICAO_Q);
    await enviar();
    expect(mensagem()).toBe('Selecione o solicitante.');
  });
});

describe('alternância entre TI e Qualidade', () => {
  beforeEach(() => {
    qualidadeDisponivel();
  });

  it('descrição e prioridade atravessam; título e categoria esperam na TI', async () => {
    await montar(USUARIO);
    await preencherTI();
    await escolher('categoria', 'Impressoras');
    await escolher('prioridade', PrioridadeEnum.ALTA);

    await marcar('Qualidade');
    expect((document.getElementById('descricao') as HTMLTextAreaElement).value).toBe(DESCRICAO_OK);
    expect(document.getElementById('prioridade')?.textContent).toContain('Alta');

    await marcar('TI');
    expect((document.getElementById('titulo') as HTMLInputElement).value).toBe(
      'Impressora do RH sem papel'
    );
    expect(document.getElementById('categoria')?.textContent).toContain('Impressoras');
  });

  it('o responsável escolhido espera na Qualidade', async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    await escolher('responsavel', 'Bruno Qualidade');
    await marcar('TI');
    await marcar('Qualidade');
    expect(document.getElementById('responsavel')?.textContent).toContain('Bruno Qualidade');
  });

  it('trocar de setor apaga a mensagem de erro', async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    await digitar('descricao', DESCRICAO_Q);
    await enviar();
    expect(mensagem()).toBe('Selecione o responsável.');
    await marcar('TI');
    expect(mensagem()).toBeNull();
  });

  it('voltar para TI e enviar manda o corpo da TI, sem nada da Qualidade', async () => {
    await montar(USUARIO);
    await preencherTI();
    await marcar('Qualidade');
    await escolher('responsavel', 'Ana Qualidade');
    await marcar('TI');
    await enviar();
    expect(corpoEnviado()).toStrictEqual({
      solicitante_id: 7,
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
      prioridade: PrioridadeEnum.MEDIA,
      categoria_id: undefined,
      tecnico_responsavel_id: undefined,
    });
  });
});

describe('modo Qualidade — erros do envio', () => {
  beforeEach(() => {
    qualidadeDisponivel();
  });

  const prontoParaEnviar = async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    await digitar('descricao', DESCRICAO_Q);
    await escolher('responsavel', 'Bruno Qualidade');
  };

  it('400: mostra o detail, recarrega a lista e guarda o texto', async () => {
    criar.mockRejectedValueOnce(erroHttp(400, 'Atendente não é elegível para a Qualidade'));
    await prontoParaEnviar();
    atendentes.mockResolvedValue([ATENDENTES[0]]);
    await enviar();

    expect(mensagem()).toBe('Atendente não é elegível para a Qualidade');
    expect(atendentes).toHaveBeenCalledTimes(2);
    expect((document.getElementById('descricao') as HTMLTextAreaElement).value).toBe(DESCRICAO_Q);
  });

  /** O escolhido saiu da lista nova: a escolha cai e precisa ser refeita. */
  it('400: escolha que saiu da lista precisa ser refeita', async () => {
    criar.mockRejectedValueOnce(erroHttp(400, 'Atendente não é elegível para a Qualidade'));
    await prontoParaEnviar();
    atendentes.mockResolvedValue([ATENDENTES[0]]);
    await enviar();

    expect(document.getElementById('responsavel')?.textContent).toContain(
      'Selecione o responsável'
    );
    await enviar();
    expect(mensagem()).toBe('Selecione o responsável.');
    expect(criar).toHaveBeenCalledTimes(1);

    await escolher('responsavel', 'Ana Qualidade');
    await enviar();
    expect(corpoEnviado()).toMatchObject({ tecnico_responsavel_id: 21 });
  });

  it('422: o texto já normalizado pelo interceptor', async () => {
    criar.mockRejectedValueOnce(
      erroHttp(422, 'descricao: String should have at least 20 characters')
    );
    await prontoParaEnviar();
    await enviar();
    expect(mensagem()).toBe('descricao: String should have at least 20 characters');
  });

  /**
   * A Qualidade foi desligada entre a consulta e o envio. Nada vira TI: a
   * tentativa fica parada, com o texto, até a pessoa escolher TI.
   */
  it('503: mensagem clara, nada reenviado para a TI, e o envio da Qualidade trava', async () => {
    criar.mockRejectedValueOnce(
      erroHttp(503, 'Abertura de chamados para a Qualidade não está disponível neste ambiente')
    );
    await prontoParaEnviar();
    await enviar();

    expect(mensagem()).toBe(
      'A abertura para a Qualidade ficou indisponível. Abra para a TI ou tente mais tarde.'
    );
    expect(criar).toHaveBeenCalledTimes(1);
    expect(corpoEnviado().setor_destino).toBe('QUALIDADE');
    expect((document.getElementById('descricao') as HTMLTextAreaElement).value).toBe(DESCRICAO_Q);

    // Continua no modo Qualidade, e não envia de novo.
    expect(radio('Qualidade')?.checked).toBe(true);
    expect(botao('Abrir chamado')?.disabled).toBe(true);
    await enviar();
    expect(criar).toHaveBeenCalledTimes(1);
  });

  it('503: escolher TI é consciente, e a TI abre com o texto guardado', async () => {
    criar.mockRejectedValueOnce(erroHttp(503));
    await montar(USUARIO);
    await preencherTI();
    await marcar('Qualidade');
    await escolher('responsavel', 'Bruno Qualidade');
    await enviar();

    await marcar('TI');
    // Com a Qualidade fora, a escolha some e o formulário volta a ser o de antes.
    expect(grupo()).toBeNull();
    expect(botao('Abrir chamado')?.disabled).toBe(false);
    await enviar();
    expect(corpoEnviado()).toMatchObject({
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
    });
    expect(corpoEnviado()).not.toHaveProperty('setor_destino');
  });

  it('400 que recarrega para 503: o envio da Qualidade trava sem virar TI', async () => {
    criar.mockRejectedValueOnce(erroHttp(400, 'Atendente não encontrado'));
    await prontoParaEnviar();
    atendentes.mockRejectedValue(erroHttp(503));
    await enviar();

    expect(radio('Qualidade')?.checked).toBe(true);
    expect(botao('Abrir chamado')?.disabled).toBe(true);
    await enviar();
    expect(criar).toHaveBeenCalledTimes(1);
  });
});
