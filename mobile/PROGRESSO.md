# Progresso — aplicativo Canaã Resolve

Registro de onde o trabalho está, para retomar sem arqueologia.

## Onde as coisas estão — 28/08/2026

Quatro fases construídas e verificadas: fundação e login, Home, Central de
Oportunidades, Perfil profissional. Tudo versionado; o `.env` não.

**O que é real e o que não é** — a distinção que mais confunde quem chega:

| | Estado |
| --- | --- |
| Entrada no aplicativo | **real**, contra a API em produção e os parceiros do banco |
| Oportunidades e perfil | **exemplos declarados** — a API de dados não existe |
| Escolher e comprimir imagem | **real** no aparelho; não há para onde enviar depois |
| Google e Apple | não ligados — a API responde 501 dizendo isso |
| Push, avaliações, plano, chat | não construídos |

A separação vive em duas variáveis: `EXPO_PUBLIC_AUTH_API_URL` está preenchida,
`EXPO_PUBLIC_DATA_API_URL` está vazia. Enquanto a segunda estiver assim, os
módulos de dados usam exemplos. **Juntá-las numa variável só foi o erro que se
pagou hoje**: ligar o login apagou os exemplos e deixou o aplicativo inteiro
mostrando erro.

**Para entrar**, um parceiro precisa de senha, e o cadastro público não pede
nenhuma. Quem dá a primeira é `npm run parceiro:senha` na raiz do repositório.
Em 28/08/2026 existe uma credencial, no `PA-0002`.

**O próximo passo óbvio**, se ninguém disser o contrário, é a **API de dados**:
oportunidades e perfil lendo e gravando no Postgres de produção. É o que falta
para o aplicativo ser real depois da tela de login. O contrato já está escrito
em `tipos.ts` de cada módulo, e só o `repositorio.ts` precisa mudar — as telas
não.

As Fases 05 e 06 foram pedidas em 28/08/2026, mas **os briefings não chegaram**
nesta sessão; o da Fase 04 veio truncado no §37. Não invente o escopo delas.

## Fase 01 — Onboarding + Autenticação · concluída

**Feito**

- Projeto Expo SDK 54 em `mobile/`, com `expo-router`, Reanimated 4 e
  TypeScript estrito. A landing na raiz não foi tocada.
- Ícones e splash gerados a partir da marca do site (pino + confirmação sobre
  verde profundo, com curvas de nível). Splash com variante clara e escura.
- Fundação de design em `src/theme/tokens.ts` e `src/ui/` — ver `FUNDACAO.md`.
- Fundo de marca único (`BrandCanvas`), vivo entre as telas: curvas de nível e
  duas auroras, que seguem o dedo no onboarding e repousam no login.
- Onboarding de três páginas, com gesto, botão, pular, trilho de progresso,
  paralaxe por camadas e retorno tátil na virada.
- Login: e-mail, senha com mostrar/ocultar, foco, erro, carregando, Google,
  Apple (botão oficial, só quando o sistema confirma), "Quero ser parceiro"
  abrindo a página de parceiros do site.
- Máquina de estados da sessão com papéis (`profissional`, `morador`) e o
  porteiro que redireciona. Persistência do onboarding em `AsyncStorage`;
  credencial de sessão reservada para `SecureStore`.
- Autenticação real ou nada: sem API configurada, nenhum caminho conclui —
  mensagem de produto para o usuário, nota técnica só em desenvolvimento.
- Claro e escuro desenhados separadamente; `reduce motion` e `reduce
  transparency` respeitados.

**Verificado**

| O quê | Como | Resultado |
| --- | --- | --- |
| Tipos | `npx tsc --noEmit` | limpo |
| Lint | `npx expo lint` | limpo |
| Versões e config | `npx expo-doctor` | 18/18 |
| Empacotamento iOS | bundle de desenvolvimento pelo Metro | 200, ~9,7 MB |
| Primeira abertura | navegador, 393×852 | cai no onboarding |
| Avançar / concluir | clique nas três etapas | chega no login |
| Persistência | recarregar depois de concluir | abre direto no login |
| Erros de console | navegador, claro e escuro | nenhum |
| Claro e escuro | capturas das 4 telas nos dois temas | ambos refinados |
| Erro de formulário | envio vazio | borda, ícone e frase por campo |

## Fase 02 — Home do profissional · concluída

