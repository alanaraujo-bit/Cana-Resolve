# Comercial — Beta Fundador, planos, pagamentos e acesso

O domínio da Fase 08. O que este documento explica é **por quê**; o que cada
arquivo faz está no cabeçalho dele.

Uma frase resume a fase inteira:

> **Pagamento não é o produto.** O produto é receber oportunidades comerciais
> relevantes de moradores de Canaã. A camada comercial existe para financiar
> essa operação — e não para virar uma máquina de upsell.

---

## 1. A regra que organiza tudo: os 90 dias

# OS 90 DIAS NÃO COMEÇAM NO PAGAMENTO.

Começam no **início oficial da operação para moradores**.

Um profissional que paga em 10 de setembro, numa operação que abre em 1º de
outubro, tem Beta de **1º de outubro a 30 de dezembro** — e não de 10 de
setembro. Nenhum dia é consumido enquanto não há morador do outro lado, porque
o que ele comprou foi a possibilidade de receber oportunidades, e ela não
existe antes disso.

Isso vive em `lib/domain/beta.ts`, no repositório do site, e tem asserção para
o cenário exato do briefing.

**Três decisões técnicas sustentam a regra:**

1. **A data oficial é uma só** — `settings["operacao.inicio"]`, e não um campo
   por parceiro. Cada parceiro calculando a partir de um evento diferente
   produziria noventa Betas diferentes, e nenhum auditável.
2. **Não existe padrão.** Sem data, a resposta é `aguardando-lancamento` e
   ninguém inventa `new Date()`. Um `?? new Date()` ali seria uma data de
   lançamento fictícia.
3. **O cálculo é em instantes**, nunca em datas locais. Somar 90 dias em
   milissegundos sobre um `timestamptz` não tem fuso, não tem horário de verão
   e não muda conforme o relógio de quem pergunta.

**A exceção, explícita:** quem paga **depois** do lançamento recebe 90 dias a
partir do próprio pagamento, e não os restos do período de quem já estava lá.
Vender "90 dias" e entregar 62 seria a mesma desonestidade que consumir o prazo
antes de abrir.

---

## 2. Quatro conceitos que não são o mesmo

A confusão entre eles é o erro mais caro desta fase, e por isso ela é
impossível de escrever: cada um tem tipo próprio em
`lib/domain/comercial/estados.ts`.

| Conceito | Pergunta que responde |
| --- | --- |
| `EstadoDaAdesao` | onde este parceiro está no processo do Beta? |
| `EstadoDaAssinatura` | existe um contrato recorrente vivo? |
| `EstadoDoPagamento` | o que aconteceu com **esta** cobrança? |
| `Entitlement` | o que esta conta pode usar **agora**? |

Eles andam juntos e divergem exatamente quando importa:

- **pagamento aprovado, operação fechada:** adesão `reservado`, assinatura
  inexistente, pagamento `aprovado`, entitlement **nenhum**;
- **assinatura cancelada:** ela ainda dá acesso, até o fim do período pago;
- **reembolso:** pagamento `reembolsado`, adesão `cancelado`, e o status
  histórico de Fundador — que é outra coisa ainda — decidido por política, não
  por efeito colateral.

### FounderStatus é histórico

Não significa plano atual, não significa assinatura ativa, não significa
prioridade no matching, não significa melhor profissional, não significa acesso
vitalício. Significa: **esta pessoa entrou na rede quando ela ainda não existia
para ninguém.**

Ele **sobrevive ao fim do Beta**. O que muda no fim é o entitlement, não a
história. E ele é derivado de uma adesão paga — não é um booleano que alguém
liga.

---

## 3. Entitlements — o que a conta pode usar agora

`lib/domain/comercial/entitlements.ts` responde a uma pergunta só:

> Este profissional pode receber oportunidades neste instante?

Três regras:

**1. É função pura, e roda no servidor.** O `agora` é o relógio do servidor,
sempre. Mudar a data do celular não estende assinatura nenhuma, porque o
aparelho não participa da conta — ele recebe o resultado e desenha.

**2. Não saber não é poder.** Quando o estado não pôde ser determinado, a
resposta é `desconhecido`, e `desconhecido` **não concede**. O caminho de
código que trata ausência de informação como permissão é o que libera acesso
sem pagamento validado.

