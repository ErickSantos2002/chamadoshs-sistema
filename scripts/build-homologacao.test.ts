import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  RecusaDaHomologacao,
  conferirArtefato,
  hostsDosArquivosEnv,
  validarUrlDaApi,
} from './build-homologacao.mjs';

/**
 * O build de homologação recusa tudo o que não for a API local (FE-5, §4).
 *
 * Só texto: nenhum caso aqui abre conexão. O host de produção aparece como
 * cadeia a recusar e a procurar no artefato, nunca como destino.
 */

const recusa = (valor: unknown) => {
  try {
    validarUrlDaApi(valor);
  } catch (erro) {
    expect(erro).toBeInstanceOf(RecusaDaHomologacao);
    return (erro as Error).message;
  }
  throw new Error('deveria ter recusado');
};

describe('validarUrlDaApi', () => {
  it('aceita 127.0.0.1 com porta da API local e devolve a origem', () => {
    expect(validarUrlDaApi('http://127.0.0.1:8011')).toBe('http://127.0.0.1:8011');
    expect(validarUrlDaApi('  http://127.0.0.1:8011/  ')).toBe('http://127.0.0.1:8011');
  });

  it('aceita localhost', () => {
    expect(validarUrlDaApi('http://localhost:8000')).toBe('http://localhost:8000');
  });

  it.each([undefined, null, '', '   '])('recusa ausente (%s), sem cair em valor padrão', (valor) => {
    expect(recusa(valor)).toMatch(/ausente/);
  });

  it('recusa o host de produção', () => {
    expect(recusa('https://chamadoshsapi.healthsafetytech.com')).toMatch(/http:\/\/|loopback/);
    expect(recusa('http://chamadoshsapi.healthsafetytech.com:8011')).toMatch(/loopback/);
  });

  it.each([
    'http://exemplo.invalid:8011',
    'http://10.0.0.5:8011',
    'http://192.168.0.10:8011',
    'http://0.0.0.0:8011',
    'http://127.0.0.2:8011',
    'http://[::1]:8011',
    'http://localhost.exemplo.invalid:8011',
    'http://127.0.0.1.nip.io:8011',
  ])('recusa host externo ou parecido com loopback: %s', (valor) => {
    expect(recusa(valor)).toMatch(/loopback/);
  });

  it('recusa https, porta ausente e porta fora da faixa', () => {
    expect(recusa('https://127.0.0.1:8011')).toMatch(/http:\/\//);
    expect(recusa('http://127.0.0.1')).toMatch(/porta explícita/);
    expect(recusa('http://127.0.0.1:5432')).toMatch(/faixa/);
    expect(recusa('http://127.0.0.1:9000')).toMatch(/faixa/);
  });

  it('recusa caminho, consulta e fragmento', () => {
    expect(recusa('http://127.0.0.1:8011/api/v1')).toMatch(/origem/);
    expect(recusa('http://127.0.0.1:8011/?x=1')).toMatch(/origem/);
    expect(recusa('http://127.0.0.1:8011/#a')).toMatch(/origem/);
  });

  it('recusa credencial embutida sem repeti-la na mensagem', () => {
    const mensagem = recusa('http://operador:segredo-ficticio@127.0.0.1:8011');
    expect(mensagem).toMatch(/usuário ou senha/);
    expect(mensagem).not.toContain('segredo-ficticio');
    expect(mensagem).not.toContain('operador');
  });

  it('nenhuma recusa repete o valor recebido', () => {
    for (const valor of [
      'https://chamadoshsapi.healthsafetytech.com',
      'http://exemplo.invalid:8011',
      'nao-e-url-ficticia',
    ]) {
      expect(recusa(valor)).not.toContain(valor);
    }
  });
});

describe('conferirArtefato', () => {
  let pasta: string;

  beforeEach(() => {
    pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'artefato-teste-'));
    fs.mkdirSync(path.join(pasta, 'assets'));
  });

  afterEach(() => {
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  const escrever = (nome: string, texto: string) =>
    fs.writeFileSync(path.join(pasta, nome), texto);

  it('aprova o artefato com a URL local e sem host de produção', () => {
    escrever('index.html', '<script src="/assets/i.js"></script>');
    escrever('assets/i.js', 'const b="http://127.0.0.1:8011";');
    expect(conferirArtefato(pasta, 'http://127.0.0.1:8011')).toEqual([]);
  });

  it('recusa o artefato com o host de produção, sem citar o trecho', () => {
    escrever('assets/i.js', 'a="http://127.0.0.1:8011";b="https://chamadoshsapi.healthsafetytech.com"');
    const problemas = conferirArtefato(pasta, 'http://127.0.0.1:8011');
    expect(problemas).toEqual([path.join('assets', 'i.js') + ': contém um host de produção']);
  });

  it('o link da Central HS, outro site do mesmo domínio, não é a API', () => {
    escrever('assets/i.js', 'a="http://127.0.0.1:8011";c="https://centralhs.healthsafetytech.com"');
    expect(conferirArtefato(pasta, 'http://127.0.0.1:8011')).toEqual([]);
  });

  it('recusa o artefato com um host lido dos .env', () => {
    escrever('assets/i.js', 'a="http://127.0.0.1:8011";b="https://api.exemplo.invalid"');
    expect(conferirArtefato(pasta, 'http://127.0.0.1:8011', ['api.exemplo.invalid'])).toHaveLength(1);
  });

  it('recusa o artefato com algo que parece token', () => {
    escrever(
      'assets/i.js',
      'a="http://127.0.0.1:8011";t="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMCJ9.ficticio"'
    );
    expect(conferirArtefato(pasta, 'http://127.0.0.1:8011')[0]).toMatch(/credencial/);
  });

  it('recusa o artefato que não usou a URL conferida', () => {
    escrever('assets/i.js', 'a="http://localhost:8000"');
    expect(conferirArtefato(pasta, 'http://127.0.0.1:8011')[0]).toMatch(/nenhum arquivo/);
  });
});

describe('hostsDosArquivosEnv', () => {
  let raiz: string;

  beforeEach(() => {
    raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'env-teste-'));
  });

  afterEach(() => {
    fs.rmSync(raiz, { recursive: true, force: true });
  });

  it('lê os hosts não locais de .env e .env.*, e ignora o loopback', () => {
    fs.writeFileSync(path.join(raiz, '.env'), '# c\nVITE_API_URL=https://api.exemplo.invalid\n');
    fs.writeFileSync(path.join(raiz, '.env.example'), 'VITE_API_URL=http://localhost:8000\n');
    fs.writeFileSync(path.join(raiz, 'outro.txt'), 'https://nao.lido.invalid');
    expect(hostsDosArquivosEnv(raiz)).toEqual(['api.exemplo.invalid']);
  });

  it('sem .env, lista vazia', () => {
    expect(hostsDosArquivosEnv(raiz)).toEqual([]);
  });
});
