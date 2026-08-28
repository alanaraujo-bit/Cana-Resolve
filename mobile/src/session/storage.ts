/**
 * Persistência local. Duas gavetas, com responsabilidades separadas:
 *
 * - `AsyncStorage` para preferências sem valor de segurança (o onboarding já
 *   foi visto, o tema escolhido). Perder isso não machuca ninguém.
 * - `SecureStore` (Keychain/Keystore) para a credencial de sessão. Nada de
 *   token em armazenamento comum — nem por conveniência, nem "só na web".
 *
 * Que chave sobrevive ao logout e qual morre está em `chaves.ts`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Account } from './SessionProvider';
import { chaves, chavesDaConta } from './chaves';

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(chaves.onboarding)) === 'true';
  } catch {
    // Armazenamento indisponível não pode travar a abertura do aplicativo:
    // no pior caso o onboarding aparece de novo.
    return false;
  }
}

export async function markOnboardingCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(chaves.onboarding, 'true');
  } catch {
    /* silencioso de propósito: é preferência, não dado crítico */
  }
}

export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(chaves.onboarding);
  } catch {
    /* idem */
  }
}

/* -------------------------------------------------------------------------- */
/*  Sessão                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * O que fica guardado entre uma abertura e outra.
 *
 * A conta vai junto com o token por um motivo de experiência: sem ela, toda
 * abertura mostraria uma tela vazia até o servidor responder. Ela é um retrato
 * do último instante conhecido — quem confirma se ainda vale é o servidor, na
 * primeira coisa que o aplicativo faz depois de abrir.
 */
export type SessaoGuardada = { token: string; conta: Account };

/**
 * `SecureStore` não existe na web. A prévia no navegador, então, **não**
 * guarda sessão — e é o comportamento certo: a alternativa seria `localStorage`,
 * que é exatamente onde um token não pode ficar. Quem testa no navegador entra
 * de novo a cada recarga; no aparelho, que é onde o produto vive, a sessão
 * persiste.
 */
const secureAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

export function guardaSeguraDisponivel(): boolean {
  return secureAvailable;
}

export async function readStoredSession(): Promise<SessaoGuardada | null> {
  if (!secureAvailable) return null;
  try {
    const bruto = await SecureStore.getItemAsync(chaves.sessao);
    if (!bruto) return null;
    const lido = JSON.parse(bruto) as Partial<SessaoGuardada>;
    // Formato antigo ou corrompido não pode virar uma sessão pela metade.
    if (!lido?.token || !lido.conta?.id) {
      await clearStoredSession();
      return null;
    }
    return { token: lido.token, conta: lido.conta as Account };
  } catch {
    return null;
  }
}

export async function writeStoredSession(sessao: SessaoGuardada): Promise<void> {
  if (!secureAvailable) return;
  try {
    await SecureStore.setItemAsync(chaves.sessao, JSON.stringify(sessao), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    /* sem sessão persistida: o usuário entra de novo na próxima abertura */
  }
}

export async function clearStoredSession(): Promise<void> {
  if (!secureAvailable) return;
  try {
    await SecureStore.deleteItemAsync(chaves.sessao);
  } catch {
    /* idem */
  }
}

/**
 * Apaga o que pertence à conta que está saindo — e só isso.
 *
 * Onboarding e tema ficam. Ver `chaves.ts` para a lista e o porquê.
 */
export async function clearAccountData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([...chavesDaConta]);
  } catch {
    /* melhor esforço: o que não sair daqui é sobrescrito no próximo login */
  }
}
