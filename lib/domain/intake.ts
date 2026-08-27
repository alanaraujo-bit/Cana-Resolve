import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  partnerApplications,
  prospects,
  serviceRequests,
} from "@/lib/db/schema";
import type { PartnerApplicationInput, ServiceRequestInput } from "@/lib/forms";
import { recordActivity } from "./activity";
import { nextCode } from "./codes";
import { normalizePhone } from "./phone";
import { prospectFunnel, type ProspectStatus } from "./states";

/**
 * A porta de entrada pública.
 *
 * Antes disto, um pedido só existia enquanto a conversa do WhatsApp existisse:
 * quem preenchesse o formulário e fechasse o aplicativo simplesmente sumia.
 * Aqui o registro nasce primeiro, ganha um código e passa a ter história.
 *
 * O WhatsApp continua sendo o canal — mas deixou de ser o lugar onde o dado
 * mora. E se a gravação falhar, quem chamou **ainda assim** manda a pessoa para
 * a conversa: o formulário público nunca pode ficar pior do que era.
 */

export type IntakeResult = {
  id: string;
  code: string;
  /** `true` quando o registro se juntou a algo que já existia. */
  merged: boolean;
};

/* ---------------------------------------------------------------
   Solicitação do morador
   --------------------------------------------------------------- */

export async function receiveServiceRequest(
  input: ServiceRequestInput,
): Promise<IntakeResult> {
  const whatsapp = normalizePhone(input.telefone);
  if (!whatsapp) throw new Error("Número de WhatsApp inválido.");

  return db.transaction(async (tx) => {
    const code = await nextCode(tx, "request");

    const [row] = await tx
      .insert(serviceRequests)
      .values({
        code,
        description: input.descricao.trim(),
        categoryId: input.categoria || null,
        serviceId: input.servico || null,
        residentName: input.nome.trim(),
        whatsapp,
        neighborhood: input.bairro?.trim() || null,
        urgency: input.urgencia || null,
        source: input.origem || null,
        attribution: input.atribuicao ?? {},
        consent: input.consentimento,
        consentAt: input.consentimento ? new Date() : null,
        status: "nova",
      })
      .returning({ id: serviceRequests.id });

    await recordActivity(tx, {
      subjectType: "request",
      subjectId: row.id,
      type: "entrada",
      toState: "nova",
      summary: `Solicitação ${code} recebida pelo site.`,
      meta: { origem: input.origem ?? null },
    });

    return { id: row.id, code, merged: false };
  });
}

/* ---------------------------------------------------------------
   Cadastro de parceiro
   --------------------------------------------------------------- */

/**
 * Onde o cadastro deve cair no funil quando ele chega sozinho, sem que
 * ninguém tenha falado com a empresa antes.
 */
const AFTER_APPLICATION: ProspectStatus = "cadastro_recebido";

/**
 * Recebe o cadastro de `/parceiros`.
 *
 * A deduplicação é pelo WhatsApp normalizado: é o único dado que a mesma
 * empresa escreve igual em qualquer contexto. Se o número já está no funil, o
 * cadastro se junta àquele prospect em vez de criar um segundo registro da
 * mesma empresa — e o funil avança, sem nunca retroceder por engano.
 */
export async function receivePartnerApplication(
  input: PartnerApplicationInput,
): Promise<IntakeResult> {
  const whatsapp = normalizePhone(input.telefone);
  if (!whatsapp) throw new Error("Número de WhatsApp inválido.");

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: prospects.id,
        code: prospects.code,
        status: prospects.status,
        contactName: prospects.contactName,
        categoryId: prospects.categoryId,
      })
      .from(prospects)
      .where(eq(prospects.whatsapp, whatsapp))
      .limit(1);

    let prospectId: string;
    let code: string;
    const merged = Boolean(existing);

    if (existing) {
      prospectId = existing.id;
      code = existing.code;

      // Só avança. Um cadastro que chega depois da aprovação não pode puxar a
      // empresa de volta para "Cadastro recebido".
      const current = prospectFunnel.indexOf(existing.status);
      const target = prospectFunnel.indexOf(AFTER_APPLICATION);
      const shouldAdvance = current >= 0 && current < target;

      await tx
        .update(prospects)
        .set({
          status: shouldAdvance ? AFTER_APPLICATION : existing.status,
          contactName: existing.contactName || input.nome.trim(),
          categoryId: existing.categoryId || input.categoria || null,
          lastInteractionAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(prospects.id, prospectId));

      await recordActivity(tx, {
        subjectType: "prospect",
        subjectId: prospectId,
        type: "cadastro",
        fromState: shouldAdvance ? existing.status : null,
        toState: shouldAdvance ? AFTER_APPLICATION : null,
        summary: shouldAdvance
          ? "Cadastro recebido pelo site e associado a este prospect."
          : "Novo cadastro recebido pelo site para uma empresa que já estava adiante no funil.",
        meta: { origem: input.origem ?? null },
      });
    } else {
      code = await nextCode(tx, "prospect");
      const [row] = await tx
        .insert(prospects)
        .values({
          code,
          name: input.empresa.trim(),
          contactName: input.nome.trim(),
          whatsapp,
          categoryId: input.categoria || null,
          source: input.origem || "formulario",
          status: AFTER_APPLICATION,
          lastInteractionAt: new Date(),
          notes: input.comoConheceu ? `Como conheceu: ${input.comoConheceu}` : null,
        })
        .returning({ id: prospects.id });

      prospectId = row.id;

      await recordActivity(tx, {
        subjectType: "prospect",
        subjectId: prospectId,
        type: "entrada",
        toState: AFTER_APPLICATION,
        summary: `Empresa entrou no funil pelo cadastro de /parceiros (${code}).`,
        meta: { origem: input.origem ?? null },
      });
    }

    const [application] = await tx
      .insert(partnerApplications)
      .values({
        prospectId,
        name: input.nome.trim(),
        company: input.empresa.trim(),
        whatsapp,
        categoryId: input.categoria || null,
        servesCanaa: input.atendeCanaa,
        howFound: input.comoConheceu?.trim() || null,
        attribution: input.atribuicao ?? {},
        status: "recebido",
      })
      .returning({ id: partnerApplications.id });

    await recordActivity(tx, {
      subjectType: "application",
      subjectId: application.id,
      type: "entrada",
      toState: "recebido",
      summary: `${input.empresa.trim()} enviou o cadastro pelo site.`,
      meta: { atendeCanaa: input.atendeCanaa, origem: input.origem ?? null },
    });

    return { id: application.id, code, merged };
  });
}
