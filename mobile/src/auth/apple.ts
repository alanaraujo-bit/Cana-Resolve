/**
 * Continuar com a Apple.
 *
 * O botão é o componente oficial (`AppleAuthenticationButton`) — desenho,
 * texto e proporções vêm da Apple, como as regras da App Store exigem. Ele só
 * aparece quando o próprio sistema confirma que o recurso está disponível.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { AuthError } from './errors';

export type AppleCredencial = {
  tipo: 'apple';
  identityToken: string;
  nomeCompleto?: string | null;
};

export async function appleDisponivel(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function iniciarApple(): Promise<AppleCredencial> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new AuthError('desconhecido', 'A Apple não devolveu identityToken.');
    }

    const nome = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ');

    return {
      tipo: 'apple',
      identityToken: credential.identityToken,
      nomeCompleto: nome || null,
    };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    const code = (error as { code?: string })?.code;
    if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') {
      throw new AuthError('cancelado');
    }
    throw new AuthError('indisponivel', code ?? String(error));
  }
}
