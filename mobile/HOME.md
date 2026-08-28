# A área do profissional — navegação e Home

O que a Fase 02 decidiu. A linguagem visual continua sendo a de
[`FUNDACAO.md`](FUNDACAO.md); aqui está só o que é novo: como a área
autenticada se organiza e como a Home resolve a pergunta que importa.

---

## 1. A palavra: **pedido**

O produto interno chama isto de oportunidade comercial. A interface chama de
**pedido** — porque foi assim que a pessoa falou, e porque foi assim que o
onboarding prometeu ("Você diz o que faz… os pedidos chegam por categoria").

Por isso a aba se chama **Pedidos**, e não "Oportunidades": o profissional não
abre o aplicativo para ver oportunidades, ele abre para ver o que alguém pediu.
"Oportunidade" é como nós falamos do negócio; "pedido" é como o produto fala com
quem trabalha.

A regra de escrita vale para todo o resto:

> "O ar-condicionado liga normalmente, mas não está gelando."
> **não** "Solicitação #4829 — manutenção HVAC."

## 2. Navegação principal

Três destinos, porque três são os que se usa todos os dias:

| Aba | O que é | Nesta fase |
| --- | --- | --- |
| **Início** | a porta de entrada operacional | completa |
| **Pedidos** | histórico, filtros, busca | destino mínimo (Fase 03) |
| **Perfil** | conta, serviços, área, ajustes | destino mínimo (fase própria) |

Ajustes, ajuda, termos e sobre **não** são destinos principais: eles moram
dentro do Perfil. Barra principal não é menu.

A barra é a mesma doca de vidro do onboarding, agora permanente
(`src/navigation/BarraPrincipal.tsx`): flutua sobre o conteúdo, acima do
indicador de Home, com Liquid Glass real no iOS 26 e os mesmos fallbacks. As
telas reservam `ESPACO_BARRA` no fim do scroll para nada ficar embaixo dela.

**Trocar de aba não anima** (`animation: 'none'`). É o gesto mais repetido do
aplicativo; ele precisa ser instantâneo, não bonito.

O estado selecionado se lê de três formas ao mesmo tempo — cor da marca, ícone
preenchido com traço mais grosso, e um selo de fundo — para não depender de cor.

### As telas são transparentes

O fundo de marca é único e vive na raiz, atrás da pilha de navegação. Para isso
funcionar, a tela que não está em foco precisa sair mesmo da árvore — é o que o
`react-native-screens` faz no iOS e no Android por padrão, e o que
`enableScreens(true)` em `app/_layout.tsx` liga também na web (onde ele vem
desligado e as abas ficariam empilhadas umas sobre as outras).

## 3. Anatomia da Home

```
Bom dia, João                                    [JB]
● Recebendo pedidos de ar-condicionado e elétrica

  [pendência — só quando bloqueia ou melhora muito a operação]

PRECISA DA SUA ATENÇÃO                              2
  ┌──────────────────────────────────────────┐
  │ Ar-condicionado              há 14 min   │
  │ O ar-condicionado liga normalmente,      │   ← o destaque
  │ mas não está gelando.                    │
  │ Novo Horizonte   [Para hoje]             │
  │ [        Ver pedido        ]             │   ← a única ação primária
  └──────────────────────────────────────────┘
  ● Algumas tomadas da casa pararam …           ›  ← os outros novos, em linha
    Novo · Vale dos Sonhos · há 3 h

SEUS ÚLTIMOS PEDIDOS
  ● Instalação de um split de 12 mil …          ›
    Você respondeu · Centro · ontem
  ● …
```

A ordem nunca muda: **quem eu sou** (contexto curto) → **o que espera resposta**
(a prioridade) → **o que já passou** (memória).

### Uma ação primária por tela

Só o **primeiro** pedido novo vira destaque com botão. Os outros novos entram
logo abaixo em linha. Dois botões cheios iguais na mesma tela não são hierarquia
— são competição.

### O que ficou de fora, de propósito

