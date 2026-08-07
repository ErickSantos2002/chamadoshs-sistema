---
name: hsweb-pr-description
description: Gera descrição de Pull Request do ChamadosHS a partir do diff ou dos commits do branch, considerando os dois repositórios, migrations SQL manuais e deploy no Easypanel. Nunca abre o PR.
---

# Skill: PR Description — ChamadosHS

## Objetivo

Gerar descrição clara e padronizada de PR, garantindo contexto suficiente para
revisar com confiança — e, neste projeto, para **subir na ordem certa**.

## Contexto que muda a descrição

- Dois repositórios independentes (`chamadoshs-sistema` e `chamadoshs-api`).
  Uma feature pode exigir PR em cada um
- Migrations são arquivos `.sql` **aplicados à mão**, sem Alembic
- Deploy é **manual, pelo usuário, via Easypanel** — não há CI/CD
- Mudança de variável no front exige **rebuild da imagem**, não só restart
- Não há testes automatizados: o "como testar" é o que garante a validação

## O que pedir se não for fornecido

- `git log main..HEAD --oneline` ou o diff
- Contexto: bug, feature, refactor?
- Há breaking change de contrato de API?
- Precisa de PR no repositório irmão?

## Estrutura gerada

```markdown
## O que foi feito
[O que muda, do ponto de vista de quem usa o sistema]

## Por que foi feito
[Motivação: bug reportado, requisito, decisão técnica]

## Como testar
- [ ] Passo 1
- [ ] Passo 2
- [ ] Comportamento esperado: ...

## Impacto
- [ ] Breaking change no contrato da API
- [ ] Requer migration SQL — arquivo: `migrations/xxx.sql`
- [ ] Requer nova variável de ambiente
- [ ] Requer rebuild da imagem do front (mudou algo `VITE_*`)
- [ ] Precisa de PR no repositório irmão — link:

## Ordem de subida
1. [ex.: aplicar migration]
2. [ex.: subir chamadoshs-api]
3. [ex.: subir chamadoshs-sistema]

## Checklist
- [ ] Build passa (`npm run build`)
- [ ] Sem `console.log` / `print()` de debug
- [ ] Variáveis novas documentadas no `.env.example`
- [ ] Testado manualmente (descrever o que foi testado)
```

## Regras

- Título no padrão de commit do projeto: `tipo(escopo): descrição em português`
- Não listar arquivos como se fossem descrição — explicar o impacto
- Migration é sempre destaque, nunca nota de rodapé
- Se afeta variável de ambiente, dizer **qual** e **onde configurar** (Easypanel:
  build arg no front, env var no back)
- Seção "Ordem de subida" só quando os dois repositórios mudam — mas quando muda,
  é obrigatória
- Adaptar o detalhe ao tamanho: PR pequeno não precisa de tudo

## Observações

- **Nunca abrir o PR automaticamente**
- Se o diff passar de ~500 linhas, sugerir dividir antes
- Aproveitar o contexto da sessão para decisões já discutidas
