# Progresso — aplicativo Canaã Resolve

Registro de onde o trabalho está, para retomar sem arqueologia.

## Onde as coisas estão — 28/08/2026

Sete fases construídas e verificadas: fundação e login, Home, Central de
Oportunidades, Perfil profissional, Conta e Configurações, Notificações, e
Reputação. Tudo versionado; o
`.env` não.

**O que é real e o que não é** — a distinção que mais confunde quem chega:

| | Estado |
| --- | --- |
| Entrada no aplicativo | **real**, contra a API em produção e os parceiros do banco |
| Sessão guardada entre aberturas, e sair | **real** desde a Fase 05 — credencial no `SecureStore`, conferida no servidor |
| Alterar senha | **real** — o servidor confere a atual e derruba os outros aparelhos |
| Tema e pausa de oportunidades | **reais** no aparelho; a pausa ainda não alcança o servidor |
| Oportunidades e perfil | **exemplos declarados** — a API de dados não existe |
| Escolher e comprimir imagem | **real** no aparelho; não há para onde enviar depois |
| Google e Apple | não ligados — a API responde 501 dizendo isso |
| Excluir conta | pedido pelo canal oficial; não há rota, e não se finge que há |
| Push | infraestrutura real; falta credencial para chegar num aparelho |
| Avaliações e reputação | **exemplos declarados** — mesma porta das oportunidades |
| Plano, chat, área do morador | não construídos |

A separação vive em duas variáveis: `EXPO_PUBLIC_AUTH_API_URL` está preenchida,
`EXPO_PUBLIC_DATA_API_URL` está vazia. Enquanto a segunda estiver assim, os
módulos de dados usam exemplos. **Juntá-las numa variável só foi o erro que se
pagou hoje**: ligar o login apagou os exemplos e deixou o aplicativo inteiro
mostrando erro.

**Para entrar**, um parceiro precisa de senha, e o cadastro público não pede
nenhuma. Quem dá a primeira é `npm run parceiro:senha` na raiz do repositório.
Em 28/08/2026 existe uma credencial, no `PA-0002`.

**O próximo passo óbvio**, se ninguém disser o contrário, é a **API de dados**:
oportunidades, perfil e avaliações lendo e gravando no Postgres de produção. É o
que falta para o aplicativo ser real depois da tela de login. O contrato já está
escrito em `tipos.ts` de cada módulo, e só o `repositorio.ts` precisa mudar — as
telas não. Com a Fase 07 são três módulos esperando a mesma variável.

A **Fase 05 chegou em 28/08/2026** e está feita — ver a seção dela abaixo e
`AJUSTES.md`. Ela trouxe junto quatro rotas na API do site (o `GET` de sessão, o
`POST` de senha, `email` na conta e o CORS extraído), porque metade do que ela
pedia não existia do lado do servidor.

**Atenção antes de abrir no Expo Go contra produção:** o aplicativo agora chama
quatro rotas de autenticação, e três delas (`GET /auth/sessoes`,
`DELETE /auth/sessoes` como parte do logout e `POST /auth/senha`) só existem
depois que o repositório do site for publicado. Elas foram provadas contra a API
rodando localmente no banco de teste. Enquanto o deploy não sair, o aplicativo
não quebra — a confirmação de sessão cai no estado "não deu para conferir" e a
troca de senha diz que não foi possível agora —, mas "Alterar senha" é um beco
sem saída até lá.

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

## Fase 05 — Conta, Configurações, Preferências e Segurança · concluída

**A sessão passou a existir de verdade.** Era o buraco no meio de tudo: a API
devolvia um token desde o dia em que nasceu, `entrar.tsx` o jogava fora e o
`SessionProvider` apagava qualquer sessão guardada na abertura. Quem fechava o
aplicativo entrava de novo, "sair" era esquecer localmente, e metade do que esta
fase pedia — logout que funciona, sessão expirada tratada, senha alterável —
não tinha em que se apoiar. Foi a primeira coisa construída.

**Feito**

