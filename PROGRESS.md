# Registro de progresso — Canaã Resolve

Serve para retomar o trabalho sem reconstruir o contexto. Ordem cronológica
inversa: o mais recente primeiro.

---

## 27/08/2026 — Portal do Morador e Portal do Parceiro

O HANDOFF.md desta sessão trazia um item de segurança como prioridade máxima
(§3.1): o login dos dois portais era um código curto + telefone, sem limite de
tentativas, e o telefone de um morador compartilha DDD/prefixo com o resto da
cidade — uma senha adivinhável por força bruta em minutos.

### O que mudou na autenticação

- **Morador deixou de ter login.** Não existe mais código nem formulário. Ao
  enviar uma solicitação, a resposta já traz um link assinado
  (`/acesso?t=...`) que abre `/acompanhar` autenticado — sem sessão em banco,
  sem senha para vazar ou adivinhar. A assinatura é HMAC-SHA256
  (`CR_SESSION_SECRET`), comparada com `timingSafeEqual`, com validade de dias
  configurável. A tabela `resident_sessions` foi removida (migração `0003`).
- **Parceiro manteve login por código + telefone** (é uma credencial que a
  empresa já usa para outras coisas), mas agora com limite duplo: por IP
  (`10/5min`) e por código (`5/15min`), usando o mesmo `rateLimit()` que já
  protegia `/ops/entrar`.
- **Vazamento mais sutil, achado ao revisar o rascunho anterior:**
  `partnerOpportunity()` devolvia nome e WhatsApp do morador na resposta do
  servidor mesmo antes do parceiro demonstrar interesse — a tela só escondia o
  dado, o que não é proteção nenhuma contra alguém lendo a resposta da rede.
  Corrigido na camada de dados: os campos só saem do banco quando o status da
  oportunidade já passou por `respondeu` (`opportunityContactUnlocked`, em
  `lib/domain/states.ts`, é agora a fonte única dessa regra nos dois sentidos).
- `setPartnerOpportunityStatus()` ganhou uma lista explícita do que o parceiro
  pode se autodeclarar (`partnerDrivableOpportunityStatuses`) — estados só do
  operador, como `sem_resposta`, não são alcançáveis por essa rota.

### Os dois portais foram reescritos

`app/(morador)/acompanhar/*` e `app/(partner)/parceiro/*` — shell compartilhado
em `components/portal/shell.tsx`, ícones e formulário de acesso próprios. O
diretório antigo `minhas-solicitacoes` e `components/audience/` saíram.

Um bug de UX real apareceu só ao olhar o print: a Home do parceiro dizia
"Oportunidades pausadas" para um parceiro cujo status verdadeiro era
`aguardando_lancamento` (nunca pausou nada — nunca chegou a operar). Uma
afirmação falsa para uma pessoa real. Corrigido com
`partnerAvailabilityBadge()`, que cobre os cinco estados possíveis sem
generalizar dois deles em um só rótulo.

### PWA para os dois portais

Replicado o padrão que já existia para `/ops`: manifest e ícones próprios por
área (`app/manifest.ts`, `app/parceiro-app.webmanifest/`), com
`viewportFit: "cover"` no layout raiz — sem isso, `env(safe-area-inset-*)`
não resolve e o padding de fundo em telas com notch não aparece.
`public/sw.js` cacheia só `/_next/static/` (nunca HTML, RSC ou resposta de
API, que variam por cookie).

### O que a verificação visual pegou e o teste automatizado não pegaria

`npm run inspect` — que abre cada rota de verdade num Chromium headless, em
4 larguras × 2 temas, e mede overflow real — encontrou até 403px de scroll
horizontal em `/parceiro/oportunidades` no mobile. A causa: o shell usava
`grid` incondicional; na única coluna do mobile, sem `grid-template-columns`
explícito, o `<main>` cresceu até o `max-content` da descrição mais longa de
um pedido. Corrigido tornando o `grid` condicional a partir de `lg:`. Um
resíduo de ~7px nos headers em 320px também apareceu e foi resolvido com gaps
menores abaixo do breakpoint `sm:`. Nenhum dos dois aparece em `tsc` ou em
teste unitário — só em navegador.

### Verificação feita

- `npm run typecheck`, `npm run lint`, `npm run build`: limpos.
- `npm test`: 43/43 (3 novas, exercitando diretamente a regra de
  "dado pessoal só depois de interesse").
