# Reputação e confiança

O domínio da Fase 07, escrito para quem vai mexer nele depois. As decisões estão
aqui; os porquês longos estão nos arquivos, junto do código que eles governam.

A pergunta que este módulo existe para responder é:

> Por que um morador deveria confiar neste profissional?

E não:

> Como fazemos este perfil parecer popular?

Toda decisão abaixo se explica por essa diferença.

---

## A regra que o tipo protege

```ts
media: number | null
```

**Um perfil sem avaliações não tem média — ele não tem zero.** "0,0 ★" num
perfil novo diz "profissional ruim" quando o que existe é ausência de dado, e no
lançamento a maioria dos parceiros legítimos vai estar exatamente aí.

Isso é `null` no tipo e não um `if` na tela de propósito: nenhuma tela futura
consegue regredir para "0,0" por descuido, porque não há um zero para exibir. É a
mesma disciplina com que o módulo de oportunidades faz o telefone **não existir**
no objeto antes da hora, em vez de escondê-lo no render.

## Quem pode avaliar

`src/reputacao/elegibilidade.ts`. Lógica pura, sem tela e sem rede — conferida
por asserção em `tests/reputacao.test.ts`, do lado do repositório do site.

O caminho completo:

```
oportunidade → contato → serviço → encerrada como "serviço realizado"
                                          ↓
                            o morador pode ser convidado a avaliar
```

Impede, e cada um tem asserção:

| Impedimento | O que barra |
| --- | --- |
| `autoavaliacao` | o profissional avaliando a si mesmo |
| `nao-participou` | quem não é o morador daquela oportunidade |
| `ainda-nao-encerrou` | serviço que ainda está acontecendo |
| `sem-servico` | encerrada, mas sem serviço realizado |
| `ja-avaliou` | segunda avaliação da mesma relação |
| `tarde-demais` | mais de 90 dias depois do encerramento |

**Não existe avaliação pública irrestrita.** Ninguém encontra uma empresa e larga
uma estrela: a avaliação pertence a uma interação real e a quem participou dela.

**"Serviço realizado" é o único resultado que habilita.** Encerrada não quer
dizer atendida — "cliente decidindo", "não fechamos" e "não consegui atender"
descrevem oportunidades que não viraram serviço. E o profissional dizer
"realizado" **não** produz avaliação nenhuma: produz o direito de o morador ser
perguntado. Ele continua livre para dar uma estrela.

### O que ainda não está protegido

Escrito porque a honestidade sobre o que falta vale mais que um antifraude de
mentira. Nenhum destes se resolve com um `if` na interface:

- contas relacionadas (a mesma pessoa com dois cadastros);
- oportunidades fabricadas só para gerar avaliação;
- repetição massiva de um mesmo aparelho ou endereço.

Os três dependem de sinais que só o servidor tem.

## A nota

1 a 5, tipo literal (`Nota = 1|2|3|4|5`). Uma nota 0, 6 ou 4,5 não existe no
domínio; se a API mandar uma, quem recusa é a fronteira, não o componente.

Comentário é **opcional** — a estrela já é informação. Três aspectos opcionais
(atendimento, qualidade, pontualidade) existem porque distinguem reclamações que
a nota geral confunde: "resolveu mas sumiu" e "veio na hora mas não resolveu"
recebem a mesma estrela e são problemas diferentes.

## Média e contagem

**Fonte única: `resumir()`, em `src/reputacao/tipos.ts`.** Perfil, prévia, lista
e a futura área do morador leem o mesmo `ResumoDeReputacao` e nenhum deles
calcula nada. Duas contas independentes divergem no primeiro caso de borda, e
quando divergem quem perde credibilidade é a plataforma.

**E o resumo vem com a página, não é calculado sobre ela.** Essa é a diferença
entre um contrato que a API real consegue cumprir e um que ela não consegue: um
endpoint paginado devolve dez avaliações, nunca as trinta. Um resumo calculado na
interface sobre o que já foi carregado seria "a média dos dez primeiros"
apresentada como a média do parceiro — e ela mudaria conforme o dedo rolasse.

