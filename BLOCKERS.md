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

## 7. Notificações — Fase 06

Nada está construído, de propósito. Nas Configurações existe uma linha dizendo
que ainda não há notificações, **sem interruptor**: um controle que não controla
nada é pior que a ausência dele.

Quando a Fase 06 começar, ela precisará de `expo-notifications`, das credenciais
de push (APNs e FCM) e de uma rota que guarde o token do aparelho. O lugar da
preferência já está decidido: é **da conta**, não do aparelho — quem decide
enviar é o servidor. Ver `mobile/AJUSTES.md`.
