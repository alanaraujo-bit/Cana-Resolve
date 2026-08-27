"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { fakeVerify, verifyPassword } from "@/lib/auth/password";
import { createSession, describeDevice } from "@/lib/auth/session";
import { isDatabaseConfigured, db } from "@/lib/db/client";
import { operators } from "@/lib/db/schema";
import { callerKey, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().min(3).max(160),
  senha: z.string().min(1).max(200),
  proximo: z.string().max(300).optional(),
});

export type LoginState = { erro?: string };

/**
 * Entrada no Operations.
 *
 * A resposta é sempre a mesma quando não dá certo — "e-mail ou senha
 * incorretos" — e o tempo gasto também: quando o e-mail não existe, a
 * conferência de senha roda mesmo assim, contra um hash descartável. Sem isso,
 * a diferença de tempo entregaria quais e-mails estão cadastrados.
 */
export async function entrar(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
    proximo: formData.get("proximo") ?? undefined,
  });

  if (!parsed.success) {
    return { erro: "Preencha o e-mail e a senha." };
  }

  if (!isDatabaseConfigured()) {
    return { erro: "O banco de dados não está configurado neste ambiente." };
  }

  const requestHeaders = await headers();
  const limit = rateLimit(callerKey(requestHeaders, "login"), 10, 300_000);
  if (!limit.ok) {
    return {
      erro: `Muitas tentativas. Tente de novo em ${Math.ceil(limit.retryAfter / 60)} min.`,
    };
  }

  const [operator] = await db
    .select({
      id: operators.id,
      passwordHash: operators.passwordHash,
      active: operators.active,
    })
    .from(operators)
    .where(sql`lower(${operators.email}) = lower(${parsed.data.email})`)
    .limit(1);

  const ok = operator
    ? await verifyPassword(parsed.data.senha, operator.passwordHash)
    : await fakeVerify();

  if (!ok || !operator?.active) {
    return { erro: "E-mail ou senha incorretos." };
  }

  await db
    .update(operators)
    .set({ lastLoginAt: new Date() })
    .where(eq(operators.id, operator.id));

  await createSession(operator.id, describeDevice(requestHeaders.get("user-agent")));

  const proximo = parsed.data.proximo;
  // Só caminhos internos: um "proximo" vindo de fora não pode virar redirect.
  const destino = proximo && /^\/ops(\/|$)/.test(proximo) ? proximo : "/ops";
  redirect(destino);
}