`resumir()` continua sendo a única implementação do cálculo; o que muda é **onde
ela roda**. Hoje no repositório, sobre a lista inteira que o exemplo conhece;
amanhã no servidor, sobre o que só ele consegue ver. A interface lê o campo nos
dois casos e não sabe a diferença. O mesmo vale para `naoVistas`: o ponto no
Perfil precisa saber de uma avaliação nova que está na página trinta.

Depois de uma ação — contestar muda a média, porque a avaliação sai da conta —
quem atualiza é `ajustarResumo()`, um **delta** sobre o total conhecido, e não um
`resumir()` sobre a página. Ele tem asserção que compara o delta com o recálculo
completo, que é a única prova de que os dois não divergem. Quando a API existir,
a resposta da ação traz o resumo novo e essa função sai do caminho.

- Média simples, **uma casa decimal**, vírgula. "4,87392" não é mais preciso — é
  falsamente preciso sobre vinte pessoas.
- **Nunca sem a contagem.** "4,8" sozinho pode ser vinte pessoas ou uma, e as
  duas coisas significam coisas diferentes. Não existe componente que mostre a
  média sem ela.
- Volume decide o que a UI mostra: `nenhuma`, `poucas` (< 5), `consistente`.
  Distribuição só a partir de 8; filtro por nota só a partir de 12. Cinco barras
  quase vazias sobre duas avaliações não informam nada e dramatizam a única nota
  baixa.
- A linguagem se adapta: com uma avaliação, a tela diz que uma avaliação diz
  pouco. Nunca "excelente reputação".

## Moderação

Quatro estados, e a existência deles permite dizer "não" a duas coisas ao mesmo
tempo: uma avaliação negativa **não** some porque incomodou, e uma avaliação com
o telefone de alguém dentro **não** fica no ar porque ninguém tinha onde
marcá-la.

| Estado | Conta na média | O morador vê |
| --- | --- | --- |
| `publicada` | **sim** | sim |
| `em-analise` | não | não |
| `removida` | não | não |
| `oculta` | não | não |

**Por que `em-analise` não conta.** É a escolha menos ruim: contar uma avaliação
que talvez seja fraude deixa a fraude funcionar enquanto a análise corre; não
contar tira temporariamente o peso de uma possivelmente legítima. O primeiro erro
premia quem manipula; o segundo apenas atrasa.

E como a análise só começa por uma denúncia, **a saída é visível**: a lista
mostra "em análise" com todas as letras e o resumo informa quantas estão fora da
conta. A média não muda sozinha sem ninguém entender por quê.

O painel de moderação **não existe nesta fase e não deveria** — ele não é do
aplicativo do profissional. O que existe é o vocabulário que o torna possível
depois sem migrar dado nenhum.

## Resposta do profissional

**Uma.** Por isso `resposta` é um objeto e não uma lista: a forma do dado é o que
impede a discussão pública de existir. Um array viraria thread na primeira semana
em que alguém tivesse pressa.

Pode ser editada e pode ser apagada. **Apagar a resposta não apaga a avaliação** —
o que sai é `resposta`, e nada mais. `editadaEm` guarda que houve correção sem
carimbar "editado" por cima da frase para o morador.

## Contestação

Seis motivos. Não há "discordo da nota" na lista, e a ausência é o ponto:
discordar não é motivo de remoção, é motivo de **resposta**.

**Contestar não remove.** A avaliação passa a `em-analise` e continua existindo,
visível ao profissional, com o estado escrito. Se apagasse, o profissional teria
controle direto sobre a própria reputação — bastaria contestar tudo que
incomodasse.

A folha diz isso **antes** do envio, não depois.

## O que o profissional pode e não pode

Pode: ver, responder, editar e apagar a própria resposta, contestar.

Não pode: alterar a nota, editar o comentário do cliente, excluir a avaliação.
**Isso não é uma permissão negada em tempo de execução — são operações que o
módulo inteiro não oferece.** Não há `removerAvaliacao` no repositório. Um botão
cinzento de "excluir" ensinaria que a operação existe e está bloqueada, quando a
verdade é que ela não existe.

## Privacidade