- **Sessão** (`src/session/`): credencial no `SecureStore`, restaurada na
  abertura e **conferida no servidor**. Três respostas, e a diferença entre elas
  é o que separa um aplicativo confiável de um que expulsa gente sem motivo:
  vale, não vale (única transição que manda entrar de novo), ou não deu para
  perguntar — e sinal fraco não custa o login de ninguém.
- **`session/chaves.ts`**: tudo que o aplicativo grava neste aparelho, em uma
  lista só, com o lado da linha de cada chave. É o que torna confiável a
  promessa de que sair apaga o rascunho do perfil e **não** apaga o tema nem o
  onboarding.
- **Quatro rotas na API** (repositório do site, `app/api/v1/auth/`): o `GET` de
  sessão, que já existia como função (`contaDaSessao`) e não tinha porta; o
  `POST /auth/senha`, novo; `email` na conta devolvida; e o CORS local extraído
  para `lib/auth/cors.ts`, agora que há duas rotas seguindo a mesma regra.
- **Configurações** em `app/(app)/ajustes/`, **fora** das abas: onze telas —
  capa, dados da conta, login e segurança, alterar senha, aparência,
  oportunidades, privacidade, permissões, ajuda, sobre, excluir conta — mais a
  área de desenvolvimento fechada por `__DEV__`.
- **Conta ≠ Perfil**, arquiteturalmente: `src/conta/` deriva método de entrada e
  estado de sessão a partir da fonte única; não guarda nada. A entrada é uma
  linha no fim da capa do Perfil, e não uma quarta aba.
- **Alterar senha é real.** Servidor confere a atual, grava a nova e derruba os
  outros aparelhos, mantendo o de quem trocou. Nenhuma tela desta fase diz que
  fez algo que não fez.
- **Tema com preferência explícita** — Sistema, Claro, Escuro —, gravado no
  aparelho e lido **antes do primeiro quadro**, junto com as fontes. "Sistema"
  continua sendo preferência depois de escolhido, e não a cor congelada.
- **Pausar oportunidades**, a única preferência de oportunidade que passou pela
  pergunta "ele precisa mesmo controlar isso?". Aparece na Home, porque uma
  pausa que só se vê onde foi ligada é uma armadilha.
- **Privacidade** explica o que o morador vê, o que só chega depois do
  interesse e o que nunca aparece — sem duplicar um formulário do Perfil.
  **Permissões** mostra a única que o aplicativo usa, e diz o que não pedimos.
- **Ajuda** com cinco perguntas reais e WhatsApp preenchido e nunca enviado.
  **Sobre** com a versão vinda do `app.json`, e a Aionix num crédito de uma
  linha. Nada que sai daqui carrega e-mail, token ou dado de conta.
- **Excluir conta** previsto e explicado, com o pedido pelo canal oficial. Nada
  de exclusão local falsa — ver `BLOCKERS.md`.
- **Cinco peças subiram para a fundação** (`src/ui/lista.tsx`): cabeçalho,
  bloco, grupo, nota e alternador. `src/perfil/componentes.tsx` continua
  exportando os mesmos nomes, e nenhuma tela da Fase 04 precisou mudar.
- Domínio documentado em [`AJUSTES.md`](AJUSTES.md).

**Corrigido no caminho** (achado olhando o produto, não o código):

| O que estava errado | Onde |
| --- | --- |
| `/ajustes/index` — o que o gerador de rotas tipadas emite para o índice de uma pilha — cai em "Unmatched Route"; o endereço servido é `/ajustes` | `src/ajustes/rota.ts`, com a conversão em um lugar só |
| "Dados da conta" e a linha do nome levavam ao mesmo lugar: duas portas para a mesma sala | capa das Configurações |
| "Navegador 0.0.0" na informação de suporte — o React Native web devolve uma versão que não existe | `informacoes.ts` |
| A nota de Segurança prometia preparação da Apple onde não há linha da Apple | `seguranca.tsx` |
| Duas caixas de aviso empilhadas na mesma tela, e um "Recebendo" ecoando o interruptor logo abaixo dele | `oportunidades.tsx` |
| "Aparelho: Navegador" repetido em Conta e em Segurança | `conta.tsx` |
| O botão de sair vinha em verde cheio, com o brilho de uma conquista | folha de confirmação |
| **Sair não apagava o rascunho do perfil de verdade**: o repositório guarda uma cópia em `memoria` e a consulta antes do disco, então o parceiro seguinte a entrar no mesmo aparelho encontraria o nome, o telefone e as fotos do anterior. Vale igual para as decisões da carteira | `src/session/limpeza.ts`, que chama o `esquecer()` de cada módulo |

