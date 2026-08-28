/**
 * Entrar com o Google — o fluxo real, com PKCE, sem segredo no aplicativo.
 *
 * O aplicativo abre a tela de consentimento do Google, recebe um `code` e o
 * entrega à API do Canaã Resolve, que troca por sessão. O `client secret`
 * nunca passa por aqui.
 *
 * Sem `EXPO_PUBLIC_GOOGLE_CLIENT_ID_*`, `googleDisponivel` é falso e a tela de
 * login trata o botão como indisponível — sem quebrar nada.
 */
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { googleClientId } from './config';
import { AuthError } from './errors';

WebBrowser.maybeCompleteAuthSession();

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

function plataforma(): 'ios' | 'android' | 'web' {
  return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
}

export function googleDisponivel(): boolean {
  return googleClientId(plataforma()) !== null;
}

export type GoogleCredencial = {
  tipo: 'google';
  code: string;
  codeVerifier?: string;
  redirectUri: string;
};

export async function iniciarGoogle(): Promise<GoogleCredencial> {
  const clientId = googleClientId(plataforma());
  if (!clientId) {
    throw new AuthError(
      'nao-configurado',
      'EXPO_PUBLIC_GOOGLE_CLIENT_ID_* ainda não foi definido — veja BLOCKERS.md.',
    );
  }

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'canaaresolve', path: 'oauth/google' });

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: ['openid', 'profile', 'email'],
    usePKCE: true,
    extraParams: { prompt: 'select_account' },
  });

  const result = await request.promptAsync(discovery);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new AuthError('cancelado');
  }
  if (result.type !== 'success' || !result.params.code) {
    throw new AuthError('desconhecido', `Retorno inesperado do Google: ${result.type}`);
  }

  return {
    tipo: 'google',
    code: result.params.code,
    codeVerifier: request.codeVerifier,
    redirectUri,
  };
}