**3. E não saber também não é bloquear o aplicativo.** Conta, histórico,
cobrança, privacidade, suporte e os dados próprios continuam acessíveis em
**qualquer** estado comercial. `SEMPRE_DISPONIVEL` existe para dizer, por
escrito, o que nenhuma regra daqui pode tirar.

Os entitlements são **dois** — participação na rede e receber oportunidades —
e a lista é curta de propósito. Ter infraestrutura não é motivo para
implementar benefício não aprovado.

### O que planos **não** fazem

- **Pagar mais não dá os melhores leads.** Não existe, e não vai existir sem
  decisão muito bem fundamentada, plano que receba oportunidade antes ou
  receba todas. Matching preserva relevância para o morador.
- **Plano não interfere na reputação.** Assinante mais caro não ganha selo.
- **Não existe cobrança por lead, comissão, carteira, saldo ou crédito.**
  Nenhum dos seis foi construído, e a ausência é a especificação.

---

## 4. O catálogo é dado, não código

Não existe, em lugar nenhum, um `if (plano === "profissional") preco = 79`.
Existe uma tabela (`commercial_offers`), e `lib/domain/comercial/catalogo.ts` é
o contrato dela.

Isso importa mais do que parece: os valores de R$79 / R$129 / R$199 para os
planos pós-Beta **são hipóteses a validar durante o Beta**, e a diferença entre
uma hipótese e uma constante é onde ela mora. Uma hipótese escrita em código
vira uma decisão que ninguém tomou, e que passa a exigir atualização de
aplicativo para ser revista.

**Por isso nenhum plano pós-Beta existe neste repositório** — nem constante,
nem semente, nem comentário para descomentar. Existe uma oferta só:

> **Parceiro Fundador — R$79 pelos primeiros 90 dias.**

### Versionamento

`codigo` identifica a oferta; `versao` identifica **esta** condição. Quando o
preço mudar, nasce a versão seguinte e a anterior fica encerrada — nunca
reescrita. Uma compra guarda o par `(codigo, versao)`, de modo que o significado
histórico do que alguém comprou continua legível depois.

### Promessa de resultado é recusada na validação

"X leads garantidos", "clientes garantidos", "retorno garantido" — `zod` recusa
a oferta inteira. Não é preciosismo: o catálogo é remoto e configurável, então
alguém vai editá-lo às pressas um dia, e a proibição precisa morar na validação
e não no bom senso de quem escreve.

---

## 5. Onde o dinheiro é validado

**O aplicativo nunca diz "paguei".** Não existe rota que ele possa chamar para
conceder acesso a si mesmo — nem "confirmei o pagamento", nem "sou fundador",
nem "ative meu Beta". Isso não é disciplina de quem escreve o cliente: **é a
ausência da rota.**

O que existe para o aplicativo é leitura:

| Rota | O quê |
| --- | --- |
| `GET /api/v1/comercial/situacao` | a situação comercial de quem está logado |
| `GET /api/v1/comercial/cobrancas` | o histórico de cobrança |

E, fora do alcance dele:

| Rota | O quê |
| --- | --- |
| `POST /api/v1/comercial/administracao` | aprovar, confirmar pagamento, abrir a operação, desfazer |
| `POST /api/v1/comercial/webhooks/[provedor]` | eventos das lojas e do gateway |

A administração é autenticada por `CR_ADMIN_SEGREDO`, que vive só no servidor —
nunca numa variável `EXPO_PUBLIC_*`, que iria dentro do pacote das lojas.

### Provedor ≠ entitlement

Apple confirma dinheiro. Google confirma dinheiro. Um gateway confirma dinheiro.
**O backend converte evento validado em estado comercial**, e essa conversão é
uma função só (`lib/comercial/adesao.ts`) — a mesma para os quatro provedores.

Hoje um provedor está ligado: `administrativo`. Não é um atalho nem um dublê —
é o modelo comercial corrente: venda por conversa, qualificação, aprovação,
pagamento, e ativação registrada pela administração. Ele valida, registra
evento, gera cobrança e deixa trilha como qualquer outro.

Os outros três estão escritos como contrato e **falham fechados**, porque um
adaptador que "por enquanto" aceita qualquer recibo é o pior tipo de bug
financeiro — o que só aparece quando alguém descobre.

---