**Verificado**

| O quê | Como | Resultado |
| --- | --- | --- |
| Tipos | `npx tsc --noEmit`, nos dois projetos | limpo |
| Lint | `npx expo lint` e `npx eslint` | limpo |
| Testes do servidor | `npm test` na raiz, com 8 asserções novas de sessão e senha | 32/32 |
| Rotas da API | `curl` contra a API rodando no banco de **teste** | 201 entrar, 200 conferir, 401 sem token, 403 senha errada, 422 senha fraca, 204 sair, 401 depois de sair |
| Percurso completo | 16 telas, nos dois temas, a 393×852 | claro e escuro refinados |
| Tela pequena | o mesmo percurso a 320×700 | sem transbordo, composição mantida |
| Sessão de verdade | login real → Conta → Segurança → trocar senha → sair, no navegador | 12 asserções, todas certas |
| Senha | atual errada recusada, régua aplicada, troca concluída, senha velha morta, nova entra | conferido |
| Tema | Escuro na hora, sobrevive a recarregar, Sistema volta a seguir o aparelho ao trocar o esquema | 8 asserções |
| Logout | não devolve o tema ao padrão, não reabre o onboarding | conferido |
| Pausa | registrada, datada, visível na capa e na Home, sobrevive a reabrir, e volta | 5 asserções |
| Offline | tema troca; alterar senha falha com frase de gente e nada diz que deu certo | conferido |
| Sessão expirada | sessões apagadas no banco, depois uma operação que precisa delas | vai ao login **uma vez**, com a frase, e fica lá |
| Alvos de toque | medição do DOM nas 16 telas, em 393 e 320 | nenhum abaixo de 44 nas telas desta fase |
| Transbordo horizontal | 320 e 393 | nenhum |
| Erros de console | percurso inteiro | nenhum do código próprio |
| Empacotamento | bundle de desenvolvimento pelo Metro, iOS e Android | 200, ~10,2 MB nos dois; as 11 rotas presentes |
| Troca de conta no mesmo aparelho | parceiro A edita o perfil, sai, parceiro B entra sem fechar o aplicativo | o que A escreveu não aparece para B |
| Formulários públicos | `npm run smoke`, apontado para o banco de teste | 7/7 |
| Landing intacta | `git diff --stat -- "app/(site)" components public brand` | vazio |

**Sobre as medições de alvo de toque:** a régua do DOM não enxerga `hitSlop`.
Ela acusa o olho de mostrar/ocultar senha (40 × 40 com `hitSlop` 12, ou seja
64 reais), os links do login (com `hitSlop` 10) e o `Switch` do sistema — que é
só desenho, com o toque na linha inteira. Nenhum é alvo pequeno de verdade.

**Não verificado aqui** — precisa de aparelho:

- **Persistência da sessão entre aberturas.** `SecureStore` não existe na web,
  então a prévia pelo navegador não guarda sessão por decisão de projeto. O
  caminho de restaurar e conferir foi exercido pelo lado do servidor; o
  `Keychain`/`Keystore` em si, não.
- Permissão de fotos concedida, negada e parcial, e o "abrir configurações do
  aparelho" — `Linking.openSettings()` não existe na web.
- Haptics do toggle, da escolha de tema e da confirmação de saída.
- Abertura real do WhatsApp e dos documentos no navegador do sistema.
- Dynamic Type acima do teto, Liquid Glass nativo, Safe Areas com Dynamic
  Island e indicador de Home, Android físico.


