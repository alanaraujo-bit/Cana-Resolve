# `app/api/app/` — a API do app nativo

O Morador e o Parceiro deixaram de ser páginas web e passaram a ser um app em
Expo / React Native. **App nativo não chama Server Action**, então tudo que as
telas dos portais faziam por action passa a existir aqui como rota HTTP.

Três regras que valem para todo arquivo desta pasta:

1. **A rota é fina.** A regra de negócio continua em `lib/domain/audience.ts`,
   a mesma que as páginas web usam. Uma rota daqui lê a credencial, valida a
   entrada, chama o domínio e serializa. Se você está prestes a escrever um
   `if` sobre estado de oportunidade dentro de um `route.ts`, ele pertence ao
   domínio.
2. **A credencial vem do cabeçalho `Authorization: Bearer`, nunca do cookie.**
   `lib/auth/bearer.ts` faz a leitura. Aceitar cookie aqui abriria CSRF: o
   navegador manda cookie sozinho em requisição de outra origem, e cabeçalho
   não.
3. **O vocabulário de erro é o de `lib/api/respond.ts`** — `{ ok: false, erro }`
   com código estável em português. A frase que a pessoa lê é escrita pelo app,
   que é quem sabe em que tela o erro apareceu.

## Rotas

| Método | Rota | Credencial |
| --- | --- | --- |
| `GET` | `/api/app/catalogo` | pública |
| `POST` | `/api/app/parceiro/sessao` | pública (é o login) |
| `DELETE` | `/api/app/parceiro/sessao` | parceiro |
| `GET` | `/api/app/parceiro` | parceiro |
| `GET` | `/api/app/parceiro/oportunidades` | parceiro |
| `GET` `POST` | `/api/app/parceiro/oportunidades/[id]` | parceiro |
| `POST` | `/api/app/parceiro/disponibilidade` | parceiro |
| `GET` | `/api/app/parceiro/notificacoes` | parceiro |
| `POST` | `/api/app/parceiro/notificacoes/[id]` | parceiro |
| `GET` | `/api/app/morador/solicitacoes` | morador |
| `GET` `POST` | `/api/app/morador/solicitacoes/[id]` | morador |
| `GET` | `/api/app/morador/notificacoes` | morador |
| `POST` | `/api/app/morador/notificacoes/[id]` | morador |

A entrada — abrir uma solicitação e cadastrar um parceiro — continua em
`/api/publico/`, que já existia para os formulários do site e serve o app sem
mudança. `POST /api/publico/solicitacoes` devolve `token`: é a credencial do
morador, a mesma que vai dentro do link de WhatsApp, e é ela que o app guarda
no chaveiro do aparelho.

## Como o morador entra no app

Ele não faz login — nunca fez. A credencial nasce em dois lugares:

- **abriu o pedido pelo app**: `POST /api/publico/solicitacoes` devolve
  `token`, e o app guarda;
- **abriu o pedido pelo site, antes**: o link de WhatsApp é
  `…/acesso?t=<token>`. O app registra o deep link desse mesmo endereço, pega o
  `t` e guarda. É por isso que `/acesso` continua existindo.
