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
- **Plus Jakarta Sans** via `@fontsource` — a fonte vem **no bundle**, não do
  CDN do Google. O sistema roda na rede interna, e `src/recursos-externos.test.ts`
  reprova qualquer recurso vindo de fora
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
| `npm run build` | valida a paleta, checa tipos e gera o bundle em `dist/` |
| `npm run typecheck` | só a checagem de tipos |
| `npm run validar:paleta` | contraste e distinção das cores (roda dentro do build) |
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
├── components/
│   ├── layout/      a casca: AppLayout, Sidebar, Topbar
│   ├── ui/          kit de primitivos (Button, Badge, Modal, Seletor…)
│   └── cadastros/   abas e modais da tela de Cadastros
├── context/         estado global (Auth, Chamados, Cadastros, Theme)
├── hooks/           useAuth, useChamados, useUsuariosPorId…
├── lib/             regras puras, cada uma com teste ao lado
├── utils/           roleMapper, avaliacao, exclusao — quem pode o quê
├── services/
│   ├── api.ts             instância Axios: token, renovação, tratamento de erro
│   └── chamadoshsapi.ts   um serviço por recurso da API
├── types/           espelho TypeScript dos contratos da API
├── data/            novidades.ts — o que aparece no aviso "O que há de novo?"
├── assets/
└── styles/
```

### `lib/` e `utils/` — por que existem

Regra que decide alguma coisa não fica solta dentro de componente. Vai para
`lib/` ou `utils/` como função pura, com teste ao lado. Alguns exemplos do que
mora lá: em que coluna do quadro cada chamado cai (`quadro.ts`), quem pode
excluir um chamado (`exclusao.ts`), as cores dos gráficos e dos status
(`graficos.ts`), quais áreas o menu mostra (`navegacao.ts`).

O motivo é concreto: a mesma regra já esteve escrita em dois lugares — na janela
do chamado e na página inteira — e só uma das cópias recebeu manutenção. Dentro
do JSX, nenhum teste alcança.

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
| **Excluir chamado** (só cancelado ou arquivado) | ✅ | — | — |
| Tarefas recorrentes | ✅ | ✅ | — |
| **Cadastros** (usuários, setores, categorias, SLA) | ✅ | — | — |

A exclusão é a única ação sem volta do sistema: apaga o chamado junto com
comentários, histórico e anexos, por cascata no banco, e não deixa registro do
que foi apagado. Por isso é restrita a administrador, só alcança chamado que já
saiu do fluxo, e a confirmação exige digitar o protocolo. A regra está em
`src/utils/exclusao.ts`, com teste.

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

**432 casos em 33 arquivos.** O teste fica ao lado do que ele cobre —
`quadro.ts` e `quadro.test.ts` na mesma pasta.

O que a suíte cobre, por natureza:

| | |
|---|---|
| **Regras** | quem pode excluir, quem aparece como responsável, em que coluna cada chamado cai, quando pedir avaliação |
| **Contratos** | os serviços chamam o endpoint certo, com o corpo certo — e não o endpoint restrito |
| **Sessão** | token, renovação antes de vencer, sessão expirada, permissão negada |
| **Aparência** | contraste e distinção das cores, nenhum elemento com dois fundos ou duas medidas disputando |
| **Estrutura** | nenhum recurso vindo de fora da rede; menus montados de uma fonte só; modais com as ações no rodapé |

Boa parte existe por causa de um defeito específico que já aconteceu, e o
comentário no topo do arquivo conta qual foi. Isso é proposital: um teste sem
essa história é apagado na primeira vez que atrapalha.

Ao escrever teste novo, o critério é: **ele falha se o comportamento quebrar?**
Vale checar quebrando o código de propósito e confirmando que a suíte acusa.

---

## 🚢 Deploy

Imagem Docker (build Node → nginx) publicada no **Easypanel**. O deploy é
**manual**.

**Checklist antes de subir:**

- [ ] `npm run build` passa — inclui a validação da paleta e a checagem de tipos
- [ ] `npm test` passa
- [ ] `package.json` e `src/data/novidades.ts` subiram juntos, com a mesma
      versão (há teste que reprova se divergirem)
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
