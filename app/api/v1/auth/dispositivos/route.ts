import { NextResponse } from "next/server";
import { z } from "zod";

import { cabecalhosDeCors, tokenDoCabecalho } from "@/lib/auth/cors";
import { contaDaSessao } from "@/lib/auth/parceiro";
import { isDatabaseConfigured } from "@/lib/db/client";
import {
  dispositivosDoParceiro,
  registrarDispositivo,
  revogarDispositivo,
} from "@/lib/push/dispositivos";
import { callerKey, rateLimit } from "@/lib/rate-limit";

/**
 * Onde um aviso pode ser entregue.
 *
 *     POST   /api/v1/auth/dispositivos   Authorization: Bearer <token>
 *     GET    /api/v1/auth/dispositivos   Authorization: Bearer <token>
 *     DELETE /api/v1/auth/dispositivos   Authorization: Bearer <token>
 *
 * **Por que ela mora sob `auth` e não sob uma API de dados.** O que ela precisa
 * saber é quem está logado — nada mais. Não lê oportunidade, não lê perfil.
 * Colocá-la atrás da API de dados, que ainda não existe, adiaria por meses uma
 * peça que já pode ser real hoje; e o registro de aparelho é justamente a peça
 * que precisa existir antes de qualquer push (§61).
 *
 * **A sessão é obrigatória em todos os verbos** (§116). Sem isso, conhecer um
 * `installationId` bastaria para redirecionar as oportunidades de alguém — e o
 * token de push jamais autentica coisa alguma por si (§55).
 *
 * O `POST` é idempotente: registrar dez vezes é uma linha (§99). É ele também
 * que resolve a troca de conta — o parceiro B registrando o aparelho do A
 * reaponta a linha, e o A para de receber ali na mesma escrita (§58).
 *
 * O `DELETE` é o §57: o aplicativo o chama **antes** de sair, com o token
 * ainda válido, porque depois não haveria com o que provar quem está pedindo.
 */

const METODOS = "GET, POST, DELETE, OPTIONS";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: cabecalhosDeCors(request, METODOS) });
}

/**
 * O que o aparelho manda.
 *
 * `installationId` é sorteado pelo aplicativo e não vem de nenhum
 * identificador do aparelho: nada de IDFV, IMEI ou serial. Um identificador de
 * hardware seguiria a pessoa entre desinstalações e entre contas, que é
 * exatamente o que não queremos rastrear (§54).
 */
const corpo = z.object({
  installationId: z.string().trim().min(8).max(64),
  pushToken: z.string().trim().min(8).max(512),
  plataforma: z.enum(["ios", "android", "web"]),
  ambiente: z.enum(["development", "production"]).default("development"),
  /** "iPhone 15 · iOS 18.2". Modelo e sistema, nada identificável. */
  descricao: z.string().trim().max(120).nullish(),
  appVersion: z.string().trim().max(32).nullish(),
});

const semSessao = (cors: Record<string, string>) =>
  NextResponse.json(
    { ok: false, erro: "sessao" },
    { status: 401, headers: { ...cors, "Cache-Control": "no-store" } },
  );

/** A conta desta requisição, ou `null`. Um lugar só para os três verbos. */
async function contaDaRequisicao(request: Request) {
  const token = tokenDoCabecalho(request);
  if (!token) return null;
  return contaDaSessao(token);
}

export async function POST(request: Request) {
  const cors = cabecalhosDeCors(request, METODOS);

  // Um aparelho registra na abertura e quando o token muda — não trinta vezes
  // por minuto. O freio é folgado para o uso legítimo e fecha o laço de uma
  // retentativa quebrada no cliente (§98).
  const limite = rateLimit(callerKey(request.headers, "dispositivo"), 12, 60_000);
  if (!limite.ok) {
    return NextResponse.json(
      { ok: false, erro: "muitas_tentativas" },
      { status: 429, headers: { ...cors, "Retry-After": String(limite.retryAfter) } },
    );
  }

  if (!isDatabaseConfigured()) {
    console.error("[push] DATABASE_URL ausente — nenhum aparelho pode se registrar");
    return NextResponse.json({ ok: false, erro: "indisponivel" }, { status: 503, headers: cors });
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

  try {
    const conta = await contaDaRequisicao(request);
    if (!conta) return semSessao(cors);

    const registrado = await registrarDispositivo(conta.id, {
      installationId: lido.data.installationId,
      pushToken: lido.data.pushToken,
      platform: lido.data.plataforma,
      environment: lido.data.ambiente,
      descricao: lido.data.descricao ?? null,
      appVersion: lido.data.appVersion ?? null,
    });

    // A resposta não devolve o token: quem o tem é o aparelho, e ele não
    // precisa que o servidor confirme repetindo-o (§54).
    return NextResponse.json(
      { dispositivo: registrado },
      { status: 200, headers: { ...cors, "Cache-Control": "no-store" } },
    );
  } catch (error) {
    // Nada do que é registrado aparece no log: nem token, nem instalação.
    console.error("[push] falha ao registrar aparelho", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, erro: "falha" }, { status: 500, headers: cors });
  }
}

/**
 * Quais aparelhos desta conta estão recebendo.
 *
 * Serve à tela de Segurança, e por isso devolve o mínimo: plataforma, apelido
 * e datas. Nenhum endereço de entrega sai daqui.
 */
export async function GET(request: Request) {
  const cors = cabecalhosDeCors(request, METODOS);

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, erro: "indisponivel" }, { status: 503, headers: cors });
  }

  try {
    const conta = await contaDaRequisicao(request);
    if (!conta) return semSessao(cors);

    return NextResponse.json(
      { dispositivos: await dispositivosDoParceiro(conta.id) },
      { status: 200, headers: { ...cors, "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[push] falha ao listar aparelhos", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, erro: "falha" }, { status: 500, headers: cors });
  }
}

/**
 * Este aparelho para de receber o que é desta conta.
 *
 * Chamado no logout, com o token ainda válido. Responde 204 mesmo quando não
 * havia nada para revogar: como o `sair`, esta é uma operação que sempre
 * termina bem — o que importa é o estado final, e ele é o mesmo.
 */
export async function DELETE(request: Request) {
  const cors = cabecalhosDeCors(request, METODOS);
  const semConteudo = () =>
    new NextResponse(null, { status: 204, headers: { ...cors, "Cache-Control": "no-store" } });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, erro: "indisponivel" }, { status: 503, headers: cors });
  }

  const url = new URL(request.url);
  const installationId = (url.searchParams.get("installationId") ?? "").trim();
  if (!installationId) {
    return NextResponse.json({ ok: false, erro: "corpo_invalido" }, { status: 400, headers: cors });
  }

  try {
    const conta = await contaDaRequisicao(request);
    // Sem sessão não dá para saber de quem é o aparelho — e revogar pelo
    // `installationId` sozinho deixaria qualquer um calar o telefone alheio.
    if (!conta) return semSessao(cors);

    await revogarDispositivo(conta.id, installationId, "saiu");
    return semConteudo();
  } catch (error) {
    console.error("[push] falha ao revogar aparelho", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, erro: "falha" }, { status: 500, headers: cors });
  }
}
