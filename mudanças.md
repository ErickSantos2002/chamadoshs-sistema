# ChamadosHS — o que mudou

**Rickelme David** · agosto e setembro de 2026

Registro do trabalho feito por **Rickelme David** no sistema de chamados da
Health & Safety Tech entre 7 de agosto e 10 de setembro de 2026.

As alterações desse período são dele. As exceções são dois registros de 24 de
agosto, de WeltonKellyson: com eles, a atualização automática do quadro na TV
passou a trazer também as tarefas do dia.

---

## Em números

| | agosto | setembro |
|---|---|---|
| Período | 7 a 31 — 10 dias de trabalho | 1 a 10 — 7 dias de trabalho |
| Alterações entregues | 96 | 184, das quais 72 de documentação |
| Versões publicadas | 39, da 1.2.0 à 1.7.3 | 5, da 1.7.4 à 1.7.8 |
| Testes automatizados | de 46 para **432** | de 432 para **649** |

---

## O ponto de partida

O sistema estava em operação desde janeiro de 2026 e cumpria o essencial: abrir
chamado, atender, resolver. O que faltava não era funcionalidade — era o que
sustenta um sistema depois que ele passa a ser usado todo dia.

Três coisas, em ordem de gravidade:

**A API respondia sem exigir autenticação.** Qualquer pessoa que soubesse o
endereço conseguia consultar e alterar dados.

**A trilha de auditoria era falsificável.** Quem praticou cada ação era
informado pelo próprio navegador, e podia ser adulterado. Uma trilha que aceita
a autoria de quem está sendo auditado não prova nada.

**Não havia nenhuma garantia automatizada.** Nenhum teste, nenhuma checagem no
build. Toda alteração era publicada na confiança de que nada mais tinha
quebrado.

---

## O que foi entregue em agosto

### Segurança

O fechamento da API foi acompanhado no front: a autoria de cada ação passou a
vir do login, verificada no servidor, e não mais do navegador — a trilha de
auditoria passou a valer como prova.

A sessão passou a se renovar sozinha. Antes o acesso vencia em algumas horas e
a pessoa era jogada na tela de login no meio de um atendimento.

Arquivos de configuração deixaram de entrar na imagem publicada, onde podiam
fazer o sistema subir apontando para o ambiente errado. E os ícones, que vinham
de um site externo, passaram a ser servidos pelo próprio sistema — ele roda na
rede interna e não deve depender de nada de fora para desenhar a tela.

### O dia a dia de quem atende

O tempo da equipe estava sendo gasto em navegação, não em atendimento. Cada
ação exigia abrir a página inteira do chamado.

Passou a ser possível **iniciar, marcar como aguardando, resolver, reabrir e
atribuir o responsável sem sair do quadro**. Ao resolver, o campo da solução
aparece ali mesmo — e continua obrigatório, porque é o que alguém vai ler quando
o mesmo problema voltar.

O quadro passou a se atualizar sozinho, e o cartão muda de coluna na hora em que
o chamado avança, sem recarregar a página.

E ganhou **filtro por pessoa**: escolher um nome deixa na tela só os chamados
sob responsabilidade dele. "Sem responsável" é uma opção à parte, e responde de
uma vez o que ainda não está com ninguém — que é a pergunta que a equipe faz
olhando o quadro.

### Enxergar o que estava escondido

Um chamado arquivado ou cancelado sumia da tela sem sair do estado em que
estava. Continuava marcado como "aberto" por dentro, contava como pendência no
painel, e **não havia caminho na interface para reencontrá-lo**.

Isso foi corrigido nos dois lados: eles ganharam colunas próprias no quadro,
atrás de um botão que não atrapalha o trabalho do dia; a busca por protocolo
passou a encontrá-los mesmo com o botão desligado; e o painel parou de contar
chamado cancelado como trabalho pendente.

Foi um problema real — quatro chamados que a equipe não achava, e que estavam
todos ali.

### Prestação de contas

- **Tela de auditoria**, com a trilha dos cadastros filtrável por tipo, autor e
  período.
- **Histórico da conta** no cadastro de usuário: quem criou, quem alterou o quê
  e quando.
- **Avaliação do atendimento** pelo solicitante, movida para onde ele de fato
  passa. Ela existia desde a primeira versão e quase ninguém usava — 12 de 144
  chamados em nove meses —, porque só aparecia numa página que ninguém tinha
  motivo para revisitar.
