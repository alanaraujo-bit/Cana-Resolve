import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";

import { db, isDatabaseConfigured } from "@/lib/db/client";
import { partnerSessions, partners } from "@/lib/db/schema";
import { normalizePhone } from "@/lib/domain/phone";
import { callerKey, rateLimit } from "@/lib/rate-limit";

/**
 * Dois modelos de acesso, de propósito diferentes.
 *
 * O **parceiro** é uma conta duradoura — perfil, histórico, oportunidades — e
 * por isso continua com sessão em banco: revogável, com "sair de todos os
 * aparelhos" fazendo sentido. A credencial (código PA + WhatsApp) é curta o
 * bastante para valer a pena forçar, então todo login passa por dois freios:
 * um por IP e um por código, já que o espaço de códigos é pequeno.
 *
 * O **morador** não cria conta. O link que ele recebe depois de pedir ajuda já
 * é a credencial — assinado com HMAC, verificável sem consulta ao banco. Não
 * existe formulário de código+telefone para forçar porque não existe
 * formulário nenhum: ver HANDOFF.md §3.1 e §4.2.
 */

const TTL_DIAS_PARCEIRO = 30;
const TTL_DIAS_MORADOR = 730; // ~2 anos: um link de WhatsApp deve sobreviver ao pedido.

export const RESIDENT_COOKIE = "cr_morador_acesso";
export const PARTNER_COOKIE = "cr_parceiro_sessao";

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("base64url");

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

/* ---------------------------------------------------------------
   Morador — link assinado, sem sessão em banco
   --------------------------------------------------------------- */

/**
 * Lida só na hora de usar — nunca em escopo de módulo. Um ambiente sem a
 * variável (uma preview mal configurada, por exemplo) não deve derrubar a
 * renderização: degrada como `isDatabaseConfigured()` degrada, apagando o
 * recurso em vez de lançar exceção no meio de uma página.
 */
function residentSecret(): string | null {
  const value = process.env.CR_SESSION_SECRET;
  return value && value.length >= 16 ? value : null;
}

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/**
 * Assina `{ whatsapp, expira }` com HMAC-SHA256. O token é o payload e a
 * assinatura, separados por ponto — sem biblioteca de JWT: é uma verificação,
 * não um formato de troca com terceiros.
 */
function signResidentToken(whatsapp: string): string | null {
  const secret = residentSecret();
  if (!secret) return null;
  const payload = base64UrlJson({ w: whatsapp, exp: Date.now() + TTL_DIAS_MORADOR * 86_400_000 });
  const assinatura = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${assinatura}`;
}

export function verifyResidentToken(token: string): ResidentViewer | null {
  const secret = residentSecret();
  if (!secret) return null;
  const [payload, assinatura] = token.split(".");
  if (!payload || !assinatura) return null;

  const esperada = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const dados = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      w?: unknown;
      exp?: unknown;
    };
    if (typeof dados.w !== "string" || typeof dados.exp !== "number") return null;
    if (dados.exp < Date.now()) return null;
    return { whatsapp: dados.w };
  } catch {
    return null;
  }
}

/**
 * Concede acesso a um WhatsApp: grava o cookie deste navegador (via
 * `cookies().set()`, seguro aqui porque quem chama devolve `NextResponse.json`
 * na sequência, nunca um redirect) e devolve o token cru, para montar o link
 * de `/acesso?t=`. `null` quando `CR_SESSION_SECRET` não está configurado —
 * sem quebrar o que depende disso, a solicitação grava do mesmo jeito.
 */
export async function grantResidentAccess(whatsapp: string): Promise<string | null> {
  const token = signResidentToken(whatsapp);
  if (!token) return null;
  await writeCookie(RESIDENT_COOKIE, token, new Date(Date.now() + TTL_DIAS_MORADOR * 86_400_000));
  return token;
}

/**
 * As opções do cookie do morador, para quem precisa gravá-lo fora deste
 * módulo — caso de `/acesso`, que redireciona na mesma resposta.
 *
 * `cookies().set()` seguido de `redirect()` (que lança `NEXT_REDIRECT`) é um
 * padrão comprovado em Server Actions; em Route Handlers não há a mesma
 * garantia de que a mutação do cookie sobrevive até a resposta de redirect
 * ser montada. Por segurança, `/acesso` constrói o `NextResponse.redirect`
 * como valor de retorno normal e grava o cookie **nele**, sem passar pelo
 * `cookies()` mutável nem pelo `redirect()` que lança exceção.
 */
export function residentCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + TTL_DIAS_MORADOR * 86_400_000),
  };
}

export const getResidentViewer = cache(async (): Promise<ResidentViewer | null> => {
  const token = (await cookies()).get(RESIDENT_COOKIE)?.value;
  if (!token) return null;
  return verifyResidentToken(token);
});

/* ---------------------------------------------------------------
   Parceiro — sessão em banco, login com dois freios
   --------------------------------------------------------------- */

/** A empresa entra com seu código PA e o mesmo WhatsApp validado pela operação. */
export async function startPartnerSession(code: string, phone: string) {
  if (!isDatabaseConfigured()) return { ok: false as const, error: "indisponivel" as const };

  const normalizedCode = code.trim().toUpperCase();
  const requestHeaders = await headers();

  // Duas chaves porque o abuso mais provável aqui não é volume genérico: são
  // poucos códigos (PA-0001, PA-0002…) e um telefone que, em Canaã, compartilha
  // DDD e prefixo com todo mundo. O freio por IP pega um robô batendo rápido;
  // o freio por código pega quem distribui as tentativas entre vários IPs.
  const ipLimit = rateLimit(callerKey(requestHeaders, "parceiro-login"), 10, 300_000);
  const codeLimit = normalizedCode
    ? rateLimit(`parceiro-login:codigo:${normalizedCode}`, 5, 900_000)
    : { ok: true as const, retryAfter: 0 };
  if (!ipLimit.ok || !codeLimit.ok) {
    return {
      ok: false as const,
      error: "muitas_tentativas" as const,
      retryAfter: Math.max(ipLimit.retryAfter, codeLimit.retryAfter),
    };
  }

  const whatsapp = normalizePhone(phone);
  if (!whatsapp) return { ok: false as const, error: "dados" as const };

  const [partner] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(and(eq(partners.code, normalizedCode), eq(partners.whatsapp, whatsapp)))
    .limit(1);
  if (!partner) return { ok: false as const, error: "dados" as const };

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_DIAS_PARCEIRO * 86_400_000);
  await db.insert(partnerSessions).values({ tokenHash: sha256(token), partnerId: partner.id, expiresAt });
  await writeCookie(PARTNER_COOKIE, token, expiresAt);
  // Aproveita a escrita para varrer o que já venceu. Sem cron, sem sujeira.
  await db.delete(partnerSessions).where(lt(partnerSessions.expiresAt, new Date()));
  return { ok: true as const };
}

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
  if (audience === "resident") {
    (await cookies()).delete(RESIDENT_COOKIE);
    return;
  }
  const token = (await cookies()).get(PARTNER_COOKIE)?.value;
  if (token) await db.delete(partnerSessions).where(eq(partnerSessions.tokenHash, sha256(token)));
  (await cookies()).delete(PARTNER_COOKIE);
}