## Fase 06 — Notificações, deep links e selos · concluída no que não depende de credencial

**A decisão que organizou a fase inteira.** A autenticação já é real; a API de
dados ainda não existe. Isso decide, sozinho, o que pôde ser construído de
verdade: **o registro de aparelho é autenticado pela sessão e por mais nada**,
então ele não tinha por que esperar pela API de dados — foi feito de verdade,
com tabela, rota, testes contra o Postgres e um percurso de `curl` de ponta a
ponta. As oportunidades continuam vindo dos exemplos declarados, e o push
aponta **para elas** (§113), não para um segundo conjunto de entidades.

**Feito — no repositório do site**

- **`partner_devices`** (migração `0005`), chaveada pela **instalação**, não
  pelo usuário nem pelo token. É esse índice único — e não um `if` na rota —
  que torna o registro idempotente, e é a mesma escrita que reaponta o aparelho
  quando outra conta entra nele. Sem janela em que os dois recebem.
- **`POST/GET/DELETE /api/v1/auth/dispositivos`**, sessão obrigatória nos três
  verbos. O token de push **não sai** na resposta de nenhum deles.
- **Sair revoga, não apaga.** `revokedAt` + motivo (`saiu`, `desinstalado`,
  `substituido`). Uma linha apagada não conta história, e o que o requisito
  crítico pede é poder provar que este aparelho parou de receber, e quando.
- **`lib/push/mensagens.ts`** — a taxonomia (quatro tipos, três famílias) e o
  texto. `conferirPrivacidade` examina o texto pronto e **recusa o envio** se
  achar telefone, e-mail, endereço ou CPF: a rede existe para o dia em que
  alguém escrever com pressa, não para substituir escrever com cuidado.
- **`lib/push/envio.ts`** — Expo Push, com deduplicação por chave de evento,
  e `DeviceNotRegistered` virando revogação em vez de retentativa eterna.
- **`npm run push:teste`** — envio de teste pela linha de comando. **Não existe
  rota HTTP de envio**, de propósito: um endpoint público seria uma superfície
  nova para proteger, e um script que roda na máquina de quem já tem a
  `DATABASE_URL` não tem superfície nenhuma (§110 + §117 de uma vez só).

**Feito — no aplicativo**

- **`src/notificacoes/`**, e uma regra que atravessa tudo: **o payload não é
  fonte de verdade** (§22). Chegou um aviso? A carteira é relida do
  repositório. Um push que diz "Nova" pode chegar depois de a oportunidade ter
  sido encerrada.
- **Uma porta só para `expo-notifications`** (`sistema.ts`), com irmão
  `sistema.web.ts`. Conferido no bundle: `expo-notifications` aparece 52 vezes
  no pacote iOS e **zero** no da web. É o que mantém viva a prévia pelo
  navegador, que é onde este produto é olhado a cada passo.
- **Permissão contextual.** O convite aparece na Home **depois** das
  oportunidades — só ali "mesmo com o aplicativo fechado" quer dizer alguma
  coisa. Duas ações do mesmo peso visual, e "Agora não" é gravado e respeitado.
- **Permissão ≠ preferência**, e a tela de Notificações existe para não
  confundir as duas: entrega é do iOS/Android, preferência é o que a pessoa
  quer receber. Com o sistema bloqueando, os interruptores continuam valendo e
  a tela **diz** que nada chega.
- **Segurança fora do opt-out** (§37). Quem desligou "comunicados" não pediu
  para não saber que alguém entrou na conta dele. Marketing não existe nesta
  fase, e a ausência é o que impede campanha usando a autorização dada para
  receber oportunidade.
- **`destino.ts`** — um destino, várias origens. Ele valida contra uma lista
  curta, guarda até haver sessão conferida, **confere o dono** antes de
  entregar, expira em 30 minutos e morre no logout.
