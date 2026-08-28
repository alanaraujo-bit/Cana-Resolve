/**
 * O que o aplicativo sabe sobre si mesmo, e para onde ele aponta fora de casa.
 *
 * Um lugar só, por dois motivos. O primeiro é banal: versão escrita à mão em
 * uma tela envelhece no dia seguinte — aqui ela sai do `app.json`, que é o
 * mesmo número que vai para a loja. O segundo importa mais: **nada que sai
 * daqui pode carregar dado pessoal**. A informação de suporte leva versão,
 * plataforma e sistema; não leva e-mail, token, nome nem nada da conta (§93 e
 * §94 da Fase 05).
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** O site é a fonte oficial dos documentos — não existe cópia aqui dentro. */
const SITE = 'https://canaaresolve.aionixdev.com';

export const links = {
  termos: `${SITE}/termos`,
  privacidade: `${SITE}/privacidade`,
  site: SITE,
  parceiros: `${SITE}/parceiros`,
} as const;

/** O canal oficial de atendimento. Ver `site.whatsapp` no repositório do site. */
export const suporte = {
  whatsapp: '5594991205078',
  whatsappLegivel: '(94) 99120-5078',
  email: 'contato@canaaresolve.aionixdev.com',
} as const;

export const NOME_DO_APLICATIVO = 'Canaã Resolve';
export const EMPRESA = 'Aionix';

/**
 * A versão publicada. Sai do `app.json` e nunca de um literal na tela.
 *
 * Sem valor — o que só acontece se alguém apagar `version` do `app.json` — a
 * tela não inventa um: mostra o traço, que é a resposta honesta.
 */
export function versao(): string {
  return Constants.expoConfig?.version ?? '—';
}

/**
 * O identificador de build, quando existe.
 *
 * Só há um quando o aplicativo foi empacotado para a loja; no Expo Go e no
 * desenvolvimento não existe, e a linha some da tela em vez de mostrar "null".
 */
export function build(): string | null {
  const ios = Constants.expoConfig?.ios?.buildNumber;
  const android = Constants.expoConfig?.android?.versionCode;
  if (Platform.OS === 'ios' && ios) return String(ios);
  if (Platform.OS === 'android' && android) return String(android);
  return null;
}

export function plataformaLegivel(): string {
  if (Platform.OS === 'ios') return 'iOS';
  if (Platform.OS === 'android') return 'Android';
  return 'Navegador';
}

export function sistemaLegivel(): string {
  // Só iOS e Android têm uma versão de sistema que diga alguma coisa. Na prévia
  // pelo navegador o React Native devolve `0.0.0` — ruído com cara de dado, e
  // um número falso é pior que nenhum numa mensagem para o suporte.
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return plataformaLegivel();
  const v = Platform.Version;
  return v ? `${plataformaLegivel()} ${v}` : plataformaLegivel();
}

/**
 * O texto que a pessoa copia para mandar ao suporte.
 *
 * A lista é fechada de propósito. Se um dia alguém for tentado a acrescentar
 * "e o e-mail, para facilitar" — não: quem escreve para o suporte já está
 * identificado pela conversa, e um texto que circula por WhatsApp não é lugar
 * de dado de conta.
 */
export function informacoesTecnicas(): string {
  const linhas = [
    `${NOME_DO_APLICATIVO} ${versao()}`,
    build() ? `Build ${build()}` : null,
    sistemaLegivel(),
  ].filter(Boolean);
  return linhas.join(' · ');
}

/**
 * A mensagem inicial da conversa com o suporte.
 *
 * Ela é **preenchida e nunca enviada**: quem aperta enviar é a pessoa, dentro
 * do WhatsApp. É a mesma regra do contato com o morador, na Fase 03.
 */
export function linkDoSuporte(assunto: 'ajuda' | 'problema' | 'exclusao'): string {
  const introducao =
    assunto === 'problema'
      ? 'Olá! Encontrei um problema no aplicativo Canaã Resolve.'
      : assunto === 'exclusao'
        ? 'Olá! Quero solicitar a exclusão da minha conta de parceiro no Canaã Resolve.'
        : 'Olá! Preciso de ajuda com o aplicativo Canaã Resolve.';

  const texto = `${introducao}\n\n${informacoesTecnicas()}`;
  return `https://wa.me/${suporte.whatsapp}?text=${encodeURIComponent(texto)}`;
}