## 6. Idempotência, auditoria e reconciliação

Três problemas que só aparecem em produção, em `lib/domain/comercial/eventos.ts`
e `lib/comercial/livro.ts`.

**1. O mesmo evento chega duas vezes.** Toda loja reentrega o que acha que não
foi confirmado. A defesa não é um `if` na rota — é uma **chave** e um índice
único no banco. Um `if` tem janela entre a consulta e a escrita; um índice
único não.

```
const { novo } = await registrarEvento(evento);
if (!novo) return;        // já processado — não faça de novo
```

A chave é `sha256(provedor:ambiente:idNoProvedor)`. O **ambiente** faz parte
dela: um evento de sandbox que caia na fila de produção concede acesso pago por
dinheiro que não existe.

O toque duplo tem chave própria, derivada do parceiro e da oferta — nunca de um
número aleatório do aparelho, que seria diferente a cada toque e não protegeria
nada.

**2. Não se sabe por que alguém está ativo.** Um estado sobrescrito não conta
história. Os eventos são acrescentados, nunca atualizados, e cada um carrega
uma frase em português dizendo o que produziu. "Por que este parceiro está
ativo?" se responde lendo `commercial_events` de cima a baixo.

**3. As três pontas discordam.** Loja diz ativo, servidor diz expirado,
aplicativo mostra cancelado. `reconciliar` devolve o **nome** do desencontro —
e não a correção, que é decisão com efeito financeiro e pertence a quem tem
contexto. O que a função garante é que o desencontro nunca fique sem nome.

**O que nunca entra em log:** cartão, CVV, nome do portador, token do provedor,
recibo cru, segredo de webhook, e-mail, telefone. `paraOLog` é uma lista
**positiva** — o que pode entrar —, porque uma lista negativa esquece o próximo
campo sensível que alguém acrescentar.

---

## 7. A migração dos parceiros de verdade

Os parceiros vendidos por WhatsApp estão em `partners.founder` e
`partners.beta_paid_at`. A migração `0006` carrega todos para
`founder_enrollments`, derivando o estado do que existe — nunca inventando:

```
beta_started_at preenchido e dentro dos 90 dias  → ativo
beta_started_at preenchido e fora dos 90 dias    → encerrado
pagou e a operação não começou                   → reservado
marcado como fundador e não pagou                → aprovado
```

`approved_at` fica nulo de propósito: essa data não existe no banco atual, e
preenchê-la com `now()` inventaria um fato.

As cobranças de `payments` viram linhas do histórico que o profissional vê no
aplicativo — não uma tela vazia dizendo que nunca houve cobrança.

**As colunas antigas continuam sendo escritas** como espelho, para que
consultas e ferramentas herdadas não fiquem cegas. A autoridade passou a ser
`founder_enrollments`; elas não decidem nada.

O SQL da migração é exercido pelos testes — o bloco é **extraído do arquivo**,
e não reescrito em TypeScript. Reescrever é como se descobre, seis meses
depois, que a migração real fazia outra coisa.

---

## 8. A área comercial no aplicativo

`app/(app)/ajustes/plano.tsx`. Fica no grupo da conta, ao lado de "Login e
segurança", e **não** é uma quarta aba.

**O que abre a tela é o estado, não o preço.** Quem entra está perguntando
"estou dentro?", "quando começa?", "quanto falta?" — e não "quanto custa?". Um
cartão de preço no topo transformaria uma tela de situação numa tela de venda.

| estado | a frase que importa |
| --- | --- |
| em análise | seu cadastro está sendo avaliado; não há nada a fazer agora |
| aprovado | esta é a condição, e é assim que se conclui |
| pagamento pendente | está processando; não é erro e não é sucesso |
| reservado | **sua vaga está garantida**, e os 90 dias ainda não começaram |
| ativo | início, fim, e quanto falta |
| terminando | falta pouco, dito sem urgência fabricada |
| encerrado | acabou, você continua Fundador, a continuidade está sendo definida |
| **desconhecido** | **não consegui conferir** — que não é "acabou" |

A última linha é a que mais importa e a mais fácil de errar. Uma tela que diz
"seu período terminou" quando a rede caiu está acusando alguém de não ter pago.

**A rota é estável, o título não.** O endereço é sempre `/ajustes/plano`, para
que um deep link gravado hoje continue valendo; o título muda com o estado —
"Minha participação" durante o Beta, "Plano" quando houver um.