- **Cold start tratado** com `getLastNotificationResponse()`, que é o único
  caminho para o toque que *iniciou* o processo.
- **O selo é uma regra só** (§44): `contarEsperando`, a mesma função que
  alimenta a aba desde a Fase 03, passou a alimentar o ícone. Abrir uma
  oportunidade a move de `nova` para `vista` e ela **continua** esperando
  decisão — o número não cai por ter sido aberta, cai por ter sido respondida.
- **Foreground não sequestra ninguém.** O banner do sistema é suprimido, os
  dados são relidos, e uma faixa discreta oferece "Ver". Quem está preenchendo
  o Perfil não é arrancado dali porque um pedido chegou.
- **Sem WebSocket e sem trabalho em segundo plano.** Push sinaliza, voltar ao
  primeiro plano reconcilia, puxar para atualizar continua existindo. Para um
  produto hiperlocal, mais infraestrutura seria custo sem ganho (§28, §29).
- **`eas.json`** com os perfis de build, e o plugin de notificações no
  `app.json` — usando o `notification-icon.png` que já existia.
- Domínio documentado em [`NOTIFICACOES.md`](NOTIFICACOES.md).

**Corrigido no caminho** (achado olhando o produto, não o código):

| O que estava errado | Onde |
| --- | --- |
| O porteiro lia o caminho pretendido **uma vez**, na primeira montagem. Um push tocado com o aplicativo já parado na tela de entrar, ou vindo do segundo plano, nunca passava por aquele instante — e o destino sumia | `app/_layout.tsx` passou a delegar para `notificacoes/destino` |
| Um endereço desconhecido mostrava a tela crua do roteador: "Unmatched Route · Page could not be found", com a URL inteira e um link para o sitemap. Tela de ferramenta, em inglês, dentro de um produto usado por um eletricista de Canaã | `app/+not-found.tsx` |
| `pausarOportunidades` montava o objeto de preferências campo a campo — com a chegada dos avisos, salvar a pausa apagaria os três interruptores | `PreferenciasProvider.tsx` |
| A linha "Notificações" dizia que elas não existiam, em duas telas | capa das Configurações e Permissões |
| **Sair da conta não desligava a entrega.** O `signOut` disparava os dois `DELETE` juntos; o da sessão chegava primeiro, e o do aparelho levava 401 — a linha ficava com `revoked_at` nulo e **o telefone continuava recebendo as oportunidades privadas de quem tinha acabado de sair**. É o §57, o parágrafo que a especificação chama de crítico, e ele falhava em silêncio. Medido contra o servidor antes e depois: `401` e `revogado: false` virou `204` e `revogado: "saiu"` | `SessionProvider.signOut` — a ordem passou a ser a funcionalidade |
| Um aviso chegando enquanto a pessoa já olhava aquela mesma oportunidade levantava a faixa mesmo assim (§79) | `NotificacoesProvider`, comparando com a rota atual |

**Verificado**

