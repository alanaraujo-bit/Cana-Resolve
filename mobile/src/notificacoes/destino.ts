/**
 * Para onde a pessoa estava indo.
 *
 * Um toque em notificação, um link, um Universal Link futuro — todos produzem
 * a mesma coisa: **um destino**. Ele nem sempre pode ser atendido na hora: o
 * aplicativo pode estar abrindo, a sessão pode estar sendo conferida, ou pode
 * não haver sessão nenhuma. Guardar o destino até dar é o que separa
 * "notificação que leva ao lugar certo" de "notificação que abre a Home e
 * deixa a pessoa procurando" (§17, §18, §139).
 *
 * Este arquivo veio de uma limitação real do porteiro anterior: ele lia o
 * caminho **uma vez**, na primeira montagem (`primeira.current`). Um push
 * tocado com o aplicativo em segundo plano, ou já parado na tela de entrar,
 * nunca passava por ali. Aqui o destino pode ser anotado a qualquer momento e
 * é consumido uma vez só.
 *
 * Duas regras de segurança moram aqui, e não em quem chama:
 *
 * 1. **Só destinos conhecidos.** Um caminho que não bate com a lista vira
 *    `null` — não vira navegação. Deep link não é um `router.push` do que
 *    chegou de fora (§71).
 * 2. **O destino é da conta que o recebeu.** Se veio com dono (`para`), ele só
 *    é entregue à mesma conta. O aparelho que trocou de usuário não abre o que
 *    era do anterior (§19), e sair apaga o que ficou pendente
 *    (`session/chaves.ts`).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';

import { chaves } from '@/session/chaves';
import { comoRota } from './rotas';

export type Origem = 'push' | 'link' | 'interno';

export type Destino = {
  /** A rota do aplicativo, já validada. Ex.: `/oportunidade/o1`. */
  rota: string;
  origem: Origem;
  /** O dono, quando a origem sabe dizer. `null` aceita qualquer conta. */
  para: string | null;
  /** Quando foi anotado. Um destino velho demais não vale a viagem. */
  em: number;
};

/**
 * Quanto tempo um destino pendente sobrevive.
 *
 * Não é segurança — é bom senso: um push tocado ontem, com o login concluído
 * hoje de manhã por outro motivo, não deveria sequestrar a abertura. Meia hora
 * cobre "toquei, o login demorou, autentiquei" com folga.
 */
const VALIDADE_MS = 30 * 60_000;

/**
 * A tradução de endereço externo em rota mora em `rotas.ts`, sem dependência
 * nenhuma, e é reexportada daqui para que ninguém precise saber que ela mudou
 * de arquivo.
 *
 * A separação é da Fase 07 e tem uma razão só: aquele arquivo é conferido por
 * asserção do lado do repositório do site, junto de `lib/push/mensagens.ts`,
 * que escreve o outro lado do mesmo contrato. Enquanto a função morava aqui,
 * importá-la arrastava o `AsyncStorage` e o alias do aplicativo — e um teste
 * que não roda é um contrato que ninguém confere.
 */
export { comoRota } from './rotas';

/* -------------------------------------------------------------------------- */

let pendente: Destino | null = null;

/**
 * Quem quer saber que apareceu um destino.
 *
 * Existe porque **quem anota e quem navega são pessoas diferentes**. O toque
 * na notificação pode chegar com o aplicativo em qualquer estado, e a
 * navegação só pode acontecer onde há sessão conferida e roteador montado.
 * Anotar é sempre seguro; navegar, não. Este canal liga os dois sem que o
 * ouvinte precise ficar perguntando.
 */
type Ouvinte = () => void;
const ouvintes = new Set<Ouvinte>();

export function assinar(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function avisar() {
  for (const ouvinte of ouvintes) {
    try {
      ouvinte();
    } catch {
      /* um ouvinte quebrado não pode calar os outros */
    }
  }
}

/**
 * Anota um destino. Devolve `false` quando ele não é um destino válido — e
 * quem chamou usa isso para mostrar "não conseguimos abrir este conteúdo" em
 * vez de nada acontecer (§71).
 *
 * O disco é escrita de conveniência, para o caso de o processo morrer entre o
 * toque e o login. A memória é a fonte durante a execução.
 */
export function anotar(bruto: string, origem: Origem, para: string | null = null): boolean {
  const rota = comoRota(bruto);
  if (!rota) return false;

  pendente = { rota, origem, para, em: Date.now() };
  void AsyncStorage.setItem(chaves.destinoPendente, JSON.stringify(pendente)).catch(() => {});
  avisar();
  return true;
}

/** Lê o que ficou pendente de uma execução anterior. Chamado uma vez, na abertura. */
export async function restaurar(): Promise<void> {
  if (pendente) return;
  try {
    const bruto = await AsyncStorage.getItem(chaves.destinoPendente);
    if (!bruto) return;
    const lido = JSON.parse(bruto) as Partial<Destino>;
    if (typeof lido.rota !== 'string' || typeof lido.em !== 'number') return;
    if (Date.now() - lido.em > VALIDADE_MS) {
      await esquecer();
      return;
    }
    // Revalida a rota lida do disco: o formato aceito pode ter mudado entre
    // versões, e confiar no que estava gravado seria confiar em dado antigo.
    if (!comoRota(lido.rota)) {
      await esquecer();
      return;
    }
    pendente = {
      rota: lido.rota,
      origem: (lido.origem as Origem) ?? 'link',
      para: typeof lido.para === 'string' ? lido.para : null,
      em: lido.em,
    };
  } catch {
    /* nada pendente é o caso normal */
  }
}

/**
 * Entrega o destino pendente para quem pode navegar — uma vez só.
 *
 * `contaAtual` é conferida contra o dono anotado. Um push que era do parceiro
 * A, tocado depois de o parceiro B entrar no mesmo aparelho, é descartado
 * aqui: nunca chega a abrir uma tela (§19).
 */
export function consumir(contaAtual: string | null): Href | null {
  const alvo = pendente;
  if (!alvo) return null;

  pendente = null;
  void AsyncStorage.removeItem(chaves.destinoPendente).catch(() => {});

  if (Date.now() - alvo.em > VALIDADE_MS) return null;
  if (alvo.para && contaAtual && alvo.para !== contaAtual) return null;
  // Um destino com dono, sem conta aberta, também não passa: quem valida a
  // igualdade precisa de alguém com quem comparar.
  if (alvo.para && !contaAtual) return null;

  return alvo.rota as Href;
}

/** Existe algo esperando? A tela de entrar usa para explicar por que está ali. */
export function temPendente(): boolean {
  return pendente !== null && Date.now() - pendente.em <= VALIDADE_MS;
}

/** Sair da conta apaga o destino pendente. Chamado por `session/limpeza.ts`. */
export async function esquecer(): Promise<void> {
  pendente = null;
  try {
    await AsyncStorage.removeItem(chaves.destinoPendente);
  } catch {
    /* melhor esforço; a chave também está em `chavesDaConta` */
  }
}
