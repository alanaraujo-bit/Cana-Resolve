# Bloqueios — área de parceiros (`/parceiros`)

Itens que dependem de uma decisão, credencial ou informação do Alan. Nenhum
deles impede o funcionamento da página: a rota está completa e conversível
como está. Registrados em 26/08/2026.

---

## 1. Não existe backend para receber o lead de parceiro

**Estado atual:** o formulário monta a mensagem e abre o WhatsApp da equipe
(`wa.me/5594991205078`), exatamente como o formulário de solicitação de serviço
já faz. Nada é gravado em banco nem enviado para um CRM.

**O que falta:** decidir onde o lead deve cair (planilha, Supabase, Notion,
CRM) e fornecer as credenciais. Quando existir, a troca é pequena: substituir o
clique no link por um `POST` em uma Route Handler e manter o WhatsApp como
confirmação. `partnerLeadMessage()` em `lib/whatsapp.ts` já entrega o payload
estruturado.

---

## 2. Nenhuma ferramenta de analytics está instalada

**Estado atual:** `lib/analytics.ts` publica todos os eventos do funil em
`window.dataLayer` e em um `CustomEvent` (`cr:analytics`). Sem GTM/GA4 no site,
os eventos existem mas não são coletados em lugar nenhum.

**O que falta:** o ID do container (GTM) ou da propriedade (GA4). Basta
adicionar o script no `app/layout.tsx` — os eventos já estarão lá, sem mudar
nenhuma seção.

Eventos disponíveis: `parceiros_page_view` (com origem/UTM),
`parceiros_section_view`, `parceiros_cta_click`, `parceiros_whatsapp_click`,
`parceiros_faq_open`, `parceiros_form_start`, `parceiros_form_error`,
`parceiros_form_submit`, `parceiros_saida_sem_envio`, `consumidor_page_view`,
`consumidor_category_click`, `consumidor_request_start`,
`consumidor_request_submit` e `consumidor_whatsapp_click`.

---

## 3. Pagamento do Beta Fundador não é feito no site

**Decisão consciente, não uma pendência técnica.** A aquisição é consultiva:
a página capta o interesse e o pagamento acontece depois da análise cadastral,
no atendimento. Se um checkout for desejado depois, será preciso definir o
gateway e as credenciais.

---

## 4. Regras contratuais do programa ainda não estão definidas

O FAQ trata isso com transparência ("as regras completas ficam registradas por
escrito no momento da confirmação"), mas há três pontos que só o Alan pode
fechar:

- **Quantos parceiros por categoria** entram na fase inicial.
- **Quantos parceiros recebem a mesma solicitação.**
- **O que acontece depois dos 90 dias** — valor e formato da continuidade.

Enquanto não forem decididos, o texto não inventa número nenhum. Quando forem,
os pontos a atualizar estão todos em `lib/partners.ts` (`partnerFaq`).

---

## 5. Prova social não existe ainda

Por decisão de projeto, nenhuma logo, depoimento, número de parceiros ou
estatística aparece na página. Quando os primeiros parceiros reais existirem e
autorizarem, o lugar natural é uma seção nova entre `PartnersWho` e
`PartnersFaq` — o ritmo da página já comporta.

---

## 6. Falta a conferência final em aparelho de verdade

**Estado atual (atualizado em 26/08/2026):** a inspeção automatizada passou a
existir. Em cada rodada, um Edge headless dirigido por CDP percorre `/`,
`/parceiros`, `/solicitar`, `/entrar`, `/termos`, `/privacidade` e a rota 404
em 320, 390, 768, 1024 e 1440 px, nos dois temas, verificando overflow
horizontal e erros de console — e exercita as interações (formulários, menu,
sanfona, troca de tema, navegação). Foi assim que apareceu e foi corrigido o
estouro de largura do título de `/parceiros` no celular.

**O que falta:** o que um navegador headless não reproduz — abrir o domínio
oficial em um aparelho físico para conferir teclado virtual, área segura do
notch, a barra fixa acima da barra do navegador e a fluidez real das animações
em um celular modesto. Não impede a operação inicial; é a última validação de
apresentação antes de uma campanha de volume.

---

## 7. ~~O domínio oficial ainda não resolve publicamente~~ — resolvido

**Fechado em 26/08/2026.** `https://canaaresolve.aionixdev.com` responde 200
com HTTPS e está como alias do deploy de produção. As sete rotas foram
auditadas no ar, em cinco larguras e nos dois temas, sem overflow horizontal e
sem erros de console.

A URL crua do deploy (`canaa-resolve-*.vercel.app`) devolve 302 para o SSO da
Vercel — é a Proteção de Deploy, e não afeta o domínio público. Se um dia for
preciso compartilhar um preview com alguém de fora, é essa opção que precisa
ser afrouxada no painel do projeto.
