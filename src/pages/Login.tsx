import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useSaudeDoSistema } from '../hooks/useSaudeDoSistema';
import { EstadoDoSistema, TEXTO_DO_ESTADO, descreverIdade } from '../lib/saude';
import { useRelogio } from '../hooks/useRelogio';
import { Button, Input, RotuloDeCampo } from '../components/ui';
import logo from '../assets/logo.png';
import {
  IconeAlerta,
  IconeChamado,
  IconeRelogio,
  IconeTrilha,
} from '../components/ui/icones';

/**
 * Cor do ponto de estado. Verde só quando é verde de verdade — o ponto existe
 * para dizer algo, e um indicador que está sempre aceso não diz nada.
 */
const COR_DO_ESTADO: Record<EstadoDoSistema, string> = {
  verificando: 'bg-conteudo-tenue',
  ok: 'bg-sucesso',
  degradado: 'bg-alerta',
  'sem-resposta': 'bg-perigo',
};

const versao = typeof __VERSAO_APP__ === 'string' ? __VERSAO_APP__ : '';

/** O que o sistema faz, dito para quem ainda não entrou. */
const DESTAQUES = [
  {
    Icone: IconeChamado,
    titulo: 'Abertura e acompanhamento',
    texto: 'Registre um chamado e siga cada passo até a resolução.',
  },
  {
    Icone: IconeRelogio,
    titulo: 'Prazo à vista',
    texto: 'O SLA aparece no cartão: dá para ver o que está no prazo e o que já estourou.',
  },
  {
    Icone: IconeTrilha,
    titulo: 'Trilha de auditoria',
    texto: 'Toda alteração fica registrada, com quem fez e quando.',
  },
];

/**
 * Tela de entrada, no formato de duas colunas do HelpHS.
 *
 * ── O que saiu daqui ──────────────────────────────────────────────────
 *
 * Esta era a única tela com a fachada de console inteira: a malha de linhas, a
 * vinheta, a varredura de inicialização e os colchetes de canto. Era bonita e
 * era de outra família — o HelpHS abre com um painel de apresentação à
 * esquerda e o formulário à direita, e é isso que faz as duas telas parecerem
 * do mesmo produto. As quatro camadas saíram do CSS junto com esta reescrita,
 * porque não sobrou nada usando nenhuma delas.
 *
 * ── O que ficou ───────────────────────────────────────────────────────
 *
 * Tudo que a tela sabia dizer. O indicador de saúde da API, a idade daquela
 * leitura, a versão e a hora mudaram de lugar — desceram para o rodapé da
 * coluna do formulário — mas continuam dizendo o mesmo.
 *
 * ── Tema ──────────────────────────────────────────────────────────────
 *
 * O login do HelpHS é escuro sempre, com hexadecimal cravado. Aqui ele segue
 * o tema, pelos tokens: quem escolheu claro não é jogado numa tela escura só
 * porque é a de entrada. Como o escuro é o padrão de quem nunca escolheu, na
 * prática a maioria vê exatamente o que o HelpHS mostra.
 *
 * ── Por que `overflow-y-auto` aqui e `min-h-full` no miolo ────────────
 *
 * Centralizar com `items-center` num container que não rola parece igual
 * enquanto a tela é alta o bastante — e corta pelos DOIS lados quando não é,
 * porque o que sobra de um item centralizado transborda em cima e embaixo.
 * Foi o que aconteceu numa TV em modo paisagem: a faixa de cima sumiu e a de
 * baixo ficou pela metade, sem rolagem possível, já que o `body` tem
 * `overflow: hidden` global.
 */
