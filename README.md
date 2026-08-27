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
  ops-app.webmanifest/  manifest da PWA do Operations
components/
  ops/                  as peças do Operations (mais densas que as do site)
  sections/ partners/   as seções do site público
lib/
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

Portal do parceiro, contas de morador, checkout, automação de distribuição.
A arquitetura foi montada para comportar tudo isso sem refazer a fundação —
mas nada disso está prometido em nenhuma tela.

Pendências que dependem de decisão ou credencial estão em `BLOCKERS.md`.
O histórico das etapas está em `PROGRESS.md`.
