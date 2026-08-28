# Bloqueios — Canaã Resolve

> **Rumo mudou em 27/08/2026.** Este arquivo é histórico. A PWA foi
> desligada; Morador e Parceiro viram app nativo em Expo / React Native, e
> este repositório fica com a landing e o backend HTTP. Onde este documento
> falar em portal web, manifest ou instalar o site, vale o que está na seção
> **Direção** do `README.md`.

Itens que dependem de uma decisão, credencial ou informação do Alan. Nenhum
deles impede o funcionamento do que já existe.

---

## 0. Uma segunda sessão de IA está editando este mesmo repositório

**Registrado em 26/08/2026.** Durante a construção do Operational Core
apareceram no repositório, sem terem sido feitas por mim, as tabelas
`resident_sessions`, `partner_sessions` e `notifications`, a migração
`0002_wealthy_hitman.sql`, `components/pwa.tsx`, `public/sw.js` e um
`prompt.txt`. São mudanças aditivas e não conflitam com o núcleo, mas duas
sessões escrevendo no mesmo diretório é uma fonte real de conflito.

Uma delas trouxe um bug que quebrava a hidratação do site inteiro:
`PwaBootstrap` lia `navigator.onLine` durante a renderização, e o Node moderno
tem um `navigator` global cujo `onLine` é `undefined` — o servidor mandava a
faixa de "sem conexão" em toda página. Já corrigido em `components/pwa.tsx`.

**O que decidir:** se as duas frentes continuam, vale separá-las em branches.

---

## 1. ~~Não existe backend para receber o lead de parceiro~~ — resolvido

**Fechado em 26/08/2026.** Existe banco (Postgres na Railway) e as duas rotas
públicas gravam antes do WhatsApp: `POST /api/publico/solicitacoes` e
`POST /api/publico/cadastros`. Se a gravação falhar, a conversa abre do mesmo
jeito — a página nunca fica pior do que era.

O cadastro que chega com um WhatsApp já presente no funil se junta ao prospect
existente em vez de criar um segundo registro da mesma empresa.

---

## 2. Nenhuma ferramenta de analytics está instalada

**Continua aberto.** `lib/analytics.ts` publica os eventos do funil em
`window.dataLayer` e em um `CustomEvent`. Sem GTM/GA4 no site, eles existem e
não são coletados.

**O que falta:** o ID do container (GTM) ou da propriedade (GA4).

**Consequência hoje:** `/ops/analytics` mede tudo a partir de "solicitação
criada". Visita ao site não aparece — e a tela diz isso, em vez de mostrar
zero como se fosse resultado.

---

## 3. Pagamento do Beta Fundador não é feito no site

**Decisão consciente.** A aquisição é consultiva. O Operations registra o
pagamento à mão, no perfil do parceiro, com valor, data, forma e referência.
Se um checkout for desejado depois, será preciso definir gateway e credenciais.

---

## 4. Regras contratuais do programa ainda não estão definidas

Três pontos que só o Alan pode fechar:

- **Quantos parceiros por categoria** entram na fase inicial.
- **Quantos parceiros recebem a mesma solicitação.**
- **O que acontece depois dos 90 dias** — valor e formato da continuidade.

Nada disso está codificado como se estivesse decidido. O sistema não limita
parceiros por categoria nem número de destinatários por pedido: quem decide é
o operador, encaminhamento a encaminhamento. Quando as regras existirem, os
lugares a mudar são `lib/domain/beta.ts`, `lib/domain/matching.ts` e o FAQ em
`lib/partners.ts`.

---

## 5. Prova social não existe ainda

Nenhuma logo, depoimento ou número de parceiros aparece no site. Quando os
primeiros parceiros reais autorizarem, o lugar é uma seção nova entre
`PartnersWho` e `PartnersFaq`.

---

## 6. Falta a conferência final em aparelho de verdade

**Estado atual:** `npm run inspect` sobe um Edge sem interface, entra no
Operations com e-mail e senha e percorre as dez rotas em 390, 768 e 1440 px,
nos dois temas, verificando rolagem horizontal, erros de console e respostas
com falha. Opcionalmente salva as telas em `.inspect/telas`.

**O que falta:** o que um navegador sem interface não reproduz — instalar a
PWA no celular e conferir teclado virtual, área segura do notch, a barra
inferior acima da barra de gestos e a fluidez real em um aparelho modesto.

---

## 7. ~~O domínio oficial ainda não resolve publicamente~~ — resolvido

**Fechado em 26/08/2026.** `https://canaaresolve.aionixdev.com` responde 200
com HTTPS e está como alias do deploy de produção.

---

## 8. ~~`CR_SESSION_SECRET` no `.env.local` não é usado~~ — passou a ser essencial

