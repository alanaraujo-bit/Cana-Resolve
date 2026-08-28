# Notificações — como o Canaã Resolve avisa um profissional

Push não é o produto. **A oportunidade é o produto.** Tudo aqui existe para
encurtar o tempo entre *uma oportunidade foi criada* e *o profissional soube
que ela existe* — e para não custar nada quando o aviso não chegar.

A regra que governa cada decisão deste documento: **se o push nunca for
entregue, o aplicativo continua correto.** A Home e a Central leem o
repositório; voltar ao primeiro plano relê; puxar para atualizar continua
existindo. O aviso é um atalho, nunca um requisito.

---

## O caminho inteiro

```
morador descreve o problema
   → a operação encaminha para um profissional compatível
   → nasce a oportunidade no banco          ← a entidade existe aqui
   → o servidor procura os aparelhos ativos daquela conta
   → manda um aviso curto pelo Expo Push     ← só sinalização
   → iOS/Android entrega (ou não)
   → o profissional toca
   → o aplicativo abre e anota o destino
   → a sessão é conferida
   → a oportunidade é lida da fonte          ← nunca do payload
   → o detalhe abre, com o estado de agora
```

Duas setas merecem atenção. A quarta é **entrega**, e ela não cria nada: se
falhar, a oportunidade continua no banco e aparece na Central assim que o
aplicativo abrir. A penúltima é o §22: o estado vem do repositório, não do
aviso — um push que diz "Nova" pode chegar depois de a oportunidade ter sido
encerrada.

---

## Onde cada peça mora

| Peça | Arquivo |
| --- | --- |
| Contrato do payload, taxonomia, estados de permissão | `src/notificacoes/tipos.ts` |
| A única porta para `expo-notifications` | `src/notificacoes/sistema.ts` |
| A mesma porta, no navegador (sem simular nada) | `src/notificacoes/sistema.web.ts` |
| Identidade da instalação | `src/notificacoes/instalacao.ts` |
| Registro e revogação no servidor | `src/notificacoes/registro.ts` |
| Destino pendente (push, link, cold start) | `src/notificacoes/destino.ts` |
| Memória do convite | `src/notificacoes/convite.ts` |
| A orquestração | `src/notificacoes/NotificacoesProvider.tsx` |
| Convite e faixa de aviso | `src/notificacoes/componentes.tsx` |
| Eventos técnicos | `src/notificacoes/analytics.ts` |
| Tela de preferências | `app/(app)/ajustes/notificacoes.tsx` |
| Endereço que não existe | `app/+not-found.tsx` |

No repositório do site:

| Peça | Arquivo |
| --- | --- |
| Tabela `partner_devices` | `lib/db/schema.ts`, migração `0005` |
| Cadastro de aparelhos | `lib/push/dispositivos.ts` |
| Texto e payload dos avisos | `lib/push/mensagens.ts` |
| Envio pelo Expo Push | `lib/push/envio.ts` |
| A rota | `app/api/v1/auth/dispositivos/route.ts` |
| Envio de teste | `scripts/push-teste.ts` (`npm run push:teste`) |
| Testes | `tests/dispositivos.test.ts` |

---

## Tipos de aviso

Quatro, em três famílias. Poucas de propósito.

| Tipo | Quando | Preferência | Canal (Android) |
| --- | --- | --- | --- |
| `oportunidade.nova` | um pedido compatível chegou | Novas oportunidades | `oportunidades` |
| `oportunidade.atualizada` | cancelada, encerrada pelo sistema, ou esperando ação | Atualizações importantes | `atualizacoes` |
| `conta.seguranca` | mudança real de acesso à conta | **nenhuma** — não é desligável | `conta` |
| `canaa.comunicado` | aviso raro sobre o serviço | Comunicados | `atualizacoes` |

Marketing **não existe** nesta lista, e a ausência é intencional: ela é o que
impede alguém de mandar campanha usando a autorização que o parceiro deu para
receber oportunidade. Quando existir, precisa de preferência própria.

Segurança fora do opt-out é a mesma ideia pelo avesso: quem desligou
"comunicados" não pediu para não saber que alguém entrou na conta dele.

---

## O que aparece na tela bloqueada

```
Nova oportunidade
Ar-condicionado · Novo Horizonte
```

Categoria e bairro. Os dois já são públicos no balcão, e os dois cabem em uma
tela bloqueada lida por quem estiver por perto.

**Nunca:** a necessidade escrita pela pessoa, o nome dela, o telefone, o
endereço, a descrição, identificadores técnicos. O exemplo que a especificação
dá — *"a câmera apontada para o quarto da minha filha"* — é exatamente o tipo
de frase que não pode aparecer no bolso de ninguém.

