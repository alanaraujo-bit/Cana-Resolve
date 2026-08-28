/**
 * A preferência de tema, gravada no aparelho.
 *
 * É a única preferência que precisa estar pronta **antes do primeiro quadro**.
 * Uma leitura assíncrona resolvida depois da primeira pintura faz o aplicativo
 * abrir escuro e piscar para claro — o tipo de detalhe que faz um produto
 * parecer improvisado. Por isso quem espera por ela é a raiz, junto com as
 * fontes: `app/_layout.tsx` já segura a splash até tudo estar pronto.
 *
 * Ela **não** pertence à conta. Sair não a apaga: quem escolheu escuro escolheu
 * para este aparelho, não para este login. Ver `session/chaves.ts`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { chaves } from '@/session/chaves';

export type ThemePreference = 'system' | 'light' | 'dark';

const validas: readonly ThemePreference[] = ['system', 'light', 'dark'];

export async function lerPreferenciaDeTema(): Promise<ThemePreference> {
  try {
    const lido = await AsyncStorage.getItem(chaves.tema);
    return validas.includes(lido as ThemePreference) ? (lido as ThemePreference) : 'system';
  } catch {
    // Armazenamento indisponível não pode travar a abertura: "Sistema" é o
    // padrão certo e o que o sistema operacional já sabe responder.
    return 'system';
  }
}

export async function gravarPreferenciaDeTema(valor: ThemePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(chaves.tema, valor);
  } catch {
    /* silencioso: é preferência, não dado crítico */
  }
}
