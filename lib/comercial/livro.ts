import "server-only";

import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { commercialEvents } from "@/lib/db/schema";
import { chaveDoEvento, paraOLog, type EventoFinanceiro } from "@/lib/domain/comercial/eventos";

/**
 * O livro dos acontecimentos financeiros — onde a idempotência acontece.
 *
 * A regra que este arquivo existe para impor: **nenhum efeito financeiro
 * acontece fora de um evento registrado, e nenhum evento é registrado duas
 * vezes.**
 *
 * A defesa não é uma consulta seguida de uma escrita. É um `insert ... on
 * conflict do nothing` sobre um índice único, e o retorno do insert é o que
 * decide se o efeito roda. Entre uma consulta e uma escrita cabe uma segunda
 * entrega do mesmo webhook; dentro de um insert, não cabe nada.
 *
 * ```
 *   const { novo } = await registrarEvento(evento);
 *   if (!novo) return;        // já processado — não faça de novo
 *   ...aplique o efeito...
 * ```
 */

export type EventoRegistrado = {
  /** `false` quando este evento já tinha sido processado antes. */
  novo: boolean;
  id: string;
  chave: string;
};

/**
 * Acrescenta um evento ao livro.
 *
 * `efeito` é uma frase em português dizendo o que o evento produziu — é ela
 * que responde ao §113 sem exigir arqueologia de código meses depois.
 */
export async function registrarEvento(
  evento: EventoFinanceiro,
  efeito?: string,
): Promise<EventoRegistrado> {
  const db = getDb();
  const chave = chaveDoEvento(evento);

  const inseridos = await db
    .insert(commercialEvents)
    .values({
      eventKey: chave,
      provider: evento.provedor,
      environment: evento.ambiente,
      kind: evento.tipo,
      partnerId: evento.parceiroId,
      amountCents: evento.valorCentavos,
      currency: evento.moeda,
      offerCode: evento.ofertaCodigo,
      offerVersion: evento.ofertaVersao,
      occurredAt: evento.em,
      effect: efeito ?? null,
      // Só o que `paraOLog` deixa passar. Recibo cru, token e dado de cartão
      // não têm caminho até aqui.
      payload: paraOLog(evento),
    })
    .onConflictDoNothing({ target: commercialEvents.eventKey })
    .returning({ id: commercialEvents.id });

  if (inseridos.length > 0) {
    return { novo: true, id: inseridos[0]!.id, chave };
  }

  const [existente] = await db
    .select({ id: commercialEvents.id })
    .from(commercialEvents)
    .where(eq(commercialEvents.eventKey, chave))
    .limit(1);

  return { novo: false, id: existente?.id ?? "", chave };
}

/**
 * A história comercial de um parceiro, do mais recente para o mais antigo.
 *
 * Serve à pergunta do §113 — "por que este parceiro está ativo?" — e à
 * auditoria. Não é o histórico de cobrança que o profissional vê: aquele é
 * `cobrancas.ts`, e mostra dinheiro, não mecânica.
 */
export async function historiaDoParceiro(partnerId: string, limite = 100) {
  const db = getDb();
  return db
    .select({
      id: commercialEvents.id,
      tipo: commercialEvents.kind,
      provedor: commercialEvents.provider,
      ambiente: commercialEvents.environment,
      em: commercialEvents.occurredAt,
      registradoEm: commercialEvents.createdAt,
      valorCentavos: commercialEvents.amountCents,
      efeito: commercialEvents.effect,
    })
    .from(commercialEvents)
    .where(eq(commercialEvents.partnerId, partnerId))
    .orderBy(desc(commercialEvents.occurredAt))
    .limit(limite);
}
