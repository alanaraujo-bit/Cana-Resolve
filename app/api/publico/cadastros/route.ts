import { NextResponse } from "next/server";

import { isDatabaseConfigured } from "@/lib/db/client";
import { receivePartnerApplication } from "@/lib/domain/intake";
import { fieldErrors, partnerApplicationSchema } from "@/lib/forms";
import { callerKey, rateLimit } from "@/lib/rate-limit";

/**
 * Recebe o cadastro enviado em `/parceiros`.
 *
 * Mesma regra da rota de solicitações: o WhatsApp abre de qualquer forma. A
 * diferença é o que acontece aqui dentro — o cadastro procura a empresa no
 * funil comercial pelo número e se junta a ela, em vez de criar um segundo
 * registro da mesma empresa.
 */
export async function POST(request: Request) {
  const limit = rateLimit(callerKey(request.headers, "cadastro"), 6, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, erro: "muitas_tentativas" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "corpo_invalido" }, { status: 400 });
  }

  const parsed = partnerApplicationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, erro: "validacao", campos: fieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  if (!isDatabaseConfigured()) {
    console.error("[cadastros] DATABASE_URL ausente — cadastro não foi gravado");
    return NextResponse.json({ ok: false, erro: "indisponivel" }, { status: 503 });
  }

  try {
    const result = await receivePartnerApplication(parsed.data);
    return NextResponse.json(
      { ok: true, codigo: result.code, associado: result.merged },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "[cadastros] falha ao gravar",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ ok: false, erro: "falha" }, { status: 500 });
  }
}
