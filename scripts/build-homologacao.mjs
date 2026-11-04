/**
 * O build de homologação: o front compilado contra uma API local, e só local.
 *
 * ── Por que isto existe ───────────────────────────────────────────────
 *
 * O `.env` do repositório aponta para a API de produção, e o Vite o lê em
 * todo build. `npm run build` sem `VITE_API_URL` no processo embute essa URL
 * no `dist/` em silêncio — um artefato de homologação que, aberto no
 * navegador, faz login e grava na base da HS. Nada no build avisava.
 *
 * Aqui a ordem é a inversa: nada é compilado antes de a URL ser conferida, e
 * o artefato pronto é conferido de novo.
 *
 * 1. `VITE_API_URL` tem de estar no ambiente DO PROCESSO. Ausente ou vazia,
 *    para — não há valor padrão, nem leitura do `.env`.
 * 2. Só `http://127.0.0.1` ou `http://localhost`, com porta explícita na
 *    faixa da API local (8000–8999), sem usuário, senha, caminho, consulta
 *    ou fragmento. Qualquer outro host — inclusive o de produção — é recusado.
 * 3. O Vite roda com `envDir` numa pasta vazia: nenhum `.env*` do
 *    repositório entra, nem com outra chave `VITE_*`.
 * 4. O artefato (`dist-homologacao/`, fora do `dist/` de produção) precisa
 *    conter a URL local e não pode conter o host de produção, nenhum host
 *    lido dos `.env*`, nem nada com cara de token. Se contiver, a pasta é
 *    apagada e o build falha.
 *
 * As mensagens de erro nunca repetem o valor recebido: uma URL com senha
 * embutida não vai parar no terminal nem em log.
 *
 * O build de produção (`npm run build`) e o deploy não mudam: este script é
 * só outra porta de entrada, para homologar.
 *
 * Uso:
 *   VITE_API_URL=http://127.0.0.1:8011 npm run build:homologacao
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const PASTA_DO_ARTEFATO = 'dist-homologacao';

/** Os únicos hosts aceitos. `localhost` por nome, sem variação. */
export const HOSTS_LOCAIS = ['127.0.0.1', 'localhost'];

/** A faixa de portas em que a API local sobe nesta máquina. */
export const PORTA_MINIMA = 8000;
export const PORTA_MAXIMA = 8999;

/**
 * O host da API de produção. Só como texto a procurar no artefato: este
 * script nunca o acessa.
 *
 * O host, e não o domínio: o botão da Central HS abre outro site do mesmo
 * domínio, e esse link é do produto — não é para onde o front manda dados.
 */
export const HOSTS_DE_PRODUCAO = ['chamadoshsapi.healthsafetytech.com'];

/** Algo com cara de JWT (`eyJ...` com ponto) ou de chave privada. */
const PADROES_DE_CREDENCIAL = [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/];

export class RecusaDaHomologacao extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'RecusaDaHomologacao';
  }
}

/**
 * Confere a URL da API e devolve a forma normalizada (`http://host:porta`).
 *
 * Recebe o valor CRU do ambiente. Toda recusa diz o que faltou, nunca qual
 * era o valor.
 */
export function validarUrlDaApi(valor) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new RecusaDaHomologacao(
      'VITE_API_URL ausente no ambiente do processo. O build de homologação não usa o .env nem tem valor padrão: ' +
        'informe a API local, por exemplo VITE_API_URL=http://127.0.0.1:8011.'
    );
  }

  let url;
  try {
    url = new URL(valor.trim());
  } catch {
    throw new RecusaDaHomologacao('VITE_API_URL não é uma URL válida.');
  }

  if (url.username || url.password) {
    throw new RecusaDaHomologacao('VITE_API_URL não pode conter usuário ou senha.');
  }
  if (url.protocol !== 'http:') {
    throw new RecusaDaHomologacao('VITE_API_URL precisa usar http:// — a API local não tem TLS.');
  }
  if (!HOSTS_LOCAIS.includes(url.hostname)) {
    throw new RecusaDaHomologacao(
      `VITE_API_URL aponta para fora do loopback. Só ${HOSTS_LOCAIS.join(' ou ')} são aceitos na homologação.`
    );
  }
  if (url.port === '') {
    throw new RecusaDaHomologacao('VITE_API_URL precisa de porta explícita.');
  }
  const porta = Number(url.port);
  if (!Number.isInteger(porta) || porta < PORTA_MINIMA || porta > PORTA_MAXIMA) {
    throw new RecusaDaHomologacao(
      `VITE_API_URL usa uma porta fora da faixa da API local (${PORTA_MINIMA}–${PORTA_MAXIMA}).`
    );
  }
  if ((url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    throw new RecusaDaHomologacao(
      'VITE_API_URL deve ser só a origem (http://host:porta): o /api/v1 o front acrescenta.'
    );
  }

  return `${url.protocol}//${url.hostname}:${porta}`;
}

