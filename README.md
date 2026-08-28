# Canaã Resolve

Plataforma hiperlocal que conecta quem precisa resolver alguma coisa em
**Canaã dos Carajás (PA)** a profissionais e empresas que atendem a região.

Uma plataforma Aionix. Produção: `canaaresolve.aionixdev.com`.

O produto tem duas metades:

- **O site** — a landing, `/solicitar` e `/parceiros`. Aquisição, do lado do
  morador e do lado da empresa.
- **O Operations** (`/ops`) — o sistema onde a operação acontece: funil
  comercial, qualificação, rede de parceiros, solicitações, encaminhamentos e
  os números que importam.

## Direção — decidida em 27/08/2026

Antes de mexer em qualquer coisa aqui, leia esta seção. Ela contradiz partes
do histórico em `PROGRESS.md` de propósito.

- **A PWA acabou.** Morador e Parceiro passam a ter **app nativo**, em
  **Expo / React Native**, publicado na Play Store e na App Store. Um único
  codebase em TypeScript, para reaproveitar os contratos de `lib/domain/` e o
  Zod de `lib/forms.ts`. Não existe mais manifest do site nem do Parceiro, e
  `public/sw.js` virou um service worker que só se desinstala.
- **Este repositório é a landing + o backend.** A landing (`/`,
  `/solicitar`, `/parceiros` e as páginas legais) é o que continua sendo
  desenvolvido na web. `lib/domain/`, `lib/db/` e `lib/auth/` ficam, porque
  o app nativo vai consumi-los — por HTTP, em `app/api/`. **App nativo não
  chama Server Action**; toda funcionalidade nova que o app precisa nasce como
  rota HTTP.
- **As páginas dos portais (`app/(morador)/`, `app/(partner)/`) estão
  congeladas.** Continuam no ar só porque links assinados já foram entregues
  por WhatsApp. Nada novo entra nelas; elas saem quando o app estiver nas
  lojas.
- **O `/ops` sai daqui para um repositório próprio.** Até lá continua
  funcionando e não deve quebrar, mas também é código congelado: nada novo é
  construído nele neste repositório.
- **O `/ops` perdeu o service worker junto com a PWA** — o registrador vivia
  no layout raiz e valia para o site inteiro. Foi de propósito: cache de
  estático não é peça essencial de uma ferramenta interna de desktop, e o
  `ops-app.webmanifest` continua bastando para instalá-la.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19
- Tailwind CSS v4 — tokens em `app/globals.css`, sem `tailwind.config.js`
- Postgres (Railway) + Drizzle ORM, via `node-postgres`
- Zod para validação de entrada
- Sem biblioteca de UI e sem biblioteca de animação: tudo é CSS

## Rodando

```bash
npm install
cp .env.local.exemplo .env.local   # e preencha DATABASE_URL

npm run db:setup                   # migrações + catálogo inicial
npm run db:operator -- voce@email.com "Seu Nome"   # cria o acesso ao /ops

npm run dev        # http://localhost:3000
npm test           # 40 testes; os de fluxo usam um banco de teste real
npm run inspect    # navegador sem interface percorre o /ops e reporta problemas
npm run lint
npm run typecheck
```

`npm run inspect` precisa de `OPS_EMAIL` e `OPS_SENHA` no ambiente ou no
`.env.local`. Com `--shot`, salva as telas em `.inspect/telas/`.

## Estrutura

```
app/
  (site)/               tudo que é público: landing, /solicitar, /parceiros…
  ops/(painel)/         o Operations, atrás de autenticação
  ops/entrar/           a entrada — fora do grupo protegido, de propósito
  api/publico/          onde os formulários públicos gravam
  api/app/              a API do app nativo (Bearer, nunca cookie) — ver o
                        README da própria pasta
  ops-app.webmanifest/  manifest do Operations (a única PWA que sobrou)
components/
  ops/                  as peças do Operations (mais densas que as do site)
  sections/ partners/   as seções do site público
lib/
  api/                  o formato de resposta da API do app
  auth/                 sessão do operador, credencial de morador e parceiro,
                        e a leitura do Bearer
  db/                   esquema, conexão e migrações
  domain/               as regras: estados, Beta, matching, entrada, analytics
  forms.ts              o contrato dos formulários públicos (servidor e cliente)
scripts/
  db.ts                 migrar, plantar catálogo, criar operador
  inspect.mjs           inspeção automatizada no navegador
tests/                  domínio (puro) e fluxo (contra Postgres de verdade)
```

## Decisões que valem manter

### Produto

- **Solicitação não é Oportunidade.** A necessidade do morador e cada
  encaminhamento dela para um parceiro são entidades separadas. Dois parceiros
  podem receber o mesmo pedido e terminar em lugares diferentes; juntar isso
  numa tabela de "leads" apagaria a informação que interessa.
- **Os 90 dias do Parceiro Fundador não começam no pagamento.** Pagar reserva a
  participação. O relógio corre a partir do lançamento da operação, quando
  passam a existir pedidos chegando. Só `registerLaunch()` escreve
  `betaStartedAt`, e há teste garantindo isso.
- **Quem paga mais não recebe os melhores pedidos.** O matching ordena por
  compatibilidade com o problema e por distribuição justa. Nenhum sinal
  comercial entra na conta.
- **Nada de métrica inventada.** Se o dado não existe — visita ao site,
  mensagem entregue, tempo de resposta do parceiro — a tela diz que não existe,
  em vez de mostrar zero como se fosse resultado.
- **Sem prova social inventada.** Nenhum número, avaliação, depoimento ou
  empresa fictícia em lugar nenhum.

### Técnicas

- **Todo estado passa por `applyTransition`.** A transição é conferida contra a
  máquina de estados e grava o histórico na mesma transação. Se a atividade não
  puder ser gravada, o estado também não muda.
- **O porteiro da borda não é a autorização.** `proxy.ts` só olha se existe um
  cookie. `requireOperator()` é chamada em toda página **e em toda Server
  Action** — uma action é um endpoint como qualquer outro.
- **O WhatsApp nunca fica pior.** Os formulários públicos gravam antes de abrir
  a conversa, mas não esperam a resposta. Se a gravação falhar, a experiência
  volta a ser exatamente a que era.
- **Deduplicação pelo WhatsApp normalizado.** É o único dado que a mesma
  empresa escreve igual em qualquer contexto.
- **Dois temas nativos.** As duas paletas são escritas à mão; o escuro não é a
  inversão do claro. O tema é aplicado por um script inline antes da primeira
  pintura.
- **Tokens antes de classes.** Cores novas entram como variáveis em `:root` /
  `[data-theme="dark"]` e são expostas no `@theme inline`.
- **Nada é apagado.** Desativar tira do seletor; o histórico continua
  explicando os registros antigos.

## O que ainda não existe

A API HTTP que o app nativo vai consumir, o próprio app em Expo, checkout e
automação de distribuição. A arquitetura foi montada para comportar tudo isso
sem refazer a fundação — mas nada disso está prometido em nenhuma tela.

Pendências que dependem de decisão ou credencial estão em `BLOCKERS.md`.
O histórico das etapas está em `PROGRESS.md`.
