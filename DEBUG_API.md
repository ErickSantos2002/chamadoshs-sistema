# Debug - Testando a API

## 1. Verificar se a API está rodando

Abra o navegador e acesse:
```
http://localhost:8000/docs
```

Se aparecer a documentação Swagger, a API está OK.

## 2. Testar Login direto no navegador (Console)

Abra o Console do navegador (F12) e cole:

```javascript
// Testar login direto
fetch('http://localhost:8000/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    nome: 'admin',  // <- COLOQUE O NOME DO SEU USUÁRIO AQUI
    senha: 'admin123'  // <- COLOQUE A SENHA AQUI
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Resposta:', data);
  if (data.access_token) {
    console.log('✅ Login funcionou!');
    console.log('Token:', data.access_token);
    console.log('User ID:', data.user_id);
    console.log('Nome:', data.nome);
    console.log('Role:', data.role);
  }
})
.catch(err => {
  console.error('❌ Erro:', err);
});
```

## 3. Verificar se tem usuário no banco

Execute no PostgreSQL:

```sql
-- Ver todos os usuários
SELECT id, nome, senha_hash, role_id, ativo FROM usuarios;

-- Ver se a senha_hash está preenchida
SELECT
  id,
  nome,
  CASE
    WHEN senha_hash IS NULL THEN '❌ SEM SENHA'
    ELSE '✅ TEM SENHA'
  END as tem_senha,
  ativo
FROM usuarios;
```

## 4. Criar usuário de teste (se não existir)

Execute no PostgreSQL ou via Swagger:

### Via SQL:
```sql
-- Inserir usuário de teste (senha: admin123)
INSERT INTO usuarios (nome, senha_hash, role_id, ativo)
VALUES (
  'admin',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5FS2B2c5ymNSm',
  1,
  true
);
```

### Via API (Swagger):
1. Acesse http://localhost:8000/docs
2. Vá em `POST /api/v1/auth/registro`
3. Clique em "Try it out"
4. Cole:
```json
{
  "nome": "admin",
  "senha": "admin123",
  "role_id": 1,
  "ativo": true
}
```
5. Execute

## 5. Verificar CORS

Se o erro for de CORS, verifique no backend (`.env` da API):

```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

E reinicie a API.

## 6. Debug no Frontend

Adicione logs no AuthContext para ver o que está acontecendo:

```typescript
const login = async (username: string, password: string) => {
  console.log('🔵 Iniciando login...');
  console.log('Username:', username);
  console.log('Password:', password ? '***' : 'VAZIO');

  setLoading(true);
  setError(null);

  try {
    console.log('🔵 Chamando authService.login...');
    const loginData = await authService.login({
      nome: username,
      senha: password
    });

    console.log('✅ Login bem sucedido:', loginData);
    // ... resto do código
  } catch (err: any) {
    console.error('❌ Erro no login:', err);
    console.error('Status:', err.response?.status);
    console.error('Data:', err.response?.data);
    // ... resto do tratamento de erro
  }
};
```

## 7. Verificar variável de ambiente

Crie o arquivo `.env` na raiz do frontend:

```env
VITE_API_URL=http://localhost:8000
```

E reinicie o servidor de desenvolvimento:
```bash
npm run dev
```

## 8. Verificar no Network do navegador

1. Abra DevTools (F12)
2. Vá na aba **Network**
3. Tente fazer login
4. Veja a requisição `login`
5. Verifique:
   - **Request URL**: deve ser `http://localhost:8000/api/v1/auth/login`
   - **Request Method**: POST
   - **Request Payload**: deve ter `nome` e `senha`
   - **Response**: veja o erro exato

## Erros Comuns:

### "Usuário ou senha incorretos" (401)
- ✅ Usuário não existe no banco
- ✅ Senha errada
- ✅ Campo `senha_hash` está vazio no banco

**Solução**: Criar usuário conforme passo 4

### "CORS error"
- ✅ Backend não configurado para aceitar requisições do frontend

**Solução**: Adicionar origem no `.env` do backend

### "Network Error" / "ERR_CONNECTION_REFUSED"
- ✅ API não está rodando

**Solução**: Iniciar a API com `uvicorn main:app --reload`

### "404 Not Found"
- ✅ URL da API está errada

**Solução**: Verificar `.env` do frontend

## Checklist Rápido:

- [ ] API rodando em `http://localhost:8000`
- [ ] Frontend rodando em `http://localhost:5173` (ou outra porta)
- [ ] Arquivo `.env` no frontend com `VITE_API_URL=http://localhost:8000`
- [ ] Usuário criado no banco com senha_hash
- [ ] CORS configurado no backend
- [ ] Migration de autenticação executada no banco
- [ ] DevTools aberto para ver erros

## Testar fluxo completo:

1. Limpe o localStorage:
```javascript
localStorage.clear();
```

2. Recarregue a página

3. Tente fazer login com um usuário que você SABE que existe

4. Veja os logs no console
