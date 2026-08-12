/// <reference types="vite/client" />

/**
 * Versão do `package.json`, embutida no bundle pelo `define` do Vite.
 *
 * Nos testes o `define` não roda, então o valor é preenchido pelo setup do
 * Vitest — sem isso, qualquer teste que toque no aviso de novidades quebraria
 * com "__VERSAO_APP__ is not defined".
 */
declare const __VERSAO_APP__: string;
