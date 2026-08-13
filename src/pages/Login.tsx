import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useSaudeDoSistema } from '../hooks/useSaudeDoSistema';
import { EstadoDoSistema, TEXTO_DO_ESTADO, descreverIdade } from '../lib/saude';
import { useRelogio } from '../hooks/useRelogio';
import { Button, Colchetes, Input, Rotulo } from '../components/ui';
import logo from '../assets/logo.png';

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
    /* `overflow-y-auto` no container e `min-h-full` no miolo, em vez de
       centralizar direto aqui.

       Centralizar com `items-center` num container que não rola parece igual
       enquanto a tela é alta o bastante — e corta pelos DOIS lados quando não
       é, porque o que sobra de um item centralizado transborda em cima e
       embaixo. Foi o que aconteceu numa TV em modo paisagem: a faixa de cima
       sumiu e a de baixo ficou pela metade, sem rolagem possível, já que o
       `body` tem `overflow: hidden` global.

       Com esta combinação a tela centraliza quando cabe e rola quando não
       cabe, que é o comportamento que se espera dos dois casos. */
    <div className="fixed inset-0 overflow-y-auto bg-superficie-base">
      {/* Duas camadas de fundo, estáticas. Elas não informam nada — o trabalho
          delas é dar profundidade para o painel ter onde pousar. A maquete
          fazia isso com linhas de log animadas em canvas; o mesmo efeito sai
          de dois gradientes que o navegador pinta uma vez e esquece.

          Ficam `fixed`, então não rolam junto e não entram na altura do
          conteúdo. */}
      <div aria-hidden="true" className="malha pointer-events-none fixed inset-0" />
      <div aria-hidden="true" className="vinheta pointer-events-none fixed inset-0" />

      <div className="flex min-h-full items-center justify-center p-4">
      <div className="animate-subir relative w-full max-w-sm">
        {/* Faixa de identificação. Diz em que sistema a pessoa está prestes a
            entrar — o que importa em uma casa com mais de um sistema interno. */}
        {/* A folga é grande porque o selo sobe 32px acima da borda do painel.
            Com o espaçamento normal ele cobre o texto desta faixa — foi o que
            aconteceu na primeira versão. */}
        <div className="mb-10 flex items-center justify-between gap-3 alto:mb-11">
          <Rotulo>ChamadosHS · Console de acesso</Rotulo>

          {/* O estado vem do /api/v1/health, não é enfeite. Quando o banco cai
              a API continua respondendo, e é isso que separa "não consigo
              entrar porque o sistema caiu" de "não consigo entrar por outro
              motivo" — a diferença entre esperar e abrir um chamado. */}
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${COR_DO_ESTADO[saude]} ${
                saude === 'verificando' ? 'animate-pulse' : ''
              }`}
            />
            <Rotulo>{TEXTO_DO_ESTADO[saude]}</Rotulo>
          </span>
        </div>

        {/* O card era de vidro fosco — `backdrop-blur` sobre branco translúcido.
            Aquilo dependia de haver textura atrás para borrar; sobre um fundo
            chapado virava só um retângulo mais claro, e o desfoque não fazia
            nada. Agora é a mesma superfície do resto do sistema. */}
        {/* O gradiente vai da superfície elevada para a normal, de cima para
            baixo. É o que separa "painel" de "retângulo": sem ele o card fica
            chapado contra o fundo, que foi como a primeira versão ficou. */}
        <div className="relative border border-borda bg-gradient-to-b from-superficie-elevada to-superficie px-8 pb-6 pt-12 shadow-2xl alto:pb-8 alto:pt-16">
          {/* A varredura precisa de `overflow-hidden` para não escapar do
              painel — mas o selo fica FORA dele, então o recorte não pode
              morar no painel. Vive nesta camada própria. */}
          <span
            aria-hidden="true"
            className="varredura pointer-events-none absolute inset-0 overflow-hidden"
          />
          <Colchetes variante="sinal" tamanho="md" animado />

          {/* O selo continua redondo: é o único elemento que não é canto, e
              sim forma. Sobe metade da própria altura para furar a borda. */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-sinal/60 bg-superficie-elevada">
              <User className="h-7 w-7 text-sinal" aria-hidden="true" />
            </div>
          </div>

          <div className="mb-4 flex justify-center alto:mb-6">
            <img src={logo} alt="Health &amp; Safety" className="max-h-[44px] object-contain alto:max-h-[64px]" />
          </div>

          <div className="mb-4 text-center alto:mb-6">
            <h1 className="text-xl font-bold text-conteudo">Bem-vindo</h1>
            <Rotulo como="p" className="mt-1 block">
              Identifique-se para continuar
            </Rotulo>
          </div>

          <form onSubmit={enviar} className="flex flex-col gap-4">
            {/* Rótulo de verdade, e não só placeholder: o placeholder some
                quando a pessoa digita, levando junto a indicação do campo. */}
            <div>
              <Rotulo como="label" htmlFor="username" className="mb-1.5 block">
                Usuário
              </Rotulo>
              <Input
                id="username"
                type="text"
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                placeholder="seu usuário de rede"
                // Monoespaçada porque login é identificador, não texto humano:
                // aqui a distinção entre l, I e 1 vale mais que o desenho.
                className="h-11 font-mono"
                required
              />
            </div>

            <div>
              <Rotulo como="label" htmlFor="password" className="mb-1.5 block">
                Senha
              </Rotulo>
              <Input
                id="password"
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="sua senha"
                className="h-11 font-mono"
                required
              />
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 border border-perigo/40 bg-perigo/10 px-3 py-2 text-sm text-perigo-forte dark:text-perigo-suave"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              tamanho="lg"
              carregando={loading}
              className="mt-2 w-full font-mono uppercase tracking-[0.18em]"
            >
              {loading ? 'Autenticando' : 'Autenticar'}
            </Button>
          </form>
        </div>

        {/* Faixa inferior.
            A maquete trazia aqui protocolo TLS, nome do nó e cronômetro de
            sessão — três valores que eu havia cravado no HTML. Numa tela de
            login, afirmar a topologia para quem ainda não se identificou é
            entregar informação de infraestrutura de graça, e nenhum dos três
            era verificável. Ficou o que o sistema sabe de si. */}
        <div className="mt-2 grid grid-cols-2 border border-borda alto:mt-3">
          <div className="border-r border-borda px-3 py-2">
            <Rotulo como="p" className="block">
              Versão
            </Rotulo>
            <p className="font-mono text-xs text-conteudo-suave">{versao || '—'}</p>
          </div>
          {/* O ponto de estado acima diz COMO está; aqui diz DE QUANDO é essa
              informação. Indicador de saúde sem hora é o que continua verde
              vinte minutos depois de o sistema ter caído. */}
          <div className="px-3 py-2">
            <Rotulo como="p" className="block">
              Verificado
            </Rotulo>
            {/* Idade, não hora. A hora ficava imóvel 59 segundos de cada 60,
                porque a sonda roda a cada minuto — a tela parecia congelada.
                A idade anda a cada segundo E diz o que interessa ao lado de um
                ponto verde: de quando é aquela leitura. */}
            <p className="font-mono text-xs text-conteudo-suave">
              {verificadoEm ? descreverIdade(agora - verificadoEm.getTime()) : '—'}
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Login;
