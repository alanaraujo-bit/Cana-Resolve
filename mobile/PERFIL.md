# Perfil profissional — o domínio

O que o perfil representa, o que cada informação faz ali, o que aparece para
quem, e o que ainda depende de servidor. O código é a fonte da verdade
(`src/perfil/`); este documento explica **por quê**.

---

## 1. Para que ele existe

O perfil não existe para o parceiro ter uma página bonita. Ele existe porque
três coisas dependem dele:

| Pergunta | Quem responde |
| --- | --- |
| Para quem o Canaã Resolve encaminha esta oportunidade? | categoria, serviços, área de atendimento |
| O morador confia no que lê? | nome, foto, descrição, portfólio, verificação |
| Ele decide chamar? | tudo acima, e o contato no momento certo |

Todo campo pedido responde pelo menos uma delas. O que não respondia nenhuma
não foi pedido — e é por isso que não há CPF, CNPJ, endereço, data de
nascimento, tempo de experiência em anos nem "sobre mim".

## 2. A entidade

`Perfil`, em `src/perfil/tipos.ts`. O contrato da interface: os exemplos e, um
dia, a API se adaptam a ele — nunca o contrário.

| Campo | O que é |
| --- | --- |
| `tipo` | `profissional` ou `empresa`. Só muda apresentação. |
| `nome` | O nome público — da pessoa ou do negócio. |
| `responsavel` | Quem responde pela empresa. **Interno.** `null` em pessoa. |
| `imagem` | Foto ou logo. `null` é caso normal, não falha. |
| `categoriaId` | Um id do catálogo. Nunca texto solto. |
| `oficio` | O ofício em uma linha, embaixo do nome. |
| `descricao` | Texto livre, teto de 400. |
| `servicos` | O que ele faz. Sugestões da categoria + escritos à mão. |
| `atendimento` | Cidade inteira, ou bairros. |
| `contatos` | WhatsApp, telefone, e-mail comercial, Instagram, site. |
| `disponibilidade` | Horário comercial. **Não** é disponibilidade de agora. |
| `portfolio` | Até 8 fotos, com legenda opcional. |
| `verificacao` | Estado da confiança. Só estrutura nesta fase. |
| `parceiroFundador` | Concedido pelo Canaã Resolve, nunca ligado na tela. |

### Categoria ≠ serviço

A categoria é o balcão (`Informática`); o serviço é o que se faz nele
(`formatação`, `instalação de rede`). A categoria faz a oportunidade chegar; o
serviço faz ela chegar **certa**. São campos diferentes de propósito.

### Horário ≠ disponibilidade

`disponibilidade` guarda o horário normal de trabalho, que o morador lê antes
de ligar. Pausar o recebimento de oportunidades é outro conceito, mora em outro
lugar e não se resolve nesta tela. Juntar os dois faz alguém achar que saiu do
ar por ter fechado no domingo.

## 3. Completude — sem gamificação

`completude.ts` lista o que falta. Não há medalha, nível nem "100% completo".
Cada item carrega `porque`: a **consequência** concreta de faltar. Se não der
para escrever a consequência em uma linha honesta, o item não deveria existir.

- **Essencial** — sem isso o perfil não funciona: nome, categoria, serviços,
  área, contato.
- **O resto** — descrição, foto, portfólio, horário: melhora a decisão do
  morador, mas não impede de receber.

A tela mostra a frase da consequência e um traço discreto. Nunca uma nota.

## 4. Privacidade — o que aparece, e quando

| Informação | Perfil público (prévia) | Observação |
| --- | --- | --- |
| Nome público, ofício, categoria | sim | |
| Foto/logo, descrição, serviços | sim | |
| Região, horário, portfólio | sim | |
| Instagram, site | sim | comerciais por natureza |
| **Telefone / WhatsApp** | **não** | entregue quando o parceiro assume uma oportunidade |
| **Responsável pela empresa** | **não** | interno |
| **E-mail da conta** | **não** | é login, não vitrine |
| E-mail comercial | só se preenchido | campo separado do da conta |