- `npm run smoke`: 21/21 contra servidor de produção local — inclui o link de
  acesso do morador e a privacidade do portal do parceiro.
- `npm run inspect` (autenticado, Operations + Parceiro + Morador) e
  `npm run inspect -- --publico`: zero overflow, zero erro de console, zero
  resposta com falha, nas duas rodadas finais.
- Dados de demonstração usados durante a verificação foram apagados do banco
  (`npm run demo:limpar`) antes de publicar — o banco de produção não deve
  carregar parceiro, prospect ou solicitação fictícios.

### Fora do escopo desta sessão, de propósito

O HANDOFF.md já registrava (§3.5) que o ecossistema completo descrito para
esta fase do produto é maior do que "portal completo agora" — a decisão
tomada foi entregar os dois portais com a base de segurança correta, não a
visão inteira de uma vez. Ficaram fora, sem tentativa: motor de notificação
via WhatsApp/push (as notificações hoje só existem dentro do portal), marcar
notificação como lida, revogação de link por morador, métricas de tempo de
resposta do parceiro e funil do morador em `/ops/analytics`, e qualquer
automação de envio. Nada disso foi esquecido — foi adiado, e continua
registrado em `BLOCKERS.md`.

---

## 26/08/2026 — Operational Core

O Canaã Resolve deixou de ser só um site. Existe agora um sistema onde a
operação inteira acontece: `/ops`.

### Infraestrutura

- **Banco:** Postgres na Railway (projeto `canaa-resolve`). Um proxy TCP
  público foi criado para a Vercel conseguir conectar de fora. `DATABASE_URL`
  está no ambiente de produção da Vercel e no `.env.local`.
- **Driver:** `node-postgres` + Drizzle. O driver HTTP foi descartado de
  propósito: ele não suporta transações, e toda mudança de estado grava o
  registro e a linha de histórico no mesmo commit.
- Dependências novas: `drizzle-orm`, `drizzle-kit`, `pg`, `zod`, `server-only`,
  `tsx`. Nenhuma substitui algo que já existia.
- Comandos: `npm run db:setup` (migra e planta o catálogo), `db:operator`,
  `db:status`, `npm test`, `npm run inspect`.

### As três decisões que sustentam o resto

1. **Solicitação não é Oportunidade.** A necessidade do morador e cada
   encaminhamento dela para um parceiro são entidades separadas, com ciclos
   próprios. Dois parceiros podem receber o mesmo pedido e terminar em lugares
   completamente diferentes — juntar isso numa tabela de "leads" apagaria
   justamente a informação que interessa.

2. **Todo estado passa por uma máquina.** `lib/domain/states.ts` define as
   cinco máquinas e as transições permitidas; `applyTransition` é o único
   caminho para mudar qualquer estado, e grava o histórico na mesma transação.
   Um pedido não salta de "Nova" para "Resolvida" nem por bug de interface
   nem por requisição forjada.

3. **Os 90 dias do Fundador não começam no pagamento.** `betaStartedAt` só é
   escrito por `registerLaunch()`. Pagar reserva a participação; o relógio
   corre a partir do momento em que existem pedidos chegando. Há teste para
   isso.

### O lead deixou de sumir

`/solicitar` e `/parceiros` gravam antes de abrir o WhatsApp. O envio não é
aguardado: se falhar, a conversa abre do mesmo jeito e a experiência volta a
ser a de antes. Quando dá certo, a tela mostra o código do pedido.

Um cadastro cujo WhatsApp já esteja no funil se junta ao prospect existente
— a deduplicação é pelo número normalizado, o único dado que a mesma empresa
escreve igual em qualquer contexto.

### As dez telas

| Rota | O que resolve |
| --- | --- |
| `/ops` | O que precisa de decisão agora, não um painel de totais |
| `/ops/solicitacoes` | Os pedidos, com triagem, matching e desfechos |
| `/ops/comercial` | O funil B2B, com próxima ação datada |
| `/ops/cadastros` | A fila de qualificação — ninguém entra sem análise |
| `/ops/parceiros` | A rede, o perfil e a condição de Fundador |
| `/ops/oportunidades` | Cada encaminhamento e seu desfecho |
| `/ops/catalogo` | Categorias e serviços, administráveis |
| `/ops/analytics` | Só o que existe no banco |
| `/ops/config` | O lançamento da operação, acesso e sessões |
| `/ops/entrar` | Sessão em banco, senha em scrypt |