Cabeçalho com saudação e situação de recebimento, o que precisa de atenção em
destaque (uma ação primária por tela), memória curta em linhas, estados vazios,
carregando, erro e puxar para atualizar.

## Fase 03 — Central de Oportunidades + experiência da oportunidade · concluída

**A palavra mudou.** A entidade passou de "pedido" para **oportunidade**, e a
aba junto: o morador faz um *pedido*, o profissional recebe uma *oportunidade*.
Mesmo objeto, dois pontos de vista — e este é o aplicativo do profissional.
`src/pedidos/` virou `src/oportunidades/`.

**Feito**

- **Domínio** (`src/oportunidades/tipos.ts`): cinco estados agrupados em três
  seções visíveis, quatro urgências, seis resultados, quatro motivos de recusa,
  histórico só com acontecimentos reais. Documentado em
  `DOMINIO-OPORTUNIDADES.md`.
- **Repositório** (`repositorio.ts`): a única fronteira com "o mundo". Leitura
  já paginada, ações que devolvem a oportunidade atualizada, e **a privacidade
  imposta na origem** — o telefone não existe no objeto antes do interesse.
- **Fonte única de estado** (`Carteira.tsx`), acima das abas: Home, Central,
  selo da aba e detalhe leem a mesma lista. Uma decisão tomada no detalhe
  aparece na Home na volta, sem ninguém sincronizar nada.
- **Central de Oportunidades**: três seções, um filtro (o balcão) que só aparece
  quando há mais de um, `FlatList` com janela limitada, estados vazios por
  seção, carregando, erro, filtro sem resultado, puxar para atualizar.
- **Detalhe**: a necessidade abre a tela; depois o contexto, o relato completo,
  o contato (quando liberado), o resultado (quando encerrada) e um histórico
  discreto. Ação principal fixa em vidro na base, que muda com o estado.
- **Folhas** (`src/ui/Sheet.tsx`): motivo da recusa e "como terminou?", em
  um toque, com véu, fechar, voltar do Android e safe area.
- **Contato**: WhatsApp por `wa.me` com mensagem preenchida e nunca enviada,
  telefone por `tel:`. Nada sai do aplicativo sem toque explícito.
- **Deep link**: `canaaresolve://oportunidade/{id}` abre o detalhe direto, e o
  porteiro guarda o destino quando é preciso autenticar antes.
- **Selo da aba**: conta só o que espera decisão. Discreto, na cor da marca.
- **Analytics**: seis eventos declarados, com deduplicação de "vista". Sem
  destino conectado, sem número inventado.
- **Nova rota**: `(app)` virou uma pilha com `(abas)` e `oportunidade/[id]`, para
  que o detalhe seja tela cheia e alcançável por link.

**Corrigido no caminho** (achado olhando o produto, não o código):

| O que estava errado | Onde |
| --- | --- |
| "Você abriu" entrava duas vezes no histórico — lista e detalhe marcavam como vista | agora só o detalhe marca |
| O fundo de marca transbordava a página na web e alargava tudo que se mede pela janela | `BrandCanvas` ganhou recorte |
| A folha nascia mais larga que a tela e o botão de fechar saía pela borda | `Sheet` |
| O deep link se perdia quando era preciso autenticar antes | `Gate`, em `app/_layout.tsx` |
| Rótulos das seções cortados ("Esper... 3") em 320 e em 393 | nomes curtos, sem contadores |
| A etiqueta de balcão atropelava o horário em 320 | `Pill` cede espaço, o tempo não |
| O texto passava por trás da doca de vidro | esmaecimento acima dela |
| A seleção de aba, seção e filtro não chegava ao leitor de tela | `aria-selected` / `aria-checked` |
| Cinco alvos de toque abaixo de 44 | corrigidos |
| "Pelo WhatsApp" aparecia sozinho no histórico, sem dizer o que houve | acontecimento primeiro, complemento depois |
| Urgência de oportunidade encerrada ("Para hoje", de uma semana atrás) | some quando encerra |
| O detalhe não tinha como atualizar | ganhou puxar para reler, que troca no lugar |
| "Ver todas" empilhava uma aba sobre a outra | `router.navigate` no lugar de `push` |
| `props.pointerEvents` descontinuado em todo o código próprio | movido para o estilo |

**Verificado**

