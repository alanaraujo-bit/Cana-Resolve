# Fundação visual — aplicativo Canaã Resolve

O que o onboarding e o login estabeleceram, e que as próximas telas devem
reaproveitar sem reinventar. Tudo isto vive em código, em `src/theme/tokens.ts`
e `src/ui/`. Este documento explica **por quê**; o código é a fonte da verdade.

Regra única: **nenhuma tela inventa valor**. Cor, espaço, raio, tipo, tempo e
curva saem dos tokens. Se faltar um valor, ele nasce em `tokens.ts` primeiro.

---

## 1. Paleta

Herdada da landing (`app/globals.css` do site), reancorada para tela pequena.
Claro e escuro são **duas paletas autorais**, não uma a inversão da outra.

| Papel | Claro | Escuro |
| --- | --- | --- |
| `bg` / `bgDeep` | `#FBF9F5` / `#F3EFE6` | `#0C1310` / `#080D0B` |
| `surface` → `surface3` | `#FFFFFF` → `#EFEAE0` | `#121D18` → `#1D2C25` |
| `line` / `lineStrong` | `#E6E0D3` / `#D3CCBB` | `#253429` / `#35473C` |
| `ink` / `muted` / `faint` | `#17201B` / `#59635C` / `#7A857D` | `#E9EFEA` / `#A1AEA6` / `#8B998F` |
| `brand` (texto, traço, ícone) | `#0E5C42` | `#4ECB92` |
| `brandFill` (CTA cheio) | `#0E5C42` | `#2F9F70` |
| `accent` (terracota) | `#A9501D` | `#E59A5C` |
| `danger` | `#A32B1C` | `#F08B7E` |

**`brand` e `brandFill` são coisas diferentes.** No escuro, o verde-menta que
funciona como texto vira neon quando preenche um botão inteiro; por isso o
preenchimento tem um verde próprio, mais profundo, com tinta escura por cima.

O terracota é ponto de destaque — olho de seção, um marcador, um ponto no
gráfico. Nunca superfície grande.

## 2. Tipografia

Duas famílias, as mesmas do site:

- **Fraunces** (serifa) — só em título de tela: `displayXL/LG/MD`.
- **Inter** — todo o resto.

Escala (`type` em `tokens.ts`): `displayXL 40` · `displayLG 31` · `displayMD 27`
· `title 20` · `body 16` · `callout 15` · `label 14` · `caption 13` ·
`overline 11/1.2` · `button 16`.

Nada abaixo de 13 em texto de leitura. Todo `<Text>` tem teto de Dynamic Type
(`maxScale`, padrão 1.35) — o texto cresce, a composição não se desmonta.

## 3. Espaço, grade e raio

- Escala de espaço em múltiplos de 4: `xs 4 · sm 8 · md 12 · lg 16 · xl 20 ·
  2xl 24 · 3xl 32 · 4xl 40 · 5xl 48 · 6xl 64`.
- **Margem lateral do conteúdo: 24** (`gutter`). Tudo se alinha a ela.
- Raios: `xs 8 · sm 12 · md 16 · lg 20 · xl 26 · 2xl 32 · pill`.
  Campo = `md`. Cartão flutuante = `xl`. Doca = `2xl`. Botão = `pill`.
- Alvo mínimo de toque: **48** (`hitTarget`). Botão principal: 54 de altura.

## 4. Componentes

| Componente | Estados que já nascem prontos |
| --- | --- |
| `Button` (`primary` · `outline` · `glass` · `quiet`) | normal, pressed (mola + véu), disabled (45%), loading (spinner no lugar do rótulo) |
| `TextField` | vazio, foco (anel externo + borda), preenchido, erro (borda + ícone + frase), disabled |
| `GlassSurface` | Liquid Glass nativo · desfoque · superfície sólida |
| `Text` | variante + tom semântico, teto de escala |
| `Wordmark`, `BrandMark` | claro, escuro, sobre superfície de marca |
| `Avatar`, `SectionHeader`, `Pill`, `Skeleton` | as peças pequenas que a Home pediu (`src/ui/blocos.tsx`) |

Estado nunca depende **só** de cor: o erro traz ícone e frase; o foco traz anel
e mudança de espessura; o carregando traz spinner e `accessibilityState.busy`.

## 5. Movimento

Uma gramática só (`motion` em `tokens.ts`):

- Durações: `instant 120` (toque) · `fast 180` · `base 280` (estado) ·
  `slow 420` (entrada de conteúdo) · `deliberate 620` (tela inteira).
- Curvas: `out (0.16, 1, 0.3, 1)` — a mesma da landing — `inOut`, `in`.
- Molas: `press` (firme, sem quicar) · `enter` · `glide` (gesto e paginação).
- Deslocamento de entrada: 14 px.

Onde há movimento e por quê:

| Onde | O quê | Para quê |
| --- | --- | --- |
| Fundo de marca | segue o dedo entre páginas | continuidade — é o mesmo fundo o tempo todo |
| Palco do onboarding | camadas em velocidades diferentes | profundidade sem truque |
| Texto da página | anda mais devagar que a página | hierarquia |
| Trilho | preenche conforme o dedo | progresso real, não decorativo |
| Botão | encolhe 2,2% e escurece | confirmação do toque |
| Campo | anel abre no foco | onde estou |
| Login | entrada escalonada | ordem de leitura |