### Matching assistido, com fairness desde a fundação

`lib/domain/matching.ts` ordena por compatibilidade (serviço > categoria
principal > categoria; região) e por distribuição justa (quem recebeu menos em
30 dias sobe até 20 pontos). **Nenhum sinal comercial entra na conta** — nem
plano, nem valor pago, nem ser Fundador. Cada candidato volta com os motivos
de estar ali e as ressalvas que pesam contra; quem decide é a pessoa.

### Segurança

- Sessão: token aleatório no cookie, SHA-256 no banco. Encerrar o acesso de
  alguém é apagar uma linha.
- Senha: scrypt com parâmetros guardados no próprio hash. Login errado e
  e-mail inexistente gastam o mesmo tempo.
- `proxy.ts` é só um porteiro otimista. A conferência que vale é
  `requireOperator()`, chamada em toda página **e em toda Server Action** —
  uma action é um endpoint como qualquer outro.

### Bugs reais encontrados e corrigidos

- **Subconsulta sem qualificação de tabela.** O Drizzle interpola a coluna sem
  o nome da tabela dentro de um template `sql`; numa subconsulta o nome passa a
  resolver contra a tabela de dentro. Quebrava `/ops/parceiros` com erro 500 e,
  pior, zerava silenciosamente o contador de encaminhamentos em
  `/ops/solicitacoes`.
- **Hidratação quebrada no site inteiro.** `components/pwa.tsx` lia
  `navigator.onLine` durante a renderização; o Node moderno tem um `navigator`
  global cujo `onLine` é `undefined`, então o servidor mandava a faixa de "sem
  conexão" em toda página.
- **Tempo relativo divergindo entre servidor e navegador.** "há 34 minutos"
  virava "há 35" no meio da hidratação.
- **Tabela de desktop espremida no celular.** Trocada por lista de cartões em
  telas estreitas — a mesma informação, outro desenho.

### Bugs reais encontrados na revisão visual

- **Função atravessando a fronteira servidor/cliente.** As telas de detalhe
  passavam `campoExtra` — uma função — para o `StatusChanger`, que é um
  Client Component. Erro 500 em produção, invisível para o `tsc`. A correção
  não foi contornar: "encerrar um parceiro pede um motivo" virou regra do
  domínio, declarada em `states.ts` junto do estado. Agora vale igual em
  qualquer tela de onde a transição seja disparada.
- **Pool de conexões esgotado.** A Visão Geral disparava quinze consultas em
  paralelo contra um banco em outro país. Viraram **uma** consulta com
  `count(*) filter (where …)`.

### Verificação feita

- `tsc --noEmit`, `eslint` e `npm test`: limpos. **40 testes.**
- Os testes de fluxo rodam contra um **Postgres de verdade** (banco
  `canaa_test`, mesmo servidor) e percorrem o cenário do briefing inteiro:
  cadastro → deduplicação → aprovação → pagamento (que não inicia o prazo) →
  onboarding → lançamento → pedido → matching → encaminhamento → contratação.
- `npm run inspect`: Edge sem interface entra no Operations e percorre as dez
  rotas em 390, 768 e 1440 px, nos dois temas — **contra a build de produção**,
  não o servidor de desenvolvimento. Nenhum overflow, nenhum erro de console,
  nenhuma resposta com falha. O mesmo comando com `--publico` cobre as seis
  rotas do site em 320, 390, 768 e 1440 px: sem regressão depois da mudança
  para route groups.
- `npm run smoke`: 14 conferências pelo navegador, **rodadas contra
  produção**. Provam a coisa que pode apodrecer sem ninguém notar — os
  formulários públicos gravando de verdade, já que por contrato o WhatsApp abre
  mesmo quando a gravação falha — e o caminho completo formulário → Server
  Action → banco → revalidação → tela. Cria os próprios registros com telefones
  reservados e apaga tudo no fim, conferindo que não sobrou nada.
- `npm run demo:popular` / `demo:limpar`: cenário completo para revisar as
  telas com conteúdo de verdade, e a faxina para começar do zero.

