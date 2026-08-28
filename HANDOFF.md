# Passagem de bastão — continuar o Portal do Parceiro e o do Morador

> **Rumo mudou em 27/08/2026.** Este arquivo é histórico. A PWA foi
> desligada; Morador e Parceiro viram app nativo em Expo / React Native, e
> este repositório fica com a landing e o backend HTTP. Onde este documento
> falar em portal web, manifest ou instalar o site, vale o que está na seção
> **Direção** do `README.md`.

Escrito em 26/08/2026, no fim da sessão que construiu o Operational Core.

Duas sessões de IA trabalharam neste repositório ao mesmo tempo. Uma terminou
o que fez; a outra parou no meio. Este documento existe para que a próxima
sessão saiba exatamente onde pisar.

---

## 1. O que está pronto e no ar

Publicado em `canaaresolve.aionixdev.com`, commitado, testado e verificado:

- **O site público** — landing, `/solicitar`, `/parceiros`, institucionais.
  Os dois formulários gravam no banco antes de abrir o WhatsApp.
- **O Operations** (`/ops`) — dez telas: Visão Geral, Comercial, Cadastros,
  Parceiros, Solicitações, Oportunidades, Catálogo, Analytics, Configurações,
  além da entrada.
- **O domínio** — `lib/domain/`, com as máquinas de estado, o matching
  assistido, a regra dos 90 dias do Fundador e a memória da operação.
- **O banco** — Postgres na Railway, alcançado pela Vercel por um proxy TCP.

Leia `README.md` para as decisões de arquitetura e `PROGRESS.md` para o
histórico. `BLOCKERS.md` tem o que depende de decisão do Alan.

**Estado atual dos dados:** o banco está zerado — só o catálogo (7 categorias,
51 serviços) e um operador. `npm run demo:popular` cria um cenário completo
para trabalhar; `npm run demo:limpar` devolve ao zero.

---

## 2. O que está pela metade

Um **Portal do Parceiro** (`/parceiro/*`) e um **Portal do Morador**
(`/acompanhar`, `/minhas-solicitacoes`), com login por código + WhatsApp.

**Nada disso está no git, e nada disso está em produção.** O domínio devolve
404 para todas essas rotas — conferido. O que existe está apenas no diretório
de trabalho da máquina do Alan.

### Inventário, arquivo por arquivo

| Arquivo | Estado | Avaliação |
| --- | --- | --- |
| `lib/domain/audience.ts` (239 linhas) | Funcional | **Bom.** Consultas corretamente escopadas por `whatsapp` / `partnerId`; um morador não alcança o pedido de outro. Tem uma tradução honesta dos estados internos para linguagem de morador (`residentStatus`) que vale manter. |
| `lib/auth/audience.ts` (119 linhas) | Funcional | **Bom no desenho, furado na proteção.** Espelha o modelo de sessão do Operations (token aleatório no cookie, SHA-256 no banco). Mas **não tem freio de tentativas** — ver §3.1. |
| `app/actions/audience.ts` (58 linhas) | Funcional | Confere o dono antes de agir. Falta validação com Zod, que é o padrão do resto. |
| `components/audience/shell.tsx` (49 linhas) | Rascunho | Casca própria, sem relação com `components/ops/` nem com o site. |
| `components/audience/access-form.tsx` (28 linhas) | Rascunho | Formulário de código + telefone. |
| `app/(partner)/parceiro/*` (6 páginas) | Rascunho | Home, entrar, oportunidades, detalhe, perfil, notificações. |
| `app/(morador)/*` (4 páginas) | Rascunho | Acompanhar, lista, detalhe, notificações. |
| `app/manifest.ts` | Funcional | PWA do site com escopo `/`. Convive com `/ops-app.webmanifest`, que tem escopo `/ops`. |
| `public/sw.js` (8 linhas) | Frágil | Service worker que faz `cache.addAll` de `/icon.svg` — se essa URL não existir, a instalação inteira falha em silêncio. Nunca foi verificado. |

### Já está commitado e funcionando

As tabelas `resident_sessions`, `partner_sessions` e `notifications` estão em
`lib/db/schema.ts`, e a criação de notificações foi colocada **dentro de
`applyTransition`** (`lib/domain/activity.ts`) — ou seja, a central de avisos
nasce das mesmas transições que movem a operação, sem nenhum app manter uma
cópia frágil dos estados. É uma boa decisão e deve ser preservada.

---

## 3. Os problemas, em ordem

### 3.1 Segurança: o login dos portais é forçável — resolver primeiro

`startResidentSession()` e `startPartnerSession()` aceitam tentativas
ilimitadas. As credenciais são um código curto e sequencial (`CR-00001`,
`PA-0001`) mais um telefone que, em Canaã, compartilha DDD e prefixo com todos
os outros. Um robô encontra combinações válidas em minutos, e o que está do
outro lado são **dados pessoais de moradores**: nome, telefone, endereço
aproximado e o problema que a pessoa tem em casa.

Já existe `lib/rate-limit.ts` no projeto, usado pelas rotas públicas e pelo
login do Operations. Aplicar ali. Considerar também um atraso progressivo por
código e um limite por telefone, já que o espaço de códigos é pequeno.

**Isto precisa estar resolvido antes de qualquer deploy desses portais.**

### 3.2 O código não segue nenhuma convenção do repositório