O objeto `Avaliacao` não tem telefone, e-mail, endereço, foto nem id de morador
**para vazar**. `autor` é o rótulo já pronto — "Cliente Canaã Resolve" —, montado
na origem. Uma tela não pode expor um dado que nunca chegou até ela.

Contexto do serviço é a **categoria** ("Serviço de elétrica"), nunca o relato
privado da oportunidade. Data por mês e ano; hora exata não acrescenta nada.

Na prévia pública, o cartão recebe `publico` e esconde o que é conversa interna:
o ponto de "ainda não li" e as notas de moderação. Encontrado na primeira
verificação visual — um ponto verde ao lado da nota, que o morador leria como
algum estado do profissional.

## Verificação

`src/reputacao/verificacao.ts`. Três tipos: contato, identidade, empresa. O
estado do dado mora em `perfil/tipos.ts`; o **significado público** mora aqui,
porque é aqui que ele é usado.

**Nenhum selo sem explicação.** Cada tipo carrega rótulo, descrição do que foi
conferido e o que aquilo **não** cobre. A pergunta que um morador faz ao ver um
selo não é "o que vocês conferiram?" — é "posso confiar?", e responder só a
primeira deixa a segunda ser respondida pela imaginação.

**Verificação não é garantia**, e a frase é obrigatória na folha — fora de
qualquer condicional. O Canaã Resolve confere um dado; não executa o serviço,
não fiscaliza e não responde pelo resultado. Errar isso uma vez custa mais do que
nunca ter mostrado selo nenhum.

**Três conferências viram um selo, não três.** Uma coleção de emblemas faz quem
tem dois parecer inferior a quem tem três, e transforma confiança em
gamificação. O selo diz que existe verificação; a folha diz qual.

Só `verificado` vira sinal público. `em-analise`, `rejeitada` e
`precisa-atualizacao` são conversa entre o Canaã Resolve e o parceiro — expor
"verificação recusada" num perfil seria uma punição que ninguém decidiu aplicar.

Em produção, `itens` é **vazio**: não existe processo de verificação aberto, e
ninguém tem item nenhum. O cenário G dos exemplos só roda em desenvolvimento.

## Parceiro Fundador

Status **histórico**, e nada além disso. Significa que alguém estava aqui quando
a rede começou — verdade sobre o passado, não sobre o serviço de amanhã.

Não é nota, não é prioridade no encaminhamento, não é "melhor profissional". A
folha diz isso com todas as letras, e ele nunca aparece perto da média como se
fosse parte dela.

## Notificações e deep links

Reutilizam a infraestrutura da Fase 06 inteira. Nada de segundo sistema.

- **Tipo novo:** `avaliacao.nova`, com interruptor próprio (`avaliacoes`), e não
  dentro de "atualizações": uma avaliação é o único aviso que carrega julgamento
  sobre o trabalho da pessoa, e quem quiser ler isso na hora que escolher precisa
  poder desligá-la sem desligar o que é operacional.
- **O aviso não carrega a nota nem o comentário.** "Você recebeu uma nova
  avaliação · Veja o retorno sobre um atendimento recente." O texto de uma
  avaliação é o julgamento de uma pessoa sobre o trabalho de outra, e pode ser
  lido na tela bloqueada por quem estiver por perto. E a nota também não vai,
  mesmo sendo um número: uma avaliação boa que se anuncia sozinha ensina que a
  ausência de número significa avaliação ruim.
- **Destino:** `avaliacao/:id` no push, traduzido para `/perfil/avaliacoes/:id`
  em `src/notificacoes/rotas.ts`. A estrutura interna de rotas não viaja dentro
  do push: um aviso gravado hoje pode ser tocado daqui a semanas, e no dia em que
  a tela mudar de lugar só aquela linha muda.
- **O selo da aba não é tocado.** Ele conta oportunidades esperando decisão, e
  continua contando só isso. As avaliações não lidas alimentam um ponto discreto
  no Perfil — misturar as duas transformaria um número específico em "tudo que
  aconteceu no aplicativo".

## Analytics

