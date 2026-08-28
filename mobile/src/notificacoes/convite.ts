/**
 * O que a pessoa respondeu quando convidamos a ativar as notificações.
 *
 * Existe por causa de um parágrafo curto e sério: **"agora não" precisa ser
 * respeitado** (§33). Sem memória, o convite reapareceria a cada abertura, e um
 * aplicativo que repete o mesmo pedido até alguém ceder é o dark pattern que o
 * §32 proíbe pelo nome.
 *
 * Duas coisas que ele **não** é:
 *
 * - **Não é a permissão.** A permissão mora no sistema operacional e é lida de
 *   lá, sempre (§91). Isto aqui é só a lembrança de que já perguntamos. Alguém
 *   que reinstala o aplicativo tem esta memória zerada e a permissão real
 *   consultada — nessa ordem de autoridade.
 * - **Não é da conta.** Quem foi convidado foi quem segura o aparelho, e o
 *   sistema operacional só pergunta uma vez por instalação. Por isso a chave
 *   sobrevive ao logout, ao lado do tema e do onboarding
 *   (`session/chaves.ts`).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { chaves } from '@/session/chaves';

export type RespostaDoConvite =
  /** Ninguém foi convidado ainda. */
  | 'nao-perguntamos'
  /** Tocou em "Ativar notificações". */
  | 'aceitou'
  /** Tocou em "Agora não". Não perguntamos de novo por conta própria. */
  | 'adiou'
  /** Aceitou o convite, e disse não ao sistema. */
  | 'negou';

const VALIDAS: readonly RespostaDoConvite[] = ['aceitou', 'adiou', 'negou'];

export const responderConvite = {
  async ler(): Promise<RespostaDoConvite> {
    try {
      const bruto = await AsyncStorage.getItem(chaves.convitePush);
      return VALIDAS.includes(bruto as RespostaDoConvite)
        ? (bruto as RespostaDoConvite)
        : 'nao-perguntamos';
    } catch {
      // Sem disco, o pior caso é convidar de novo — e não é grave, porque o
      // convite só aparece onde faz sentido e nunca bloqueia a tela.
      return 'nao-perguntamos';
    }
  },

  async gravar(resposta: Exclude<RespostaDoConvite, 'nao-perguntamos'>): Promise<void> {
    try {
      await AsyncStorage.setItem(chaves.convitePush, resposta);
    } catch {
      /* melhor esforço */
    }
  },

  /** Só para a área de desenvolvimento: convidar de novo. */
  async esquecer(): Promise<void> {
    try {
      await AsyncStorage.removeItem(chaves.convitePush);
    } catch {
      /* idem */
    }
  },
};
