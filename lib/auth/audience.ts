import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";

import { db, isDatabaseConfigured } from "@/lib/db/client";
import {
  partnerSessions,
  partners,
  residentSessions,
  serviceRequests,
} from "@/lib/db/schema";
import { normalizePhone } from "@/lib/domain/phone";

const TTL_DAYS = 30;
export const RESIDENT_COOKIE = "cr_morador_sessao";
export const PARTNER_COOKIE = "cr_parceiro_sessao";

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("base64url");

function expiry() {
  return new Date(Date.now() + TTL_DAYS * 86_400_000);
}

async function writeCookie(name: string, token: string, expiresAt: Date) {
  const jar = await cookies();
  jar.set(name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export type ResidentViewer = { whatsapp: string };
export type PartnerViewer = { id: string; code: string; name: string; status: string };

/**
 * A confirmação pede dois dados que a pessoa já recebeu: o código mostrado no
 * fim da solicitação e o WhatsApp que ela informou. Nenhuma informação do
 * pedido é revelada antes dessa conferência.
 */
export async function startResidentSession(code: string, phone: string) {
  if (!isDatabaseConfigured()) return { ok: false as const, error: "indisponivel" };
  const whatsapp = normalizePhone(phone);
  if (!whatsapp) return { ok: false as const, error: "dados" };

  const [request] = await db
    .select({ id: serviceRequests.id })
    .from(serviceRequests)
    .where(and(eq(serviceRequests.code, code.trim().toUpperCase()), eq(serviceRequests.whatsapp, whatsapp)))
    .limit(1);
  if (!request) return { ok: false as const, error: "dados" };

  const token = randomBytes(32).toString("base64url");
  const expiresAt = expiry();
  await db.insert(residentSessions).values({ tokenHash: sha256(token), whatsapp, expiresAt });
  await writeCookie(RESIDENT_COOKIE, token, expiresAt);
  await db.delete(residentSessions).where(lt(residentSessions.expiresAt, new Date()));
  return { ok: true as const };
}

/** A empresa entra com seu código PA e o mesmo WhatsApp validado pela operação. */
export async function startPartnerSession(code: string, phone: string) {
  if (!isDatabaseConfigured()) return { ok: false as const, error: "indisponivel" };
  const whatsapp = normalizePhone(phone);
  if (!whatsapp) return { ok: false as const, error: "dados" };

  const [partner] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(and(eq(partners.code, code.trim().toUpperCase()), eq(partners.whatsapp, whatsapp)))
    .limit(1);
  if (!partner) return { ok: false as const, error: "dados" };

  const token = randomBytes(32).toString("base64url");
  const expiresAt = expiry();
  await db.insert(partnerSessions).values({ tokenHash: sha256(token), partnerId: partner.id, expiresAt });
  await writeCookie(PARTNER_COOKIE, token, expiresAt);
  await db.delete(partnerSessions).where(lt(partnerSessions.expiresAt, new Date()));
  return { ok: true as const };
}

export const getResidentViewer = cache(async (): Promise<ResidentViewer | null> => {
  if (!isDatabaseConfigured()) return null;
  const token = (await cookies()).get(RESIDENT_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ whatsapp: residentSessions.whatsapp })
    .from(residentSessions)
    .where(and(eq(residentSessions.tokenHash, sha256(token)), gt(residentSessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
});

export const getPartnerViewer = cache(async (): Promise<PartnerViewer | null> => {
  if (!isDatabaseConfigured()) return null;
  const token = (await cookies()).get(PARTNER_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: partners.id, code: partners.code, name: partners.name, status: partners.status })
    .from(partnerSessions)
    .innerJoin(partners, eq(partners.id, partnerSessions.partnerId))
    .where(and(eq(partnerSessions.tokenHash, sha256(token)), gt(partnerSessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
});

export async function endAudienceSession(audience: "resident" | "partner") {
  const name = audience === "resident" ? RESIDENT_COOKIE : PARTNER_COOKIE;
  const table = audience === "resident" ? residentSessions : partnerSessions;
  const token = (await cookies()).get(name)?.value;
  if (token) await db.delete(table).where(eq(table.tokenHash, sha256(token)));
  (await cookies()).delete(name);
}
