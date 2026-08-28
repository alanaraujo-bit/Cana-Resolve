# Bloqueios — o que depende de você

Nada aqui impede o desenvolvimento visual nem o teste no Expo Go. São pontos de
configuração isolados: enquanto estiverem vazios, o aplicativo abre normalmente
e os caminhos que dependem deles se declaram indisponíveis, com mensagem de
produto para o usuário e nota técnica só em desenvolvimento.

Onde preencher: `mobile/.env` (copie de `mobile/.env.exemplo`). O arquivo está
fora do versionamento.

---

## 1. API de autenticação — `EXPO_PUBLIC_AUTH_API_URL` · **resolvido em 28/08/2026**

A API existe e está no ar:

```
EXPO_PUBLIC_AUTH_API_URL=https://canaaresolve.aionixdev.com/api/v1
```

Entrada por **e-mail e senha**, contra os parceiros de verdade do banco. O
código mora no repositório do site (`app/api/v1/auth/sessoes/`), decisão tomada
por Alan e registrada no `README.md` de lá.

Quem ainda não tem senha não entra — o cadastro público não pede senha. Para
dar a primeira a alguém, no repositório do site:

```
npm run parceiro:senha -- listar
npm run parceiro:senha -- definir PA-0002 parceiro@exemplo.com
```

A senha é sorteada e mostrada uma vez; o banco guarda só o hash (scrypt).

**Continua faltando:** a tela de "criar senha" e a de "esqueci minha senha".
Enquanto não existirem, quem distribui credencial é o comando acima.

**No aparelho e no navegador.** No celular (Expo Go) não existe CORS: o `fetch`
do React Native não tem origem, e a entrada funciona direto. A prévia web
(`expo start --web`) é barrada pelo navegador, então a API libera de propósito
só as origens locais — `localhost` e rede local. Nenhuma página da internet
consegue disparar login pelo navegador de quem a visita.

O texto abaixo é o registro de como era antes.

---

**Faltava:** o endereço do servidor que valida credencial e devolve sessão.

O aplicativo já fala o contrato esperado (`src/auth/service.ts`):

```
POST {base}/auth/sessoes
body: { tipo: "senha" | "google" | "apple", ... }
200:  { token, conta: { id, nome, papel } }
401:  credencial inválida
```

Enquanto não existir, **nenhum login conclui** — por decisão, não por acidente:
o aplicativo nunca considera alguém autenticado sem confirmação de servidor.

**As oportunidades dependem da mesma variável.** Sem ela, em desenvolvimento a
Central e o detalhe são alimentados por exemplos declarados e identificados na
tela; em produção nada carrega e a falha é dita. O contrato que o servidor
precisará atender está em `mobile/DOMINIO-OPORTUNIDADES.md`, §10 — com duas
garantias que são do servidor e não da interface: o contato da pessoa só vai na
resposta depois do interesse registrado, e as transições são idempotentes.

**Quando voltar:** subir o serviço de autenticação (o repositório do site não é
o lugar dele) e preencher a variável.

## 2. Google — `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS` / `_ANDROID` / `_WEB`

**Falta:** os Client IDs OAuth do Google Cloud Console.

O fluxo já está escrito com PKCE e sem segredo no aplicativo: o aparelho obtém
um `code` e a API o troca por sessão. O `client secret` fica no servidor.

**Quando voltar:**

1. Google Cloud Console → Credenciais → OAuth 2.0 → criar um cliente para iOS,
   um para Android e um Web (este é o que o servidor usa na troca).
2. URI de redirecionamento do aplicativo: `canaaresolve://oauth/google`.
3. Preencher as três variáveis.

**Atenção — Expo Go:** o cliente OAuth nativo do Google exige o esquema de URL
do aplicativo, que o Expo Go não tem. O botão e todos os seus estados podem ser
vistos no Expo Go, mas **concluir** a entrada pelo Google exige uma
*Development Build* (`npx expo run:ios`). A arquitetura já está pronta para
essa migração; nada precisa ser reescrito.

## 3. Apple — Sign in with Apple

**Falta:** habilitar a capacidade no Apple Developer e finalizar a verificação
do `identityToken` no servidor.

Já está feito: o botão oficial da Apple, exibido apenas quando
`AppleAuthentication.isAvailableAsync()` confirma disponibilidade, e
`usesAppleSignIn: true` no `app.json`.

**Quando voltar:** ativar "Sign in with Apple" no App ID
`com.aionix.canaaresolve`, e validar o token no servidor. Também exige
*Development Build* para funcionar de ponta a ponta.

## 4. Identificadores definitivos

