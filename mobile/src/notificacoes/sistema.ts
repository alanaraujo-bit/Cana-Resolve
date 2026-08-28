/**
 * A única porta do aplicativo para `expo-notifications`.
 *
 * Tudo que fala com o sistema operacional passa por aqui, e por dois motivos:
 *
 * 1. **A prévia pelo navegador continua viva.** `sistema.web.ts` é o irmão
 *    deste arquivo, e o Metro escolhe um dos dois. Nenhuma tela importa
 *    `expo-notifications` diretamente — se importasse, a prévia web, que é
 *    onde o produto é conferido a cada passo, quebraria no primeiro import.
 *
 * 2. **Push remoto não existe em todo ambiente.** Expo Go perdeu a entrega
 *    remota, e o navegador nunca a teve. Isso não é erro nem falta de
 *    configuração: é o ambiente. `disponibilidade()` diz qual é o caso, com
 *    nome próprio, para a interface poder falar a verdade em vez de mostrar um
 *    interruptor que não liga nada (§35).
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Carga, EstadoDaPermissao } from './tipos';
import { lerCarga } from './tipos';

export type Disponibilidade =
  /** Dá para receber push remoto aqui. */
  | 'pronta'
  /** Expo Go: o aviso local funciona, o remoto não (§2 da Fase 06). */
  | 'expo-go'
  /** Emulador/simulador: o sistema não emite token de push. */
  | 'sem-aparelho'
  /** Falta o `projectId` — ver BLOCKERS.md. */
  | 'sem-projeto'
  /** Navegador. */
  | 'web';

/**
 * O `projectId` do EAS, sem o qual o serviço da Expo não sabe para qual
 * aplicativo emitir um token.
 *
 * Ele não é inventado aqui (§63): ou está no `app.json`, colocado por
 * `eas init`, ou a função devolve `null` e o aplicativo diz que não pode
 * registrar. Um valor chutado renderia um token que nunca entrega nada.
 */
export function projectId(): string | null {
  const cru =
    Constants.expoConfig?.extra?.eas?.projectId ??
    // `easConfig` é o que existe dentro de uma build feita pelo EAS.
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  const limpo = typeof cru === 'string' ? cru.trim() : '';
  return limpo ? limpo : null;
}

const noExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function disponibilidade(): Disponibilidade {
  if (Platform.OS === 'web') return 'web';
  if (noExpoGo) return 'expo-go';
  if (!Device.isDevice) return 'sem-aparelho';
  if (!projectId()) return 'sem-projeto';
  return 'pronta';
}

/**
 * `development` ou `production`.
 *
 * Um token emitido por uma build de desenvolvimento não é entregável pela
 * credencial de produção. Confundir os dois faz o envio falhar em silêncio —
 * o pior tipo de falha —, então o ambiente viaja junto com o registro (§118).
 */
export function ambiente(): 'development' | 'production' {
  return __DEV__ || Constants.executionEnvironment !== ExecutionEnvironment.Standalone
    ? 'development'
    : 'production';
}

/** "iPhone 15 · iOS 18.2". Modelo e sistema — nada que identifique a pessoa. */
export function descricaoDoAparelho(): string {
  const modelo = Device.modelName ?? Platform.OS;
  const sistema = Device.osVersion ? ` · ${Device.osName ?? Platform.OS} ${Device.osVersion}` : '';
  return `${modelo}${sistema}`.slice(0, 120);
}

/* -------------------------------------------------------------------------- */
/*  Comportamento com o aplicativo aberto                                     */
/* -------------------------------------------------------------------------- */

/**
 * O que o sistema faz quando um aviso chega com o aplicativo na frente.
 *
 * A resposta do §23 é: **não jogar o banner do sistema por cima da interface**.
 * Quem está com o Canaã Resolve aberto já está aqui; um banner nativo cobrindo
 * o que ele está lendo é interrupção sem ganho. O aplicativo mostra a própria
 * marca discreta (`AvisoDeNovaOportunidade`), atualiza os dados e o selo.
 *
 * O que **continua** acontecendo: o aviso entra no Notification Center e o
 * badge do ícone é atualizado — quem sair do aplicativo encontra o registro.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

/* -------------------------------------------------------------------------- */
/*  Permissão                                                                  */
/* -------------------------------------------------------------------------- */

function comoEstado(
  permissao: Notifications.NotificationPermissionsStatus,
): EstadoDaPermissao {
  if (permissao.granted) return 'concedida';
  // No iOS, "provisória" entrega em silêncio; para o nosso caso ela conta como
  // concedida — a entrega acontece, e é isso que a tela precisa dizer.
  if (permissao.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'concedida';
  }
  if (permissao.status === 'undetermined') return 'a-perguntar';
  return permissao.canAskAgain ? 'negada' : 'bloqueada';
}

export async function lerPermissao(): Promise<EstadoDaPermissao> {
  if (disponibilidade() === 'web') return 'indisponivel';
  try {
    return comoEstado(await Notifications.getPermissionsAsync());
  } catch {
    return 'indisponivel';
  }
}

/**
 * Pede a permissão ao sistema — **uma vez**, e só quando alguém tocou em
 * "Ativar notificações" (§30, §31). Este arquivo nunca chama isto sozinho.
 */
