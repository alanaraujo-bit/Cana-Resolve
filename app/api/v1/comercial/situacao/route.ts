import { NextResponse } from "next/server";

import { cabecalhosDeCors, tokenDoCabecalho } from "@/lib/auth/cors";
import { contaDaSessao } from "@/lib/auth/parceiro";
import { situacaoDoParceiro } from "@/lib/comercial/situacao";
import { isDatabaseConfigured } from "@/lib/db/client";

/**
 * A situação comercial de quem está logado.
 *
 *     GET /api/v1/comercial/situacao   Authorization: Bearer <token>
 *
 * **O servidor é a autoridade** (§48), e esta rota é a forma concreta disso: o
 * aplicativo não calcula dias, não decide entitlement e não infere estado a
 * partir de um pagamento que ele acha que fez. Ele lê daqui e desenha.
 *
 * **Ela é só de leitura, e é de propósito.** Não existe nesta API nenhum verbo
 * que o aplicativo possa chamar para conceder acesso a si mesmo — nem
 * "confirmei o pagamento", nem "sou fundador", nem "ative meu Beta". O §17 não
 * é uma disciplina de quem escreve o cliente: é a ausência da rota.
 *
 * **Por que mora em `comercial/` e não em `auth/`.** A régua do repositório
 * dizia "o que o app precisa do servidor e só precisa saber quem está logado
 * entra em `auth/`". Esta rota precisa saber quem está logado **e** ler estado
 * comercial — então ganhou um irmão. A régua continua: `app/api/v1/` é do
 * aplicativo, e telas continuam fora daqui. Ver o README.
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

    const situacao = await situacaoDoParceiro(conta.id);

    return NextResponse.json(situacao, {
      status: 200,
      /*
       * `no-store`, sem exceção. Estado comercial em cache intermediário é
       * como um entitlement vencido continuar sendo servido — e pior, servido
       * possivelmente para outra conta. O aplicativo tem o próprio cache, com
       * revalidação, e ele sabe o que está fazendo (§108).
       */
      headers: { ...cors, "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(
      "[comercial] falha ao montar a situação",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ ok: false, erro: "falha" }, { status: 500, headers: cors });
  }
}