Assumidos, e trocáveis a qualquer momento em `mobile/app.json`:

- Bundle ID (iOS) e package (Android): `com.aionix.canaaresolve`
- Esquema de URL: `canaaresolve`
- Nome de exibição: `Canaã Resolve`

**Se algum destes já existir na App Store Connect ou no Google Play com outro
valor, avise** — trocar depois de publicado é caro.

## 5. Recuperação de senha

A tela já tem o ponto de entrada. O destino ainda não existe: hoje ela informa
que o recurso chega em breve. Depende do item 1.

**Alterar senha, ao contrário, já é real** desde a Fase 05 — mas só para quem
está dentro do aplicativo, com a senha atual na mão (`POST /api/v1/auth/senha`).
"Esqueci minha senha" é outro caminho: ali não existe sessão que autorize a
troca, e ele precisa de e-mail transacional — que o projeto ainda não tem.

## 6. Exclusão de conta — uma decisão de política, antes de código

**Falta:** decidir o que acontece com o histórico quando um parceiro pede para
sair.

A tela existe (`Configurações › Dados da conta › Excluir minha conta`), explica
a consequência e encaminha o pedido pelo WhatsApp oficial, onde uma pessoa
confirma a identidade e executa. Nada é apagado pelo aplicativo, e nada diz que
foi — apagar a sessão local e anunciar "conta excluída" deixaria a conta no
banco e o perfil no ar.

Automatizar exige responder três perguntas que **não são técnicas**:

1. O que acontece com atendimentos já encerrados? Eles envolvem também o morador
   do outro lado, e não são só do parceiro.
2. Por quanto tempo os registros precisam ficar guardados — obrigação fiscal,
   consumerista, LGPD?
3. O que é anonimização suficiente: desligar o registro do perfil público basta,
   ou o nome precisa sair também?

**Quando voltar:** decidido isso, o caminho no servidor é curto — uma rota que
reautentica, marca a conta e agenda o expurgo. A tela do aplicativo passa a
chamá-la, e o texto dela já está escrito para esse dia.

## 7. Notificações — Fase 06 · **parcialmente resolvido em 28/08/2026**

A infraestrutura existe e é real: tabela `partner_devices`, rota
`POST/GET/DELETE /api/v1/auth/dispositivos`, camada mobile inteira, deep links,
selo, preferências e o envio pelo Expo Push (`npm run push:teste`). O que
funciona hoje sem depender de você está descrito em `mobile/NOTIFICACOES.md`.

**Falta o que só você pode fazer**, e são três coisas — nenhuma delas impede o
desenvolvimento continuar, todas impedem um push chegar no seu iPhone.

### 7.1 Conta Expo e `projectId` — **bloqueia o teste real**

O serviço de push da Expo emite token para um projeto identificado. Sem isso o
aplicativo não pede token, e diz na tela que a build não está identificada — em
vez de tentar e falhar em silêncio.

```bash
npm i -g eas-cli
cd mobile
eas login          # a conta Expo é sua; não dá para criar por você
eas init           # grava extra.eas.projectId em app.json — commite essa mudança
```

Nada foi inventado no `app.json`: o campo simplesmente não existe ainda.

### 7.2 Credencial de push da Apple (APNs) — **bloqueia o teste real**

```bash
cd mobile
eas credentials    # iOS → Push Notifications → gerar a chave
```

Precisa de uma conta paga do **Apple Developer Program** com o App ID
`com.aionix.canaaresolve`. O EAS cria e guarda a chave `.p8` — ela nunca entra
no repositório.

### 7.3 Build de desenvolvimento — **bloqueia o teste real**

```bash
cd mobile
eas build --profile development --platform ios
```

O perfil já está escrito em `mobile/eas.json`. Push remoto **não funciona no
Expo Go** por decisão da plataforma, não por falta de configuração nossa: o
aplicativo detecta o ambiente e diz isso na tela de Notificações.

Android, quando for a vez: `eas credentials` cuida do FCM, e o
`google-services.json` do Firebase precisa existir. Nenhum dos dois é
necessário para o iPhone.

### 7.4 Publicar a rota na Vercel — **um passo, não um bloqueio**

A migração `0005` **já foi aplicada** no banco de trabalho, e a rota funciona
contra ele. Falta o deploy do site para que o aparelho a alcance pela internet:
enquanto ele não sair, `POST /api/v1/auth/dispositivos` responde 404 no domínio
público, e o aplicativo trata isso como falha de registro — com nova tentativa
na abertura seguinte, sem quebrar nada.

### O que **não** bloqueia