Isso não depende de escrever com cuidado. `conferirPrivacidade`, em
`lib/push/mensagens.ts`, examina o texto pronto e **recusa o envio** se
encontrar telefone, e-mail, endereço ou CPF. A rede existe para o dia em que
alguém escrever com pressa.

O payload, por dentro, carrega o que a navegação precisa:

```json
{
  "tipo": "oportunidade.nova",
  "destino": "oportunidade/o1",
  "oportunidadeId": "o1",
  "em": "2026-08-28T13:00:00.000Z",
  "evento": "oportunidade.nova:o1",
  "para": "<id do parceiro>"
}
```

`para` é o que impede um aviso da conta anterior de abrir dados da conta atual.
`evento` é a identidade do fato: dois envios com a mesma chave são o mesmo
acontecimento, e o segundo não vira uma segunda notificação.

---

## Registro do aparelho

**A chave é a instalação, não o usuário e não o token.**

`installationId` é sorteado pelo aplicativo na primeira abertura e guardado no
aparelho. Não vem de IDFV, serial nem identificador de publicidade — um
identificador de hardware seguiria a pessoa entre desinstalações e entre
contas, que é o rastro que não queremos deixar.

```
POST   /api/v1/auth/dispositivos    Authorization: Bearer <sessão>
GET    /api/v1/auth/dispositivos
DELETE /api/v1/auth/dispositivos?installationId=…
```

Os três exigem sessão. O token de push **nunca** autentica nada: ele é
endereço de entrega, e só.

O `POST` é um `onConflictDoUpdate` sobre um índice único de `installationId`.
As consequências saem de graça:

- registrar dez vezes é uma linha (idempotência);
- o token mudou? a mesma linha é atualizada;
- outro parceiro entrou neste aparelho? a linha é **reapontada** para ele, na
  mesma escrita — sem janela em que os dois recebem;
- o aparelho estava revogado? registrar de novo o ressuscita.

A resposta não devolve o token, e `GET` também não: quem o tem é o aparelho.

### Ciclo de vida

| Acontece | O que o servidor faz |
| --- | --- |
| Primeira permissão concedida | cria a linha |
| Token renovado pelo sistema | atualiza a mesma linha |
| Outra conta entra no aparelho | reaponta `partnerId` |
| **Sair da conta** | `revokedAt` + `revokedReason: 'saiu'` |
| Provedor diz `DeviceNotRegistered` | `revokedReason: 'desinstalado'` |
| Trocar a senha | `revogarOutras` acompanha as sessões derrubadas |

**Sair revoga, não apaga.** Uma linha apagada não conta história; o que o
requisito crítico pede é que o aparelho *pare* de receber o que era daquela
conta, e uma revogação datada prova isso.

O aplicativo chama o `DELETE` **antes** de esquecer o token — depois não
haveria com o que provar quem está pedindo. Ele não espera a resposta: sair é
imediato para quem pediu. Se falhar, a próxima entrada neste aparelho reaponta
a linha, e o conteúdo do aviso não carrega dado privado de ninguém.

---

## Permissão

**Nunca na primeira abertura.** Instalar → abrir → "deseja enviar
notificações?" é o pedido que a pessoa nega antes de saber o que perde.

O convite aparece na **Home**, depois das oportunidades — só ali a frase "mesmo
com o aplicativo fechado" quer dizer alguma coisa. Ele tem duas ações do mesmo
peso visual: **Ativar notificações** e **Agora não**. Recusar custa um toque,
como aceitar.

"Agora não" é gravado (`cr.push.convite.v1`) e **respeitado**: o convite não
volta sozinho. O caminho continua aberto em Configurações › Notificações, onde
a pessoa chega porque quis.

Cinco estados, e a interface diz qual é:

| Estado | O que a tela mostra |
| --- | --- |
| `a-perguntar` | o convite, ou o botão em Configurações |
| `concedida` | "Ativadas", e o aparelho é registrado |
| `negada` | o que se perde, e um botão para pedir de novo — uma vez, por toque |
| `bloqueada` | "Abrir configurações do aparelho". Sem insistir: o sistema não pergunta mais |
| `indisponivel` | navegador, Expo Go ou simulador — dito com todas as letras |

A permissão real é **sempre lida do sistema**, na abertura e a cada volta ao
primeiro plano. A memória local diz apenas se já convidamos; quem manda é o
sistema operacional.

### Permissão ≠ preferência

Duas coisas diferentes, e a tela de Notificações existe para não confundi-las:

- **Entrega** é do iOS/Android. Não se muda de dentro do aplicativo.
- **Preferência** é o que a pessoa quer receber quando a entrega for possível.

Com o sistema bloqueando, os três interruptores continuam representando a
escolha dela — e a tela **diz** que nada será entregue. Um interruptor ligado
sobre uma entrega bloqueada é uma mentira educada.

---