Nove eventos, e **o que eles não carregam é a regra**: nenhum leva comentário,
resposta, nome, telefone, id de morador, categoria ou qualquer trecho escrito por
alguém. Um evento viaja para fora, é retido por terceiros e sobrevive à conta que
o gerou — mandar o comentário de um cliente junto seria publicá-lo onde ninguém
consegue apagar depois.

Sobra a forma: um número, um estado, um motivo de lista fechada. `avaliacaoId`
liga "recebeu" a "abriu" sem carregar conteúdo; nem ele vai no evento de
denúncia, porque cruzar denúncia com avaliação específica é moderação, não
métrica de produto.

## Matching — o que esta fase deixa explícito

**A reputação é um sinal, não a regra.** Nesta fase não existe ordenação por
nota, não existe "mais bem avaliado" e não existe score. E o problema que o
matching futuro terá de resolver está escrito aqui para não ser descoberto tarde:

> Sem oportunidades, o parceiro novo não recebe avaliações.
> Sem avaliações, um matching guiado por nota não lhe dá oportunidades.

Um algoritmo que só olha a estrela fecha esse círculo e congela a rede no
conjunto de quem chegou primeiro. Quem construir o matching precisa de um
caminho deliberado para o parceiro novo e legítimo.

## O que a área do morador vai precisar implementar

O modelo já suporta; a UX não existe porque a área não existe.

1. **O convite.** `conviteDoEncerramento()` produz o fato; a área do morador
   decide como perguntar. Não há push para morador nesta fase, porque não há
   morador nesta fase.
2. **A tela de avaliar.** Estrelas, comentário opcional, enviar — poucos
   segundos. `podeAvaliar()` já responde se aquela pessoa pode.
3. **A edição.** Sete dias para corrigir, e o modelo **atualiza a mesma
   avaliação** em vez de criar outra.
4. **A leitura do perfil público.** A prévia comercial é o desenho de
   referência: se um dia existir página na web, ela nasce daquela composição.

## Decisões pendentes

Declaradas em vez de inventadas.

- **Avaliação removida: some ou fica marcada?** Hoje simplesmente sai do público.
  Se deve existir indicação de que houve remoção é decisão de política, não de
  código — e não vale inventar uma política jurídica agora.
- **Nome do morador.** Hoje "Cliente Canaã Resolve", sempre. Se o primeiro nome
  pode aparecer depende de o que a política de privacidade prometer a ele.
- **Prazos.** 90 dias para avaliar e 7 para editar são escolhas razoáveis, não
  medidas. Revisar quando houver volume.
- **Moderação de conteúdo.** Há estados; não há quem analise nem ferramenta
  interna. É a primeira coisa que a operação vai precisar quando as primeiras
  avaliações reais chegarem.
- **Taxa de resposta, tempo médio, serviços concluídos.** Podem virar sinais
  úteis. Não existem, e não se inventam: só quando houver dado real e regra
  clara. E nunca misturados à nota pública — são dimensões diferentes.

## Estrutura

```
src/reputacao/
  tipos.ts            o contrato, resumir() e ajustarResumo(): o cálculo
  elegibilidade.ts    quem pode avaliar (puro, testado)
  verificacao.ts      o significado público de cada selo
  exemplos.ts         cenários A–G — só desenvolvimento
  repositorio.ts      a única fronteira; devolve página + resumo + esquecer()
  ReputacaoProvider   a fonte única de estado
  analytics.ts        nove eventos, sem conteúdo
  componentes.tsx     estrelas, resumo, distribuição, cartão
  explicacoes.tsx     as duas folhas que explicam os selos
  acoes.tsx           responder e contestar

app/(app)/(abas)/perfil/
  avaliacoes.tsx      a lista completa
  avaliacoes/[id].tsx uma avaliação — destino do deep link

src/notificacoes/rotas.ts   comoRota, puro e testável
lib/push/mensagens.ts       avisoDeNovaAvaliacao (repositório do site)
tests/reputacao.test.ts     52 asserções
```

**Por que a tela da avaliação mora dentro da pilha do Perfil** e não numa rota de
topo como `oportunidade/[id]`: o `ReputacaoProvider` vive no `_layout` daquela
pilha, e uma tela aberta fora dele estouraria — justamente no caso mais provável,
um push tocado com o aplicativo frio.
