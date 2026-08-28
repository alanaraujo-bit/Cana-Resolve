# Oportunidade — o domínio

O que a palavra significa, quais estados existem, o que cada ação faz e o que
o profissional pode ver em cada momento. O código é a fonte da verdade
(`src/oportunidades/tipos.ts`); este documento explica **por quê**.

---

## 1. O que é uma oportunidade

Uma pessoa de Canaã descreveu um problema, e esse problema chegou a quem sabe
resolver.

Do lado de quem pede, isso é um **pedido**. Do lado de quem atende, é uma
**oportunidade**. Mesmo objeto, dois pontos de vista — e este é o aplicativo do
profissional, por isso a palavra aqui é oportunidade.

Ela existe para responder três perguntas, nesta ordem:

1. **O que essa pessoa precisa?**
2. **Eu consigo atender?**
3. **O que faço agora?**

O que não ajuda a responder uma dessas três não entra na tela.

---

## 2. Estados

Cinco estados de sistema, agrupados em **três seções visíveis**. A distinção
existe porque o que o produto precisa registrar é mais fino do que o que a
pessoa precisa entender: para ela, `nova` e `vista` pedem a mesma coisa — uma
decisão.

| Estado | O que significa | Seção |
| --- | --- | --- |
| `nova` | Chegou e você ainda não abriu | Esperando você |
| `vista` | Você leu, mas ainda não decidiu | Esperando você |
| `interessado` | Você disse que consegue atender | Em andamento |
| `em-contato` | Você já falou com a pessoa | Em andamento |
| `encerrada` | Acabou, com um resultado registrado | Encerradas |

Não existe funil, etapa, pipeline nem status quase iguais. O que o profissional
precisa saber é se a bola está com ele, com a pessoa, ou se acabou.

**`indisponível` não é um estado armazenado.** É a resposta do repositório
quando a oportunidade pedida não existe mais — o detalhe a trata como tela
própria, sem erro técnico. Ver §7.

---

## 3. Ações, e o que cada uma provoca

O profissional nunca atualiza status manualmente. Ele age, e o estado
acompanha.

| Ação | Estado depois | Evento no histórico | O que mais muda |
| --- | --- | --- | --- |
| Abrir a oportunidade | `nova` → `vista` | "Você abriu" | Sai do selo da aba |
| **Consigo atender** | → `interessado` | "Você disse que consegue atender" | **Libera o contato da pessoa** |
| **Não consigo atender** | → `encerrada` | "Encerrada" | Resultado `nao-consegui-atender`, com motivo opcional |
| Falar no WhatsApp / Ligar | → `em-contato` | "Você iniciou o contato" | — |
| **Registrar como terminou** | → `encerrada` | "Encerrada" | Grava o resultado escolhido |

Abrir é a **única** transição automática, porque abrir é um comportamento que o
aplicativo realmente observa. Não há automação inventada: nada supõe que a
conversa avançou, que a pessoa respondeu ou que o serviço foi feito.

Reabrir não conta de novo — nem no estado, nem na medição.

---

## 4. Resultado

Encerrar pergunta uma coisa só: **como terminou?** Um toque.

- Serviço realizado
- Cliente ainda está decidindo
- Cliente não respondeu
- Não fechamos
- Não consegui atender *(só pela recusa)*
- Outro motivo

Sem "ganho" e "perdido": o público não precisa entender CRM. E nada de
faturamento ou valor — dado financeiro só se pedirá quando houver um propósito
claro para ele.

"Cliente não respondeu" existe de propósito: uma oportunidade que não fechou
não é, por padrão, culpa do profissional, e registrar isso separadamente é o
que permitirá medir a qualidade da operação sem acusar ninguém.

**Motivo da recusa** (opcional, uma seleção rápida): fora da área, não faço
esse serviço, sem disponibilidade, outro. Existe porque um dia melhora o
encaminhamento — não porque um formulário precisava ser preenchido.

---

## 5. Privacidade — o que aparece, e quando

| Momento | O que o profissional vê |
| --- | --- |
| Lista e detalhe, antes de decidir | Necessidade, relato completo, balcão, bairro, pressa, quando chegou |
| Depois de **Consigo atender** | O acima, mais **primeiro nome e telefone** |

Nunca, em nenhum momento desta fase: endereço exato, sobrenome, documento,
qualquer outro dado pessoal.

Isto **não é uma regra de tela**. É o repositório (`repositorio.ts`,
`comPrivacidade`) que não entrega o contato antes da hora: o campo chega `null`
à interface, para que nenhuma tela possa vazá-lo por descuido, hoje ou depois.

O detalhe de uma oportunidade ainda não decidida diz isso em voz alta: *"O
contato da pessoa aparece aqui quando você disser que consegue atender."*

---

## 6. Contato

O modelo do Canaã Resolve é **conectar**: orçamento, contratação e execução
acontecem diretamente entre profissional e cliente.

- Canal principal: **WhatsApp**, por `https://wa.me/<telefone>?text=<mensagem>`
  — que abre o aplicativo quando ele existe e cai no navegador quando não,
  sem precisar de `canOpenURL` nem de esquema declarado.
- Alternativa: **ligar**, por `tel:`.
- A mensagem inicial vem **preenchida, nunca enviada**. Uma frase curta que dá
  contexto; o profissional escreve o resto como profissional, não como robô.
