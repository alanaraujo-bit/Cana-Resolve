import { NextResponse } from "next/server";

import { cabecalhosDeCors, tokenDoCabecalho } from "@/lib/auth/cors";
import { contaDaSessao } from "@/lib/auth/parceiro";
import { cobrancasDoParceiro } from "@/lib/comercial/situacao";
import { isDatabaseConfigured } from "@/lib/db/client";

/**
 * O histórico de cobrança de quem está logado.
 *
 *     GET /api/v1/comercial/cobrancas   Authorization: Bearer <token>
 *
 * Separado da situação por um motivo de produto, e não de arquitetura: o §104
 * diz que histórico e faturamento **continuam acessíveis mesmo sem plano
 * ativo**. Sendo uma rota própria, ela não depende de nenhum estado comercial
 * para responder — quem pagou vê o que pagou, tenha acesso hoje ou não.
 *
 * O que sai daqui é o que uma pessoa entende: data, descrição, valor, estado e
 * o comprovante quando o provedor oferecer um. Nunca identificador de
 * transação de gateway, nunca código de erro, nunca recibo cru.
 */

const METODOS = "GET, OPTIONS";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: cabecalhosDeCors(request, METODOS) });
}

export async function GET(request: Request) {
  const cors = cabecalhosDeCors(request, METODOS);

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, erro: "indisponivel" }, { status: 503, headers: cors });
  }

  try {
    const token = tokenDoCabecalho(request);
    const conta = token ? await contaDaSessao(token) : null;
    if (!conta) {
      return NextResponse.json(
        { ok: false, erro: "sessao" },
        { status: 401, headers: { ...cors, "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { cobrancas: await cobrancasDoParceiro(conta.id) },
      { status: 200, headers: { ...cors, "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[comercial] falha ao ler as cobranças",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ ok: false, erro: "falha" }, { status: 500, headers: cors });
  }
}