- **Prazos de SLA** visíveis no quadro e no formulário: ao escolher a
  prioridade, a pessoa já vê o prazo que está assumindo.

### Acesso e clareza

O menu escondia áreas de quem não tinha perfil para elas, o que fazia a opção
simplesmente não existir. Agora todas aparecem, e quem abre uma área que não é
sua encontra uma explicação — qual é, de quem é, a quem pedir acesso. Quem
protege de verdade é o servidor.

Excluir cadastro virou **desativar e reativar**, com o nome certo: a lixeira
prometia uma coisa e fazia outra.

E foi criado o aviso **"O que há de novo?"**, que abre sozinho a cada versão e
explica a mudança na língua de quem abre chamado, não na de quem programa.

### A TV da sala

O quadro fica exposto numa TV, em paisagem e com pouca altura. Essa tela ditou
várias decisões:

- O login aparecia cortado em cima e embaixo, sem como rolar.
- A tela podia abrir sem mostrar chamado nenhum, sem erro e sem aviso.
- O menu lateral ocupava quase a largura de uma coluna inteira — passou a
  começar recolhido.

### Acessibilidade

As cores dos gráficos foram refeitas e **validadas para daltonismo**, com uma
verificação automática que reprova a publicação se alguém baixar um valor. A
paleta anterior tinha quatro pares de cores indistinguíveis entre si para quem
tem deuteranopia — invisível para quem enxerga as três cores, e o suficiente
para tornar um gráfico inútil para quem não enxerga.

### Identidade visual

O sistema inteiro passou a usar a linguagem visual do **HelpHS** — paleta,
tipografia, ícones e estrutura de tela.

Foi feito em doze etapas, cada tela migrada contra uma especificação escrita e
conferida em seguida com uma pergunta só: **mudou alguma coisa além de
aparência?** Foram 16 conferências; nenhum campo, coluna, filtro, botão ou
mensagem saiu no caminho.

Duas cores do HelpHS **não** foram copiadas ao pé da letra: reprovavam no
contraste mínimo de legibilidade, e foram substituídas por tons equivalentes que
passam.

### Exclusão de chamado

O sistema não tinha como apagar um chamado — só ocultar.

A ação foi liberada apenas para administrador, apenas em chamado já cancelado ou
arquivado, e a confirmação exige **digitar o número do protocolo**. É a única
ação do sistema sem volta: apaga o chamado, os comentários, o histórico e os
anexos, e não fica registro do que foi apagado.

---

## O que foi entregue em setembro

### Menos atrito no uso diário

**As janelas pararam de fechar com um clique fora delas.** Escorregar o mouse
no meio de um formulário fechava tudo, e o que tinha sido digitado se perdia
sem aviso. Agora elas saem pelo X ou pela tecla Esc.

**O aviso de novidades parou de abrir sozinho.** Ele aparecia a cada versão,
mesmo para quem tinha entrado só para atender um chamado. Agora o número da
versão, no rodapé do menu, ganha um ponto azul quando há novidade, e a pessoa
lê quando quiser.

**Os botões de ação dos cadastros dizem o que fazem.** Eram quatro ícones quase
da mesma cor, sem explicação. Agora, com o mouse por cima, aparece
"Visualizar", "Editar", "Resetar senha" ou "Desativar".

### O design do HelpHS, agora pela base

Em agosto o sistema passou a ter a aparência do HelpHS. Em setembro passou a
usar a mesma base: o conjunto de cores, fonte e componentes que os dois
sistemas compartilham, em vez de uma cópia aproximada dele.

Foram 20 etapas e 173 alterações, publicadas juntas em 10 de setembro, na
versão 1.7.7. O que muda para quem usa:

- **Os campos de formulário mostram onde começam.** O contorno era tão claro
  que mal se via; agora tem o contraste mínimo recomendado.
- **Nenhum texto fica abaixo de 12px** — oito estavam menores que isso.
- **O destaque de foco aparece para quem navega pelo teclado**, e deixou de
  acender a cada clique do mouse.
- **As animações respeitam quem pediu menos movimento** nas configurações do
  computador, e o pulso permanente do botão flutuante saiu.
- **Os gráficos do painel ficaram legíveis**: a caixa que aparece ao passar o
  mouse trazia o texto na cor da fatia, e em vários casos ele sumia.

