import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AppLayout from '../../components/layout/AppLayout';

/**
 * A galeria da casca — só em desenvolvimento.
 *
 * ── Por que ela existe ────────────────────────────────────────────────
 *
 * A §26 exige screenshot da casca — barra expandida, recolhida, gaveta do
 * celular, faixa do topo — nos dois temas, para fechar o Checkpoint 1. No
 * Checkpoint 1 isso ficou por fazer, e o motivo está no relatório: a casca só
 * aparece DEPOIS do login, o login depende da API, e o front rodando sozinho
 * alcança só a tela de login, que não usa casca. Foi a decisão 2 do relatório.
 *
 * Esta página é a saída: monta a casca DE VERDADE — o mesmo `AppLayout`, a
 * mesma `Sidebar`, a mesma `Topbar` — sem token, sem API e sem rede, e deixa o
 * estado inteiro ser escolhido pela URL. Cada screenshot vira um endereço, e
 * quem precisar refazê-los daqui a seis meses não tem de adivinhar como.
 *
 * O que ela NÃO é: uma segunda casca. Ela não redesenha nada. Se a `Sidebar`
 * mudar, a foto muda junto — que é a única forma de o screenshot continuar
 * valendo como prova.
 *
 * ── Os dois modos ─────────────────────────────────────────────────────
 *
 * `?cru=1`   desenha só a casca, preenchendo a janela.
 * sem `cru`  desenha uma MOLDURA: um iframe de tamanho exato, colado no canto
 *            superior esquerdo, com a casca dentro.
 *
 * A moldura existe porque a §28 pede resoluções fixas — 1366×768 e 390×844 —
 * e a janela de quem tira a foto costuma estar maximizada em outra coisa. Dá
 * para redimensionar a janela do sistema operacional; não dá para CONTAR com
 * isso, e uma janela maximizada ignora o pedido em silêncio. Foi o que
 * aconteceu aqui: pedido de 1366, viewport continuou em 1920, sem erro.
 *
 * Dentro do iframe o `h-screen` da casca é a altura do iframe, e as media
 * queries valem contra a largura dele. Ou seja: a 390px a casca de verdade
 * troca a barra pela gaveta, como trocaria num celular. É a mesma casca, no
 * mesmo `md`, numa viewport que se pode escolher.
 *
 * Colada em (0,0) e sem nada em volta, a moldura deixa recortar a captura da
 * janela exatamente em `largura`×`altura`.
 *
 * ── Como se usa ───────────────────────────────────────────────────────
 *
 *   /dev/galeria?estado=expandida&tema=claro
 *   /dev/galeria?estado=recolhida&tema=escuro&titulo=Chamados
 *   /dev/galeria?estado=gaveta&tema=claro&largura=390&altura=844
 *
 * `estado`   expandida | recolhida | gaveta  (padrão: recolhida, como o app)
 * `tema`     claro | escuro                  (padrão: o que estiver gravado)
 * `titulo`   qualquer texto                  (padrão: vazio, como hoje)
 * `largura`  px da moldura                   (padrão: 1366)
 * `altura`   px da moldura                   (padrão: 768)
 * `cru`      1 para desenhar sem moldura
 *
 * ── Por que não entra em produção ─────────────────────────────────────
 *
 * `router.tsx` só registra a rota sob `import.meta.env.DEV`, que o Vite troca
 * por `false` literal no build — o `import()` dinâmico morre no tree-shaking e
 * este arquivo não vira pedaço nenhum do bundle. Conferido: depois do build,
 * nenhum arquivo em `dist/` contém a palavra "galeria".
 */

/**
 * A pessoa que aparece na faixa do topo.
 *
 * A `Topbar` lê nome e papel do `AuthContext`. Sem isto o menu do usuário sai
 * vazio, e o screenshot mostraria um estado que ninguém vê no sistema.
 *
 * O nome é ostensivamente falso de propósito: screenshot vai para documento, e
 * documento circula. Ninguém deve olhar estas imagens e achar que está vendo a
 * conta de uma pessoa real.
 */
const PESSOA_DE_MENTIRA = {
  id: 0,
  username: 'Galeria DEV',
  role: 'Administrador',
};

/** Só o que a `Topbar` consome. O resto do contrato é preenchido inerte. */
const AUTH_DE_MENTIRA = {
  user: PESSOA_DE_MENTIRA,
  token: 'galeria',
  loading: false,
  login: async () => {},
  logout: () => {},
  error: null,
};

type Estado = 'expandida' | 'recolhida' | 'gaveta';

const ESTADOS: Record<
  Estado,
  { recolhida: boolean; gaveta: boolean; descricao: string }
> = {
  expandida: {
    recolhida: false,
    gaveta: false,
    descricao: 'barra lateral aberta — 256px',
  },
  recolhida: {
    recolhida: true,
    gaveta: false,
    descricao: 'barra lateral recolhida — 72px',
  },
  gaveta: {
    recolhida: false,
    gaveta: true,
    descricao: 'gaveta aberta sobre o fundo — 256px',
  },
};