Gráfico, percentual, faturamento, conversão, ranking, meta, nível, selo. Nenhum
ajuda a decidir nada hoje, e metade teria que ser inventada. A régua para
qualquer coisa nova na Home:

> Isso ajuda o profissional a **perceber** ou **agir** sobre um pedido?

## 4. Estados da Home

| Estado | Quando | O que a tela faz |
| --- | --- | --- |
| **Carregando** | primeira carga | esqueleto com a forma do conteúdo real — um destaque e três linhas |
| **Com novos** | há pedido em `novo` | seção "Precisa da sua atenção", destaque + linhas |
| **Sem novos** | só pedidos já tratados | "Nenhum pedido novo agora" + o que já passou |
| **Conta nova** | nunca recebeu nada | "Sua conta está pronta" + a pendência, se houver |
| **Pausado** | `recebendo: false` | o estado no cabeçalho e o vazio dizem o porquê |
| **Erro** | a primeira carga falhou | bloco de falha com "Tentar de novo"; o resto do aplicativo continua |
| **Atualizando** | puxou para atualizar | o conteúdo fica; uma falha aqui **não** apaga o que está na tela |

O vazio nunca mente. Não existe "12 pessoas procurando seu serviço", não existe
atividade inventada para a tela parecer viva. Ele diz o que é verdade: você está
na rede, e o pedido aparece aqui quando chegar.

## 5. Estados de um pedido

Quatro, e só quatro (`src/pedidos/tipos.ts`). O Canaã Resolve não é um CRM: o
que importa é saber se a bola está com você, com a pessoa, ou se acabou.

| Estado | Significa | Como aparece |
| --- | --- | --- |
| `novo` | chegou, você não abriu | destaque, ou linha com "Novo ·" e ponto na cor da marca |
| `visto` | você leu, não respondeu | linha discreta |
| `respondido` | você se colocou à disposição | linha com "Você respondeu ·" |
| `encerrado` | resolvido, recusado ou vencido | linha com "Encerrado ·", ponto apagado |

O estado abre a legenda quando muda o que a pessoa precisa fazer — assim ele
nunca é o pedaço cortado pelas reticências, e a cor do ponto deixa de ser a
única pista.

## 6. Privacidade

No resumo aparecem: a necessidade, a categoria, o **bairro** e a pressa. Não
aparecem nome, telefone nem endereço — isso é do momento em que a conversa
começa, não da vitrine.

## 7. Dados

`src/pedidos/` separa três coisas:

- `tipos.ts` — o contrato da interface. É com ele que os componentes falam.
- `exemplos.ts` — dados de exemplo, **só para desenvolvimento visual**. Some
  quando a API existir.
- `fonte.ts` — de onde a Home tira o que mostra. Devolve situação, dados, erro e
  `atualizar()`. Quando a API existir, só a função `buscar` muda de lugar.

Em produção, sem `EXPO_PUBLIC_AUTH_API_URL`, `buscar` falha de forma honesta —
não existe caminho em que exemplo apareça como se fosse dado real.

## 8. O que existe só em desenvolvimento

Dois atalhos, ambos sob `__DEV__` e ausentes do pacote publicado:

- **Entrar** — na tela de login, "abrir a área do profissional com dados de
  exemplo". Não autentica ninguém: cria uma sessão com
  `origem: 'desenvolvimento'`.
- **Cenários** — no fim da Home, um controle que troca o conjunto de exemplos
  para conferir os estados sem esperar a API.

## 9. Componentes novos

Entraram no sistema (`src/ui/blocos.tsx`) porque já se repetem:
`Avatar`, `SectionHeader`, `Pill`, `Skeleton`. E, no domínio
(`src/pedidos/componentes.tsx`): `PedidoDestaque` e `PedidoLinha`.

**Nenhum token novo foi necessário nesta fase** — a paleta, a escala
tipográfica, os espaços, os raios e a gramática de movimento da Fase 01 deram
conta da Home inteira. Isso era o teste da fundação, e ela passou.
