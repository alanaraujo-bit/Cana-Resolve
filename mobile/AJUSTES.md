# Conta e Configurações

O que a Fase 05 decidiu, e por quê. Curto de propósito: o detalhe fica no
código, onde não envelhece sozinho.

## A linha que separa Conta de Perfil

É a decisão que governa tudo aqui.

| | Perfil (Fase 04) | Conta (Fase 05) |
| --- | --- | --- |
| Pergunta | Como eu **apareço** para o morador | Como eu **entro**, e o que protege isso |
| Conteúdo | nome comercial, ofício, serviços, área, horário, portfólio, contatos públicos | e-mail de acesso, método de autenticação, senha, sessão |
| Onde vive | aba Perfil, `src/perfil/` | `/ajustes`, `src/conta/` |
| Quem lê | o morador | só você |

As duas se relacionam — a mesma pessoa — e não se misturam. O e-mail de acesso
não é o e-mail comercial; trocar um não troca o outro. Nada de Configurações
edita dado de vitrine, e o Perfil não guarda credencial.

**A entrada** para Configurações é uma linha no fim da capa do Perfil. Não virou
uma quarta aba: a navegação principal é do dia a dia, e Configurações é onde se
entra, resolve e sai. A pilha vive em `app/(app)/ajustes/`, **fora** das abas,
por isso mesmo — e porque empilhá-la dentro do Perfil desfaria a separação
acima.

## Como a sessão funciona agora

Até a Fase 04 a API devolvia um token e o aplicativo o descartava: quem fechava
o aplicativo entrava de novo, e "sair" era esquecer localmente. A Fase 05
fechou esse buraco, porque tudo nesta fase se apoia nele.

```
abrir → ler credencial do SecureStore → perguntar ao servidor se ainda vale
      ├─ vale        → segue, com nome e e-mail atualizados
      ├─ não vale    → limpa, manda entrar, e explica: "Sua sessão expirou."
      └─ não deu para perguntar (sem rede) → segue; sinal fraco não custa o login
```

Três regras que não se negociam:

1. **Uma fonte só.** `SessionProvider` é o único estado de autenticação do
   aplicativo. Nenhuma tela guarda o próprio "estou logado" e **nenhuma tela
   redireciona por conta própria** ao receber um 401 — ela chama `sessaoExpirou()`
   e o porteiro em `app/_layout.tsx` faz a única transição que existe. É o que
   evita o pingue-pongue entre login e Início.
2. **Token em armazenamento seguro.** `SecureStore` (Keychain/Keystore), nunca
   `AsyncStorage`. Na web o `SecureStore` não existe, então a prévia pelo
   navegador simplesmente **não** guarda sessão — a alternativa seria
   `localStorage`, que é exatamente onde um token não pode ficar.
3. **Erro de rede não é sessão inválida.** Só um 401 do servidor derruba
   alguém.

Rotas, no repositório do site (`app/api/v1/auth/`):

| | O quê |
| --- | --- |
| `POST /auth/sessoes` | entrar; devolve `{ token, conta }`, agora com `email` |
| `GET /auth/sessoes` | esta credencial ainda vale? 200 com a conta, ou 401 |
| `DELETE /auth/sessoes` | sair; encerra a sessão no servidor |
| `POST /auth/senha` | trocar a senha (exige a atual; derruba os outros aparelhos) |

## Métodos de entrada

`src/conta/tipos.ts` deriva a lista; nenhuma tela decide isso sozinha.

| Método | Estado hoje | Por quê |
| --- | --- | --- |
| E-mail e senha | **em uso** | é a única porta aberta: quem tem sessão entrou por aqui |
| Google | não ligado | o servidor recusa com 501 — ver `BLOCKERS.md` |
| Apple | não ligado, e **só aparece no iOS** | idem; no Android seria uma linha inútil |

Nenhum dos dois diz "Conectado" só porque o botão existe na tela de entrada.
Quando um deles for ligado, o servidor precisará dizer por onde a conta entra —
hoje é dedução, e a dedução é válida porque só há um caminho.

**Senha só quando existe senha.** `temSenhaLocal()` esconde "Alterar senha" de
uma conta que tenha entrado só por Google ou Apple. Hoje nenhuma tem; a tela já
sabe se adaptar.

## Preferências: o que é do aparelho e o que é da conta

| Preferência | Onde vive | Sobrevive ao logout? |
| --- | --- | --- |
| Aparência (Sistema / Claro / Escuro) | aparelho, `AsyncStorage` | **sim** |
| Idioma | fixo em pt-BR | — |
| Pausar oportunidades | conta, hoje espelhada no aparelho | **não** |
| Notificações (Fase 06) | conta | **não** |

A lista de chaves e de que lado da linha cada uma fica está em
`src/session/chaves.ts`, em um lugar só — é o que torna a separação confiável.

**Aparência.** "Sistema" continua sendo uma preferência depois de escolhida, e
não a cor congelada: o que se grava é a palavra. A leitura acontece **antes do
primeiro quadro** (`app/_layout.tsx` espera por ela junto com as fontes), senão
um aparelho no escuro com "Claro" salvo abriria escuro e piscaria.

