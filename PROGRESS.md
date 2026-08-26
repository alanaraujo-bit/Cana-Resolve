# Registro de progresso — Canaã Resolve

Serve para retomar o trabalho sem reconstruir o contexto. Ordem cronológica
inversa: o mais recente primeiro.

---

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
