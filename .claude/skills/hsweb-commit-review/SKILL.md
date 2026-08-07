---
name: hsweb-commit-review
description: Revisa um commit do ChamadosHS antes de finalizar — mensagem no padrão conventional commits em português, escopo coeso e arquivos indevidos. Usar antes de git commit ou push.
---

# Skill: Commit Review — ChamadosHS

## Objetivo

Revisar um commit antes de ser finalizado: mensagem clara, escopo coeso, nenhum
arquivo indevido.

## Convenção do projeto

O ChamadosHS usa **conventional commits com descrição em português**. Exemplos
reais do histórico:

```
feat(tarefas-recorrentes): confirmação forte ao excluir tarefa com histórico
fix(cadastros): alinha leitura de campos ao contrato real da API
fix(sla): não mascarar ausência de dados de SLA como 0% no Dashboard
chore(deps): remove pacotes não utilizados e corrige vulnerabilidades
```

Regras derivadas do histórico:

- **Tipos em uso**: `feat`, `fix`, `chore`
- **Escopo obrigatório** e nomeado pelo módulo do domínio: `chamados`, `sla`,
  `cadastros`, `tarefas-recorrentes`, `dashboard`, `deps`
- **Descrição em português, minúscula, sem ponto final**
- Descreve **o efeito**, não o arquivo mexido

> ⚠️ Não sugerir imperativo em inglês ("Add", "Fix", "Update") — contraria a
> convenção adotada. Commits antigos do repositório usam formato livre
> ("ajuste filtros chamados"); esse padrão foi **abandonado**, não replicar.

## O que analisar

### 1. Mensagem

- Segue `tipo(escopo): descrição em português`?
- O escopo bate com o módulo realmente alterado?
- A descrição diz o efeito para quem usa o sistema, e não "mexi no arquivo X"?
- Subject com no máximo ~72 caracteres
- Mudança complexa tem corpo explicando o **porquê**?

Problemas a apontar: mensagem vaga ("ajustes", "wip", "correções"), tipo errado
(`feat` para correção de bug), escopo inventado que não existe no projeto.

### 2. Escopo das mudanças

- O commit faz **uma coisa só**?
- Arquivo que não deveria estar: `.env`, `dist/`, `node_modules/`, `*.log`
- Código de debug esquecido: `console.log` no front, `print()` no back
- O diff é proporcional ao que a mensagem descreve?

### 3. Consistência com o projeto

- Segue os padrões de `hsweb-code-review`?
- **É alteração de contrato da API?** Então o outro repositório provavelmente
  precisa de commit correspondente — verificar e avisar
- Há migration `.sql` que precisa ser aplicada junto?
- Breaking change sinalizada?

## Formato da resposta

```
✅ Mensagem: aprovada
📦 Escopo: coeso — só tarefas recorrentes
🔍 Arquivos: ⚠️ .env está staged — remover
🔗 Repo irmão: contrato mudou, chamadoshs-api precisa de commit junto
💬 Sugestão: feat(tarefas-recorrentes): exibe responsável na listagem
```

## Observações

- **Nunca executar o commit** — a decisão é do usuário
- Se o commit tiver múltiplas responsabilidades, sugerir como dividir
- Tom objetivo: o objetivo é agilizar, não bloquear
