/**
 * Os eventos comerciais — o contrato, não a infraestrutura.
 *
 * Como nos outros módulos, este arquivo **não inventa** analytics: declara o
 * que um dia será medido e, em desenvolvimento, imprime o que teria sido
 * enviado. Quando houver destino real, ele entra em `despachar`, e nenhuma tela
 * muda.
 *
 * ## O que estes eventos NÃO carregam (§115)
 *
 * Nenhum valor em dinheiro, nenhum identificador de transação, nenhuma
 * referência de pagamento, nenhum dado de cartão, nenhum recibo, nenhum e-mail.
 *
 * A tentação é grande — "quanto foi pago" é a métrica que qualquer painel
 * comercial pede primeiro. Mas um evento de analytics viaja para fora, é retido
 * por terceiros e sobrevive à conta que o gerou; e a receita real já está no
 * banco, onde é auditável e não sai do país sem decisão. O que sai daqui é a
 * **forma** do que aconteceu: qual oferta, qual etapa, o que deu errado em
 * categoria fechada.
 *
 * ## O que eles deveriam responder, quando existirem
 *
 * - de cada dez aprovados, quantos chegam a ver a condição e quantos concluem;
 * - quantos abandonam o checkout, e em que ponto;
 * - se o estado "aguardando lançamento" gera dúvida — medido pela quantidade de
 *   gente que abre a área comercial repetidamente sem nada mudar;
 * - se o aviso de fim de Beta é lido ou ignorado.
 *
 * Nada disso vira painel nesta fase (§116). O contrato é o entregável.
 */

export type MotivoDeFalha =
  /** A pessoa fechou ou cancelou. **Não é erro** (§82). */
  | 'cancelado'
  /** O provedor recusou. */
  | 'recusado'
  /** Rede, servidor, tempo esgotado. */
  | 'indisponivel'
  /** A validação no servidor não confirmou a compra. */
  | 'nao_validado';

export type EventoComercial =
  /** A condição comercial apareceu para alguém elegível. */
  | { nome: 'offer_viewed'; oferta: string; versao: number }
  /** Começou uma contratação. */
  | { nome: 'checkout_started'; oferta: string; versao: number }
  /** A compra foi confirmada pelo servidor — nunca pelo cliente. */
  | { nome: 'purchase_completed'; oferta: string; versao: number }
  /** Não deu certo. Sem código de gateway: motivo de uma lista fechada. */
  | { nome: 'purchase_failed'; oferta: string; motivo: MotivoDeFalha }
  /** A pessoa desistiu no meio. Registrado como fato, não como falha. */
  | { nome: 'purchase_canceled'; oferta: string }
  /** Uma compra anterior foi reconhecida na reinstalação ou noutro aparelho. */
  | { nome: 'subscription_restored'; oferta: string }
  /** Abriu o lugar onde se gerencia a assinatura. */
  | { nome: 'subscription_management_opened'; provedor: string }
  /** Abriu a área comercial. `estado` é o da adesão, não um dado pessoal. */
  | { nome: 'commercial_area_opened'; estado: string }
  /** Abriu o histórico de cobrança. */
  | { nome: 'billing_history_opened'; total: number }
  /** Viu o aviso de que o Beta está terminando. */
  | { nome: 'beta_ending_seen'; diasRestantes: number };

type Corpo<N extends EventoComercial['nome']> = Omit<
  Extract<EventoComercial, { nome: N }>,
  'nome'
>;

function despachar(evento: EventoComercial) {
  if (__DEV__) {
    console.log('[analytics]', evento.nome, evento);
  }
  // Produção: sem destino configurado, o evento é descartado em silêncio. Sem
  // fila, sem retentativa e sem promessa de entrega.
}

export function registrarComercial<N extends EventoComercial['nome']>(nome: N, corpo: Corpo<N>) {
  despachar({ nome, ...corpo } as unknown as EventoComercial);
}