---
## 26/08/2026 — Publicação em produção

- O novo modelo comercial foi publicado: commit `3d55b8e` enviado para o `main` no GitHub e deploy de produção concluído na Vercel.
- `canaaresolve.aionixdev.com/parceiros` responde 200 e serve a condição Beta Fundador (R$ 79 pelos primeiros 90 dias); a oferta antiga saiu do ar.
- O bloqueio de autenticação da Vercel registrado antes deixou de existir: a CLI está autenticada e `vercel --prod --yes` executa normalmente.

---

## 26/08/2026 — Novo modelo comercial de lançamento

- A oferta passou a ser **Parceiro Fundador · Beta: R$79 pelos primeiros 90 dias**. O período só começa com o início oficial da operação para moradores; a análise e a confirmação da categoria acontecem antes.
- A página `/parceiros` ganhou uma comparação clara, porém discreta, entre o Beta Fundador e a operação regular, além da seção de continuidade prevista: Profissional (a partir de R$79/mês), Empresarial (previsão de R$129/mês) e Destaque (previsão de R$199/mês).
- Cada plano é apresentado como estrutura prevista, sujeita à validação. Recursos futuros não são oferecidos como disponíveis agora; oportunidades continuam dependentes de compatibilidade para o cliente, nunca do plano contratado.
- O funil agora afirma explicitamente a entrada controlada por categoria, a inexistência de garantia de leads/clientes/faturamento, a ausência de fidelidade obrigatória após o beta e a decisão livre de continuar ou não.
- O selo de Parceiro Fundador passou a comunicar participação na primeira fase e possível permanência no perfil, com uma futura condição especial de renovação sem inventar valores ou prazos.
- Home, FAQ, formulário, WhatsApp, Termos, SEO, JSON-LD e preview de compartilhamento foram alinhados à nova condição.

### Verificação

- `npm run lint`, `npx tsc --noEmit` e `npm run build` concluídos sem erros.
- Servidor local consultado em `/`, `/parceiros`, `/parceiros/opengraph-image` e `/termos`: todas as rotas responderam 200; a página de parceiros renderizou a comparação e não contém a oferta antiga.

---

## 26/08/2026 — Camada de movimento

O site ganhou uma gramática de movimento própria. A regra que organiza tudo:
**nenhum efeito existe só para ser bonito** — cada um mostra hierarquia,
confirma um toque, indica o que chegou ou revela uma informação que já era
útil. Nada depende de JavaScript para o conteúdo aparecer e tudo desliga em
`prefers-reduced-motion`.

### Onde o vocabulário vive

Quase tudo é CSS, em `app/globals.css` (bloco "Camada de movimento", numerado
de 1 a 11). O JavaScript entra só onde o CSS não alcança, em
`components/motion.tsx` — e sempre com um listener só, `requestAnimationFrame`
e nenhum estado em React por pixel.

| Classe | O que faz |
| --- | --- |
| `.cr-enter` | Entrada escalonada no carregamento (`--cr-delay` controla o ritmo) |
| `.cr-reveal` | Revelação em scroll; aceita `anim="up\|blur\|scale\|left\|right"` |
| `.cr-draw` / `.cr-draw-load` | Traço de SVG que se desenha (em scroll / no carregamento) |
| `.cr-mark` | Marca-texto que acompanha o texto quando ele quebra em várias linhas |
| `.cr-rail` / `.cr-rail-x` | Trilho que se preenche conforme os passos entram na tela |
| `.cr-spot` | Foco de luz que segue o ponteiro dentro do cartão |
| `.cr-aura` / `.cr-aura-far` | Manchas do fundo que respondem de longe ao ponteiro |
| `.cr-lift` | Elevação discreta no hover |
| `.cr-sheen` | Brilho que atravessa o botão principal uma vez |
| `.cr-link` / `.cr-navlink` | Sublinhado que cresce (do início / do centro) |
| `.cr-nudge` | Seta que desliza quando o bloco que a contém recebe hover |
| `.cr-ping` | Anel que pulsa: algo acabou de chegar |
| `.cr-caret` / `.cr-ghost` | Cursor piscando e esmaecimento do exemplo que se escreve sozinho |
| `.cr-drift-a/b` | Deriva lenta das auroras de fundo |
| `.cr-timer` | Barra de tempo do carrossel de exemplos |
| `.cr-seal-ring` | O anel de texto do selo de Fundador girando devagar |
| `.cr-shake` (via WAAPI) | Tranco curto no primeiro campo com erro |
| `.cr-bloom` / `.cr-halo` | Confirmação de envio |
| `.cr-acc` | Sanfona de dúvidas com altura animada (`::details-content`) |
| `.cr-progress` | Filete de progresso de leitura no cabeçalho |
| `.cr-page-enter` | Troca de rota |

