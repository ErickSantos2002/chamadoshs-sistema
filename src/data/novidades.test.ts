import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NOVIDADES } from './novidades';

const versaoDoPacote: string = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8')
).version;

describe('lista de novidades', () => {
  // A versão do package.json é o que decide quando o aviso abre. Se ela subir
  // e ninguém escrever a entrada correspondente, o modal abre mostrando só
  // versões antigas e sem marcar nenhuma como atual — falha silenciosa, que
  // aparece para o usuário e não para quem programa.
  it('a primeira entrada corresponde à versão em execução', () => {
    expect(NOVIDADES[0]?.versao).toBe(versaoDoPacote);
  });

  it('está em ordem decrescente de versão', () => {
    const versoes = NOVIDADES.map((v) => v.versao);
    const ordenadas = [...versoes].sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true })
    );
    expect(versoes).toEqual(ordenadas);
  });

  it('não repete versão', () => {
    const versoes = NOVIDADES.map((v) => v.versao);
    expect(new Set(versoes).size).toBe(versoes.length);
  });

  it('toda versão tem data no formato ISO e ao menos um item', () => {
    for (const versao of NOVIDADES) {
      expect(versao.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(versao.itens.length).toBeGreaterThan(0);
    }
  });

  // O aviso é lido por quem abre chamado. Texto de uma linha seca costuma ser
  // jargão copiado do commit — o mínimo obriga a explicar o que mudou.
  it('nenhum item é curto demais para explicar algo', () => {
    for (const versao of NOVIDADES) {
      for (const item of versao.itens) {
        expect(item.texto.trim().length).toBeGreaterThan(30);
      }
    }
  });
});