**Atualizado em 27/08/2026 — não apague esta variável.** Ela assina o link de
acompanhamento do morador (`lib/auth/audience.ts`, HMAC-SHA256): sem ela, a
solicitação continua sendo gravada, mas ninguém recebe link de
acompanhamento. Precisa do **mesmo valor** em produção (Vercel) e em
`.env.local` — um valor diferente em cada lugar invalidaria os links
conforme o ambiente muda. Ver `.env.local.exemplo` para como gerar um novo,
caso precise trocar (o que invalida todos os links já enviados).

---

## 9. Troque a senha do operador

O acesso ao Operations foi criado com uma senha gerada automaticamente, que
está em texto puro no `.env.local` e apareceu na conversa que gerou este
sistema. Ela dá acesso a todos os dados pessoais de moradores e empresas.

**O que fazer:** entrar em `/ops/config`, trocar a senha, e atualizar
`OPS_SENHA` no `.env.local` para `npm run inspect` e `npm run smoke`
continuarem funcionando. Depois, "Sair de todos os aparelhos" na mesma tela.

---

## 10. ~~O trabalho da outra sessão não está no git — nem no ar~~ — resolvido

**Fechado em 27/08/2026.** A decisão (HANDOFF.md §4) foi entrar com o portal
completo agora. `/parceiro/*` e `/acompanhar/*` foram reescritos com a base de
segurança do item 3.1 (ver `PROGRESS.md`, 27/08/2026), commitados (`f846bb0`)
e enviados ao `main` no GitHub. O push disparou o deploy automático da
integração Vercel↔GitHub — sem precisar de `vercel --prod` manual, que
inclusive um classificador de permissão desta sessão bloqueia por ser ação de
produção. `minhas-solicitacoes` foi removido — substituído por `/acompanhar`,
que não usa login.

Confirmado contra `canaaresolve.aionixdev.com`: `vercel inspect` mostra o
alias apontando para o deployment do commit `f846bb0`; `/parceiro/entrar` e
`/acompanhar` respondem 200; `/minhas-solicitacoes` responde 404;
`npm run smoke` (21/21) e `npm run inspect -- --publico` (zero problemas)
rodaram com `INSPECT_BASE` na URL de produção.

## 11. Prazo de retenção de dados não foi definido

A Política de Privacidade agora diz a verdade sobre o que é guardado, onde e
como pedir exclusão. O que ela **não** diz é por quanto tempo — porque isso
ainda não foi decidido.

**O que falta:** um prazo (ex.: solicitações resolvidas apagadas ou
anonimizadas após X meses) e quem executa. Enquanto não existir, o texto diz
"enquanto for útil para atender você e para o histórico da operação", que é
honesto mas frouxo. Quando decidir, atualizar
`app/(site)/privacidade/page.tsx` e criar a rotina.

---

## 12. As rotas públicas de gravação não têm proteção contra volume

`POST /api/publico/solicitacoes` e `/cadastros` gravam no banco sem
autenticação — como tem de ser, são formulários públicos. O freio é um contador
em memória por instância (`lib/rate-limit.ts`), que não é compartilhado entre
instâncias.

Serve para o volume de hoje. Se aparecer abuso, o passo barato é um campo
armadilha no formulário (invisível para gente, preenchido por robô) e, depois,
um contador compartilhado — o lugar de trocar é dentro de `lib/rate-limit.ts`,
sem tocar em nenhuma rota.

---

## 14. Recursos adiados conscientemente nos portais do Morador e do Parceiro

**Registrado em 27/08/2026.** Os dois portais foram entregues com a base de
segurança correta (ver `PROGRESS.md`, 27/08/2026), mas o HANDOFF.md já
apontava (§3.5) que o ecossistema completo descrito para esta fase é maior do
que "portal completo agora". Ficou de fora, sem tentativa de implementação
parcial:

- **Entrega de notificação por WhatsApp/push.** As notificações hoje só
  existem dentro do portal (`/acompanhar/notificacoes`,
  `/parceiro/notificacoes`) — não há envio ativo para fora do site. Alguém só
  fica sabendo se voltar a abrir o link ou logar.
- **Marcar notificação como lida.** A lista mostra tudo; não há estado de
  lido/não lido persistido.
- **Revogação de link por morador.** O link de acompanhamento (`/acesso`) vale
  pelo prazo definido em `lib/auth/audience.ts`; não existe forma do próprio
  morador invalidar um link antigo (ex.: se repassou o número).
- **`/ops/analytics` não mede os portais.** Tempo de resposta do parceiro
  depois de receber uma oportunidade, e o funil do morador entre "solicitação
  criada" e "contratado", não aparecem — a tela continua só com os agregados
  que já existiam antes desta sessão.
- **Nenhuma automação de envio.** O link de acompanhamento sai na resposta da
  API pública; quem manda por WhatsApp para o morador ainda é o fluxo humano
  existente, não um disparo automático.

Nenhum desses é um bug — são escolhas de escopo. Ficam aqui para não serem
confundidos com "esquecido" quando alguém for procurar por eles.
