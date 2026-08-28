/**
 * Persistência local. Duas gavetas, com responsabilidades separadas:
 *
 * - `AsyncStorage` para preferências sem valor de segurança (o onboarding já
 *   foi visto). Perder isso não machuca ninguém.
 * - `SecureStore` (Keychain/Keystore) para credencial de sessão, quando ela
 *   existir. Nada de token em armazenamento comum.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ONBOARDING_KEY = 'cr.onboarding.completed.v1';
const SESSION_KEY = 'cr.session.v1';

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'true';
  } catch {
    // Armazenamento indisponível não pode travar a abertura do aplicativo:
    // no pior caso o onboarding aparece de novo.
    return false;
  }
}

export async function markOnboardingCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    /* silencioso de propósito: é preferência, não dado crítico */
  }
}

export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch {
    /* idem */
  }
}

const secureAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

export async function readStoredSession(): Promise<string | null> {
  if (!secureAvailable) return null;
  try {
    return await SecureStore.getItemAsync(SESSION_KEY);
  } catch {
    return null;
  }
}

export async function writeStoredSession(value: string): Promise<void> {
  if (!secureAvailable) return;
  try {
    await SecureStore.setItemAsync(SESSION_KEY, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    /* sem sessão persistida: o usuário entra de novo na próxima abertura */
  }
}

export async function clearStoredSession(): Promise<void> {
  if (!secureAvailable) return;
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    /* idem */
  }
}