| O quê | Como | Resultado |
| --- | --- | --- |
| Tipos | `npx tsc --noEmit`, nos dois projetos | limpo |
| Lint | `npx expo lint` e `npx eslint` | limpo |
| Testes do servidor | `npm test`, com 16 asserções novas de dispositivo e privacidade | 48/48 |
| Idempotência | registrar dez vezes a mesma instalação | uma linha |
| Troca de conta | B registra o aparelho de A | A para de receber na mesma escrita |
| Logout, na rota | revogação datada, e a linha continua existindo | conferido |
| **Logout, no caminho do aplicativo** | os dois `DELETE` na ordem do `signOut`, contra o servidor | antes: `401`, aparelho vivo. Depois da correção: `204`, `revogado: "saiu"` |
| Autorização | B tentando revogar o aparelho de A | recusado |
| Token morto | `DeviceNotRegistered` → revogado, e invalidar de novo não conta duas | conferido |
| Privacidade do texto | telefone, e-mail e endereço no corpo do aviso | os três recusados |
| A rota, de verdade | `curl` contra o servidor local e o banco de trabalho | 200 registrar, 200 idempotente, 200 segundo aparelho, 401 sem sessão, 401 sessão inventada, 400 corpo inválido, 400 sem instalação, 401 revogar sem sessão, 204 sair, 204 revogar de novo |
| Token na resposta | busca por `ExponentPushToken` no corpo do `POST` e do `GET` | nenhuma ocorrência |
| Bundles | Metro, iOS e Android | 200, ~10,9 MB nos dois |
| Isolamento da web | `expo-notifications` no bundle | 52 no iOS, **0** na web |
| Login real | e-mail e senha contra a API no ar, pelo navegador | entrou |
| **Cenário C** | `/oportunidade/o1` deslogado → login → o detalhe correto abre | conferido, com botão de voltar levando ao Início |
| Nada vaza antes do login | a tela de entrar com um destino pendente | nenhum dado da oportunidade |
| Destino atravessa reinício | pendente gravado numa execução, honrado na seguinte | conferido |
| Oportunidade indisponível | id inexistente, com sessão viva | "Esta oportunidade não está mais disponível", com saída para a Central; nenhum erro técnico |
| Rota desconhecida | `/coisa/que/nao/existe`, com e sem sessão | nenhuma tela crua do roteador |
| Convite | Home, claro e escuro, 393 e 320 | aparece, sem transbordo e sem alvo abaixo de 44 |
| "Agora não" | tocar, e depois reabrir o aplicativo | não volta a perguntar |
| Contagem única | selo da aba e "Precisa da sua atenção" | os dois em 3 |
| Percurso das telas novas | Notificações e Permissões, nos dois temas | claro e escuro refinados |
| Erros de console | quatro percursos completos | nenhum |
| Landing intacta | `git diff --stat -- "app/(site)" components public brand` | vazio |

**Não verificado aqui** — precisa do seu iPhone e das credenciais:

- **Push remoto de verdade.** Nada foi entregue a nenhum aparelho: falta a
  conta Expo (`eas init`), a chave APNs e a build de desenvolvimento — os três
  em `BLOCKERS.md` §7. **Não afirmo que push foi validado no iPhone**, porque
  não foi.
- Cold start pelo toque na notificação, foreground, background e app encerrado.
- O selo no ícone do aplicativo, os canais do Android e o agrupamento no
  Notification Center.
- O prompt do sistema — conceder, negar, negar de vez — e "abrir configurações
  do aparelho".
- Que o logout impede a entrega **de fato**. A revogação está conferida no
  banco, pelo caminho exato que o aplicativo usa; o que falta é a outra metade
  — mandar um push depois de sair e confirmar que nada chega.
- Persistência da sessão entre aberturas, que na web não existe por decisão da
  Fase 05 — e é por isso que o percurso de destino pendente foi conferido
  dentro de uma execução e entre execuções, mas não com sessão restaurada.

O roteiro completo para essa validação está em
[`NOTIFICACOES.md`](NOTIFICACOES.md), na seção "O roteiro no aparelho".

## Fase 07 — Reputação, avaliações, confiança e verificação · concluída

**A decisão que organizou a fase.** A API de dados continua não existindo, então
a pergunta foi a mesma da Fase 06: o que dá para construir de **verdade**? A
resposta, aqui, é tudo que é regra — média, elegibilidade, moderação, o texto do
push, a tradução do deep link. Nada disso depende de servidor, tudo isso é o que
passa despercebido numa captura de tela, e é por isso que virou lógica pura com
asserção em vez de comentário. As avaliações em si vêm dos exemplos declarados,
pela mesma porta (`EXPO_PUBLIC_DATA_API_URL`) que alimenta oportunidades e perfil.

**Feito — no aplicativo**

- **`src/reputacao/`**, com a mesma separação dos outros módulos. E uma regra que
  vive no **tipo**, não numa tela: `media` é `number | null`. Um perfil sem
  avaliações não tem média — ele não tem *zero*. "0,0 ★" num perfil novo diz
  "profissional ruim" quando o que existe é ausência de dado, e no lançamento a
  maioria dos parceiros legítimos vai estar exatamente aí. Sendo `null` no tipo,
  nenhuma tela futura consegue regredir para "0,0" por descuido.
