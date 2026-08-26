# Canaã Resolve

Landing page oficial do **Canaã Resolve** — a plataforma que conecta quem
precisa resolver alguma coisa em Canaã dos Carajás (PA) a profissionais e
empresas locais.

Uma plataforma Aionix. Domínio de produção: `canaaresolve.aionixdev.com`.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19
- Tailwind CSS v4 (tokens em `app/globals.css`, sem `tailwind.config.js`)
- TypeScript
- Sem dependências de UI ou animação: tudo é CSS + um `IntersectionObserver`

## Rodando

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # build de produção
npm run lint
```

## Estrutura

```
app/
  page.tsx              landing
  solicitar/            fluxo de solicitação de serviço
  entrar/               área de conta (ainda não construída, e a página diz isso)
  termos/ privacidade/  conteúdo institucional
  opengraph-image.tsx   card de compartilhamento (next/og)
  robots.ts sitemap.ts
components/
  sections/             seções da landing
  request-form.tsx      formulário → mensagem pronta no WhatsApp
  site-header.tsx       header + navegação mobile
  theme.tsx             controle de tema (claro / sistema / escuro)
lib/
  site.ts               nome, cidade, contato, URL
  categories.ts         categorias, exemplos de pedido, urgências
  whatsapp.ts           montagem dos links wa.me
```

## Decisões que valem manter

- **Sem prova social inventada.** Não há números, avaliações, depoimentos ou
  empresas fictícias. A seção de profissionais mostra o estágio real do
  produto e as categorias com vaga aberta.
- **Nenhum CTA morto.** Todo botão e link leva a algo que existe. A área de
  conta tem uma página honesta em vez de um login que não funciona.
- **A solicitação é real.** O formulário monta a mensagem e abre a conversa
  no WhatsApp oficial (`lib/site.ts`). Nada é gravado no site nesta versão —
  e a página diz isso ao usuário, com consentimento desmarcado por padrão.
- **Dois temas nativos.** As duas paletas são escritas à mão em
  `app/globals.css`; o escuro não é a inversão do claro. O tema é aplicado
  por um script inline no `<head>`, antes da primeira pintura.
- **Tokens antes de classes.** Cores novas entram como variáveis em
  `:root` / `[data-theme="dark"]` e são expostas no `@theme inline`.

## Próximos passos previstos

Descoberta de serviços, perfis de profissionais, área do parceiro, gestão de
leads e avaliações. A base de tokens, componentes e conteúdo foi montada para
crescer nessa direção sem refazer a identidade.