- O registro de aparelho já é real e já foi conferido de ponta a ponta contra o
  banco (`npm test`, mais um percurso de `curl` na rota).
- A preferência, a permissão, o convite, o selo e os deep links funcionam sem
  qualquer credencial.
- `EXPO_ACCESS_TOKEN` só é exigido se a conta Expo tiver *Enhanced Security*
  ligada. Sem ele, o envio funciona.

### Produção, quando chegar a hora

- Chave APNs de **produção** (a mesma `.p8` serve; muda o ambiente do token).
- `eas build --profile production` gera build com tokens de ambiente
  `production` — o registro já guarda essa distinção por aparelho.
- FCM configurado, para o Android.
- Antes de publicar, conferir o texto dos avisos contra `§10`: categoria e
  bairro, nunca a necessidade do morador.

## 8. Universal Links / App Links — preparado, não ligado

Hoje o aplicativo abre por `canaaresolve://oportunidade/:id`, e isso funciona
para push e para link interno. Um link `https://canaaresolve.aionixdev.com/...`
abrindo o aplicativo exige:

- **iOS:** o arquivo `/.well-known/apple-app-site-association` servido pelo
  domínio, com o **Team ID da Apple** — que ainda não temos. Um valor chutado
  ali não é inofensivo: ele quebra a associação de forma silenciosa. Por isso
  **nada foi criado em `public/`** (§63).
- **Android:** `/.well-known/assetlinks.json` com a impressão digital SHA-256
  do certificado de assinatura, que só existe depois da primeira build
  assinada.

Quando os dois existirem: acrescentar `associatedDomains` no `app.json`,
`autoVerify: true` no intent filter do Android, e os dois arquivos na landing —
**só os arquivos**, sem tocar no conteúdo da página.

E a regra que não muda com isso: uma URL válida não concede acesso. Conhecer o
id de uma oportunidade não é autorização; quem autoriza é o servidor, para o
usuário autenticado daquele momento.

## 9. Reputação — Fase 07 · o que depende de você

A camada de confiança está construída e conferida. Nada aqui impede o
desenvolvimento continuar; são decisões e credenciais que só você tem.

### 9.1 Push de avaliação nova — **mesmo bloqueio do §7**

O aviso existe (`avisoDeNovaAvaliacao`), tem canal próprio no Android,
interruptor próprio nas preferências e destino direto (`avaliacao/:id`). O que
falta para ele **chegar num aparelho** é exatamente o que o §7 lista: conta
Expo, chave APNs e build de desenvolvimento. Nenhuma linha nova.

### 9.2 Verificação de parceiro — **não existe processo, e a tela diz isso**

O domínio está pronto: três tipos (contato, identidade, empresa), cinco estados,
e o significado público de cada um escrito em `mobile/src/reputacao/verificacao.ts`.

O que **não** existe é o processo: ninguém recebe documento, ninguém analisa,
ninguém decide. Em produção todo parceiro tem `verificacao.itens` vazio, e o
perfil não mostra selo nenhum — que é o correto, e não uma falha.

**Quando voltar**, três perguntas antes de qualquer código:

1. **Quem confere?** Uma pessoa da operação, com um roteiro escrito. Sem isso, um
   selo "verificado" é uma afirmação que ninguém sustenta.
2. **O que basta para cada tipo?** Ligar para o número e ouvir resposta? Ver o
   documento por vídeo? Consultar o CNPJ na Receita? A descrição pública que o
   morador lê já está escrita, e ela precisa ser verdade.
3. **Onde ficam os documentos?** Se houver envio de documento pelo aplicativo,
   isso é armazenamento de dado sensível, com prazo de retenção e responsabilidade
   — e nada disso foi construído de propósito (§85). Enquanto a resposta for
   "não sabemos ainda", a verificação continua sendo feita fora do aplicativo, e o
   resultado entra pelo banco.

### 9.3 Moderação — a primeira coisa que a operação vai precisar

Uma avaliação contestada vira `em-analise` e **fica lá**. Não há painel, não há
fila e não há quem decida — por decisão: ferramenta administrativa não pertence
ao aplicativo do profissional (§129), e ela é do Operations, que mora em outro
repositório.

O efeito prático: no dia em que a primeira contestação real chegar, alguém
precisa poder olhá-la e decidir. Enquanto isso não existir, a avaliação fica fora
da média indefinidamente — o que é seguro para o parceiro e ruim para o dado.

**Quando voltar:** decidir se a moderação entra no Operations (o lugar certo) e
qual o prazo máximo que uma contestação pode ficar sem resposta.

### 9.4 Decisões de política, não de código

