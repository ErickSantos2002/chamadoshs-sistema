# Guia de Uso - ChamadosHS API Frontend

## Configuração

### 1. Configurar URL da API

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_API_URL=http://localhost:8000
```

Para produção, altere para a URL da sua API:

```env
VITE_API_URL=https://api.chamadoshs.com
```

## Estrutura dos Serviços

### Arquivos Criados

```
src/
├── services/
│   ├── api.ts              # Configuração base do Axios + interceptors
│   └── chamadoshsapi.ts    # Todos os serviços da API
├── types/
│   └── api.ts              # Tipos TypeScript de todas as entidades
```

## Como Usar

### Importação

```typescript
import chamadosHSApi from '@/services/chamadoshsapi';
// ou importar serviços individuais
import { authService, chamadosService } from '@/services/chamadoshsapi';
```

## Exemplos de Uso

### 1. Autenticação

#### Login

```typescript
import { authService } from '@/services/chamadoshsapi';

async function handleLogin(nome: string, senha: string) {
  try {
    const response = await authService.login({ nome, senha });
    console.log('Login sucesso:', response);
    // Token é armazenado automaticamente
    // Redirecionar para dashboard
  } catch (error) {
    console.error('Erro no login:', error);
  }
}
```

#### Registro

```typescript
async function handleRegistro() {
  try {
    const response = await authService.registro({
      nome: 'joao.silva',
      senha: 'senha123',
      role_id: 3, // Usuário
      ativo: true,
    });
    console.log('Usuário criado:', response);
  } catch (error) {
    console.error('Erro no registro:', error);
  }
}
```

#### Verificar se está logado

```typescript
if (authService.isAuthenticated()) {
  const user = authService.getCurrentUser();
  console.log('Usuário logado:', user);
}
```

#### Obter dados do usuário logado

```typescript
async function getUserInfo() {
  try {
    const user = await authService.me();
    console.log('Dados do usuário:', user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
  }
}
```

#### Logout

```typescript
function handleLogout() {
  authService.logout();
  // Redirecionar para login
  window.location.href = '/login';
}
```

### 2. Chamados

#### Listar todos os chamados

```typescript
import { chamadosService } from '@/services/chamadoshsapi';

async function listarChamados() {
  try {
    const chamados = await chamadosService.listar();
    console.log('Chamados:', chamados);
  } catch (error) {
    console.error('Erro ao listar chamados:', error);
  }
}
```

#### Listar com filtros

```typescript
async function listarChamadosFiltrados() {
  const chamados = await chamadosService.listar({
    status: 'Aberto',
    solicitante_id: 1,
    limit: 50,
  });
  console.log('Chamados filtrados:', chamados);
}
```

#### Buscar chamado específico

```typescript
async function buscarChamado(id: number) {
  const chamado = await chamadosService.buscar(id);
  console.log('Chamado:', chamado);
}
```

#### Criar novo chamado

```typescript
import { PrioridadeEnum } from '@/types/api';

async function criarChamado() {
  const novoChamado = await chamadosService.criar({
    solicitante_id: 1,
    categoria_id: 2,
    titulo: 'Problema com impressora',
    descricao: 'A impressora não está imprimindo',
    prioridade: PrioridadeEnum.ALTA,
  });
  console.log('Chamado criado:', novoChamado);
}
```

#### Atualizar chamado

```typescript
import { StatusEnum } from '@/types/api';

async function atualizarChamado(id: number) {
  const chamadoAtualizado = await chamadosService.atualizar(
    id,
    {
      status: StatusEnum.EM_ANDAMENTO,
      tecnico_responsavel_id: 2,
    },
    2 // ID do usuário que está fazendo a alteração
  );
  console.log('Chamado atualizado:', chamadoAtualizado);
}
```

### 3. Comentários

#### Listar comentários de um chamado

```typescript
import { comentariosService } from '@/services/chamadoshsapi';

async function listarComentarios(chamadoId: number) {
  const comentarios = await comentariosService.listarPorChamado(chamadoId);
  console.log('Comentários:', comentarios);
}
```

#### Adicionar comentário

```typescript
async function adicionarComentario(chamadoId: number, usuarioId: number) {
  const comentario = await comentariosService.criar({
    chamado_id: chamadoId,
    usuario_id: usuarioId,
    comentario: 'Estou verificando o problema',
    is_interno: false,
  });
  console.log('Comentário criado:', comentario);
}
```

### 4. Histórico

```typescript
import { historicoService } from '@/services/chamadoshsapi';

async function verHistorico(chamadoId: number) {
  const historico = await historicoService.listarPorChamado(chamadoId);
  console.log('Histórico:', historico);
}
```

### 5. Usuários

```typescript
import { usuariosService } from '@/services/chamadoshsapi';

// Listar usuários
const usuarios = await usuariosService.listar();

// Listar apenas técnicos ativos
const tecnicos = await usuariosService.listar({ role_id: 2, ativo: true });

// Buscar usuário
const usuario = await usuariosService.buscar(1);

// Criar usuário
const novoUsuario = await usuariosService.criar({
  nome: 'maria.santos',
  senha: 'senha123',
  setor_id: 2,
  role_id: 3,
});
```

### 6. Setores

```typescript
import { setoresService } from '@/services/chamadoshsapi';

// Listar todos os setores
const setores = await setoresService.listar();

// Listar apenas setores ativos
const setoresAtivos = await setoresService.listar(true);

// Criar setor
const novoSetor = await setoresService.criar({
  nome: 'TI',
  descricao: 'Setor de Tecnologia da Informação',
});
```

### 7. Categorias

```typescript
import { categoriasService } from '@/services/chamadoshsapi';

// Listar todas as categorias
const categorias = await categoriasService.listar();

// Listar apenas categorias ativas
const categoriasAtivas = await categoriasService.listar(true);
```

## Exemplo Completo: Componente de Login

```typescript
import React, { useState } from 'react';
import { authService } from '@/services/chamadoshsapi';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.login({ nome, senha });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome de usuário"
        required
      />
      <input
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        placeholder="Senha"
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
```

## Exemplo Completo: Listar e Criar Chamados

```typescript
import React, { useEffect, useState } from 'react';
import { chamadosService, authService } from '@/services/chamadoshsapi';
import { Chamado, PrioridadeEnum } from '@/types/api';

export function Chamados() {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarChamados();
  }, []);

  const carregarChamados = async () => {
    try {
      const data = await chamadosService.listar();
      setChamados(data);
    } catch (error) {
      console.error('Erro ao carregar chamados:', error);
    } finally {
      setLoading(false);
    }
  };

  const criarNovoChamado = async () => {
    const user = authService.getCurrentUser();
    if (!user) return;

    try {
      await chamadosService.criar({
        solicitante_id: user.id,
        titulo: 'Novo chamado',
        descricao: 'Descrição do problema',
        prioridade: PrioridadeEnum.MEDIA,
        categoria_id: 1,
      });
      carregarChamados(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <button onClick={criarNovoChamado}>Novo Chamado</button>
      <ul>
        {chamados.map((chamado) => (
          <li key={chamado.id}>
            {chamado.protocolo} - {chamado.titulo} - {chamado.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Tratamento de Erros

Os interceptors do Axios já tratam automaticamente:

- **401 Unauthorized**: Remove token e redireciona para login
- **403 Forbidden**: Exibe erro no console

Para tratar erros específicos:

```typescript
try {
  const chamados = await chamadosService.listar();
} catch (error: any) {
  if (error.response) {
    // Erro da API
    console.error('Status:', error.response.status);
    console.error('Mensagem:', error.response.data.detail);
  } else if (error.request) {
    // Sem resposta do servidor
    console.error('Servidor não respondeu');
  } else {
    // Erro na configuração da requisição
    console.error('Erro:', error.message);
  }
}
```

## Proteção de Rotas

Exemplo de componente para proteger rotas:

```typescript
import { Navigate } from 'react-router-dom';
import { authService } from '@/services/chamadoshsapi';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

Uso no router:

```typescript
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

## Dicas

1. **Token automático**: O token é enviado automaticamente em todas as requisições
2. **Logout automático**: Se o token expirar, o usuário é redirecionado para login
3. **TypeScript**: Use os tipos do arquivo `types/api.ts` para type safety
4. **Error handling**: Sempre use try/catch nas chamadas assíncronas
5. **Loading states**: Sempre mostre feedback visual durante requisições

## Troubleshooting

### Erro de CORS

Se tiver erro de CORS, verifique se a URL da API no `.env` está correta e se o backend está configurado para aceitar requisições do seu domínio.

### Token não está sendo enviado

Verifique se o token está sendo salvo no localStorage após o login. Use as DevTools do navegador (Application > Local Storage).

### Requisições falham após algum tempo

O token expira em 30 minutos por padrão. Use `authService.refresh()` para renovar ou faça novo login.
