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
