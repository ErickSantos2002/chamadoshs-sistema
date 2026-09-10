import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Os campos de senha do sistema, e o que impede o gerenciador de errar.
 *
 * ── O defeito que motivou o arquivo ──────────────────────────────────
 *
 * `UsuarioModal` era o ÚNICO formulário de senha do projeto sem
 * `autoComplete`, e é justamente o que cria a senha de OUTRA pessoa. Sem o
 * atributo, o gerenciador do navegador trata o campo como login e oferece a
 * senha salva de quem está logado — o administrador. Aceita por reflexo, ela
 * vira a senha do usuário novo.
 *
 * O modo de falha é o pior possível: **nada dá errado na tela**. O formulário
 * salva, o toast diz que deu certo, e a pessoa recebe uma credencial que não é
 * a dela. Só aparece quando alguém tenta entrar.
 *
 * ── Por que este teste lê o ARQUIVO, e não renderiza ─────────────────
 *
 * Montar o `UsuarioModal` exige o `CadastrosContext`, o `AuthContext` e uma
 * lista de usuários — três dublês para verificar um atributo. E a verificação
 * que importa não é "este campo tem o atributo", é **"nenhum campo de senha do
 * sistema ficou sem"**, que é uma pergunta sobre o conjunto e não sobre um
 * componente.
 *
 * Lendo os arquivos, o teste falha quando alguém acrescentar um campo de senha
 * novo em qualquer lugar — que é exatamente o dia em que o defeito voltaria.
 * Um teste de render do `UsuarioModal` passaria feliz nesse dia.
 */

const RAIZ = resolve(__dirname, '../..');

/** Todo arquivo que declara um campo de senha. */
const ARQUIVOS_COM_SENHA = [
  'components/cadastros/UsuarioModal.tsx',
  'components/cadastros/UsuariosTab.tsx',
  'components/ModalTrocarSenha.tsx',
  'pages/Login.tsx',
];

const ler = (relativo: string) =>
  readFileSync(resolve(RAIZ, relativo), 'utf-8');

/**
 * Os campos de senha de um arquivo, com o pedaço de código de cada um.
 *
 * Um campo começa em `type=...'password'` e vai até o fim daquele elemento.
 * O corte em `/>` basta porque todos os campos do projeto são auto-fechados.
 */
function camposDeSenha(fonte: string): string[] {
  const campos: string[] = [];
  // Duas formas convivem no projeto, e a marca precisa das duas:
  //
  //     type="password"                        campo simples
  //     type={mostrar ? 'text' : 'password'}   campo com botão do olho
  //
  // A primeira versão só pegava a segunda, e o `Login` — que tem a primeira —
  // passou como "nenhum campo de senha". Um teste de cobertura que não enxerga
  // metade dos casos é pior que nenhum: ele afirma que varreu.
  const marca = /type=(?:"password"|\{[^}\n]*'password'\s*\})/g;
  let m: RegExpExecArray | null;

  while ((m = marca.exec(fonte)) !== null) {
    // Sobe até o `<Input` ou `<input` que abre o elemento, e desce até o `/>`.
    const abertura = fonte.lastIndexOf('<', m.index);
    const fechamento = fonte.indexOf('/>', m.index);
    if (abertura === -1 || fechamento === -1) continue;
    campos.push(fonte.slice(abertura, fechamento));
  }
  return campos;
}

describe('campos de senha', () => {
  it('todos declaram autoComplete', () => {
    const semAtributo: string[] = [];

    for (const arquivo of ARQUIVOS_COM_SENHA) {
      for (const campo of camposDeSenha(ler(arquivo))) {
        if (!campo.includes('autoComplete=')) {
          const id = campo.match(/id="([^"]+)"/)?.[1] ?? '(sem id)';
          semAtributo.push(`${arquivo} → ${id}`);
        }
      }
    }

    expect(semAtributo).toEqual([]);
  });

  it('o par do UsuarioModal usa new-password, e não current-password', () => {
    const campos = camposDeSenha(ler('components/cadastros/UsuarioModal.tsx'));

    // Dois campos: a senha e a confirmação. `current-password` aqui seria
    // ainda pior que a ausência — estaria PEDINDO ao gerenciador a senha
    // guardada de quem está logado.
    expect(campos).toHaveLength(2);
    for (const campo of campos) {
      expect(campo).toContain('autoComplete="new-password"');
    }
  });

  it('o Login continua em current-password, que é o certo lá', () => {
    // O contraste importa: no Login a pessoa digita a PRÓPRIA senha, e é o
    // único lugar do sistema onde o gerenciador deve oferecer o que guardou.
    // Um teste que exigisse `new-password` em todo lugar quebraria isto.
    const campos = camposDeSenha(ler('pages/Login.tsx'));
    expect(campos).toHaveLength(1);
    expect(campos[0]).toContain('current-password');
  });
});