Registradas em `mobile/REPUTACAO.md`, seção "Decisões pendentes". As duas que
mais pesam:

- **Uma avaliação removida some, ou fica marcada como removida?** Hoje some do
  público. Se deve existir indicação é decisão jurídica, e não vale inventar uma
  agora.
- **O nome do morador pode aparecer?** Hoje é sempre "Cliente Canaã Resolve".
  Mostrar o primeiro nome depende do que a política de privacidade prometeu a
  ele — e mudar isso depois de as primeiras avaliações existirem é caro.

### O que **não** bloqueia

Tudo que é regra: média, contagem, elegibilidade, moderação, resposta,
contestação, o texto do push e o deep link. Todos conferidos por asserção
(`npm test`) e olhando o produto no navegador, claro e escuro, em 393 e 320.

---

## 10. Comercial — Fase 08 · o que depende de você

A camada comercial está construída, testada e conferida no navegador. O que
falta aqui é **credencial, decisão de política e conta de loja** — nada que
código resolva.

**A régua desta seção:** cada item diz o que falta, o que ele impede e quem
resolve. E diz explicitamente se bloqueia a **interface**, o **sandbox** ou a
**produção** — porque os três são coisas diferentes, e hoje quase nada bloqueia
a interface.

### 10.1 Apple — App Store Connect e produtos IAP · **bloqueia produção**

**O que falta:** conta Apple Developer ativa, o aplicativo criado no App Store
Connect, e os produtos de compra configurados lá.

**O que impede:** compra dentro do aplicativo no iOS. Nada mais — a área
comercial abre, mostra o estado real e permite concluir pelo canal oficial.

**Quem resolve:** você. É a mesma conta que o §7 (push) já espera, então o
mesmo dia resolve os dois.

**Quando chegar:** `lib/billing/provedor.ts` tem o adaptador `apple` escrito
como contrato e fechado. Ele passa a validar o `transactionId` contra a API da
Apple, conferindo `bundleId`, ambiente e produto. As notificações
servidor-a-servidor entram por `POST /api/v1/comercial/webhooks/apple`, que já
existe e hoje responde 503.

### 10.2 Google Play — Play Console e produtos de assinatura · **bloqueia produção**

**O que falta:** conta de desenvolvedor no Google Play, o aplicativo criado no
Play Console, os produtos configurados, e a conta de serviço com acesso à
Play Developer API.

**O que impede:** compra dentro do aplicativo no Android. Idem ao anterior.

**Quem resolve:** você.

**Atenção operacional:** o Google **estorna sozinho** uma compra que não seja
reconhecida (`acknowledge`) no prazo. Quando o adaptador for ligado, o
reconhecimento faz parte do caminho de confirmação — não é um passo opcional.

### 10.3 Billing alternativo (Pix, cartão pelo site) · **bloqueia produção, e é decisão antes de credencial**

**O que falta, e nesta ordem:**

1. **Confirmar elegibilidade.** Apple e Google mantêm programas de billing
   alternativo com condições próprias no Brasil. Antes de qualquer código:
   somos elegíveis? Precisamos nos inscrever? Há telas obrigatórias, avisos
   obrigatórios, obrigação de oferecer o billing da loja junto, relatórios
   periódicos, e qual é a taxa?
2. Só depois disso: credencial do provedor de pagamento.

**O que impede:** oferecer Pix ou checkout externo **dentro do aplicativo**.

**Por que não foi construído:** capacidade técnica não é permissão comercial.
Colocar um botão de Pix dentro de um app das lojas sem essa confirmação é
violar a política delas — e compliance é requisito de produto, não detalhe de
implementação. O adaptador `alternativo` existe fechado, com o motivo escrito.

**Quem resolve:** você, com quem cuidar do jurídico/fiscal.

### 10.4 Segredos de webhook · **bloqueia sandbox e produção**

**O que falta:** as variáveis de ambiente no servidor (Vercel):

```
CR_ADMIN_SEGREDO=…              administração comercial (obrigatória)
CR_WEBHOOK_APPLE_SEGREDO=…      quando a Apple entrar
CR_WEBHOOK_GOOGLE_SEGREDO=…     quando o Google entrar
CR_WEBHOOK_ALTERNATIVO_SEGREDO=…  quando houver provedor alternativo
```

**O que impede:** `CR_ADMIN_SEGREDO` ausente fecha a rota administrativa
(503) — mas **não** impede a operação: `npm run comercial` faz o mesmo pela
linha de comando, e quem o roda já tem a `DATABASE_URL`. Os três de webhook
ausentes fazem cada rota recusar tudo com 503.