const ehEstado = (v: string | null): v is Estado =>
  v === 'expandida' || v === 'recolhida' || v === 'gaveta';

/** Uma linha de dado, do jeito que a §14 desenha rótulo e valor. */
const Linha: React.FC<{ rotulo: string; children: React.ReactNode }> = ({
  rotulo,
  children,
}) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-borda py-2 last:border-b-0">
    <span className="font-mono text-xs uppercase tracking-[0.1em] text-conteudo-tenue">
      {rotulo}
    </span>
    <span className="text-sm text-conteudo-suave">{children}</span>
  </div>
);

/** A casca, com o estado que a URL pediu. É isto que a foto mostra. */
const CascaDaGaleria: React.FC<{
  estado: Estado;
  titulo?: string;
  darkMode: boolean;
}> = ({ estado, titulo, darkMode }) => {
  /** Só para a imagem dizer em que largura foi tirada. */
  const [largura, setLargura] = useState(() => window.innerWidth);
  useEffect(() => {
    const aoRedimensionar = () => setLargura(window.innerWidth);
    window.addEventListener('resize', aoRedimensionar);
    return () => window.removeEventListener('resize', aoRedimensionar);
  }, []);

  const { recolhida, gaveta, descricao } = ESTADOS[estado];

  return (
    <AuthContext.Provider value={AUTH_DE_MENTIRA}>
      <AppLayout
        pageTitle={titulo}
        recolhidaInicial={recolhida}
        gavetaAbertaInicial={gaveta}
        aoAbrirNovidades={() => {}}
        temNovidade
        versao={typeof __VERSAO_APP__ === 'string' ? __VERSAO_APP__ : ''}
      >
        {/* O conteúdo do `<main>` é deliberadamente pequeno: o que está sendo
            fotografado é a casca, e uma tela cheia de dado falso disputaria a
            atenção de quem for comparar as medidas. O que ele traz é a legenda
            da própria imagem — sem isso, oito arquivos .png viram um quebra-
            cabeça na hora de escrever o relatório. */}
        <h2 className="text-base font-semibold text-conteudo">
          Galeria da casca
        </h2>
        <p className="mt-1 max-w-prose text-sm text-conteudo-tenue">
          Página de desenvolvimento. Existe para produzir as imagens que a §26
          exige no Checkpoint 1, e não faz parte do sistema.
        </p>

        <div className="mt-6 max-w-md border border-borda bg-superficie p-4">
          <Linha rotulo="estado">{descricao}</Linha>
          <Linha rotulo="tema">{darkMode ? 'escuro' : 'claro'}</Linha>
          <Linha rotulo="viewport">{largura}px</Linha>
          <Linha rotulo="título na topbar">
            {titulo ? `"${titulo}"` : 'vazio (Fases 11–16)'}
          </Linha>
        </div>
      </AppLayout>
    </AuthContext.Provider>
  );
};

const GaleriaDaCasca: React.FC = () => {
  const [params] = useSearchParams();
  const { darkMode } = useTheme();

  const cru = params.get('cru') === '1';
  const estado: Estado = ehEstado(params.get('estado'))
    ? (params.get('estado') as Estado)
    : 'recolhida';
  const temaPedido = params.get('tema');
  const titulo = params.get('titulo') ?? undefined;
  const largura = Number(params.get('largura')) || 1366;
  const altura = Number(params.get('altura')) || 768;

  /**
   * O tema NÃO é aplicado aqui.
   *
   * Ele entra em `main.tsx`, de forma síncrona, antes do `createRoot` — a
   * chave de `localStorage` é escrita a partir da URL e a classe vai para o
   * `<html>` na mesma linha, então a PRIMEIRA pintura já sai certa.
   *
   * Esta página fazia isso por efeito, e o preço eram três defeitos: a
   * primeira pintura saía no tema errado e trocava um quadro depois; o
   * `toggleDarkMode` inverte e o `StrictMode` o chamava duas vezes; e a
   * moldura e o iframe, sendo duas instâncias do app na mesma origem,
   * escreviam a mesma chave e uma desfazia a outra.
   *
   * O `darkMode` daqui serve só para a legenda da imagem dizer o que está
   * pintado — e, por vir do mesmo contexto que pinta, não pode divergir dela.
   */

  if (cru) {
    return (
      <CascaDaGaleria estado={estado} titulo={titulo} darkMode={darkMode} />
    );
  }

  const dentro = new URLSearchParams({ cru: '1', estado });
  if (temaPedido) dentro.set('tema', temaPedido);
  if (titulo) dentro.set('titulo', titulo);

  return (
    // Colada em (0,0), sem margem e sem nada em volta: assim a captura da
    // janela pode ser recortada exatamente em `largura`×`altura`.
    <iframe
      title={`Casca ${estado} — ${largura}x${altura}`}
      src={`/dev/galeria?${dentro.toString()}`}
      width={largura}
      height={altura}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        border: 0,
        display: 'block',
        zIndex: 2147483647,
      }}
    />
  );
};

export default GaleriaDaCasca;
