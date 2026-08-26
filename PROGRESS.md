# Registro de progresso — Canaã Resolve

Serve para retomar o trabalho sem reconstruir o contexto. Ordem cronológica
inversa: o mais recente primeiro.

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
