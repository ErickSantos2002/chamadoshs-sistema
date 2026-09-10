import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

/**
 * A trava que impede captura de evidência apontada para produção.
 *
 * ── Por que ela existe ───────────────────────────────────────────────
 *
 * O `.env` deste repositório aponta para a API de **produção**, e não há proxy
 * no Vite: o front fala direto com ela. Um `npm run dev` na máquina de quem
 * está capturando conversa com o sistema real.
 *
 * Duas consequências, e a primeira é séria:
 *
 * 1. A captura do estado de erro do Dashboard pede "derrube a API". Apontado
 *    para produção, esse passo deixa de ser um teste e vira uma
 *    indisponibilidade.
 * 2. As dezoito imagens vão para `docs/` e sobem no commit. Contra produção
 *    elas levam título de chamado, nome de solicitante e protocolo de gente
 *    real.
 *
 * ── O que este arquivo testa, e o que a sonda testa ──────────────────
 *
 * A sonda faz a conferência de verdade, e ela já foi vista **bloqueando**: com
 * o `.env` de produção intacto, devolveu `ok: false` nomeando a URL, com
 * canário, marcador e tabelas todos ok — ou seja, bloqueou pelo motivo certo e
 * só por ele.
 *
 * O que falta é a direção oposta, e ela não pode ser provada mexendo no `.env`
 * — o operador pediu para não tocar nele até mandar a URL local. Então a
 * decisão é testada por STRING, que é como o `achadosDeNome` e o
 * `resolverDoPacote` também são.
 */

const requerer = createRequire(import.meta.url);
const { ehLocal, apiDoEnv } = requerer(
  resolve(__dirname, '../scripts/sonda-captura.js')
) as {
  ehLocal: (url: unknown) => boolean | null;
  apiDoEnv: () => string | null;
};

describe('trava de captura — o endereço é local?', () => {
  it('aceita as três formas de local', () => {
    expect(ehLocal('http://localhost:8000')).toBe(true);
    expect(ehLocal('http://127.0.0.1:8000')).toBe(true);
    expect(ehLocal('http://[::1]:8000')).toBe(true);
  });

  it('recusa produção', () => {
    expect(ehLocal('https://chamadoshsapi.healthsafetytech.com')).toBe(false);
  });

  /**
   * A armadilha que a versão ingênua não pegaria.
   *
   * `url.includes('localhost')` aprova `https://localhost.exemplo.com`, que é
   * um domínio de terceiro com a palavra no nome. É a mesma família do `\b` que
   * casava `text-info-700` procurando `text-info`, e do escape octal que virou
   * outro caractere: **casar prefixo em vez de estrutura**.
   *
   * Aqui a URL é parseada e o hostname comparado por igualdade.
   */
  it('não cai no domínio que só CONTÉM a palavra', () => {
    expect(ehLocal('https://localhost.exemplo.com')).toBe(false);
    expect(ehLocal('https://nao-localhost.com')).toBe(false);
    expect(ehLocal('https://127.0.0.1.exemplo.com')).toBe(false);
  });

  /**
   * Diante de lixo, devolve nulo — e não um palpite.
   *
   * Uma trava que chuta "local" para o que não conseguiu ler libera a captura
   * exatamente no caso em que menos se sabe o que está acontecendo. Quem chama
   * trata o `null` como problema, e a sonda diz "ausente ou inválida".
   */
  it('devolve nulo para o que não é URL, em vez de chutar', () => {
    expect(ehLocal('')).toBeNull();
    expect(ehLocal('   ')).toBeNull();
    expect(ehLocal('nao-e-url')).toBeNull();
    expect(ehLocal(undefined)).toBeNull();
    expect(ehLocal(42)).toBeNull();
  });

  it('lê o VITE_API_URL do .env, e não uma cópia', () => {
    // Sem afirmar QUAL é o valor: ele muda quando o operador sobe a API local,
    // e um teste que fixasse a URL de produção reprovaria justamente no dia em
    // que tudo passou a estar certo.
    const url = apiDoEnv();
    expect(url, 'VITE_API_URL não encontrada no .env').toBeTruthy();
    expect(ehLocal(url), 'a URL do .env não é parseável').not.toBeNull();
  });
});
