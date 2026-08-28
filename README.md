# Canaã Resolve — o site

A landing do **Canaã Resolve**, plataforma hiperlocal que conecta quem precisa
resolver alguma coisa em **Canaã dos Carajás (PA)** a profissionais e empresas
que atendem a região.

Uma plataforma Aionix. Produção: `canaaresolve.aionixdev.com`.

## O que este repositório é — e o que deixou de ser

Este repositório é **só o site**: a landing, `/solicitar`, `/parceiros` e as
páginas legais. Aquisição, dos dois lados. Mais a captura dos leads que os dois
formulários geram.

Já foi mais. Saíram daqui, de propósito e por inteiro:

- **O Operations (`/ops`)** — funil comercial, triagem, rede de parceiros,
  encaminhamentos, analytics. Vai para um repositório próprio.
- **O Portal do Morador e o Portal do Parceiro.** Morador e parceiro passam a
  ter **app nativo**, em Expo / React Native, publicado na Play Store e na App
  Store. As telas deles não se constroem aqui.
- **A PWA.** O site não é mais instalável: competiria com o app das lojas e
  entregaria menos.

Tudo isso está no histórico do git — `git log` até `4ff3d91` mostra o
repositório completo, e qualquer arquivo volta com
`git checkout 4ff3d91 -- <caminho>`.

**O Operations continua fora daqui.** Já o aplicativo nativo nasceu em
[`mobile/`](mobile/README.md) — projeto Expo à parte, com `package.json` e
`node_modules` próprios, que não toca em nada do site.

Para o site, a régua segue a mesma: se não aparece para quem visita, ou não
serve para gravar quem preencheu um formulário, não entra em `app/`.

**Uma exceção, decidida em 28/08/2026: a API do aplicativo.** A entrada do
parceiro (`app/api/v1/auth/`) mora aqui, e não num serviço à parte como o
commit `e2d3654` previa. O motivo é prático: o deploy deste repositório já está
de pé e ligado ao Postgres, e um serviço novo custaria dias para entregar a
mesma tela de login. A régua ganhou uma linha — o que o **app** precisa do
servidor entra em `app/api/v1/`, e só isso. Telas do app continuam fora.

O que existe ali hoje, todo em `app/api/v1/auth/`:

| Rota | O quê |
| --- | --- |
| `POST /auth/sessoes` | entrar por e-mail e senha; devolve `{ token, conta }` |
| `GET /auth/sessoes` | esta credencial ainda vale? 200 com a conta, ou 401 |
| `DELETE /auth/sessoes` | sair; a sessão morre no banco, não só no aparelho |
| `POST /auth/senha` | trocar a senha: exige a atual e derruba os outros aparelhos |
| `POST /auth/dispositivos` | onde entregar um aviso deste parceiro. Idempotente |
| `GET /auth/dispositivos` | quais aparelhos recebem — sem o endereço de entrega |
| `DELETE /auth/dispositivos` | este aparelho para de receber. Chamado ao sair |

A quarta nasceu com a Fase 05, porque uma tela de "alterar senha" que não
altera senha nenhuma seria pior que tela nenhuma. A sessão vive no banco
(`partner_sessions`), e do token cru só existe uma cópia: a do aparelho que
entrou.

As três de `dispositivos` nasceram com a Fase 06, e ficaram sob `auth` por um
motivo só: o que elas precisam saber é **quem está logado**, e nada mais — não
leem oportunidade nem perfil. Esperar pela API de dados adiaria por meses a
peça que precisa existir antes de qualquer push.

A Fase 07 acrescentou um aviso — `avisoDeNovaAvaliacao`, em
`lib/push/mensagens.ts` — e nenhuma rota. Ele passa pela mesma
`conferirPrivacidade` dos outros, e **não carrega a nota nem o comentário**: o
texto de uma avaliação é o julgamento de uma pessoa sobre o trabalho de outra, e
ele pode ser lido na tela bloqueada por quem estiver por perto. Ver
`mobile/REPUTACAO.md`.

A chave é a **instalação**, não o usuário e não o token de push: um índice
único em `installation_id` é o que torna o registro idempotente, e é a mesma
escrita que reaponta o aparelho quando outra conta entra nele. Sair **revoga**,
não apaga — uma linha apagada não conta história. O token de push nunca sai
desta tabela para a interface, para log, ou para qualquer resposta: ele é
endereço de entrega, nunca identidade. Ver `mobile/NOTIFICACOES.md`.

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