const Login: React.FC = () => {
  const { login, loading, error, user } = useAuth();
  const { setDarkModeOnLogin } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { estado: saude, verificadoEm } = useSaudeDoSistema();
  // Faz o texto de idade andar mesmo sem nada novo acontecer no sistema.
  const agora = useRelogio(1000);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!user) return;

    // Define o escuro apenas para quem nunca escolheu tema.
    setDarkModeOnLogin();

    if (location.pathname !== '/dashboard') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, location.pathname, setDarkModeOnLogin]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div className="fixed inset-0 overflow-y-auto">
      <div className="flex min-h-full">
        {/* ── Painel de apresentação ───────────────────────────────────
            Some abaixo de `lg`: num celular ele empurraria o formulário
            para baixo da dobra, e quem abre o login quer o formulário. */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-superficie px-14 py-12 lg:flex lg:w-3/5">
          {/* Dois halos desfocados, como os do HelpHS. São decoração e nada
              mais — daí `aria-hidden` e `pointer-events-none`. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-sinal/20 blur-[120px]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -left-20 h-[400px] w-[400px] rounded-full bg-sinal/10 blur-[100px]"
          />

          <div className="relative z-10">
            <img
              src={logo}
              alt="Health &amp; Safety"
              className="h-14 w-auto object-contain"
            />
          </div>

          <div className="relative z-10 space-y-10">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-sinal/30 bg-sinal/10 px-3 py-1">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-sinal"
                />
                <span className="text-xs font-medium text-sinal">
                  Chamados internos — Health &amp; Safety
                </span>
              </span>

              <h1 className="text-4xl font-bold leading-tight text-conteudo">
                O chamado certo,
                <br />
                na mão de quem resolve.
              </h1>

              <p className="max-w-md text-base leading-relaxed text-conteudo-suave">
                Abra, acompanhe e feche chamados da equipe num lugar só — com
                prazo visível e histórico de tudo que aconteceu.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {DESTAQUES.map(({ Icone, titulo, texto }) => (
                <div key={titulo} className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sinal/10">
                    <Icone className="h-5 w-5 text-sinal" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-conteudo">{titulo}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-conteudo-tenue">
                      {texto}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-xs text-conteudo-tenue">
            © 2026 Health &amp; Safety Tech
          </p>
        </aside>

        {/* ── Coluna do formulário ─────────────────────────────────── */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:w-2/5">
          <div className="w-full max-w-sm space-y-8">
            {/* A marca só aparece aqui quando o painel da esquerda não está
                na tela — senão o logo apareceria duas vezes. */}
            <div className="flex justify-center lg:hidden">
              <img
                src={logo}
                alt="Health &amp; Safety"
                className="h-12 w-auto object-contain"
              />
            </div>

            <div className="space-y-1 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-conteudo">Bem-vindo</h2>
              <p className="text-sm text-conteudo-tenue">
                Identifique-se para continuar no ChamadosHS.
              </p>
            </div>

            <form onSubmit={enviar} className="space-y-5">
              {/* Rótulo de verdade, e não só placeholder: o placeholder some
                  quando a pessoa digita, levando junto a indicação do campo. */}
              <div>
                <RotuloDeCampo htmlFor="username">Usuário</RotuloDeCampo>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  autoComplete="username"
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  placeholder="seu usuário de rede"
                  // Monoespaçada porque login é identificador, não texto
                  // humano: aqui a distinção entre l, I e 1 vale mais que o
                  // desenho. Na senha não vale — ela aparece como pontos.
                  className="font-mono"
                  required
                />
              </div>

              <div>
                <RotuloDeCampo htmlFor="password">Senha</RotuloDeCampo>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="sua senha"
                  required
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-perigo/40 bg-perigo/10 px-3 py-2 text-sm text-perigo-forte dark:text-perigo-suave"
                >
                  <IconeAlerta
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                tamanho="lg"
                carregando={loading}
                className="w-full"
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>

            {/* ── O que o sistema sabe de si ─────────────────────────
                O estado vem do /api/v1/health, e não é enfeite: quando o
                banco cai a API continua respondendo, e é isso que separa
                "não consigo entrar porque o sistema caiu" de "não consigo
                entrar por outro motivo" — a diferença entre esperar e abrir
                um chamado por outro caminho.

                A maquete antiga trazia aqui protocolo TLS e nome do nó.
                Numa tela de login, afirmar a topologia para quem ainda não
                se identificou é entregar infraestrutura de graça. Ficou o
                que o sistema sabe de si e pode provar. */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-borda pt-5 text-xs text-conteudo-tenue">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${COR_DO_ESTADO[saude]} ${
                    saude === 'verificando' ? 'animate-pulse' : ''
                  }`}
                />
                {TEXTO_DO_ESTADO[saude]}
                {/* O ponto acima diz COMO está; isto diz DE QUANDO é essa
                    informação. Indicador de saúde sem hora é o que continua
                    verde vinte minutos depois de o sistema ter caído. */}
                {verificadoEm && (
                  <span className="text-conteudo-tenue/80">
                    · {descreverIdade(agora - verificadoEm.getTime())}
                  </span>
                )}
              </span>

              <span className="flex items-center gap-3">
                <span className="font-mono">{versao || '—'}</span>
                <span className="font-mono tabular-nums">
                  {new Date(agora).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