export async function pedirPermissao(): Promise<EstadoDaPermissao> {
  if (disponibilidade() === 'web') return 'indisponivel';
  try {
    const permissao = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        // Nada de `allowCriticalAlerts` e nada de `allowProvisional`: uma
        // oportunidade comercial não é emergência médica, e furar o Foco de
        // alguém — ou entrar sem pedir — para avisar de serviço é abuso (§41).
        allowCriticalAlerts: false,
        allowProvisional: false,
      },
    });
    return comoEstado(permissao);
  } catch {
    return 'indisponivel';
  }
}

/* -------------------------------------------------------------------------- */
/*  Canais do Android                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Três canais, um por família de aviso (§50).
 *
 * Não é um canal por categoria de serviço: para o sistema operacional,
 * "Elétrica" e "Refrigeração" são a mesma coisa — uma oportunidade. O que a
 * pessoa quer poder silenciar separadamente é *o tipo de assunto*, e são três.
 */
export async function prepararCanais(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('oportunidades', {
      name: 'Novas oportunidades',
      description: 'Quando um pedido compatível com o que você faz chega até você.',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      // O padrão do sistema. Nada de padrão inventado de vibração (§40).
      vibrationPattern: undefined,
      lightColor: '#0E5C42',
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync('atualizacoes', {
      name: 'Atualizações',
      description: 'Mudanças importantes em oportunidades suas, e comunicados raros.',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync('avaliacoes', {
      name: 'Novas avaliações',
      description: 'Quando um cliente avalia um atendimento seu.',
      // `DEFAULT` e não `HIGH`: uma avaliação não é urgente. Ela merece ser
      // sabida, não interromper um serviço em andamento.
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      // Sem selo: o número do ícone conta oportunidades esperando decisão, e
      // só isso (§76). Ver `definirSelo`.
      showBadge: false,
    });
    await Notifications.setNotificationChannelAsync('conta', {
      name: 'Conta e segurança',
      description: 'Avisos sobre o acesso à sua conta.',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      showBadge: false,
    });
  } catch {
    /* canal é organização, não requisito: falhar aqui não impede receber */
  }
}

/* -------------------------------------------------------------------------- */
/*  Token                                                                      */
/* -------------------------------------------------------------------------- */

export type FalhaDeToken = 'sem-permissao' | 'indisponivel' | 'erro';

export type ResultadoDeToken =
  | { ok: true; token: string }
  | { ok: false; falha: FalhaDeToken; detalhe?: string };

/**
 * O endereço de entrega deste aparelho.
 *
 * Nunca aparece na interface e nunca vai para log (§54, §96) — sai daqui
 * direto para o registro no servidor.
 */
export async function obterToken(): Promise<ResultadoDeToken> {
  const onde = disponibilidade();
  if (onde !== 'pronta') return { ok: false, falha: 'indisponivel', detalhe: onde };

  if ((await lerPermissao()) !== 'concedida') {
    return { ok: false, falha: 'sem-permissao' };
  }

  const id = projectId();
  if (!id) return { ok: false, falha: 'indisponivel', detalhe: 'sem-projeto' };

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    return data ? { ok: true, token: data } : { ok: false, falha: 'erro' };
  } catch (e) {
    return { ok: false, falha: 'erro', detalhe: e instanceof Error ? e.message : undefined };
  }
}

/* -------------------------------------------------------------------------- */
/*  Selo do ícone                                                              */
/* -------------------------------------------------------------------------- */

/**
 * O número no ícone do aplicativo.
 *
 * Ele vem da **mesma** função que alimenta o selo da aba (§44): quem conta é
 * `contarEsperando`, no domínio das oportunidades. Duas contagens
 * independentes divergiriam no primeiro caso de borda, e o ícone passaria a
 * mentir sobre o aplicativo.
 *
 * Zero apaga o selo, e não desenha um "0" (§46).
 */
export async function definirSelo(quantas: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, quantas));
  } catch {
    /* nem toda plataforma tem selo; não ter não é falha */
  }
}

/* -------------------------------------------------------------------------- */
/*  Escuta                                                                     */
/* -------------------------------------------------------------------------- */

export type Assinatura = { remove: () => void };

/** Um aviso chegou com o aplicativo aberto. Não navega — quem navega é a pessoa. */
export function aoReceber(ouvinte: (carga: Carga) => void): Assinatura {
  return Notifications.addNotificationReceivedListener((n) => {
    const carga = lerCarga(n.request.content.data);
    if (carga) ouvinte(carga);
  });
}

/** A pessoa **tocou** em um aviso. Este é o único gatilho de navegação. */
export function aoTocar(ouvinte: (carga: Carga) => void): Assinatura {
  return Notifications.addNotificationResponseReceivedListener((r) => {
    const carga = lerCarga(r.notification.request.content.data);
    if (carga) ouvinte(carga);
  });
}

/**
 * O toque que **abriu** o aplicativo, quando ele estava encerrado (§16).
 *
 * Sem isto, o cold start perde o destino: o `addNotificationResponseReceived`
 * só vê o que acontece depois de ele existir, e o toque que iniciou o processo
 * já passou. Este é o caso que a especificação chama de mais importante.
 */
export function tocouParaAbrir(): Carga | null {
  try {
    const resposta = Notifications.getLastNotificationResponse();
    if (!resposta) return null;
    return lerCarga(resposta.notification.request.content.data);
  } catch {
    return null;
  }
}

/** Consome o toque inicial, para ele não ser processado duas vezes. */
export function esquecerToqueInicial(): void {
  try {
    Notifications.clearLastNotificationResponse();
  } catch {
    /* não existir é aceitável */
  }
}