| O quê | Como | Resultado |
| --- | --- | --- |
| Tipos | `npx tsc --noEmit` | limpo |
| Lint | `npx expo lint` | limpo |
| Fluxo completo | 21 capturas por tema, no navegador a 393×852 | claro e escuro refinados |
| Privacidade | busca por telefone no DOM da lista e do detalhe não decidido | nenhuma ocorrência |
| Contato | `window.open` interceptado | `wa.me/55…?text=Olá,…`, nada enviado |
| Nada sai sem toque | contador de saídas antes do primeiro toque | zero |
| Interesse → contato → encerramento | asserções sobre estado, doca e histórico | as três transições corretas |
| Voltar preserva contexto | seção e filtro depois de ir ao detalhe e voltar | preservados |
| Home e Central | selo da aba × seção da Home, depois de encerrar | mesma contagem |
| Alvos de toque | medição do DOM em Home, Central e folha | nenhum abaixo de 44 |
| Transbordo horizontal | 320, 360, 393 e 430 | nenhum |
| Erros de página | todo o percurso, nos dois temas | nenhum |
| Descrições longas e bairros longos | exemplos com relato de 4 linhas e "Loteamento Vila Nova do Sol Nascente" | composição intacta |
| Empacotamento nativo | bundle de desenvolvimento pelo Metro, iOS e Android | 200, ~10,4 MB nos dois |
| "Ver todas" → Central → voltar | `router.navigate`, e depois voltar | chega com a aba marcada; o voltar cai no Início |
| Refresh do detalhe | reler a oportunidade aberta | troca no lugar, sem piscar e sem perder a rolagem |
| Filtro sobrevive à troca de aba | Central → Início → Central | seção e balcão preservados |
| Landing intacta | `git diff --stat -- app components lib public` | vazio |

**Não verificado aqui** — precisa de aparelho:

- **Dynamic Type.** `react-native-web` escreve tamanhos em px e ignora
  `maxFontSizeMultiplier`; o teto de escala existe em todo `<Text>`, mas o
  comportamento real só aparece no aparelho. O eixo equivalente foi apertado
  por outro caminho: 320 px de largura, onde a composição se manteve.
- Liquid Glass nativo (exige iOS 26 e a API presente no aparelho).
- Haptics — `step`, `commit`, `success` e `error` estão nos pontos certos, mas
  vibração não se vê no navegador.
- Abertura real do WhatsApp e do discador. A URL foi conferida; quem a abre é o
  sistema.
- Puxar para atualizar com o dedo (o controle existe nas três telas; o gesto
  em si só acontece em tela de toque), Dynamic Island, indicador de Home, Android
  físico e `reduce motion` / `reduce transparency` do sistema.

**Aviso conhecido, de fora:** `props.pointerEvents is deprecated` aparece uma
vez no console da web. Vem de `@react-navigation/elements`
(`ResourceSavingView`), não do código deste repositório, e não tem efeito em
aparelho.

## Fase 04 — Perfil profissional · concluída

> Escrita **em paralelo** com a Fase 03, por outra sessão, a partir do briefing
> que veio na mesma mensagem. Nenhum arquivo do módulo de oportunidades foi
> tocado, e nenhum arquivo compartilhado (`src/ui/`, `src/theme/`, os dois
> `_layout` de cima) foi alterado.

**Feito**

- Módulo em `src/perfil/`, com a mesma separação do módulo de oportunidades:
  `tipos.ts` (contrato), `catalogo.ts` (categorias, serviços e bairros como
  conteúdo, não regra), `exemplos.ts` (só desenvolvimento), `repositorio.ts`
  (única fronteira com o mundo), `PerfilProvider.tsx` (fonte única de estado).
- Capa do Perfil: como apareço → o que falta → onde mexo. Sem painel, sem
  métrica e sem "70% completo" — o que falta vem com a consequência escrita.
- Seis seções curtas, cada uma rota de verdade: identidade, serviços,
  atendimento, contato, horário e portfólio. A pilha vive dentro da aba, então
  a barra principal fica no lugar e toda seção volta para a capa.
- Prévia pública (`Ver como meu perfil aparece`) lendo **o mesmo objeto** que a
  edição escreve. Sem cópia, sem dado de exemplo.
- Pessoa e empresa na mesma arquitetura: muda a apresentação, não o formulário.
  Sair de empresa apaga o responsável, para o dado não vazar depois.
- Privacidade: telefone, responsável e e-mail da conta não aparecem no perfil
  público. O número é entregue pelo módulo de oportunidades, no momento certo.