### Para quem usa leitor de tela

Uma parte grande do trabalho não aparece na tela, e muda muito para quem ouve o
sistema em vez de enxergá-lo:

- o cartão do quadro passou a ser anunciado como um item com título, e não como
  um bloco de texto solto;
- as listas de escolha anunciam o valor escolhido — antes o apagavam do próprio
  nome;
- três botões perdiam o nome em telas estreitas;
- o estado de dois controles do painel, que era dito só pela cor, passou a ser
  dito também em texto;
- as janelas passaram a manter o foco do teclado dentro delas enquanto estão
  abertas.

### Defeitos encontrados no caminho

Nenhum destes aparecia como erro:

- **O histórico de uma tarefa recorrente mostrava, ao pé da letra,
  "Histórico — {selecionada.titulo}"** no lugar do nome da tarefa.
- **Dois cliques rápidos na avaliação podiam gravar a nota errada.** Se a
  pessoa clicava em 5 e mudava para 4, valia a resposta que chegasse por
  último ao servidor, e não o último clique — e nada na tela avisava.
- **O reset de senha disparava duas trocas com um duplo clique.**
- **Ao criar um usuário, o navegador oferecia a senha salva do
  administrador.** Aceita por reflexo, ela virava a senha da conta nova.
- **Apertar Esc numa lista de escolha dentro de uma janela fechava a janela
  inteira**, e não só a lista.

### Travas novas contra o erro repetido

Passaram a rodar antes de cada publicação verificações automáticas que recusam
o que reprovar: contraste de texto e de gráfico, cores de gráfico que se
confundem para quem é daltônico, botões sem nome, cores copiadas à mão que se
desencontram da base compartilhada, entre outras. Nenhuma delas existia no
começo do mês.

### O interruptor do modo escuro

Na versão 1.7.8, o interruptor do modo escuro voltou a funcionar como
interruptor: a bolinha ficava do lado direito mesmo no modo claro e, no escuro,
escapava do trilho até a borda do menu.

---

## Como o trabalho foi conduzido

**Cada entrega sobe a versão e escreve o aviso, no mesmo momento.** Não se
acumula. Se a pessoa não perceberia a diferença sem ler o texto, o aviso não é
escrito — e se percebe, é escrito na língua dela.

**Os testes cresceram de 46 para 649** — 432 no fim de agosto —, e cobrem as regras que ninguém pega em
revisão: a ordem de uma verificação, o contraste de uma cor, a presença de uma
palavra na tela. Vários existem por causa de um defeito específico que já
aconteceu, e o motivo está escrito ao lado.

**A publicação recusa código que não passa.** Checagem de tipos, código morto,
contraste de cores e dependência externa são conferidos automaticamente antes de
qualquer coisa ir ao ar.

**O porquê fica escrito no código.** Cada decisão não óbvia carrega a razão e o
defeito que a motivou, para que ninguém a desfaça daqui a seis meses achando que
está limpando.

---

## Onde o sistema está hoje

Versão **1.7.8**, publicada e em operação desde 10 de setembro.

Setembro deixou três frentes em aberto:

**A conferência final, tela a tela, não foi feita.** A troca da base do design
foi verificada por testes e por verificações automáticas, que conferem cor,
contraste e medida — mas não aparência. A última vez que alguém olhou as telas
foi em 8 de setembro, e depois disso três etapas mudaram o desenho. Como a
mudança já foi publicada, o "antes" para comparar não pode mais ser
reconstruído com facilidade.

**Botões pequenos demais para o toque.** 52 alvos ficaram abaixo do tamanho
recomendado para uso no celular. A ordem de conserto está decidida.

**Trocar o tema com o menu aberto pode deixar o menu na cor antiga.** Há uma
correção no ar, mas ela é uma hipótese: o defeito some quando se tenta medi-lo,
e só dá para confirmar olhando.

E duas de agosto continuam:

**A guarda da exclusão não foi conferida em tela.** A ação funciona — foi usada
em dados reais. O que falta verificar é o que ela impede: que o botão não
apareça em chamado ativo, nem para quem não é administrador.

**Cancelar não tem como ser desfeito.** O sistema permite cancelar um chamado,
mas não existe caminho de volta — nem na tela, nem no servidor. Um cancelamento
por engano prende o chamado nesse estado. Resolver isso depende de uma alteração
no servidor, não no front.
