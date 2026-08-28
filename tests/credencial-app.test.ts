import "./setup-db";

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import {
  createPartnerSession,
  issueResidentToken,
  resolvePartnerByToken,
  revokePartnerToken,
  verifyResidentToken,
} from "@/lib/auth/audience";
import { bearerToken, partnerFromRequest, residentFromRequest } from "@/lib/auth/bearer";
import { db, getPool } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

/**
 * A credencial do app nativo.
 *
 * Estes testes existem porque o app trocou o transporte da credencial — de
 * cookie `httpOnly`, que o servidor controla, para uma string guardada no
 * aparelho de outra pessoa. O que era implícito ("só o navegador manda esse
 * cookie") virou coisa que precisa ser conferida a cada requisição.
 *
 * O que se prova aqui é a fronteira, não a tela: quem o token identifica, o
 * que ele deixa de identificar depois de revogado ou vencido, e que nenhum
 * outro jeito de mandar a credencial é aceito.
 */

// Uma chave qualquer: o que importa é a assinatura ser conferida contra ela,
// não qual é. Definida antes do primeiro uso porque `issueResidentToken` lê a
// variável na hora de assinar, de propósito.
process.env.CR_SESSION_SECRET ||= "chave-de-teste-com-tamanho-suficiente";

before(async () => {
  await migrate(db, { migrationsFolder: "lib/db/migrations" });
  await db.execute(sql`truncate table partner_sessions, partners restart identity cascade`);
});

/**
 * Cada teste ganha o próprio parceiro.
 *
 * Não é higiene genérica: o freio de tentativas é **por código** e mora em
 * memória de processo, então dois testes que entrassem com o mesmo código
 * somariam tentativas e o quinto login legítimo do arquivo seria recusado. Um
 * código por teste mantém cada um sozinho com o seu contador.
 */
let sequencia = 9000;
async function criarParceiro() {
  sequencia += 1;
  const code = `PA-${sequencia}`;
  const whatsapp = `559499000${sequencia}`;
  const [row] = await db
    .insert(schema.partners)
    .values({ code, name: `Fixture ${code}`, whatsapp, status: "ativo" })
    .returning({ id: schema.partners.id });
  return { id: row.id, code, whatsapp };
}

after(async () => {
  await getPool().end();
});

describe("Bearer: o único transporte aceito", () => {
  const comCabecalho = (valor: string | null) =>
    new Request("https://exemplo.test/api/app/parceiro", {
      headers: valor === null ? {} : { authorization: valor },
    });

  it("lê o token de Authorization: Bearer", () => {
    assert.equal(bearerToken(comCabecalho("Bearer abc123")), "abc123");
  });

  it("aceita o esquema em qualquer caixa e com espaço sobrando", () => {
    // RFC 7235: o esquema não diferencia maiúsculas. Um cliente que mande
    // "bearer" não está errado, e recusá-lo seria um bug difícil de achar do
    // lado do app.
    assert.equal(bearerToken(comCabecalho("bearer   abc123")), "abc123");
    assert.equal(bearerToken(comCabecalho("  BEARER abc123  ")), "abc123");
  });

  it("recusa outro esquema, cabeçalho ausente e token vazio", () => {
    assert.equal(bearerToken(comCabecalho("Basic abc123")), null);
    assert.equal(bearerToken(comCabecalho("abc123")), null);
    assert.equal(bearerToken(comCabecalho("Bearer")), null);
    assert.equal(bearerToken(comCabecalho("Bearer   ")), null);
    assert.equal(bearerToken(comCabecalho(null)), null);
  });

  it("não aceita a credencial por cookie", () => {
    // Esta é a razão de o Bearer ser obrigatório. O navegador manda cookie
    // sozinho numa requisição vinda de outra origem; cabeçalho, não. Se um dia
    // alguém "facilitar" aceitando o cookie aqui, toda rota desta API vira
    // CSRF — e é este teste que deve quebrar primeiro.
    const token = issueResidentToken("5594990001111");
    assert.ok(token);
    const request = new Request("https://exemplo.test/api/app/morador/solicitacoes", {
      headers: { cookie: `cr_morador_acesso=${token}` },
    });
    assert.equal(residentFromRequest(request), null);
  });
});

describe("Morador: o link assinado é a credencial", () => {
  it("o token identifica o WhatsApp que o gerou", () => {
    const token = issueResidentToken("5594990001111");
    assert.ok(token);
    assert.deepEqual(verifyResidentToken(token), { whatsapp: "5594990001111" });
  });

  it("um payload adulterado não passa pela assinatura", () => {
    // O ataque óbvio: trocar o WhatsApp dentro do payload para ler os pedidos
    // de outra pessoa. O payload é legível — é base64, não criptografia —,
    // então a única coisa entre um curioso e os dados alheios é o HMAC.
    const token = issueResidentToken("5594990001111");
    assert.ok(token);
    const [payload, assinatura] = token.split(".");
    const adulterado = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    adulterado.w = "5594990002222";
    const forjado = `${Buffer.from(JSON.stringify(adulterado)).toString("base64url")}.${assinatura}`;

    assert.equal(verifyResidentToken(forjado), null);
  });

  it("um token vencido não vale mais", () => {
    // Assinado com a chave certa e ainda assim recusado: o prazo faz parte do
    // que a assinatura cobre.
    const payload = Buffer.from(
      JSON.stringify({ w: "5594990001111", exp: Date.now() - 1000 }),
    ).toString("base64url");
    const assinatura = createHmac("sha256", process.env.CR_SESSION_SECRET!)
      .update(payload)
      .digest("base64url");

    assert.equal(verifyResidentToken(`${payload}.${assinatura}`), null);
  });

  it("lixo não derruba a verificação", () => {
    for (const entrada of ["", ".", "a.b", "sem-ponto", "..", "a.b.c"]) {
      assert.equal(verifyResidentToken(entrada), null, `entrada: ${JSON.stringify(entrada)}`);
    }
  });
});

