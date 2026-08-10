# 🎫 ChamadosHS — Front-end

Interface web do sistema de chamados de suporte técnico da Health & Safety,
usado pela equipe de TI para registrar, acompanhar e resolver atendimentos.

O sistema atende requisitos de **ISO 27001**: o histórico de chamados é a
evidência de que os controles de registro e tratamento de incidentes existem e
funcionam.

---

## 📦 Este repositório é só o front-end

O ChamadosHS é dividido em dois repositórios independentes:

| Repositório | O que é |
|---|---|
| **`chamadoshs-sistema`** (este) | Interface web — React + TypeScript |
| **`chamadoshs-api`** | API REST — FastAPI + PostgreSQL |

Eles sobem separado e têm ciclos de deploy próprios. Mudança de contrato exige
alteração nos dois, e a ordem importa — veja [Deploy](#-deploy).

---

## 🛠️ Stack

- **React 19** + **TypeScript**
- **Vite 7** — build e servidor de desenvolvimento
- **Tailwind CSS** — estilos, com modo escuro
- **React Router 6** — rotas, com carregamento sob demanda por página
- **Axios** — cliente HTTP, com interceptors de autenticação
- **Recharts** — gráficos do dashboard
- **Vitest** — testes
- **Context API** para estado global — o projeto **não usa** React Query,
  Redux ou Zustand

---

## 🚀 Rodando localmente

```bash
npm install
cp .env.example .env    # e ajuste a URL da API
npm run dev             # http://localhost:5173
```

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | checa tipos e gera o bundle em `dist/` |
| `npm run typecheck` | só a checagem de tipos |
| `npm test` | roda a suíte |
| `npm run test:watch` | testes em modo observador |
| `npm run preview` | serve o build local |

---

## ⚙️ Configuração

Uma única variável:

```env
VITE_API_URL=http://localhost:8000
```

### ⚠️ Duas armadilhas conhecidas

**Variáveis `VITE_*` vão para o bundle.** São embutidas em tempo de build e
ficam legíveis no navegador de qualquer usuário. **Nunca coloque segredo ali** —
token, senha, chave de API.

**Trocar a variável no painel não muda nada sem rebuild.** Como o valor é
embutido no build, o front precisa ser reconstruído. Em Docker, ela é
`ARG`/build arg, não variável de runtime.

> O `.env` versionado em `.env.example` aponta para `localhost`. O `.env` real
> costuma apontar para a **API de produção**, porque a equipe não roda o
> back-end localmente. Consequência: `npm run dev` opera sobre dados reais —
> cuidado ao testar exclusões.

---

## 📁 Estrutura

```
src/
├── pages/           uma tela por rota
├── components/      componentes compartilhados
│   └── cadastros/   abas e modais da tela de Cadastros
├── context/         estado global (Auth, Chamados, Cadastros, Theme)
├── hooks/           useAuth, useChamados, useUsuariosPorId
├── services/
│   ├── api.ts             instância Axios: token, renovação, tratamento de erro
│   └── chamadoshsapi.ts   um serviço por recurso da API
├── types/           espelho TypeScript dos contratos da API
├── utils/           roleMapper (perfis e permissões)
├── assets/
└── styles/
```

### Como os dados fluem

```
página  →  context  →  services  →  API
```

**Componente nunca chama `axios` direto.** Toda requisição passa por
`src/services/chamadoshsapi.ts`, que é onde os contratos vivem.

O `src/services/api.ts` concentra o que vale para todas as chamadas: anexa o
token, renova a sessão antes de expirar, redireciona ao login quando a sessão
cai e avisa na tela quando a API nega por falta de permissão.

---

## 🔐 Perfis de acesso

Os perfis do front espelham o que a API autoriza. Mudou de um lado, tem que
mudar do outro — ver `podeAtenderChamado` e `podeSerResponsavel` em
`src/utils/roleMapper.ts`.

| | Administrador | Técnico | Usuário |
|---|:---:|:---:|:---:|
| Abrir e comentar chamado | ✅ | ✅ | ✅ |
| Ver todos os chamados | ✅ | ✅ | só os próprios |
| Editar, arquivar, desarquivar | ✅ | ✅ | — |
| Tarefas recorrentes | ✅ | ✅ | — |
| **Cadastros** (usuários, setores, categorias, SLA) | ✅ | — | — |

**Contas de serviço** — painel de parede, login de integração — são marcadas no
cadastro e não aparecem como técnico atribuível, embora continuem acessando o
sistema normalmente.

> A regra de verdade está na API. O front esconde o que não é permitido para
> não oferecer botão que não funciona, mas **esconder não é controle de
> acesso**.

---

## 🧪 Testes

```bash
npm test
```

Cobrem hoje o `roleMapper` (perfis e o fallback para o menor privilégio), os
interceptors do Axios (token, renovação, sessão expirada, permissão negada) e a
paginação da listagem de usuários.

Ao escrever teste novo, o critério é: **ele falha se o comportamento quebrar?**
Vale checar quebrando o código de propósito e confirmando que a suíte acusa.

---

## 🚢 Deploy

Imagem Docker (build Node → nginx) publicada no **Easypanel**. O deploy é
**manual**.

**Checklist antes de subir:**

- [ ] `npm run build` passa — inclui a checagem de tipos
- [ ] `npm test` passa
- [ ] `VITE_API_URL` configurada como **build arg** no Easypanel
- [ ] Se o contrato da API mudou, a alteração correspondente subiu no
      `chamadoshs-api`

**Ordem quando os dois repositórios mudam:**

| Tipo de mudança | Ordem |
|---|---|
| Campo novo na API (aditivo) | API → front |
| Campo removido ou renomeado | front → API |
| Endurecimento de autenticação | **front primeiro** |

Depois de subir, confirme no navegador (F12 → Network) que as requisições vão
para o domínio certo — se `VITE_API_URL` não entrou no build, o bundle sai
apontando para `localhost`.

---

## 🤖 Skills do projeto

`.claude/skills/` traz skills escritas para esta stack: revisão de código,
auditoria de segurança, checagem de ambiente, checklist de deploy, revisão de
testes, refatoração e geração de PR/changelog. São versionadas de propósito —
valem para quem for trabalhar no projeto, não só para uma sessão.

---

## 👥 Equipe

Setor de TI — Health & Safety · `ti@healthsafetytech.com`

Bug ou sugestão? Abra um chamado no próprio sistema.
