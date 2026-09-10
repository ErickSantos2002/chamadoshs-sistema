import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * O sistema é interno e roda na rede da HS. Nenhum recurso visual pode depender
 * de servidor de terceiro: se o provedor cair, bloquear o IP da empresa ou
 * mudar de endereço, a interface degrada sem que ninguém tenha alterado código.
 *
 * Havia 12 ícones vindos do `img.icons8.com`. Além da disponibilidade, cada
 * carregamento anunciava o host interno do sistema no `Referer` de um domínio
 * externo. Foram para um pacote no bundle, e de lá para `components/ui/icones`,
 * desenhados no projeto — hoje nenhum ícone sai da rede.
 *
 * Este teste falha se alguém voltar a apontar `src` para fora.
 *
 * ── Por que ele varre CSS também ──────────────────────────────────────
 *
 * Ele nasceu varrendo só `.ts`/`.tsx`, e por doze arquivos isso bastava: os
 * ícones eram `<img src>`. Mas a fonte NÃO entra por JSX — entra por
 * `@import url(...)` e por `src: url(...)` dentro de `@font-face`, em CSS. Ou
 * seja: durante todo o tempo em que a tipografia do sistema veio do CDN do
 * Google, este teste esteve verde. Ele guardava a porta errada.
 *
 * A varredura de CSS ignora comentário, e isso é necessário, não conveniência:
 * `design-system/tokens/typography.css` cita a URL antiga do Google dentro de
 * um bloco de comentário, documentando o que a emenda E3 substituiu. Sem tirar
 * comentário, o teste reprovaria justamente o arquivo que resolveu o problema.
 */

const RAIZ = join(__dirname);

/** Só o código que vai para o bundle — teste não é servido a ninguém. */
function arquivosDeCodigo(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivosDeCodigo(caminho);
    if (/\.test\.tsx?$/.test(nome)) return [];
    return /\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

/** Pega o `src=` e o que vem logo depois, onde a URL apareceria. */
const SRC_COM_VALOR = /src\s*=\s*[{"'`][^>]{0,200}/g;

describe('recursos externos', () => {
  const arquivos = arquivosDeCodigo(RAIZ);

  it('encontra os arquivos de código para varrer', () => {
    // Sem esta checagem, um erro de caminho faria a suíte passar varrendo nada.
    expect(arquivos.length).toBeGreaterThan(20);
  });

  it('nenhum src aponta para servidor externo', () => {
    const infratores: string[] = [];

    for (const arquivo of arquivos) {
      const conteudo = readFileSync(arquivo, 'utf-8');
      for (const trecho of conteudo.match(SRC_COM_VALOR) ?? []) {
        if (/https?:\/\//i.test(trecho)) {
          infratores.push(`${arquivo.replace(RAIZ, 'src')}: ${trecho.slice(0, 90)}`);
        }
      }
    }

    expect(infratores).toEqual([]);
  });

  it('o ícone externo que existia não voltou', () => {
    const comIcons8 = arquivos.filter((a) =>
      readFileSync(a, 'utf-8').includes('icons8')
    );

    expect(comIcons8).toEqual([]);
  });
});

/** Todo `.css` de `src/`, inclusive a cópia do design system. */
function arquivosDeEstilo(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivosDeEstilo(caminho);
    return nome.endsWith('.css') ? [caminho] : [];
  });
}

/** Sem comentários — ver o cabeçalho deste arquivo. */
const semComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Qualquer `url(...)` apontando para fora, com ou sem aspas. */
const URL_EXTERNA = /url\(\s*['"]?\s*(https?:)?\/\//gi;

describe('recursos externos no CSS', () => {
  const estilos = arquivosDeEstilo(RAIZ);

  it('encontra os arquivos de estilo para varrer', () => {
    // Mesma razão do caso equivalente acima: um erro de caminho faria a suíte
    // passar varrendo nada, e é justamente disso que este arquivo desconfia.
    expect(estilos.length).toBeGreaterThan(5);
  });

  it('nenhum url() de CSS aponta para servidor externo', () => {
    const infratores: string[] = [];

    for (const arquivo of estilos) {
      const conteudo = semComentarios(readFileSync(arquivo, 'utf-8'));
      for (const trecho of conteudo.match(URL_EXTERNA) ?? []) {
        infratores.push(`${arquivo.replace(RAIZ, 'src')}: ${trecho.trim()}`);
      }
    }

    expect(infratores).toEqual([]);
  });

  it('a fonte é servida do próprio bundle, nos seis pesos', () => {
    const tipografia = readFileSync(
      join(RAIZ, 'design-system', 'tokens', 'typography.css'),
      'utf-8'
    );
    const ativo = semComentarios(tipografia);

    // Doze regras: seis pesos x dois subconjuntos (latin, latin-ext).
    expect((ativo.match(/@font-face/g) ?? []).length).toBe(12);

    for (const peso of [300, 400, 500, 600, 700, 800]) {
      expect(ativo).toContain(`font-weight: ${peso};`);
    }

    // Todas apontam para dentro, e nenhuma para o Google.
    expect((ativo.match(/url\("\.\.\/fonts\//g) ?? []).length).toBe(12);
    expect(ativo).not.toContain('googleapis');
    expect(ativo).not.toContain('gstatic');
  });
});