## Deep links

Um destino, várias origens. Todas produzem a mesma coisa: `oportunidade/:id`.

```
canaaresolve://oportunidade/o1     esquema próprio, hoje
push  → carga.destino              o mesmo formato
link interno                       o mesmo formato
Universal Link / App Link          preparado, ver BLOCKERS.md
```

`src/notificacoes/destino.ts` é o guardião. Ele:

1. **valida** contra uma lista curta de rotas aceitas — o que não bate vira
   `null`, e não vira navegação;
2. **guarda** o destino até haver sessão conferida e roteador montado;
3. **confere o dono** antes de entregar: um push do parceiro A, tocado depois
   de o parceiro B entrar no mesmo aparelho, é descartado sem abrir tela;
4. **expira** em 30 minutos — um push tocado ontem não sequestra a abertura de
   hoje;
5. **morre no logout**, junto com o rascunho do perfil e as decisões da
   carteira (`session/limpeza.ts`).

Ele nasceu de um furo real: o porteiro em `app/_layout.tsx` lia o caminho
**uma vez**, na primeira montagem. Um push tocado com o aplicativo já parado na
tela de entrar, ou vindo do segundo plano, nunca passava por aquele instante.

### Os cinco estados de abertura

| Estado | Como o destino chega |
| --- | --- |
| Aplicativo aberto | `addNotificationResponseReceivedListener` |
| Em segundo plano | o mesmo ouvinte, ao voltar |
| **Encerrado (cold start)** | `getLastNotificationResponse()`, na montagem |
| Sessão carregando | anotado; consumido quando a sessão confirma |
| Sem sessão / expirada | anotado; login; **depois** a oportunidade abre |

Quem navega é **um lugar só**: `NotificacoesProvider`, com `push` sobre o
Início — nunca `replace`. Assim quem chegou por notificação tem para onde
voltar.

Um endereço que o aplicativo não conhece cai em `app/+not-found.tsx`, com frase
de gente e uma saída — nunca a tela crua do roteador.

### Uma tela de detalhe só

Home, Central, push e link convergem para `app/(app)/oportunidade/[id].tsx`.
Não existe uma versão "vinda da notificação". Ela já trata, de antes:
carregando, indisponível, encerrada, sem rede.

---

## Selo

**Uma regra, duas superfícies.** `contarEsperando`, em
`src/oportunidades/tipos.ts`, conta as oportunidades no grupo *Esperando você*
— `nova` e `vista`. É a mesma função que alimenta o selo da aba desde a Fase 03
e, agora, o selo do ícone do aplicativo.

Não há uma segunda contagem. Duas divergiriam no primeiro caso de borda, e o
ícone passaria a mentir sobre o aplicativo.

- Abrir uma oportunidade a move de `nova` para `vista` — e ela **continua**
  esperando uma decisão, então o número **não** cai. Ele cai quando a pessoa
  responde. É o comportamento que o §45 pede: abrir uma não é ter visto todas.
- Zero **remove** o selo. Nunca um "0" desenhado.
- Sair da conta zera o selo do ícone.

---

## Com o aplicativo aberto

Chega um aviso. Três coisas acontecem, e navegar não é uma delas:

1. a carteira é **relida da fonte** — sem exigir puxar para atualizar;
2. o selo se ajusta por consequência, porque a contagem é derivada;
3. uma **faixa discreta** aparece no topo, com "Ver", e some em 7 segundos.

O banner do sistema é suprimido em foreground (`shouldShowBanner: false`):
quem está com o aplicativo aberto já está aqui. O aviso continua entrando no
Notification Center.

**O aplicativo nunca navega sozinho.** Quem está preenchendo o Perfil não é
arrancado dali porque um pedido chegou. A faixa oferece; a pessoa decide.

E se o aviso for de um tipo que ela desligou, ou de uma conta que não é a
aberta, ele não vira faixa nenhuma.

### Reconciliação

Voltar ao primeiro plano relê a carteira e a permissão. É isso que mantém o
produto correto quando nenhum push chega — e é onde uma permissão desligada nas
Configurações do aparelho é percebida.

Sem WebSocket, sem polling, sem trabalho em segundo plano. Push sinaliza,
foreground reconcilia, puxar para atualizar continua existindo. Para um
produto hiperlocal, mais infraestrutura que isso seria custo sem ganho.

---

## Ambiente de teste

Push remoto **não funciona no Expo Go** nem no navegador. Isso não é
configuração faltando: é o ambiente, e o aplicativo diz qual é.

| Onde | Push remoto | Resto do aplicativo |
| --- | --- | --- |
| Build de desenvolvimento, aparelho real | sim | sim |
| Expo Go | não | sim |
| Simulador | não | sim |
| Navegador | não | sim, menos sessão persistida |

