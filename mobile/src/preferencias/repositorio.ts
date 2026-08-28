/**
 * De onde as preferências da conta vêm, e para onde vão.
 *
 * A única fronteira do módulo com "o mundo", como no Perfil e nas
 * Oportunidades. As telas chamam `ler` e `salvar`; elas não sabem — e não devem
 * saber — se aquilo dorme no aparelho ou viaja para o servidor.
 *
 * Enquanto a API de dados não existir, a preferência é gravada **neste
 * aparelho** e a interface diz isso com todas as letras. Não é simulação: a
 * escolha é real e tem efeito real (a Home muda), só não alcança o servidor
 * ainda — que é exatamente o que a tela informa. No dia em que
 * `EXPO_PUBLIC_DATA_API_URL` for preenchida, o que muda é este arquivo.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { authConfig } from '@/auth/config';
import { chaves } from '@/session/chaves';
import { preferenciasPadrao, type PreferenciasDaConta } from './tipos';

/**
 * A porta é a API de **dados**, não a de autenticação. A separação existe
 * desde 28/08/2026, quando ligar o login apagou os exemplos do aplicativo
 * inteiro — ver `auth/config.ts`.
 */
export function apenasNesteAparelho(): boolean {
  return !authConfig.dataApiBaseUrl;
}

type Gravado = { oportunidadesPausadas?: boolean; pausadasEm?: string | null };

export async function lerPreferencias(): Promise<PreferenciasDaConta> {
  try {
    const bruto = await AsyncStorage.getItem(chaves.preferenciasDaConta);
    if (!bruto) return preferenciasPadrao;

    const lido = JSON.parse(bruto) as Gravado;
    return {
      oportunidadesPausadas: lido.oportunidadesPausadas === true,
      pausadasEm: lido.pausadasEm ? new Date(lido.pausadasEm) : null,
    };
  } catch {
    // Preferência ilegível não pode impedir o aplicativo de abrir: o padrão é
    // "recebendo", que é o estado que não surpreende ninguém.
    return preferenciasPadrao;
  }
}

/**
 * Grava a preferência.
 *
 * Lança quando falha — e a tela precisa disso: uma preferência que parece
 * salva e não foi é pior do que uma que avisa. Ver §62 da Fase 05.
 */
export async function salvarPreferencias(p: PreferenciasDaConta): Promise<void> {
  const gravado: Gravado = {
    oportunidadesPausadas: p.oportunidadesPausadas,
    pausadasEm: p.pausadasEm ? p.pausadasEm.toISOString() : null,
  };

  await AsyncStorage.setItem(chaves.preferenciasDaConta, JSON.stringify(gravado));

  // Quando existir servidor, a chamada entra aqui — e o armazenamento local
  // continua, como espelho para o aplicativo abrir sem rede.
}
