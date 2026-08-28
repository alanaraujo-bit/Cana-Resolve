import { NextResponse } from "next/server";

import { isDatabaseConfigured } from "@/lib/db/client";
import { receiveServiceRequest } from "@/lib/domain/intake";
import { fieldErrors, serviceRequestSchema } from "@/lib/forms";
import { callerKey, rateLimit } from "@/lib/rate-limit";

/**
 * Recebe a solicitação do morador antes do WhatsApp.
 *
 * O formulário chama esta rota e segue para a conversa **de qualquer jeito**:
 * se aqui der errado, a pessoa não pode perceber. Por isso a resposta de erro
 * é discreta e o cliente não a trata como bloqueio — o pior caso volta a ser
 * exatamente o que era antes, um pedido que existe só no WhatsApp.
 */
export async function POST(request: Request) {
  const limit = rateLimit(callerKey(request.headers, "solicitacao"), 8, 60_000);
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

  const parsed = serviceRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, erro: "validacao", campos: fieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  if (!isDatabaseConfigured()) {
    console.error("[solicitacoes] DATABASE_URL ausente — pedido não foi gravado");
    return NextResponse.json({ ok: false, erro: "indisponivel" }, { status: 503 });
  }

  try {
    const result = await receiveServiceRequest(parsed.data);

    // Só o código volta. Já houve aqui um link de acompanhamento assinado, que
    // levava a um portal web; o portal saiu, e devolver uma credencial que não
    // abre nada seria pior que não devolver nada. O código (CR-00021) continua
    // servindo ao que sempre serviu: a pessoa e a equipe falarem do mesmo
    // pedido no WhatsApp.
    return NextResponse.json({ ok: true, codigo: result.code }, { status: 201 });
  } catch (error) {
    // Nada de dado pessoal no log: só o que ajuda a entender a falha.
    console.error(
      "[solicitacoes] falha ao gravar",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ ok: false, erro: "falha" }, { status: 500 });
  }
}