- **`resumir()` é a fonte única do cálculo.** Perfil, prévia e lista chamam essa
  função e nenhuma outra. Duas contas independentes divergem no primeiro caso de
  borda, e quando divergem quem perde credibilidade é a plataforma.
- **`elegibilidade.ts`** — quem pode avaliar, como lógica pura. Autoavaliação,
  quem não participou, serviço que não aconteceu, avaliação repetida e prazo
  vencido: cinco impedimentos, cada um com asserção. **Não existe avaliação
  pública irrestrita.** E "serviço realizado" é o único resultado que habilita:
  encerrada não quer dizer atendida.
- **Moderação com quatro estados**, e só `publicada` conta na média. A escolha
  que precisou de justificativa é `em-analise` **não** contar: contar uma
  avaliação que talvez seja fraude deixa a fraude funcionar enquanto a análise
  corre. Como a análise só começa por uma denúncia, a saída fica **visível** — a
  lista diz "em análise" e o resumo informa quantas estão fora da conta, em vez
  de a média mudar sozinha.
- **Contestar não remove.** A avaliação vira `em-analise` e continua existindo,
  visível, com o estado escrito. E a folha diz isso **antes** do envio.
- **Uma resposta, e ela é um objeto e não uma lista** — a forma do dado é o que
  impede a thread de nascer. Editável e apagável; apagar a resposta não apaga a
  avaliação.
- **O que o profissional não pode fazer não existe como função.** Não há
  `removerAvaliacao` no repositório, não há alterar nota, não há editar o
  comentário do cliente. Não é permissão negada em tempo de execução: é operação
  ausente do módulo.
- **Privacidade na origem.** O objeto `Avaliacao` não tem telefone, e-mail nem id
  de morador **para vazar**. `autor` chega pronto: "Cliente Canaã Resolve".
- **Verificação com significado** (`verificacao.ts`): cada tipo com o que foi
  conferido e o que aquilo **não** cobre, mais a frase obrigatória de que
  verificação não é garantia. Três conferências viram **um** selo, não três.
- **Fundador continua separado da nota**, e a folha diz com todas as letras que
  ele não é avaliação nem prioridade.
- **Push e deep link reutilizam a Fase 06 inteira.** Tipo novo `avaliacao.nova`,
  com interruptor próprio; o aviso **não carrega a nota nem o comentário**; o
  destino é `avaliacao/:id`, traduzido para a rota interna em um lugar só.
- **O selo da aba não foi tocado.** As não lidas alimentam um ponto discreto no
  Perfil, e nada mais.
- Domínio documentado em [`REPUTACAO.md`](REPUTACAO.md).

**Feito — no repositório do site**

- `avisoDeNovaAvaliacao` em `lib/push/mensagens.ts`, passando pela mesma
  `conferirPrivacidade` dos outros avisos.
- `tests/reputacao.test.ts`, 52 asserções sobre média, moderação, elegibilidade,
  saneamento de texto, verificação, o push e o deep link.

**Corrigido no caminho** (achado olhando o produto, não o código):