- Escolher, recortar e comprimir imagem funciona de verdade (`expo-image-picker`
  + `expo-image-manipulator`, API do SDK 54 conferida na documentação da
  versão — `mediaTypes` é array, `manipulateAsync` está obsoleto). O que não
  existe é para onde mandar depois — e nada diz "enviado".
- Salvar é explícito; sair com alteração pendente pergunta uma vez. Cada seção
  manda **só os campos que mexeu**: salvar o perfil inteiro faria uma tela
  aberta antes desfazer o que outra seção acabou de salvar.
- Serviço escrito à mão é normalizado; promessa impossível de comprovar gera
  aviso discreto, nunca bloqueio.
- Domínio documentado em `PERFIL.md`, com o que falta e as decisões pendentes.
- Nenhum token novo, nenhum componente da fundação alterado. As peças do módulo
  moram em `src/perfil/componentes.tsx` até se repetirem fora dele.

**Verificado**

| O quê | Como | Resultado |
| --- | --- | --- |
| Tipos | `npx tsc --noEmit` no projeto inteiro | limpo |
| Lint | `npx expo lint` | limpo |
| Empacotamento iOS | bundle de desenvolvimento pelo Metro, após as correções | 200, ~10,36 MB |
| Empacotamento Android | idem, após as correções | 200, ~10,36 MB |
| Rotas no pacote | as sete telas do Perfil presentes | conferido |
| Lógica pura | 34 asserções em `tipos`, `validacao` e `completude` | 34/34 |
| Telefone | máscara, E.164, DDD, fixo e celular | conferido |
| Serviços | grito normalizado, duplicata com acento, teto | conferido |
| Completude | perfil vazio, perfil cheio, ordem das pendências | conferido |
| Codificação | acentos em todos os arquivos do módulo | sem mojibake |
| Percurso completo | capa → 6 seções → prévia, no navegador a 393×852 | as 8 rotas certas, voltar previsível |
| Claro e escuro | o percurso inteiro nos dois temas | ambos refinados |
| Tela pequena | o percurso inteiro a 320 px | sem transbordo, composição mantida |
| Alvos de toque | medição do DOM nas 8 telas, nos 3 cenários | nenhum abaixo de 44 |
| Rolagem horizontal | as 8 telas, nos 3 cenários | nenhuma |
| Erros de console | o percurso inteiro, nos 3 cenários | nenhum |
| Privacidade | busca por telefone e por responsável no DOM da prévia | nenhuma ocorrência |
| O que a prévia mostra | nome da empresa e Instagram presentes | conferido |

**Corrigido antes de fechar** (achado relendo o fluxo de estado, que tipo, lint
e empacotamento não enxergam):

| O que estava errado | Onde |
| --- | --- |
| Cada seção salvava o perfil inteiro: uma tela aberta antes desfazia o que outra acabou de salvar | `edicao.tsx` e `PerfilProvider.tsx` — agora vai só o remendo |
| Rascunho abandonado podia voltar à vida num salvar posterior, com a tela ainda montada na pilha | `sair()` desfaz o rascunho |
| Aberto por link, com o perfil ainda carregando, o telefone ficava vazio para sempre | `contato.tsx` — semente por efeito, não no `useState` |
| Horário e atendimento dividiam a mesma seção, embaralhando analytics e a linha de pendência | `completude.ts` ganhou `horario` |
| O interruptor era o único alvo de toque, com 40 × 20 — abaixo dos 48 da fundação | `Alternador`: a linha inteira aciona, e o interruptor ficou só como desenho |

**Não verificado aqui** — precisa de aparelho:

- Galeria, permissão de fotos, recorte e compressão reais.
- Haptics do salvar, `KeyboardAvoidingView` com teclado físico, Safe Areas.
- Dynamic Type acima do teto.
- Liquid Glass nativo, e o gesto de puxar para atualizar com o dedo.

**Aviso sobre o escopo:** o texto da Fase 04 recebido naquela sessão termina no
§37, no meio de "O QUE NÃO DEVE APARECER PUBLICAMENTE". Os §38 em diante — onde,
pelo padrão da Fase 03, ficam os critérios de aceitação — não foram lidos. O que
está aqui cobre §1–37.

## Próxima fase — quando estas forem aprovadas

Não foi antecipada. Ficaram de fora de propósito: Configurações, Push
Notifications, avaliações, plano, financeiro, área do morador, chat e analytics
conectado.
