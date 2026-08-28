import { NextResponse } from "next/server";

import { grantResidentAccess } from "@/lib/auth/audience";
import { isDatabaseConfigured } from "@/lib/db/client";
import { receiveServiceRequest } from "@/lib/domain/intake";
import { normalizePhone } from "@/lib/domain/phone";
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

    // Concede acesso a este navegador (o cookie sai no Set-Cookie da resposta)
    // e devolve o link assinado, para quem acabou de pedir ajuda poder abrir o
    // acompanhamento de qualquer aparelho depois. `token` vem `null` só quando
    // `CR_SESSION_SECRET` não está configurado — nesse caso a gravação e o
    // WhatsApp continuam intactos, só não existe link para mostrar.
    const whatsapp = normalizePhone(parsed.data.telefone);
    const token = whatsapp ? await grantResidentAccess(whatsapp) : null;
    // A origem vem da própria requisição, não de uma constante — assim o link
    // funciona igual em produção, preview e `npm run start` local.
    const origem = new URL(request.url).origin;
    const link = token ? `${origem}/acesso?t=${token}&r=${result.id}` : null;

    // `token` sai ao lado de `link` porque o app nativo não tem cookie jar:
    // ele guarda a credencial no chaveiro do aparelho e a manda depois em
    // `Authorization: Bearer`. Não é exposição nova — é o mesmo token que já
    // viaja dentro de `link`, e é o mesmo que chega por WhatsApp.
    return NextResponse.json({ ok: true, codigo: result.code, link, token }, { status: 201 });
  } catch (error) {
    // Nada de dado pessoal no log: só o que ajuda a entender a falha.
    console.error(
      "[solicitacoes] falha ao gravar",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ ok: false, erro: "falha" }, { status: 500 });
  }
}