### Instalar a build de desenvolvimento no iPhone

Pré-requisitos que **dependem de você** — ver `BLOCKERS.md`:

```bash
npm i -g eas-cli
cd mobile
eas login                 # conta Expo
eas init                  # cria o projeto e grava extra.eas.projectId no app.json
eas credentials           # gera a chave de push do APNs (precisa de conta Apple Developer)
eas build --profile development --platform ios
```

O QR code no fim leva ao instalador. Depois:

```bash
cd mobile && npx expo start --dev-client
```

O aplicativo abre com a própria identidade — nome, ícone e splash do Canaã
Resolve, não o Expo Go.

### Uma armadilha do perfil `preview`

`ambiente()` chama de `production` o que roda numa build `Standalone` com
`__DEV__` desligado. O perfil **`preview`** do `eas.json` é exatamente isso — e
mesmo assim, distribuído internamente pelo iOS, ele emite token de **sandbox**.
Um registro marcado `production` com token de sandbox falha em silêncio, que é
o pior tipo de falha.

Não afeta esta fase: o §65 pede a build de **desenvolvimento**, e ela é
`development` dos dois lados. Mas no dia em que o `preview` for usado para
testar push com gente de fora, `ambiente()` precisa de um terceiro valor — ou
o perfil precisa declarar o ambiente por variável, em vez de deduzi-lo.

### Mandar um push de teste

No repositório do site, com a `DATABASE_URL` no `.env.local`:

```bash
npm run push:teste -- aparelhos    parceiro@exemplo.com
npm run push:teste -- oportunidade parceiro@exemplo.com o1
npm run push:teste -- atualizacao  parceiro@exemplo.com o1 cancelada
npm run push:teste -- seguranca    parceiro@exemplo.com
```

**Não existe rota HTTP de envio**, e é de propósito: um endpoint público seria
uma superfície nova para proteger. Um script que roda na máquina de quem já
tem a `DATABASE_URL` não tem superfície nenhuma.

### O roteiro no aparelho

1. instalar a build e entrar com uma conta de verdade;
2. na Home, tocar em **Ativar notificações** e aceitar no prompt do sistema;
3. conferir em Configurações › Desenvolvimento que o registro diz
   *Registrado no servidor*, e no site que `push:teste -- aparelhos` lista o
   aparelho;
4. **fechar o aplicativo por completo** e mandar
   `push:teste -- oportunidade <email> o1`;
5. tocar no aviso: o detalhe da oportunidade `o1` precisa abrir direto;
6. repetir com o aplicativo aberto: a faixa aparece, e **nada navega sozinho**;
7. repetir com o aplicativo em segundo plano;
8. conferir o número no ícone antes e depois de responder a uma oportunidade;
9. sair da conta e mandar outro push: **nada pode chegar**.

---

## Privacidade e segurança, em uma lista

- O texto visível carrega categoria e bairro. Nada mais.
- `conferirPrivacidade` recusa o envio de texto com telefone, e-mail, endereço
  ou CPF.
- O token de push nunca aparece na interface, em log, ou em evento de
  analytics. Ele sai da tabela só para o provedor.
- Conhecer um `oportunidadeId` não concede acesso: quem autoriza é o servidor,
  quando a tela busca os dados.
- Conhecer um `installationId` não permite calar o aparelho de outra pessoa: a
  revogação exige a sessão do dono.
- Sair da conta revoga a entrega e apaga o destino pendente.
- Não há ação de negócio na tela bloqueada. "Tenho interesse" pelo lock screen
  implicaria autorização, idempotência, concorrência e toque acidental — a
  decisão acontece dentro do aplicativo.
- Ambientes separados: cada registro guarda `development` ou `production`, e um
  token de desenvolvimento não é entregável pela credencial de produção.

---

## Analytics

Contratos declarados, sem infraestrutura — como nos outros módulos. Em
desenvolvimento imprimem; em produção são descartados em silêncio.

`notification_permission_prompted` · `_granted` · `_denied` · `_adiada` ·
`device_registered` · `device_registration_failed` · `device_revoked` ·
`notification_received` · `notification_opened` ·
`notification_deeplink_resolved` · `notification_deeplink_recusado`

Nenhum carrega token, instalação ou conteúdo do aviso.

E três coisas que **não** são a mesma: *enviado* é do servidor, *recebido* é a
chegada, *aberto* é o toque. Tratá-las como uma só faria a métrica contar
intenção como se fosse atenção.

---

## O que esta fase deliberadamente não fez

Central de notificações, caixa de entrada, histórico de avisos, sino no
cabeçalho, painel de "últimas notificações" na Home, chat, área do morador,
marketing, campanhas, dashboard de métricas, e ação de negócio na notificação.

A entidade continua sendo a **oportunidade**, e ela já tem Central.
