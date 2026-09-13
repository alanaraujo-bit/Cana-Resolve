/**
 * Configuração de autenticação — tudo que vem de fora do código.
 *
 * Nada aqui é segredo: apenas identificadores públicos de cliente OAuth e a
 * base da API. Eles chegam por variáveis `EXPO_PUBLIC_*` (arquivo `.env`, que
 * não é versionado) e, quando faltam, o aplicativo continua perfeitamente
 * utilizável — os caminhos que dependem deles se declaram indisponíveis.
 *
 * O que precisa ser preenchido está listado em `BLOCKERS.md`.
 */

function read(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const authConfig = {
  /** Base da API de autenticação do Canaã Resolve. Ex.: https://.../api/v1 */
  apiBaseUrl: read(process.env.EXPO_PUBLIC_AUTH_API_URL),
  /**
   * Base da API que serve **dados** — oportunidades, perfil.
   *
   * Separada da autenticação de propósito. As duas nasceram no mesmo endereço,
   * mas não ficam prontas no mesmo dia: em 28/08/2026 a entrada passou a ser
   * real e a leitura de dados ainda não existia. Enquanto isso for uma
   * variável só, ligar o login apaga os exemplos e deixa o aplicativo inteiro
   * mostrando erro — que é exatamente o que aconteceu.
   *
   * Enquanto estiver vazia, os módulos de dados seguem com exemplos declarados
   * em desenvolvimento, e em produção se declaram indisponíveis.
   */
  dataApiBaseUrl: read(process.env.EXPO_PUBLIC_DATA_API_URL),
  /**
   * Vitrine: liga os exemplos declarados fora do desenvolvimento.
   *
   * Sem isto, um pacote de release sem API de dados não fica vazio — ele
   * **falha**: `exigirExemplos` levanta erro e toda tela de dados vira
   * estado de falha. Isso é o certo para produção e o errado para um pacote
   * que existe só para alguém olhar a interface antes de a leitura existir.
   *
   * Fica atrás de uma variável própria, e não de `__DEV__`, porque quem
   * compila a vitrine é quem escreve `EXPO_PUBLIC_DEMO=1` — vazio, que é o
   * padrão, mantém produção exatamente como estava.
   */
  demo: read(process.env.EXPO_PUBLIC_DEMO) === '1',
  google: {
    ios: read(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS),
    android: read(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID),
    web: read(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB),
  },
} as const;

/**
 * Se os exemplos declarados podem aparecer no lugar da API que ainda não
 * existe. Verdadeiro em desenvolvimento e na vitrine; falso em produção.
 */
export const comExemplos = __DEV__ || authConfig.demo;

export function googleClientId(platform: 'ios' | 'android' | 'web'): string | null {
  return authConfig.google[platform] ?? authConfig.google.web;
}

export const backendReady = authConfig.apiBaseUrl !== null;