describe("Parceiro: a sessão vive no banco e é revogável", () => {
  const cabecalhos = () => new Headers({ "x-forwarded-for": "203.0.113.10" });

  it("entra com código e WhatsApp, e o token devolvido identifica o parceiro", async () => {
    const parceiro = await criarParceiro();
    // De minúscula e com o telefone formatado como a pessoa digitaria: o
    // código é normalizado para maiúscula e o telefone passa por
    // `normalizePhone`, que devolve dígitos com DDI.
    const digitos = parceiro.whatsapp;
    const comoDigitado = `${digitos.slice(2, 4)} ${digitos.slice(4, 9)}-${digitos.slice(9)}`;
    const session = await createPartnerSession(parceiro.code.toLowerCase(), comoDigitado, cabecalhos());
    assert.ok(session.ok);

    const viewer = await resolvePartnerByToken(session.token);
    assert.equal(viewer?.id, parceiro.id);
    assert.equal(viewer?.code, parceiro.code);
  });

  it("o token não é gravado em claro no banco", async () => {
    // Se o dump do Postgres vazar, um token guardado em claro é uma sessão
    // pronta para uso. O que fica na tabela é o hash.
    const parceiro = await criarParceiro();
    const session = await createPartnerSession(parceiro.code, parceiro.whatsapp, cabecalhos());
    assert.ok(session.ok);

    const linhas = await db.select().from(schema.partnerSessions);
    assert.ok(linhas.length > 0);
    assert.ok(
      linhas.every((linha) => linha.tokenHash !== session.token),
      "o token cru apareceu na coluna token_hash",
    );
  });

  it("código certo com WhatsApp de outra empresa não entra", async () => {
    const parceiro = await criarParceiro();
    const session = await createPartnerSession(parceiro.code, "5594990009999", cabecalhos());
    assert.equal(session.ok, false);
    assert.equal(session.ok === false && session.error, "dados");
  });

  it("depois de sair, o token não identifica mais ninguém", async () => {
    const parceiro = await criarParceiro();
    const session = await createPartnerSession(parceiro.code, parceiro.whatsapp, cabecalhos());
    assert.ok(session.ok);

    assert.ok(await resolvePartnerByToken(session.token));
    await revokePartnerToken(session.token);
    assert.equal(await resolvePartnerByToken(session.token), null);
  });

  it("uma sessão vencida não identifica ninguém", async () => {
    const parceiro = await criarParceiro();
    const session = await createPartnerSession(parceiro.code, parceiro.whatsapp, cabecalhos());
    assert.ok(session.ok);

    await db
      .update(schema.partnerSessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.partnerSessions.partnerId, parceiro.id));

    assert.equal(await resolvePartnerByToken(session.token), null);
  });

  it("um token inventado não identifica ninguém", async () => {
    assert.equal(await resolvePartnerByToken("token-que-nunca-existiu"), null);
    assert.equal(await resolvePartnerByToken(""), null);
  });

  it("o mesmo caminho vale quando o token chega por requisição", async () => {
    const parceiro = await criarParceiro();
    const session = await createPartnerSession(parceiro.code, parceiro.whatsapp, cabecalhos());
    assert.ok(session.ok);

    const request = new Request("https://exemplo.test/api/app/parceiro", {
      headers: { authorization: `Bearer ${session.token}` },
    });
    assert.equal((await partnerFromRequest(request))?.id, parceiro.id);
  });
});

describe("Parceiro: os freios da entrada valem para o app também", () => {
  it("o freio por código conta as tentativas mesmo vindas de IPs diferentes", async () => {
    // O espaço de códigos é pequeno (PA-0001, PA-0002…) e o telefone, em
    // Canaã, compartilha DDD e prefixo com todo mundo. Um freio só por IP não
    // seguraria quem distribui as tentativas — e o app, saindo de uma rede
    // móvel, troca de IP sozinho.
    let ultimo: Awaited<ReturnType<typeof createPartnerSession>> | null = null;
    for (let i = 0; i < 8; i += 1) {
      ultimo = await createPartnerSession(
        "PA-INEXISTENTE",
        "5594990009001",
        new Headers({ "x-forwarded-for": `198.51.100.${i}` }),
      );
    }
    assert.equal(ultimo?.ok, false);
    assert.equal(ultimo?.ok === false && ultimo.error, "muitas_tentativas");
  });
});
