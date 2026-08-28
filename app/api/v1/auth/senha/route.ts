import { NextResponse } from "next/server";
import { z } from "zod";

import { cabecalhosDeCors, tokenDoCabecalho } from "@/lib/auth/cors";
import { alterarSenha } from "@/lib/auth/parceiro";
import { validarSenha } from "@/lib/auth/senha";
import { isDatabaseConfigured } from "@/lib/db/client";
import { callerKey, rateLimit } from "@/lib/rate-limit";

/**
 * Trocar a senha, de dentro do aplicativo.
 *
 *     POST /api/v1/auth/senha
 *     Authorization: Bearer <token>
 *     { atual, nova }
 *
 * Esta rota existe porque a alternativa era pior. O aplicativo precisa de uma
 * tela de "alterar senha" na Fase 05, e uma tela que diz **senha alterada** sem
 * que nada tenha mudado é exatamente o que a especificação proíbe. Ou a
 * operação é real, ou a tela não existe — e o trabalho de torná-la real é o
 * arquivo `lib/auth/parceiro.ts`, que já sabia conferir e gravar senha.
 *
 * O que é do servidor, e não da interface:
 *
 * - a senha atual é exigida (o token prova aparelho logado, não dono presente);
 * - as outras sessões da conta caem, e a que pediu a troca sobrevive;
 * - o freio é apertado — trocar senha não é algo que se faça seis vezes por
 *   minuto, e esta é uma rota onde tentar em massa compensaria.
 *
 * Ela **não** serve para "esqueci minha senha": ali não há sessão nenhuma para
 * autorizar a troca. Esse caminho continua sendo o do `BLOCKERS.md`.
 */

const METODOS = "POST, OPTIONS";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: cabecalhosDeCors(request, METODOS) });
}

const corpo = z.object({
  atual: z.string().min(1).max(256),
  nova: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  const cors = cabecalhosDeCors(request, METODOS);

  const limite = rateLimit(callerKey(request.headers, "senha"), 5, 60_000);
  if (!limite.ok) {
    return NextResponse.json(
      { ok: false, erro: "muitas_tentativas" },
      { status: 429, headers: { ...cors, "Retry-After": String(limite.retryAfter) } },
    );
  }

  const token = tokenDoCabecalho(request);
  if (!token) {
    return NextResponse.json({ ok: false, erro: "sessao" }, { status: 401, headers: cors });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "corpo_invalido" }, { status: 400, headers: cors });
  }

  const lido = corpo.safeParse(payload);
  if (!lido.success) {
    return NextResponse.json({ ok: false, erro: "corpo_invalido" }, { status: 400, headers: cors });
  }

  // A régua da senha nova é conferida aqui também, e não só na tela: um cliente
  // é uma sugestão, o servidor é a regra.
  const fraca = validarSenha(lido.data.nova);
  if (fraca) {
    return NextResponse.json(
      { ok: false, erro: "senha_fraca", detalhe: fraca },
      { status: 422, headers: cors },
    );
  }

  if (lido.data.nova === lido.data.atual) {
    return NextResponse.json(
      { ok: false, erro: "senha_igual", detalhe: "A senha nova precisa ser diferente da atual." },
      { status: 422, headers: cors },
    );
  }

  if (!isDatabaseConfigured()) {
    console.error("[auth] DATABASE_URL ausente — ninguém consegue trocar senha");
    return NextResponse.json({ ok: false, erro: "indisponivel" }, { status: 503, headers: cors });
  }

  try {
    const falha = await alterarSenha(token, lido.data.atual, lido.data.nova);

    if (falha === "sessao") {
      return NextResponse.json({ ok: false, erro: "sessao" }, { status: 401, headers: cors });
    }
    if (falha === "sem-senha") {
      return NextResponse.json({ ok: false, erro: "sem_senha" }, { status: 409, headers: cors });
    }
    if (falha === "senha-atual") {
      return NextResponse.json({ ok: false, erro: "senha_atual" }, { status: 403, headers: cors });
    }

    return new NextResponse(null, {
      status: 204,
      headers: { ...cors, "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[auth] falha ao trocar senha", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, erro: "falha" }, { status: 500, headers: cors });
  }
}