| O que estava errado | Onde |
| --- | --- |
| **`porId` tinha lista de dependências vazia.** A tela de detalhe guarda a avaliação num `useMemo` com `[id, porId]`, e com `porId` estável **o memo nunca recalculava**: publicar uma resposta gravava tudo certo e a tela continuava mostrando o objeto de antes, ainda oferecendo "Responder". Idem para a contestação. Tipo, lint e as 44 asserções passavam todos | `ReputacaoProvider` |
| O ponto de "ainda não li" **vazava para a prévia pública** — um ponto verde ao lado da nota que o morador leria como algum estado do profissional | `CartaoDeAvaliacao` ganhou `publico` |
| O filtro por nota desenhava `<Estrelas nota={1} />` em cada chip: cinco estrelas com uma preenchida ao lado de um "5", dizendo duas coisas contraditórias | `UmaEstrela`, ícone de unidade |
| Alvos de 36 e de 28 px — os chips do filtro e o link "Como funcionam" | ambos para 44 |
| "por não corresponde a um serviço meu": os rótulos de motivo são orações e não cabem depois de "por" | o motivo passou a entrar entre aspas |
| **`comoRota` descartava tudo até a primeira barra em todo esquema**, como se sempre houvesse host. `canaaresolve://oportunidade/o1` virava `o1` e não abria nada. Defeito herdado da Fase 06, invisível porque o push manda o destino *sem* esquema — quem passava por ali era um link de verdade, tocado fora do aplicativo | `notificacoes/rotas.ts` |

**Verificado**

| O quê | Como | Resultado |
| --- | --- | --- |
| Tipos | `npx tsc --noEmit`, nos dois projetos | limpo |
| Lint | `npx expo lint` e `npx eslint` | limpo |
| Testes | `npm test`, com 52 asserções novas em `tests/reputacao.test.ts` | 100/100 |
| Média | zero, uma, três, cinco, e com removida e em análise no meio | `null` quando não há; 4,7 e não 4,66667; removida não contamina |
| Elegibilidade | os cinco impedimentos, mais a janela de edição | conferidos |
| "Serviço realizado" é o único que habilita | os outros cinco resultados | os cinco recusados |
| Deep link | as três formas, ida e volta, e o esquema próprio | idempotente; a regressão da Fase 06 coberta |
| Push de avaliação | busca por nota e por comentário no texto | nenhum dos dois; privacidade limpa |
| Percurso completo | perfil → lista → detalhe → responder → contestar → prévia | claro e escuro, 393 e 320 |
| Estados de confiança | empresa verificada com **zero** avaliações, folha de verificação, duas avaliações, negativa, em análise | os cinco conferidos |
| "0,0" | busca no texto de **toda** tela capturada | nenhuma ocorrência |
| Ranking e gamificação | busca por "Top 1", "Mais bem avaliado", "Score", "garantido" | nenhuma ocorrência |
| Erro isolado | avaliações no cenário "erro", com o Perfil aberto | a caixa falha e diz; as seis seções continuam inteiras |
| Amostra pequena | duas avaliações | sem distribuição, sem filtro, e a frase não conclui nada |
| Alvos de toque | medição do DOM em todas as telas, 393 e 320 | nenhum abaixo de 44 |
| Transbordo horizontal | 320 e 393 | nenhum |
| Erros de console | quatro percursos completos, nos dois temas | nenhum |
| Selo da aba | contagem de Oportunidades ao longo do percurso | continua 3; nenhuma avaliação entrou nele |
| Landing intacta | `git diff --stat -- "app/(site)" components public brand` | vazio |

**Não verificado aqui** — precisa de aparelho:

- **Push de avaliação nova entregue de verdade.** Falta o mesmo da Fase 06: conta
  Expo, chave APNs e build de desenvolvimento (`BLOCKERS.md` §7). **Não afirmo
  que chegou em nenhum iPhone**, porque não chegou.
- Cold start pelo toque num aviso de avaliação.
- Haptics do publicar e do contestar.
- O teclado real subindo sob a folha de resposta — `comTeclado` foi escrito para
  isso e o navegador não tem teclado de sistema.
- Dynamic Type acima do teto, Liquid Glass nativo, Safe Areas com Dynamic Island,
  Android físico.

## Próxima fase — quando esta for aprovada

A Fase 07 para aqui, de propósito. Não foram começados: assinatura, planos,
pagamentos, analytics comercial, área do morador, chat, ranking, marketplace
nem Central de Notificações.

Continuam de fora, pelo mesmo motivo de sempre: a **API de dados**, que é o que
separa este aplicativo de ser real por inteiro depois do login, e os
Universal Links, que dependem do Team ID da Apple (`BLOCKERS.md` §8).
