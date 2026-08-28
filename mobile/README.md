# Canaã Resolve — aplicativo

O aplicativo nativo do **Canaã Resolve**, em Expo / React Native — o lado de
quem atende. Quatro fases construídas:

| Fase | O quê | Onde se lê o porquê |
| --- | --- | --- |
| 01 | Fundação, onboarding e login | [`FUNDACAO.md`](FUNDACAO.md) |
| 02 | Home do profissional e as três abas | [`HOME.md`](HOME.md) |
| 03 | Central de Oportunidades e a tela da oportunidade | [`DOMINIO-OPORTUNIDADES.md`](DOMINIO-OPORTUNIDADES.md) |
| 04 | Perfil profissional e a prévia pública | [`PERFIL.md`](PERFIL.md) |

**A entrada é real.** Desde 28/08/2026 o login vai contra a API em produção e
os parceiros de verdade do banco — não há atalho fingindo autenticar. Já as
oportunidades e o perfil que aparecem depois dela ainda são **exemplos
declarados**: a API de dados não existe. Ver "Variáveis", abaixo.

O site (a landing, `/solicitar`, `/parceiros`) continua na raiz do repositório e
não foi tocado. Este diretório é um projeto à parte, com o seu próprio
`package.json` e o seu próprio `node_modules`.

## Rodando

```bash
cd mobile
npm install
npm start          # servidor de desenvolvimento + QR code
npm run tunnel     # o mesmo, quando o celular não está na mesma rede
```

Abra o Expo Go no iPhone e leia o QR. Testado com **Expo SDK 54**, que é a
versão do Expo Go 1017756 (a mais recente disponível para iOS na App Store).

```bash
npm run typecheck  # tsc --noEmit
npm run lint       # expo lint
npm run doctor     # expo-doctor: versões e configuração
```

## Variáveis

```bash
cp .env.exemplo .env
```

Duas bases de API, separadas de propósito porque não ficaram prontas no mesmo
dia:

| Variável | Hoje | O que muda |
| --- | --- | --- |
| `EXPO_PUBLIC_AUTH_API_URL` | `https://canaaresolve.aionixdev.com/api/v1` | a entrada é real |
| `EXPO_PUBLIC_DATA_API_URL` | **vazia** | enquanto assim, oportunidades e perfil usam exemplos |

Juntá-las numa variável só foi o erro que se pagou em 28/08/2026: ligar o login
apagou os exemplos e deixou o aplicativo inteiro mostrando erro.

Sem nada preenchido o aplicativo continua abrindo — cada caminho que depende de
servidor se declara indisponível em vez de fingir que funcionou. O que falta
está em [`../BLOCKERS.md`](../BLOCKERS.md).

**Para entrar de verdade** é preciso um parceiro com senha, e o cadastro
público não pede nenhuma. Quem dá a primeira é o comando na raiz do
repositório:

```bash
npm run parceiro:senha -- listar
npm run parceiro:senha -- definir PA-0002 parceiro@exemplo.com
```

## Estrutura

```
app/                    rotas (expo-router)
  _layout.tsx           provedores, fontes, fundo de marca e o porteiro de sessão
  index.tsx             partida — não desenha nada, só espera a decisão
  onboarding.tsx        as três páginas
  entrar.tsx            login
  (app)/                a área do profissional
    (abas)/             Início, Oportunidades, Perfil
      perfil/           a capa e as seis seções de edição, mais a prévia
    oportunidade/[id]   a tela da oportunidade — fora das abas, para abrir por link
src/
  theme/                tokens e o provedor de tema (claro, escuro, acessibilidade)
  ui/                   Button, TextField, Text, GlassSurface, Sheet, ícones, haptics
  navigation/           a barra principal de abas
  onboarding/stages.tsx as três composições visuais
  oportunidades/        domínio, exemplos, repositório, estado e componentes
  perfil/               domínio, catálogo, completude, validação, imagem, estado
  session/              máquina de estados da entrada + persistência local
  auth/                 config, erros, contrato da API, Google e Apple
assets/                 ícones e splash, gerados a partir da marca do site
```

Cada módulo de dados segue a mesma separação: `tipos.ts` é o contrato,
`exemplos.ts` só existe em desenvolvimento, `repositorio.ts` é a única fronteira
com o mundo, e um provedor acima das telas é a fonte única de estado.

## O que já está decidido

[`FUNDACAO.md`](FUNDACAO.md) — paleta, tipografia, espaço, raio, componentes,
movimento, haptics, Liquid Glass e seus fallbacks, safe area. É a referência das
próximas telas.

[`HOME.md`](HOME.md) — a área do profissional: navegação, anatomia da Home,
prioridade das oportunidades e estados da tela.

[`DOMINIO-OPORTUNIDADES.md`](DOMINIO-OPORTUNIDADES.md) — o que é uma
oportunidade, os cinco estados, as ações, o encerramento e a privacidade.

[`PERFIL.md`](PERFIL.md) — o que o perfil representa, o que aparece para quem,
e o que ainda depende de servidor.

[`PROGRESSO.md`](PROGRESSO.md) — o que cada fase entregou, o que foi
verificado de verdade e o que não foi.

## Fora de escopo por enquanto

Configurações, criação e recuperação de senha pelo próprio parceiro,
notificações, avaliações, plano, financeiro, chat, área do morador e analytics
conectado. A arquitetura os acomoda; nenhum deles foi construído.

E a **API de dados** — a leitura e a escrita de oportunidades e perfil contra o
servidor. É o que separa este aplicativo de ser real por inteiro.