- Nada abre sozinho. Toda saída do aplicativo exige um toque.

Não há chat interno nesta fase, e não há pagamento, carteira, comissão,
proposta, orçamento nem contrato — o modelo atual não exige nenhum deles.

---

## 7. Erros e ausências

| Situação | O que a pessoa vê |
| --- | --- |
| A lista não carregou | "Não foi possível carregar suas oportunidades agora." + Tentar de novo |
| A lista falhou **ao atualizar** | O conteúdo anterior continua; a falha não apaga a tela |
| A oportunidade não existe mais | "Esta oportunidade não está mais disponível." + volta para a Central |
| Uma decisão não foi registrada | Aviso discreto abaixo do conteúdo, com convite a tentar de novo |

Nunca aparece 404, 500, exceção, stack trace ou JSON. O detalhe técnico existe
só sob `__DEV__`, em uma linha separada e identificada como desenvolvimento.

**Conectividade:** o aplicativo não monta infraestrutura offline. Ele reage ao
que acontece — uma ação que falha diz que falhou e oferece nova tentativa, e o
conteúdo já visível não é destruído. Nada é marcado como concluído sem
confirmação.

---

## 8. Filtros e busca

Existe **um** filtro: o balcão (categoria). Ele aparece só quando a seção à
vista tem mais de um.

Ficaram de fora, com motivo:

- **Estado** — já é a divisão principal da tela.
- **Urgência** — a ordenação já traz o que espera resposta primeiro, e a pressa
  está escrita em cada cartão.
- **Período** — só fará diferença num histórico grande; entra junto com a
  paginação.
- **Busca** — mesma regra. A leitura já nasce paginada (`Pagina`); a busca entra
  quando rolar deixar de bastar, e não antes.

---

## 9. Decisões pendentes

Coisas que precisam de regra de negócio antes de virar código:

1. **Expiração.** Uma oportunidade pode deixar de fazer sentido com o tempo. O
   modelo já sabe representar "não está mais disponível", mas **nenhum prazo
   foi inventado**: não há contagem regressiva, não há "restam 2 minutos" e não
   há expiração automática. Quando houver uma regra real, ela poderá ser
   comunicada honestamente.
2. **Exclusividade.** A interface não afirma que a oportunidade é só sua, nem
   mostra concorrência, número de interessados, ranking ou disputa. Isso
   depende de uma decisão de produto que ainda não existe.
3. **Atualização do conteúdo.** O modelo carrega `atualizadaEm`, mas não há
   backend que informe mudanças; nada é anunciado como "atualizado" enquanto
   isso não existir.

---

## 10. O que dependerá de backend

Toda a leitura e toda a escrita passam por `src/oportunidades/repositorio.ts`.
É o único arquivo que muda quando a API existir. O contrato esperado:

```
GET  {base}/oportunidades                 → lista + cursor de paginação
GET  {base}/oportunidades/{id}            → uma, com contato só se liberado
POST {base}/oportunidades/{id}/vista      → marca como vista
POST {base}/oportunidades/{id}/interesse  → libera o contato na resposta
POST {base}/oportunidades/{id}/recusa     → { motivo? }
POST {base}/oportunidades/{id}/contato    → { canal: whatsapp | telefone }
POST {base}/oportunidades/{id}/encerrar   → { resultado }
```

Duas garantias que **o servidor** precisa manter, e não a interface:

- o contato só vai na resposta depois do interesse registrado;
- as transições são idempotentes (abrir duas vezes não gera dois eventos).

Sem `EXPO_PUBLIC_AUTH_API_URL`, em desenvolvimento a interface é alimentada por
exemplos declarados (`exemplos.ts`), isolados e identificados na tela por um
seletor que só existe sob `__DEV__`. Em produção, sem API, nada conclui e a
falha é dita — a mesma regra da autenticação na Fase 01.

---

## 11. Analytics — eventos esperados

Declarados em `src/oportunidades/analytics.ts`. Não há destino conectado; em
desenvolvimento eles são impressos, em produção descartados. Nenhum número é
inventado.

| Evento | Quando |
| --- | --- |
| `oportunidade_vista` | Primeira abertura, uma vez por oportunidade |
| `interesse_demonstrado` | Tocou em "Consigo atender" |
| `contato_iniciado` | Abriu o WhatsApp ou o discador, com canal |
| `nao_consigo_atender` | Recusou, com motivo quando houver |
| `oportunidade_encerrada` | Informou como terminou |
| `oportunidade_aberta_por_link` | Chegou ao detalhe sem passar pela lista |

**Recebimento não é emitido daqui** — é acontecimento do servidor. E abrir a
mesma oportunidade cinco vezes não são cinco visualizações: a deduplicação é
parte do contrato, não um detalhe de implementação.

---

## 12. Deep link

`canaaresolve://oportunidade/{id}` abre direto o detalhe. A tela não depende de
a lista ter sido visitada: quando a carteira não tem o id, ela busca a
oportunidade sozinha.

Se o aplicativo estiver fechado e a pessoa precisar entrar, o porteiro guarda o
destino e a leva até ele depois de autenticar — o link não se perde no caminho.

Push Notifications são uma fase própria e **não** foram implementadas. O que
está pronto é o lugar para onde elas vão apontar.
