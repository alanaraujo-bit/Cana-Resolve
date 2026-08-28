/**
 * Os eventos técnicos das notificações — o contrato, não a infraestrutura.
 *
 * Como nos outros módulos: nada aqui envia coisa alguma. Declara o que um dia
 * será medido e, em desenvolvimento, imprime o que teria sido enviado.
 *
 * A regra desta fase, além das que já valiam: **nunca o token de push**, nunca
 * o id da instalação, nunca o conteúdo do aviso (§93, §96). O que interessa
 * medir é a forma — pediu, concedeu, registrou, abriu — e o tipo do aviso.
 *
 * E uma distinção que a especificação faz questão de separar (§94): *recebido*
 * e *aberto* são eventos diferentes. Enviado, então, nem é daqui — é do
 * servidor. Tratar os três como um só faria a métrica de push contar
 * intenções como se fossem atenções.
 */
import type { TipoDeAviso } from './tipos';

export type Evento =
  /** Mostramos o convite, antes do prompt do sistema. */
  | { nome: 'notification_permission_prompted' }
  | { nome: 'notification_permission_granted' }
  | { nome: 'notification_permission_denied'; definitiva: boolean }
  /** A pessoa escolheu "agora não". Não é o mesmo que negar ao sistema. */
  | { nome: 'notification_permission_adiada' }
  /** O aparelho passou a ter endereço de entrega. Sem token, sem instalação. */
  | { nome: 'device_registered'; plataforma: string }
  | { nome: 'device_registration_failed'; falha: string }
  /** O aparelho deixou de receber o que era desta conta. */
  | { nome: 'device_revoked' }
  /** Um aviso chegou com o aplicativo aberto. */
  | { nome: 'notification_received'; tipo: TipoDeAviso }
  /** A pessoa tocou em um aviso. */
  | { nome: 'notification_opened'; tipo: TipoDeAviso; estado: 'aberto' | 'fundo' | 'encerrado' }
  /** O destino foi resolvido em uma tela de verdade. */
  | { nome: 'notification_deeplink_resolved'; tipo: TipoDeAviso | 'link' }
  /** O destino não pôde ser resolvido: rota desconhecida ou dono errado. */
  | { nome: 'notification_deeplink_recusado'; motivo: 'rota' | 'conta' | 'validade' };

function despachar(evento: Evento) {
  if (__DEV__) {
    console.log('[analytics]', evento.nome, evento);
  }
  // Produção: sem destino configurado, o evento é descartado em silêncio.
}

export function registrar(evento: Evento) {
  despachar(evento);
}