O número não é segredo — é entregue no momento certo, pelo módulo de
oportunidades, e não fica exposto num perfil.

Trocar o tipo de empresa para pessoa **apaga** `responsavel`: guardar dado que a
tela não mostra mais é como ele vaza depois.

## 5. Salvar

Salvar é sempre explícito. Nada grava enquanto se digita, e o botão só acende
quando há o que salvar. Sair com alteração pendente pergunta uma vez — é a
única confirmação do módulo, e existe porque evita perder trabalho de verdade.
Falha ao salvar não apaga o que foi digitado.

## 6. Texto livre e promessas

A descrição é o único campo de texto livre, e por isso o mais cuidado:

- serviço escrito à mão é normalizado (`FAÇO DE TUDO!!!!` → `Faço de tudo`),
  limitado a 40 caracteres e conferido contra duplicata com acento;
- promessas impossíveis de comprovar ("o melhor da cidade", "100% garantido")
  geram um **aviso discreto**, nunca um bloqueio. O perfil é do parceiro.

## 7. Navegação

```
aba Perfil
└── /perfil                 capa: como apareço, o que falta, onde mexo
    ├── /perfil/identidade   tipo, foto, nome, categoria, ofício, descrição
    ├── /perfil/servicos     o que faz
    ├── /perfil/atendimento  cidade inteira ou bairros
    ├── /perfil/contato      WhatsApp, telefone, e-mail, redes
    ├── /perfil/horario      dias e janela, ou 24 horas
    ├── /perfil/portfolio    fotos e legendas
    └── /perfil/previa       como o morador vê
```

Cada seção é rota de verdade, com endereço e voltar previsível — não um modal
anônimo. A pilha vive **dentro** da aba, então a barra principal fica no lugar
e toda seção volta para a capa.

O `PerfilProvider` fica acima da pilha: capa, edição e prévia leem o mesmo
objeto, e o que uma salva a outra já enxerga. Não há duas cópias do perfil.

## 8. A prévia

`Ver como meu perfil aparece` lê **o mesmo objeto** que a edição escreve — sem
cópia e sem dado de exemplo. Uma prévia que mente é pior do que não ter prévia.

Ela é também o desenho de referência do perfil público: se um dia existir página
na web, ela nasce desta composição.

## 9. O que ainda não existe — e não foi fingido

| O quê | Estado | Onde se conecta |
| --- | --- | --- |
| **Leitura/escrita do perfil pela API** | não existe | `repositorio.ts` — hoje exemplos em `__DEV__`; em produção, falha declarada |
| **Upload de imagem** | não existe | `imagem.enviar()` lança de propósito. Toda imagem é `origem: 'local'` |
| **Verificação de parceiro** | só estrutura | não há envio de documento nem quem analise; a tela diz isso |
| **Analytics** | só contrato | `analytics.ts` imprime em `__DEV__`, descarta em produção |
| **Lista oficial de bairros** | provisória | `catalogo.ts` — precisa ser conferida com a prefeitura |
| **Edição de horário por dia** | só no modelo | `porDia` é lido e exibido; a UI não monta escala |

Escolher, recortar e comprimir imagem **funciona de verdade** no aparelho. O que
não existe é para onde mandar depois — e nenhuma tela diz "enviado".

Enquanto não há API, o que se edita fica gravado no aparelho
(`AsyncStorage`, chave `cr.perfil.rascunho.v1`) para que testar não signifique
preencher tudo de novo. É rascunho local declarado, não sincronização — e a
capa avisa isso com todas as letras.

## 10. Decisões pendentes

- **Bairros**: confirmar a lista oficial de Canaã dos Carajás.
- **Verificação**: definir o que se envia, quem analisa e o que o selo promete
  ao morador. Sem isso definido, o selo não deve ser prometido a ninguém.
- **Limite de fotos**: hoje 8, por caber bem na tela e na memória. Se um dia
  virar diferencial de plano, é decisão comercial — não foi antecipada aqui.
- **Perfil público na web**: se existir, reaproveita a composição da prévia.