### O que não existe nesta tela

**Não há botão de comprar** — não porque a tela o esconda, mas porque não existe
caminho de compra dentro do aplicativo nesta fase. A tela diz como a
contratação acontece de verdade, pelo canal oficial, em vez de mostrar um botão
que não leva a lugar nenhum.

E não há: gradiente, selo "MAIS POPULAR", cartão de preço em vidro, animação no
plano mais caro, confete, foguete, barra de progresso do período. O Liquid Glass
da fundação é para navegação e folhas; usá-lo num preço seria o "parece premium"
que a especificação recusa.

### Acessibilidade do preço

"R$79" é lido de maneiras diferentes por cada leitor de tela, e "79/90" vira
"setenta e nove barra noventa". O rótulo é escrito à mão: *setenta e nove reais
pelos primeiros 90 dias*.

E o preço na tela vem de **duas funções separadas**, nunca de um `split` sobre a
frase pronta: `Intl` separa "R$" do valor com espaço **não separável** (U+00A0),
e um `split(' ')` quebrava a linha no lugar errado. Foi encontrado olhando a
captura, não o código.

---

## 9. A Home não vira anúncio

`avisoComercialDaHome` devolve `null` em quase todos os estados — inclusive nos
bons — e essa é a intenção. **O profissional abriu o aplicativo para trabalhar
oportunidades.**

Só três situações passam, e as três têm ação ou consequência real:

1. o Beta está nos últimos sete dias;
2. há uma cobrança com problema numa assinatura;
3. o cadastro foi aprovado e a participação ainda não foi concluída.

Beta ativo com setenta dias pela frente não aparece. Vaga reservada não aparece.
Nada que o profissional já sabe e não pode mudar aparece.

---

## 10. Push comercial

Tipo novo `conta.participacao`, reusando a Fase 06 inteira. **Não é
desligável**, pela mesma razão do aviso de segurança aplicada a dinheiro: quem
pediu para não receber "comunicados" não pediu para descobrir pelo extrato que
uma cobrança falhou.

Quatro fatos merecem interromper alguém: pagamento confirmado, Beta começou,
Beta terminando, cobrança com problema. Não estão na lista, e não é
esquecimento: "sua categoria está com poucas vagas", "aproveite", "veja os
planos", "faltam 30 dias".

Três decisões no texto:

1. **Nenhuma exclamação, nenhum "CORRA".** "Seu período Beta termina em 7 dias"
   é informação; "RESTAM 2 DIAS!" é pressão.
2. **Nenhum valor em dinheiro no corpo.** O texto aparece na tela bloqueada, e
   quanto alguém paga não é assunto de quem estiver por perto.
3. **Nenhuma venda**, nem quando o Beta acaba: a frase diz que avisaremos sobre
   a continuidade, porque é o que é verdade.

O destino é `plano` → `/ajustes/plano`, e não a Home: mandar alguém para a Home
depois de dizer que há um problema de cobrança é fazê-lo procurar.

A chave do evento inclui o **dia**, não o instante: o processo que avisa sobre o
fim pode rodar mais de uma vez no mesmo dia, e duas execuções não são dois
fatos.

---

## 11. Os onze cenários

`src/comercial/exemplos.ts`, **só desenvolvimento**, atrás de duas portas
(`__DEV__` **e** cenário escolhido explicitamente). Nunca aparecem como resposta
a uma falha — um cenário servido no lugar de um erro é uma compra simulada
parecendo real.

Em análise · A aprovado · B processando · C reservado · D ativo 72 dias ·
E termina em 7 · F encerrado · G assinatura ativa · H pagamento falhou ·
I cancelada · erro.

Cada um existe porque desenha uma tela diferente. Se dois produzissem a mesma
tela, um seria enfeite.

---

## 12. O que ficou para a operação

Ver `BLOCKERS.md` §10, com o que falta, o que impede, quem resolve e se bloqueia
interface, sandbox ou produção. Em resumo: contas das lojas, segredos de
webhook, a data do lançamento, a decisão sobre planos pós-Beta, nota fiscal, e
as políticas de reembolso e de tolerância.

Nada disso bloqueia a interface, e nada disso foi inventado para preencher
vazio.
