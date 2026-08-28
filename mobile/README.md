# Canaã Resolve — aplicativo

O aplicativo nativo do **Canaã Resolve**, em Expo / React Native. Esta é a
**Fase 01**: entrada do aplicativo, onboarding, login e a fundação de design,
movimento e autenticação que o resto do produto vai herdar.

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

Tudo opcional. Sem nada preenchido o aplicativo abre normalmente — onboarding e
login funcionam, e a autenticação se declara indisponível em vez de fingir que
funcionou. O que falta está em [`../BLOCKERS.md`](../BLOCKERS.md).

## Estrutura

```
app/                    rotas (expo-router)
  _layout.tsx           provedores, fontes, fundo de marca e o porteiro de sessão
  index.tsx             partida — não desenha nada, só espera a decisão
  onboarding.tsx        as três páginas
  entrar.tsx            login
  (app)/                a área do profissional: Início, Pedidos, Perfil
src/
  theme/                tokens e o provedor de tema (claro, escuro, acessibilidade)
  ui/                   Button, TextField, Text, GlassSurface, ícones, fundo, haptics
  navigation/           a barra principal de abas
  onboarding/stages.tsx as três composições visuais
  pedidos/              tipos, exemplos de desenvolvimento, fonte de dados, componentes
  session/              máquina de estados da entrada + persistência local
  auth/                 config, erros, contrato da API, Google e Apple
assets/                 ícones e splash, gerados a partir da marca do site
```

## O que já está decidido

[`FUNDACAO.md`](FUNDACAO.md) — paleta, tipografia, espaço, raio, componentes,
movimento, haptics, Liquid Glass e seus fallbacks, safe area. É a referência das
próximas telas.

[`HOME.md`](HOME.md) — a área do profissional: navegação, anatomia da Home,
prioridade dos pedidos, estados da tela e taxonomia dos pedidos.

[`PROGRESSO.md`](PROGRESSO.md) — o que foi feito nesta fase, o que foi
verificado e o que vem depois.

## Fora de escopo por enquanto

Lista completa de pedidos, tela do pedido, perfil completo, configurações,
pagamentos, notificações, chat, área do morador e cadastro aberto. A arquitetura
os acomoda; nenhum deles foi construído.
