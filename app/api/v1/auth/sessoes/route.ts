import { NextResponse } from "next/server";
import { z } from "zod";

import { cabecalhosDeCors, tokenDoCabecalho } from "@/lib/auth/cors";
import { contaDaSessao, entrarComSenha, sair } from "@/lib/auth/parceiro";
import { isDatabaseConfigured } from "@/lib/db/client";
import { callerKey, rateLimit } from "@/lib/rate-limit";

/**
 * A entrada do aplicativo do parceiro.
 *
 *     POST /api/v1/auth/sessoes     { tipo: "senha", email, senha }
 *     GET /api/v1/auth/sessoes      Authorization: Bearer <token>
 *     DELETE /api/v1/auth/sessoes   Authorization: Bearer <token>
 *
 * O contrato é o que o aplicativo já falava desde a Fase 01
 * (`mobile/src/auth/service.ts`): 200 devolve `{ token, conta }`, 401 é
 * credencial inválida, e nada além disso. A API nasceu depois do cliente, então
 * ela se adapta ao contrato — não o contrário.
 *
 * **Por que esta rota mora no repositório do site.** O README dizia que a API
 * do aplicativo não se constrói aqui. Alan decidiu o contrário em 28/08/2026,
 * pelo motivo mais simples que existe: o deploy já está de pé, e um serviço
 * novo custaria dias para entregar a mesma tela de login. A decisão está
 * registrada no README para o repositório não mentir sobre si mesmo.
 *
 * O `GET` é o que permite ao aplicativo guardar a sessão entre aberturas sem
 * confiar no próprio disco: ele restaura a sessão gravada e pergunta aqui se
 * ela ainda vale. 200 devolve a conta, 401 é sessão expirada ou revogada — e é
 * esse 401 que faz o aplicativo mandar entrar de novo em vez de mostrar erro
 * espalhado por todas as telas.
 *
 * Google e Apple ainda não entram: falta o que está no `mobile/BLOCKERS.md`.
 * Eles respondem 501 dizendo isso, em vez de fingir uma verificação.
 */

const METODOS = "GET, POST, DELETE, OPTIONS";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: cabecalhosDeCors(request, METODOS) });
}

/** O corpo que o aplicativo manda. `tipo` é o que separa os caminhos. */
const corpo = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("senha"),
    email: z.string().trim().min(1).max(200),
    senha: z.string().min(1).max(256),
  }),
  z.object({
    tipo: z.literal("google"),
    code: z.string(),
    codeVerifier: z.string().optional(),
    redirectUri: z.string(),
  }),
  z.object({
    tipo: z.literal("apple"),
    identityToken: z.string(),
    nomeCompleto: z.string().nullish(),
  }),
]);

type Cabecalhos = Record<string, string>;

const naoAutorizado = (cors: Cabecalhos) =>
  NextResponse.json({ ok: false, erro: "credenciais" }, { status: 401, headers: cors });

export async function POST(request: Request) {
  const cors = cabecalhosDeCors(request, METODOS);

  // Freio por origem: login é a superfície onde tentativa em massa compensa.
  // Seis por minuto é folgado para quem erra a senha e apertado para um robô.
  const limite = rateLimit(callerKey(request.headers, "auth"), 6, 60_000);
  if (!limite.ok) {
    return NextResponse.json(
      { ok: false, erro: "muitas_tentativas" },
      { status: 429, headers: { ...cors, "Retry-After": String(limite.retryAfter) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, erro: "corpo_invalido" },
      { status: 400, headers: cors },
    );
  }

  const lido = corpo.safeParse(payload);
  // Corpo malformado num login não merece detalhe de validação: seria um mapa
  // dos campos aceitos. Quem escreve o cliente tem o contrato.
  if (!lido.success) return naoAutorizado(cors);

  if (lido.data.tipo !== "senha") {
    return NextResponse.json(
      {
        ok: false,
        erro: "nao_disponivel",
        detalhe:
          lido.data.tipo === "google"
            ? "Entrada pelo Google ainda não está ligada."
            : "Entrada pela Apple ainda não está ligada.",
      },
      { status: 501, headers: cors },
    );
  }

  if (!isDatabaseConfigured()) {
    console.error("[auth] DATABASE_URL ausente — ninguém consegue entrar");
    return NextResponse.json(
      { ok: false, erro: "indisponivel" },
      { status: 503, headers: cors },
    );
  }

  try {
    const sessao = await entrarComSenha(lido.data.email, lido.data.senha);
    if (!sessao) return naoAutorizado(cors);

    return NextResponse.json(
      { token: sessao.token, conta: sessao.conta },
      // Uma resposta com credencial dentro não pode ficar em cache de ninguém.
      { status: 201, headers: { ...cors, "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[auth] falha ao entrar", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, erro: "falha" }, { status: 500, headers: cors });
  }
}

/**
 * Quem é o dono desta sessão.
 *
 * Sem corpo e sem efeito: o aplicativo pergunta na abertura se a credencial
 * que ele guardou ainda vale. `contaDaSessao` já renova o `lastSeenAt`, então
 * quem usa o aplicativo não é expulso por inatividade.
 */
export async function GET(request: Request) {
  const cors = cabecalhosDeCors(request, METODOS);
  const token = tokenDoCabecalho(request);

  if (!token) {
    return NextResponse.json(
      { ok: false, erro: "credenciais" },
      { status: 401, headers: { ...cors, "Cache-Control": "no-store" } },
    );
  }

  if (!isDatabaseConfigured()) {
    console.error("[auth] DATABASE_URL ausente — nenhuma sessão pode ser conferida");
    return NextResponse.json({ ok: false, erro: "indisponivel" }, { status: 503, headers: cors });
  }

  try {
    const conta = await contaDaSessao(token);
    // 401 significa **esta sessão não vale mais** — o aplicativo trata isso
    // mandando entrar de novo. Qualquer outro problema precisa de outro código,
    // ou uma falha do banco expulsaria todo mundo de uma vez.
    if (!conta) return naoAutorizado(cors);

    return NextResponse.json(
      { conta },
      { status: 200, headers: { ...cors, "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[auth] falha ao conferir sessão", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, erro: "falha" }, { status: 500, headers: cors });
  }
}

/** Sair. Não falha quando o token já não vale: sair é sempre bem-sucedido. */
export async function DELETE(request: Request) {
  const token = tokenDoCabecalho(request);

  if (token && isDatabaseConfigured()) {
    try {
      await sair(token);
    } catch (error) {
      console.error("[auth] falha ao sair", error instanceof Error ? error.message : error);
    }
  }

  return new NextResponse(null, {
    status: 204,
    headers: { ...cabecalhosDeCors(request, METODOS), "Cache-Control": "no-store" },
  });
}
