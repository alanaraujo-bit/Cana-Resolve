import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { and, desc, eq, gt, lt } from "drizzle-orm";

import { db, isDatabaseConfigured } from "@/lib/db/client";
import { operators, sessions } from "@/lib/db/schema";

/**
 * Sessões do Operations.
 *
 * O cookie carrega só um token aleatório. O banco guarda o SHA-256 dele, nunca
 * o token — quem lesse o banco não conseguiria se passar por ninguém. E, como
 * a sessão existe como linha, encerrar o acesso de alguém é apagar uma linha,
 * não esperar um prazo assinado dentro do cookie expirar.
 */

export const SESSION_COOKIE = "cr_ops_sessao";
const TTL_DAYS = 30;
/** Renova a validade quando faltar menos de uma semana, sem trocar o token. */
const RENEW_AFTER_DAYS = 7;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "operator";
};

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("base64url");

/** Rótulo curto do aparelho, para o operador reconhecer a própria sessão. */
export function describeDevice(userAgent: string | null | undefined) {
  const ua = userAgent ?? "";
  const os = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPad|iOS/i.test(ua)
      ? "iPhone"
      : /Mac OS X/i.test(ua)
        ? "Mac"
        : /Windows/i.test(ua)
          ? "Windows"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Aparelho";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "navegador";
  return `${os} · ${browser}`;
}

export async function createSession(operatorId: string, device?: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000);

  await db.insert(sessions).values({
    tokenHash: sha256(token),
    operatorId,
    expiresAt,
    device: device ?? null,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  // Aproveita a escrita para varrer o que já venceu. Sem cron, sem sujeira.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

  return token;
}

/**
 * Quem está usando o sistema nesta requisição, ou `null`.
 *
 * `cache()` garante uma consulta só por requisição, mesmo que o layout, a
 * página e três componentes perguntem a mesma coisa.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isDatabaseConfigured()) return null;

  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      operatorId: operators.id,
      name: operators.name,
      email: operators.email,
      role: operators.role,
      active: operators.active,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(operators, eq(operators.id, sessions.operatorId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row || !row.active) return null;

  return {
    id: row.operatorId,
    name: row.name,
    email: row.email,
    role: row.role,
  };
});

/**
 * Estende a sessão que está perto de vencer. Fica separado da leitura porque
 * páginas renderizadas não podem escrever cookies — só ações e rotas podem.
 */
export async function touchSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const now = new Date();
  const renewIfBefore = new Date(now.getTime() + RENEW_AFTER_DAYS * 86_400_000);
  const expiresAt = new Date(now.getTime() + TTL_DAYS * 86_400_000);

  const updated = await db
    .update(sessions)
    .set({ lastSeenAt: now, expiresAt })
    .where(
      and(
        eq(sessions.tokenHash, sha256(token)),
        gt(sessions.expiresAt, now),
        lt(sessions.expiresAt, renewIfBefore),
      ),
    )
    .returning({ tokenHash: sessions.tokenHash });

  if (updated.length > 0) {
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });
  }
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/** Encerra todas as sessões de um operador — inclusive a atual. */
export async function destroyAllSessions(operatorId: string) {
  await db.delete(sessions).where(eq(sessions.operatorId, operatorId));
}

export async function listSessions(operatorId: string) {
  return db
    .select({
      tokenHash: sessions.tokenHash,
      device: sessions.device,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(and(eq(sessions.operatorId, operatorId), gt(sessions.expiresAt, new Date())))
    .orderBy(desc(sessions.lastSeenAt));
}
