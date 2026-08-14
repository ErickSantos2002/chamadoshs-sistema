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
