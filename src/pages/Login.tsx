import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { Button, Input } from '../components/ui';
import logo from '../assets/logo.png';

const Login: React.FC = () => {
  const { login, loading, error, user } = useAuth();
  const { setDarkModeOnLogin } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

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

  const rotulo = 'mb-1.5 block text-sm font-medium text-conteudo-suave';

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-superficie-base p-4">
      {/* O card era de vidro fosco — `backdrop-blur` sobre branco translúcido.
          Aquilo dependia de haver textura atrás para borrar; sobre um fundo
          chapado virava só um retângulo mais claro, e o desfoque não fazia
          nada. Agora é a mesma superfície do resto do sistema. */}
      <div className="relative w-full max-w-sm rounded-2xl border border-borda bg-superficie px-8 pb-8 pt-14 shadow-2xl">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-superficie bg-superficie-elevada shadow-lg">
            <User className="h-9 w-9 text-conteudo-tenue" aria-hidden="true" />
          </div>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={logo} alt="Health &amp; Safety" className="max-h-[60px] object-contain" />
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-conteudo">Bem-vindo</h1>
          <p className="mt-0.5 text-sm text-conteudo-tenue">Faça login para continuar</p>
        </div>

        <form onSubmit={enviar} className="flex flex-col gap-4">
          {/* Rótulo de verdade, e não só placeholder: o placeholder some
              quando a pessoa digita, levando junto a indicação do campo. */}
          <div>
            <label htmlFor="username" className={rotulo}>
              Usuário
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              placeholder="Seu usuário de rede"
              className="h-11"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className={rotulo}>
              Senha
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Sua senha"
              className="h-11"
              required
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-perigo/30 bg-perigo/10 px-3 py-2 text-sm text-perigo-forte dark:text-perigo-suave"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          <Button type="submit" tamanho="lg" carregando={loading} className="mt-2 w-full">
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