As páginas dos portais estão minificadas — componentes inteiros numa única
linha, sem comentários, com Tailwind embutido que não usa nem o sistema do
site nem o do Operations. O resto do repositório é o oposto: cada módulo abre
explicando a decisão que ele protege, e o motivo mora junto do código.

Isso não é preferência de estilo. Um arquivo assim não é revisável, e a
próxima pessoa (ou IA) que mexer nele vai reescrevê-lo do zero. **Reescrever
as páginas** aproveitando o backend, que é a parte boa.

### 3.3 Nunca foram verificados

Não há teste, não estão na inspeção de navegador (`scripts/inspect.mjs`) nem
no teste de fumaça (`scripts/smoke-acoes.mjs`). Ninguém sabe se o login
funciona ponta a ponta, se as telas se comportam no celular ou se o parceiro
consegue de fato responder uma oportunidade.

### 3.4 A Política de Privacidade não menciona os portais

`app/(site)/privacidade/page.tsx` foi atualizada quando o site passou a gravar
dados, e descreve corretamente o que existe hoje. Ela **não** fala de contas,
sessões nem acesso do morador aos próprios dados por login. Se os portais
entrarem, a Política precisa ser atualizada **antes** — foi esse o compromisso
assumido por escrito na própria página.

### 3.5 O briefing original pedia para não construir isso agora

A seção 36 do briefing lista explicitamente "portal completo do morador" e
"portal completo do parceiro" entre o que **não** deveria ser construído nesta
fase, e a seção 5.3 diz "prepare a fundação, não construa o produto futuro
inteiro".

O Alan decidiu continuar. Vale então decidir junto **qual recorte** entra:
um portal completo é outra promessa para sustentar, e a operação ainda é
assistida por gente. Ver §4.

---

## 4. A decisão antes do código

Perguntar ao Alan, e só então escrever:

1. **O portal do parceiro entra inteiro ou só a resposta à oportunidade?**
   O menor recorte útil é: o parceiro abre um link, vê o pedido e responde
   "consigo atender" / "não consigo agora". Isso já tira a operação do meio da
   conversa e alimenta o funil com dado real. Perfil, histórico e notificações
   podem esperar.

2. **O morador precisa de login?** Hoje ele recebe um código (`CR-00021`) e
   conversa pelo WhatsApp. Um link direto e assinado, enviado na mensagem,
   resolveria o acompanhamento sem criar conta, sem senha e sem a superfície
   de ataque do §3.1. É mais simples e mais seguro.

3. **A PWA do site (`app/manifest.ts` + `public/sw.js`) faz sentido agora?**
   Ela existe pela metade e não foi pedida.

---

## 5. Como este projeto trabalha

Ler `README.md` inteiro antes de escrever código. O essencial:

- **Comentário explica decisão, não mecânica.** Todo módulo abre dizendo qual
  regra ele protege e por quê. Se um trecho só descreve o que o código já diz,
  ele sai.
- **Nada de métrica ou estado inventado.** Se o dado não existe, a tela diz que
  não existe. Não há "visualizado" em lugar nenhum porque o WhatsApp não
  informa isso.
- **Todo estado passa por `applyTransition`.** É o único caminho, e grava o
  histórico na mesma transação.
- **Tokens antes de classes.** Cores novas entram como variáveis em
  `app/globals.css` e são expostas no `@theme inline`.
- **Dois temas de primeira classe.** O escuro não é a inversão do claro.
- **Celular não é desktop espremido.** Tabela vira lista de cartões —
  ver `Responsive` em `components/ops/ui.tsx`.

### Verificação — o que provar antes de dizer que terminou

```bash
npm run typecheck && npm run lint
npm test                 # 40 testes; fluxo completo contra Postgres real
npm run build && npm run start
npm run inspect          # navegador nas rotas do /ops, 3 larguras, 2 temas
npm run inspect -- --publico   # o mesmo para o site, a partir de 320 px
npm run smoke            # formulário → Server Action → banco → tela
```

**Sempre inspecionar contra `npm run build && npm run start`, nunca contra
`next dev`** — o CSS do Turbopack em desenvolvimento fica obsoleto e some com
variantes responsivas, o que já fez perder tempo caçando um bug inexistente.

Os portais precisam entrar em `scripts/inspect.mjs` e em
`scripts/smoke-acoes.mjs` antes de serem considerados prontos.

### Deploy

`vercel --prod --yes`. Conferir depois com `INSPECT_BASE=<domínio> npm run smoke`
— ele cria os próprios registros com telefones reservados e apaga tudo no fim,
então é seguro rodar contra produção.

---

## 6. Ordem sugerida

1. Decidir o recorte com o Alan (§4).
2. Trancar o login dos portais (§3.1) — ou eliminá-lo, se a resposta do §4.2
   for o link assinado.
3. Reescrever as telas no padrão do repositório, aproveitando
   `lib/domain/audience.ts`.
4. Atualizar a Política de Privacidade **antes** de publicar.
5. Estender `inspect.mjs` e `smoke-acoes.mjs` para cobrir os portais.
6. Commitar e publicar.

E, antes de tudo: `git status`. Se aparecer arquivo que ninguém desta conversa
escreveu, a outra sessão voltou a trabalhar — combine quem mexe em quê antes
de continuar.