/**
 * Os hosts das URLs que aparecem nos `.env*` do repositório. São o que o
 * build de produção embutiria; nenhum deles pode sobrar no artefato.
 * Lidos e comparados, nunca impressos.
 */
export function hostsDosArquivosEnv(raiz = RAIZ) {
  const hosts = new Set();
  let nomes = [];
  try {
    nomes = fs.readdirSync(raiz).filter((nome) => nome === '.env' || nome.startsWith('.env.'));
  } catch {
    return [];
  }
  for (const nome of nomes) {
    let texto = '';
    try {
      texto = fs.readFileSync(path.join(raiz, nome), 'utf8');
    } catch {
      continue;
    }
    for (const trecho of texto.match(/https?:\/\/[^\s'"#]+/g) ?? []) {
      try {
        const { hostname } = new URL(trecho);
        if (hostname && !HOSTS_LOCAIS.includes(hostname)) hosts.add(hostname);
      } catch {
        // Linha que não é URL: não há host a procurar.
      }
    }
  }
  return [...hosts];
}

function* arquivosDe(pasta) {
  for (const entrada of fs.readdirSync(pasta, { withFileTypes: true })) {
    const caminho = path.join(pasta, entrada.name);
    if (entrada.isDirectory()) yield* arquivosDe(caminho);
    else yield caminho;
  }
}

/**
 * Confere o artefato pronto. Devolve a lista de problemas (vazia = aprovado)
 * — cada um diz o arquivo e o motivo, nunca o trecho encontrado.
 */
export function conferirArtefato(pasta, urlLocal, proibidos = []) {
  const problemas = [];
  let achouUrlLocal = false;
  const hosts = [...new Set([...HOSTS_DE_PRODUCAO, ...proibidos])];

  for (const arquivo of arquivosDe(pasta)) {
    const texto = fs.readFileSync(arquivo, 'latin1');
    const relativo = path.relative(pasta, arquivo);
    if (texto.includes(urlLocal)) achouUrlLocal = true;
    for (const host of hosts) {
      if (texto.includes(host)) problemas.push(`${relativo}: contém um host de produção`);
    }
    for (const padrao of PADROES_DE_CREDENCIAL) {
      if (padrao.test(texto)) problemas.push(`${relativo}: contém algo com cara de credencial`);
    }
  }
  if (!achouUrlLocal) {
    problemas.push('nenhum arquivo contém a URL local da API: o build não usou o valor conferido');
  }
  return problemas;
}

async function principal() {
  const urlLocal = validarUrlDaApi(process.env.VITE_API_URL);
  // O Vite lê `process.env`: daqui em diante só o valor normalizado existe.
  process.env.VITE_API_URL = urlLocal;
  console.log(`[homologação] API local conferida: ${urlLocal}`);

  const envVazio = fs.mkdtempSync(path.join(os.tmpdir(), 'chamadoshs-homologacao-env-'));
  const saida = path.join(RAIZ, PASTA_DO_ARTEFATO);
  try {
    const { build } = await import('vite');
    await build({
      root: RAIZ,
      mode: 'homologacao',
      envDir: envVazio,
      logLevel: 'warn',
      build: { outDir: saida, emptyOutDir: true },
    });
  } finally {
    fs.rmSync(envVazio, { recursive: true, force: true });
  }

  const problemas = conferirArtefato(saida, urlLocal, hostsDosArquivosEnv());
  if (problemas.length > 0) {
    fs.rmSync(saida, { recursive: true, force: true });
    throw new RecusaDaHomologacao(
      `Artefato recusado e apagado:\n  - ${[...new Set(problemas)].join('\n  - ')}`
    );
  }
  console.log(`[homologação] Artefato conferido em ${PASTA_DO_ARTEFATO}/: só a API local, sem host de produção.`);
}

const executadoDireto =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (executadoDireto) {
  principal().catch((erro) => {
    const mensagem = erro instanceof RecusaDaHomologacao ? erro.message : 'falha no build (ver acima).';
    console.error(`[homologação] ${mensagem}`);
    process.exit(1);
  });
}