**Isso é intencional.** Um endpoint financeiro que aceita evento não verificado
é um botão público de conceder acesso pago. Recusar por falta de credencial é
o estado correto; aceitar por falta dela seria o bug.

**Nunca em `EXPO_PUBLIC_*`.** Qualquer variável com esse prefixo vai dentro do
pacote distribuído nas lojas, e um segredo ali é um segredo publicado.

### 10.5 A data de início da operação · **bloqueia o começo do Beta de todo mundo**

**O que falta:** a decisão de quando o Canaã Resolve abre para os moradores.

**O que impede:** os 90 dias de todos os Fundadores. Enquanto a data não
existir, quem pagou fica em "vaga garantida" e **nenhum dia é consumido** — que
é exatamente o comportamento correto, e não um estado degradado.

**Quem resolve:** você, e é uma decisão de negócio.

**Como registrar, no dia:**

```
npm run comercial -- abrir 2026-10-01T03:00:00Z
```

Isso grava a data em `settings["operacao.inicio"]` e move todos os Fundadores
reservados para `ativo` na mesma escrita, com o mesmo início. É idempotente:
rodar duas vezes não empurra o fim do período de ninguém.

**Não existe data padrão, e não existe data de exemplo.** Enquanto a chave não
existir, o aplicativo diz "avisaremos quando a operação começar" — nunca uma
data provável.

### 10.6 Planos pós-Beta · **decisão comercial, não código**

**O que falta:** decidir se existe continuidade após os 90 dias, e qual.

Os valores que circularam — Profissional a partir de R$79/mês, Empresarial
R$129, Destaque R$199 — são **hipóteses a validar durante o Beta**, e por isso
não existem em lugar nenhum do código nem do banco. Não há semente, não há
constante, não há comentário para descomentar. Um valor escrito vira uma
decisão que ninguém tomou.

**O que o aplicativo faz enquanto isso:** diz a verdade — "estamos finalizando
as condições de continuidade após o Beta. Você será informado antes do
término" — e `continuidade.renovacaoAutomatica` é `false`, sempre. Nada é
cobrado sem oferta aprovada.

**Quando decidir:** o plano entra como linha em `commercial_offers`, com
`estado: 'rascunho'` até estar pronto. Nenhum deploy é necessário para mudar
preço ou disponibilidade.

### 10.7 Nota fiscal · **dependência empresarial**

**O que falta:** definição fiscal — quem emite, sob qual regime, com qual
integração.

**O que impede:** entregar documento fiscal ao parceiro. O histórico de
cobrança mostra o que foi pago, mas `comprovante` é `null` e a tela não finge
que existe recibo.

**Por que não foi construído:** gerar um PDF com cara de documento fiscal seria
produzir documento falso. Enquanto não houver definição real, a ausência
honesta é melhor.

### 10.8 Políticas de reembolso e contestação · **decisão de política**

**O que falta:** a política. Um reembolso de um Beta de 90 dias no dia 80
devolve quanto? Uma contestação suspende o acesso na hora ou depois da
análise? O status histórico de Fundador sobrevive a um estorno?

**O que existe hoje, e é o comportamento seguro na ausência de política:**
reembolso e contestação cancelam a adesão, o acesso cai, a cobrança muda de
estado (nunca é apagada), o evento fica no livro — e **o status de Fundador
não é apagado**, porque apagar história por causa de um estorno é uma decisão
que ninguém tomou.

**Quem resolve:** você.

### 10.9 Grace period · **não inventado de propósito**

Quando existir assinatura recorrente, existirá pagamento que falha. Quanto
tempo de tolerância? A arquitetura suporta o estado (`tolerancia`), e o acesso
durante ele é limitado pela data de fim do período — mas **a duração não está
definida**, e não foi chutada.

### O que **não** bloqueia

Tudo que é regra e tudo que é interface:

- a regra dos 90 dias, o cálculo do período, os fusos e a virada de horário de
  verão;
- a separação entre FounderStatus, adesão, assinatura, pagamento e entitlement;
- o catálogo configurável, o versionamento de ofertas e a validação que recusa
  promessa de resultado;
- a idempotência de eventos financeiros e a proteção contra toque duplo;
- a migração dos parceiros adquiridos por WhatsApp;
- os onze estados da área comercial, o histórico de cobrança, o aviso
  contextual da Home, o push comercial e o deep link;
- a ativação administrativa, que é o modelo comercial **real** de hoje e
  funciona de ponta a ponta.

Conferidos por asserção (`npm test`, 205 asserções) e olhando o produto no
navegador — claro e escuro, 393 e 320, os onze cenários.