Componentes novos em `components/motion.tsx`: `InView`, `SpotlightArea`,
`PointerAura`, `ReadingProgress`, `CountUp`, `useReducedMotion`. E
`components/route-transition.tsx` para a troca de rota.

### As sacadas que mudam o produto, não só a aparência

- **Palpite de categoria no hero.** `guessCategory()` (em `lib/categories.ts`)
  lê o que a pessoa está escrevendo e sugere a categoria em tempo real —
  "Parece Eletricista". O palpite vai junto na URL para `/solicitar`, onde a
  categoria já chega marcada. Menos um campo para preencher.
- **Filete de conclusão nos dois formulários.** Uma linha no topo do cartão
  cresce conforme os campos obrigatórios ficam prontos. Sem contagem, sem
  gamificação: só a sensação de que falta pouco.
- **O erro some sozinho.** `limparErro()` apaga o aviso assim que o campo passa
  a estar certo, em vez de esperar um novo envio.
- **Barra de tempo na demonstração de oportunidade.** Mostra que a troca é
  automática e para de correr quando o ponteiro entra no cartão.
- **Troca de tema em círculo.** A View Transitions API abre o tema novo a
  partir do botão tocado. Onde a API não existe, a troca é instantânea.
- **Progresso de leitura.** `animation-timeline: scroll()` onde houver;
  onde não houver, um listener passivo faz o mesmo.

### Bug real corrigido no caminho

No celular, o `<h1>` de `/parceiros` estourava a largura da tela: a frase
destacada estava com `whitespace-nowrap` para caber o traço de SVG, e o item
de grid crescia junto. Trocada pelo marca-texto `.cr-mark`, que quebra em
várias linhas. Existe agora uma auditoria automatizada de overflow em todas as
rotas × 5 larguras × 2 temas para que isso não volte.

### Verificação feita

- `tsc --noEmit`, `eslint` e `next build` limpos.
- Navegador headless (Edge via CDP) percorrendo `/`, `/parceiros`,
  `/solicitar`, `/entrar`, `/termos`, `/privacidade` e 404 em 320, 390, 768,
  1024 e 1440 px, nos dois temas: **nenhum overflow horizontal e nenhum erro
  de console**.
- Interações exercitadas de verdade: palpite de categoria e a URL que ele
  gera, validação e erros dos formulários, filete de progresso chegando a
  100%, sanfona de dúvidas, menu mobile, troca de tema (incluindo a limpeza do
  `data-vt`), navegação entre rotas, barra fixa do mobile, foco de luz nos
  cartões e paralaxe do hero.
- Em `prefers-reduced-motion: reduce`, os 29 blocos de revelação da home
  aparecem todos visíveis e nenhuma animação roda.

### Honestidade do texto

Os dois formulários ainda diziam "nada é armazenado neste site", e a Política
de Privacidade prometia por escrito ser atualizada **antes** de a plataforma
passar a guardar solicitações. As duas coisas foram corrigidas no mesmo dia em
que a gravação entrou: o texto dos formulários, a seção nova "Onde os dados
ficam" e a descrição exata do que o parceiro recebe num encaminhamento.

### No ar

Publicado em produção em 26/08/2026 (`vercel --prod`, deploy
`canaa-resolve-dpyj1orr2`), com o commit também no GitHub. O domínio oficial
`https://canaaresolve.aionixdev.com` passou a responder — ver `BLOCKERS.md`
item 7, agora fechado. A mesma auditoria de largura e a mesma bateria de
interações foram repetidas **contra o site no ar**, com o mesmo resultado:
nenhum overflow, nenhum erro de console, tudo funcionando.


## 26/08/2026 — Auditoria de pré-lançamento comercial

- Revisadas as rotas públicas, textos de lançamento, funis WhatsApp, metadata,
  SEO técnico e instrumentação de conversão.