`prefers-reduced-motion` (iOS/Android) desliga paralaxe, molas e entradas — a
tela continua completa, só sem deslocamento.

## 6. Retorno tátil

Três momentos, e nada além disso:

- `haptics.step` — virou a página do onboarding, e o botão que a vira.
- `haptics.commit` — concluiu o onboarding, enviou o login.
- `haptics.success` / `haptics.error` — resposta real da autenticação.

Nunca a cada toque.

## 7. Liquid Glass e seus três acabamentos

`GlassSurface` decide em tempo de execução, nesta ordem:

1. **iOS 26+ com a API disponível** (`expo-glass-effect.isLiquidGlassAvailable()`,
   verificado no aparelho, nunca por suposição de versão) → `GlassView` nativo.
2. **iOS anterior** → desfoque do sistema (`expo-blur`, material espesso) com o
   mesmo filete e o mesmo raio.
3. **Android, ou "reduzir transparência" ligado** → superfície sólida da paleta.

Os três têm o mesmo filete, o mesmo raio e o mesmo peso visual: nenhum é a
versão pobre do outro. Vidro só onde ele trabalha — a doca do onboarding, os
cartões dos palcos. Nunca uma tela inteira de vidro.

## 8. Safe area e barras do sistema

- O fundo vai até a borda; **conteúdo e controle, nunca**.
- Topo: `insets.top` do `react-native-safe-area-context`, somado ao espaço de
  desenho. Nada de padding fixo inventado.
- Base: `Math.max(insets.bottom, 16)` — o indicador de Home não encosta no botão.
- A barra de status acompanha o tema (`StatusBar style` claro/escuro), e o fundo
  do sistema é pintado com `expo-system-ui` para não piscar branco.
- Android roda edge-to-edge.

## 9. Iconografia

Uma família só, desenhada em `src/ui/icons.tsx`: traço 1.75, pontas
arredondadas, grade de 24. Sem emoji como ícone. Duas exceções obrigatórias,
por regra de plataforma: o "G" do Google nas cores do Google, e o botão oficial
da Apple (`AppleAuthenticationButton`).

## 10. Layout — o padrão que as próximas telas herdam

```
[ fundo de marca, global, atrás de tudo ]
  cabeçalho    — assinatura à esquerda, ação secundária à direita
  conteúdo     — margem de 24, hierarquia: olho → título → texto
  doca         — vidro, na base, com a ação principal
```

O fundo (`BrandCanvas`) é único e vive na raiz, atrás da pilha de navegação —
por isso as telas são transparentes (`contentStyle` e tema de navegação). Uma
tela nova entra sem redesenhar o fundo, e a paisagem não pisca na troca.

## 10.1 Navegação principal da área autenticada

A barra de abas é a mesma doca de vidro do onboarding, agora permanente, e as
telas continuam transparentes para o fundo de marca aparecer atrás delas. A
anatomia da Home, a regra de prioridade dos pedidos, os estados da tela e a
taxonomia dos pedidos estão em [`HOME.md`](HOME.md).

## 11. Navegação e sessão

`src/session/SessionProvider.tsx` é a máquina de estados da entrada:

```
carregando → primeira-vez (onboarding) → sem-sessão (entrar) → autenticado
```

O porteiro (`Gate`, em `app/_layout.tsx`) é quem redireciona. Telas não decidem
rota. Os papéis (`profissional`, `morador`) já existem no tipo `Account`: a área
do morador entra como mais um destino, sem reescrever nada.

## 12. Acessibilidade — o mínimo que já está de pé

Alvos de 48, rótulos e dicas em português em todo controle, ordem de leitura
coerente, `accessibilityState` em botão e campo, região viva na mensagem de
erro, teto de Dynamic Type, respeito a reduzir movimento e reduzir
transparência, e nenhum estado comunicado só por cor.

---

## 13. O que a Fase 03 acrescentou à fundação

Nada foi redesenhado. Entraram três peças, pelas mesmas regras:

- **`Sheet` + `OpcaoDaFolha`** (`src/ui/Sheet.tsx`) — a folha que sobe da base,
  para decisões de um toque que não merecem uma tela nem cabem num alerta do
  sistema. Não usa vidro: ela nasce em outra hierarquia nativa, onde não há o
  que desfocar atrás, e superfície sólida é o acabamento honesto ali.
- **Selo de contagem na barra principal** — o único do aplicativo. Cor da marca,
  17 px, e só na aba Oportunidades. Conta o que espera decisão, não o total.
- **Sete ícones** na mesma família (traço 1.75, grade 24): voltar, fechar,
  relógio, pino, etiqueta, telefone e sem-conexão. Mais o do WhatsApp, que
  mantém o contorno reconhecível do aplicativo mas **herda a cor do contexto** —
  um verde alheio no meio da paleta da casa gritaria.

Três correções na fundação, provocadas por esta fase e não por gosto:

- `BrandCanvas` ganhou recorte. O desenho é maior que a tela de propósito, mas
  sem `overflow: hidden` o excesso alargava a página inteira na web.
- Selo de aba, seção e filtro passaram a expor `aria-selected` / `aria-checked`:
  `accessibilityState` sozinho não vira atributo nenhum, e a seleção ficava dita
  só pela cor — o que a regra da casa proíbe.
- `pointerEvents` saiu das props e foi para o estilo, em todo o código próprio.