npm run db:setup   # migrações + catálogo de categorias e serviços

npm run dev        # http://localhost:3000
npm test           # regras puras + a entrada, contra um Postgres de teste
npm run smoke      # o navegador preenche os dois formulários e confere o banco
npm run push:teste # manda um aviso de teste para um parceiro (ver mobile/NOTIFICACOES.md)
npm run lint
npm run typecheck
```

`npm run smoke` é a verificação que mais importa aqui — veja abaixo por quê.

## Estrutura

```
app/
  (site)/               a landing, /solicitar, /parceiros, /privacidade, /termos
  api/publico/          onde os dois formulários gravam
  api/v1/auth/          a entrada do aplicativo do parceiro
components/
  sections/             as seções da home
  partners/             as seções de /parceiros
lib/
  auth/                 senha (scrypt) e sessão do parceiro
  push/                 aparelhos, texto dos avisos e envio
  db/                   esquema, conexão e migrações
  domain/               entrada, códigos, telefone, catálogo semente
  forms.ts              o contrato dos formulários (servidor e cliente)
scripts/
  db.ts                 migrar, plantar catálogo, status
  senha-parceiro.ts     dá a primeira senha a um parceiro (não há tela ainda)
  smoke-acoes.mjs       verificação dos formulários pelo navegador
tests/                  regras puras e a entrada contra Postgres de verdade

mobile/                 o aplicativo nativo (Expo) — projeto independente
```

## Decisões que valem manter

### Produto

- **O WhatsApp nunca fica pior.** Os formulários gravam antes de abrir a
  conversa, mas não esperam a resposta. Se a gravação falhar, a experiência
  volta a ser exatamente a que era antes de existir banco: a pessoa cai no
  WhatsApp do mesmo jeito, sem ver erro nenhum.
- **É por isso que `npm run smoke` existe.** Uma captura quebrada é invisível
  — a tela não muda, a conversa abre, ninguém reclama, e os leads simplesmente
  param de aparecer. Só um teste que preenche o formulário de verdade e depois
  procura o registro no banco pega isso.
- **Nada de métrica inventada.** Se o dado não existe, a tela diz que não
  existe, em vez de mostrar zero como se fosse resultado.
- **Sem prova social inventada.** Nenhum número, avaliação, depoimento ou
  empresa fictícia em lugar nenhum.

### Técnicas

- **Deduplicação pelo WhatsApp normalizado.** É o único dado que a mesma
  empresa escreve igual em qualquer contexto. Um cadastro repetido se junta ao
  registro que já existe em vez de criar um segundo.
- **O funil só anda para a frente.** Um cadastro que chega depois da aprovação
  não pode puxar a empresa de volta para "cadastro recebido". Há teste.
- **A atividade nasce na mesma transação do registro.** Se ela não puder ser
  gravada, o registro também não é — nada existe sem explicação de como
  apareceu.
- **Dois temas nativos.** As duas paletas são escritas à mão; o escuro não é a
  inversão do claro. O tema é aplicado por um script inline antes da primeira
  pintura.
- **Tokens antes de classes.** Cores novas entram como variáveis em `:root` /
  `[data-theme="dark"]` e são expostas no `@theme inline`.

## Sobre o banco

As tabelas continuam todas de pé — inclusive as que só o Operations escrevia
(`opportunities`, `partners`, `operators`, `notifications`…). Nada foi
derrubado, porque há dados reais dentro: empresas cadastradas, pedidos
recebidos, o histórico inteiro. Uma migração de `drop table` apagaria isso
para sempre, e o Operations ainda vai querer ler tudo do repositório novo.

O que este repositório escreve é só a entrada: `service_requests`,
`partner_applications`, `prospects` e `activities`. `lib/domain/states.ts`
guarda os nomes de estado que as colunas aceitam — vocabulário herdado, que
nenhuma tela daqui movimenta.

`public/sw.js` é uma lápide: ele existe para desinstalar o service worker que
ficou nos aparelhos de quem abriu o site na época da PWA. Só pode ser apagado
depois de essa versão ter circulado.