- Removidas alegações de demanda já ativa, categorias “mais procuradas” e
  atendimento obrigatoriamente residente. A linguagem agora descreve uma rede
  inicial preparada para receber e encaminhar solicitações.
- Criada imagem de compartilhamento própria para `/solicitar`; o preview de
  `/parceiros` passou a comunicar aquisição B2B sem prometer demanda existente.
- O domínio canônico padrão é `canaaresolve.aionixdev.com`, sem fallback visual
  para domínio temporário da Vercel.
- Adicionados eventos agregados do funil de moradores. Nenhum texto livre,
  nome ou telefone entra na camada de analytics.
- `/entrar` permanece acessível diretamente e sem indexação, mas foi retirado
  da navegação principal para não prometer uma conta que ainda não existe.
- Validação técnica após as mudanças: `npm run lint` e `npm run build` concluídos.

## 26/08/2026 — Área de parceiros (`/parceiros`)

Rota comercial completa, pensada para ser o link enviado por WhatsApp a
empresários e profissionais. Objetivo único: transformar interessado em
Parceiro Fundador.

### O que foi criado

| Arquivo | Papel |
| --- | --- |
| `app/parceiros/page.tsx` | A rota, com metadata própria e JSON-LD (WebPage + Service/Offer + FAQPage) |
| `app/parceiros/opengraph-image.tsx` | Preview de compartilhamento específico da página |
| `lib/partners.ts` | Todo o conteúdo comercial em um lugar só (passos, benefícios, oferta, FAQ) |
| `lib/analytics.ts` | Camada de eventos do funil (dataLayer + CustomEvent), neutra de ferramenta |
| `components/partners/*` | Hero, contraste, como funciona, benefícios, oferta, quem participa, FAQ, cadastro, selo, barra fixa |

### Decisões de produto

- **Posicionamento:** canal de oportunidades, nunca "espaço de anúncio". A
  seção `contrast.tsx` diz isso explicitamente sem atacar nenhuma plataforma.
- **Momento "eu entendi":** `opportunity-demo.tsx` mostra um pedido chegando ao
  parceiro, rotativo entre três exemplos, com rodapé dizendo que é demonstração
  do conceito — não uma captura de tela de algo que já existe.
- **Nenhum número inventado:** sem contagem regressiva, vagas restantes, leads,
  faturamento, depoimentos ou logos. O que ainda não foi decidido é dito como
  não decidido (ver `BLOCKERS.md`, item 4).
- **Selo de Fundador** (`founder-seal.tsx`): sinete de traço fino em
  `currentColor`, com as curvas de nível da marca. Nada de dourado. Já foi
  desenhado para reaparecer no perfil do parceiro depois do lançamento —
  `FounderBadge` é a versão em linha, pronta para esse uso.
- **Conversão em uma etapa:** seis campos (nome, empresa, WhatsApp, categoria,
  atende Canaã, como conheceu). O envio abre o WhatsApp com a mensagem pronta e
  a tela seguinte explica os três próximos passos, deixando claro que não há
  aprovação automática nem cobrança naquele momento.
- **CTA persistente:** barra fixa só no mobile, que aparece depois do hero e
  some quando o formulário entra na tela.

### Ligações com o resto do site

Todos os caminhos de "sou profissional" agora levam a `/parceiros`: item de
menu (`lib/site.ts`), rodapé, header mobile, `/entrar`, `/solicitar`, e as
seções `launch`, `services` e `for-pros` da landing. A rota também entrou no
`sitemap.ts`.

### Verificação feita

- `tsc --noEmit`, `eslint` e `next build` limpos.
- Página inspecionada no navegador (Edge headless via CDP) em desktop 1440 e
  mobile 390, nos dois temas, seção por seção.
- Formulário exercitado de verdade: validação com campos vazios, preenchimento,
  conteúdo da mensagem do WhatsApp, tela de sucesso e disparo dos eventos do
  funil.

### Próximos passos naturais

1. Instalar GTM/GA4 e ver o funil rodando (BLOCKERS #2).
2. Persistir o lead em algum lugar além do WhatsApp (BLOCKERS #1).
3. Fechar as regras do programa e atualizar o FAQ (BLOCKERS #4).
4. Quando houver parceiros reais, abrir a seção de prova social (BLOCKERS #5).
