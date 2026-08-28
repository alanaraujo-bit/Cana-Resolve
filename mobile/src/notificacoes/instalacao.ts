/**
 * A identidade desta instalação do aplicativo.
 *
 * É um número sorteado uma vez e guardado no aparelho. Três coisas que ele
 * **não** é, e cada uma responde a um parágrafo da especificação:
 *
 * - **Não é o usuário.** Um aparelho passa de mão, e duas contas podem entrar
 *   nele. Quem manda no vínculo é o servidor, na hora do registro (§58).
 * - **Não é o token de push.** O token muda quando o sistema quiser (§56); a
 *   instalação não. Chavear o cadastro pelo token faria lixo acumular a cada
 *   renovação, e um aparelho viraria dez linhas.
 * - **Não vem do hardware.** Nada de IDFV, serial ou publicidade. Um
 *   identificador de aparelho seguiria a pessoa entre desinstalações e entre
 *   contas — que é exatamente o rastro que não queremos deixar (§54).
 *
 * Por isso ele **sobrevive ao logout** e morre na desinstalação: é do
 * aparelho, como o tema e o onboarding. Ver `session/chaves.ts`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { chaves } from '@/session/chaves';

let emMemoria: string | null = null;

function sortear(): string {
  // 16 bytes em hexadecimal: 32 caracteres, dentro da régua do servidor.
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * O identificador desta instalação, criando-o na primeira vez.
 *
 * Guarda em memória além do disco: ele é lido a cada registro, e uma leitura
 * de disco por abertura basta.
 */
export async function idDaInstalacao(): Promise<string> {
  if (emMemoria) return emMemoria;

  try {
    const guardado = await AsyncStorage.getItem(chaves.instalacao);
    if (guardado && guardado.length >= 8) {
      emMemoria = guardado;
      return guardado;
    }
  } catch {
    /* disco indisponível: segue para o sorteio */
  }

  const novo = sortear();
  emMemoria = novo;
  try {
    await AsyncStorage.setItem(chaves.instalacao, novo);
  } catch {
    // Sem disco, o identificador vale só enquanto o aplicativo estiver aberto.
    // O registro continua funcionando; o que se perde é a idempotência entre
    // aberturas, e o servidor absorve isso com uma linha a mais, não com um
    // erro.
  }
  return novo;
}

/** Só para a área de desenvolvimento: recomeça como se fosse outra instalação. */
export async function esquecerInstalacao(): Promise<void> {
  emMemoria = null;
  try {
    await AsyncStorage.removeItem(chaves.instalacao);
  } catch {
    /* melhor esforço */
  }
}