**Idioma** não é um menu. Só existe português, e um seletor com uma opção seria
teatro; a linha informa e a arquitetura fica pronta.

**Pausar oportunidades** foi a única preferência de oportunidade que passou pela
pergunta "o profissional precisa mesmo controlar isso?". Filtro por bairro, por
valor mínimo e por horário não passaram: já existem no Perfil ou estreitariam o
encontro antes de haver volume para saber se ajudam. A pausa aparece na **Home**
de propósito — uma pausa que só se vê onde foi ligada é uma armadilha.

Enquanto `EXPO_PUBLIC_DATA_API_URL` estiver vazia, a pausa vale neste aparelho e
a tela diz isso.

## Segurança

**Alterar senha é real.** Existe rota, o servidor confere a senha atual, grava a
nova e **derruba as outras sessões** da conta — a que pediu a troca continua. Se
não fosse real, esta tela não deveria existir: um "senha alterada com sucesso"
sem nada alterado é o pior tipo de mentira que uma interface pode contar.

A régua é curta (8 caracteres, não só números) e chega **antes** do erro. Quem
vai digitar isso é um eletricista no meio da rua; exigir símbolo e maiúscula não
compra segurança, compra senha anotada num papel.

**Não existe** central de dispositivos conectados. O servidor guarda as sessões,
mas não há rota para listá-las, e uma tela com aparelhos inventados seria pior
que nenhuma. A tela mostra o aparelho de agora e o estado da confirmação.

**Biometria** ficou de fora, e não por esquecimento: Face ID / Touch ID fazem
sentido para proteger a **reentrada** numa sessão que já existe, e essa sessão
passou a existir só agora. Entra quando houver o que proteger, com autorização
pedida na hora de ativar e fallback sempre disponível — nunca como substituta da
autenticação.

## Sair da conta

O que **morre**: a credencial no `SecureStore`, a sessão no servidor (melhor
esforço — sair não pode falhar por falta de rede) e o que pertence à conta neste
aparelho: o rascunho local do perfil e as preferências da conta.

O que **fica**: o onboarding já visto e o tema escolhido. São do aparelho, não do
login. Logout não é resetar o aplicativo.

O rascunho de perfil **precisa** morrer: é dado de um parceiro, e apareceria na
tela do próximo a entrar neste aparelho.

**E limpar é esvaziar a memória, não só o disco.** O repositório do perfil
guarda uma cópia em `memoria` e a consulta **antes** do `AsyncStorage`; remover
a chave, sozinho, não fazia nada enquanto o aplicativo seguisse aberto. A
carteira de oportunidades tem uma cópia igual, com as decisões tomadas. Por isso
a limpeza mora em `src/session/limpeza.ts` e chama o `esquecer()` de cada
módulo — `chaves.ts` diz *quais* chaves são da conta, e `limpeza.ts` faz a
limpeza acontecer.

A confirmação é uma folha simples, sem drama, e nenhum dos dois botões vem em
verde cheio — sair não é uma conquista, e esconder a saída seria um padrão
escuro.

## Excluir conta

Está previsto, explicado e **não implementado como mentira**. A tela diz o que
acontece, separa exclusão de logout com todas as letras, e o pedido vai pelo
canal oficial, onde uma pessoa confirma a identidade e executa.

Apagar a sessão local e dizer "conta excluída" deixaria a conta no banco e o
perfil no ar. O que falta para automatizar está no `BLOCKERS.md`, e a parte
difícil não é técnica: é decidir o que acontece com o histórico de atendimentos
já encerrados, que envolve o morador do outro lado.

## Permissões

Uma só, porque é uma só que o aplicativo usa: **fotos**, para a imagem do perfil
e o portfólio. Localização não é pedida — ser um aplicativo de bairro não é
motivo para saber onde alguém está. Notificações serão pedidas na Fase 06,
quando houver o que notificar.

Quando a permissão está negada, a tela diz por que precisamos, o que muda sem
ela e como habilitar — e oferece abrir os ajustes do sistema, sem pedir de novo
em laço. Na web esse lugar não existe: a tela explica em vez de estourar.

## Notificações — o que já está pronto para a Fase 06

Uma linha em Preferências, dizendo que ainda não existem. Sem interruptor: um
controle que não controla nada é a pior coisa que uma tela de Configurações pode
ter. Quando o envio existir, ela vira uma seção com as categorias que já se
sabe que virão — novas oportunidades, conta e segurança, comunicados — e a
preferência passa a ser **da conta**, porque quem decide enviar é o servidor.

## Desenvolvimento

Os atalhos que estavam espalhados (rever o onboarding, ver o ambiente) ganharam
uma tela em `/ajustes/desenvolvimento`, fechada por `__DEV__`. Ela mostra se as
APIs estão configuradas — nunca o conteúdo de uma variável, nunca um token.
Configurações de desenvolvedor não pertencem à experiência de quem usa o
produto.

## O que esta fase não construiu

Push completo, central de notificações, planos, assinatura, pagamentos,
analytics conectado, avaliações, chat, área do morador e painel administrativo.
A arquitetura acomoda todos; nenhum foi começado.
