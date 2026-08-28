import "./setup-db";

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import {
  alterarSenha,
  contaDaSessao,
  definirSenha,
  entrarComSenha,
  sair,
} from "@/lib/auth/parceiro";
import { db, getPool } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

/**
 * A sessão do parceiro — o que o aplicativo passou a depender na Fase 05.
 *
 * Até aqui a entrada devolvia um token que o aplicativo jogava fora: quem
 * fechasse o aplicativo entrava de novo, e "sair" era esquecer localmente. Com
 * a sessão guardada no aparelho, três coisas viraram promessa que precisa ser
 * verdade — e é o que este arquivo prova, contra o Postgres:
 *
 * 1. o token restaurado é conferido no servidor, e uma sessão revogada morre;
 * 2. trocar a senha exige a senha atual e derruba os **outros** aparelhos;
 * 3. o e-mail da conta vem do banco, e não do que foi digitado na tela.
 */

const EMAIL = "parceiro.sessao@exemplo.com";
const SENHA = "senha-de-teste-1";

let parceiroId: string;

before(async () => {
  await migrate(db, { migrationsFolder: "lib/db/migrations" });

  await db.execute(sql`
    truncate table
      activities, interactions, opportunities, service_requests,
      partner_applications, payments, partner_services, partner_categories,
      partner_sessions, prospects, partners, sessions, operators, settings
    restart identity cascade
  `);

  const [parceiro] = await db
    .insert(schema.partners)
    .values({
      code: "PA-9001",
      name: "Refrigeração Canaã",
      email: EMAIL,
      whatsapp: "5594980000001",
      status: "ativo",
    })
    .returning({ id: schema.partners.id });

  parceiroId = parceiro.id;
  await definirSenha(parceiroId, SENHA);
});

after(async () => {
  await getPool().end();
});

describe("a sessão do parceiro", () => {
  it("entra com a senha certa e devolve o e-mail que está no banco", async () => {
    const sessao = await entrarComSenha(EMAIL.toUpperCase(), SENHA);

    assert.ok(sessao, "a entrada deveria ter funcionado");
    assert.equal(sessao.conta.id, parceiroId);
    assert.equal(sessao.conta.email, EMAIL, "o e-mail vem da coluna, não do formulário");
    assert.equal(sessao.conta.papel, "profissional");
  });

  it("o token guardado no aparelho é conferido no servidor", async () => {
    const sessao = await entrarComSenha(EMAIL, SENHA);
    assert.ok(sessao);

    const conta = await contaDaSessao(sessao.token);
    assert.equal(conta?.id, parceiroId);
    assert.equal(await contaDaSessao("token-inventado"), null);
  });

  it("do token cru não existe cópia no banco", async () => {
    const sessao = await entrarComSenha(EMAIL, SENHA);
    assert.ok(sessao);

    const linhas = await db
      .select({ hash: schema.partnerSessions.tokenHash })
      .from(schema.partnerSessions);

    assert.ok(linhas.length > 0);
    assert.ok(
      linhas.every((l) => l.hash !== sessao.token),
      "o banco não pode guardar o token que o aparelho tem",
    );
  });

  it("sair mata a sessão na hora, e não só no aparelho", async () => {
    const sessao = await entrarComSenha(EMAIL, SENHA);
    assert.ok(sessao);

    await sair(sessao.token);
    assert.equal(await contaDaSessao(sessao.token), null, "sessão encerrada não vale mais");
  });

  it("uma sessão expirada não vale, mesmo com o token certo", async () => {
    const sessao = await entrarComSenha(EMAIL, SENHA);
    assert.ok(sessao);

    // Envelhece a linha em vez de esperar trinta dias.
    await db
      .update(schema.partnerSessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.partnerSessions.partnerId, parceiroId));

    assert.equal(await contaDaSessao(sessao.token), null);
  });
});

describe("trocar a senha", () => {
  it("recusa quem não acerta a senha atual", async () => {
    const sessao = await entrarComSenha(EMAIL, SENHA);
    assert.ok(sessao);

    assert.equal(await alterarSenha(sessao.token, "chute-errado", "outra-senha-9"), "senha-atual");
    assert.ok(await entrarComSenha(EMAIL, SENHA), "a senha antiga continua valendo");
  });

  it("recusa uma sessão que não vale", async () => {
    assert.equal(await alterarSenha("token-inventado", SENHA, "outra-senha-9"), "sessao");
  });

  it("troca a senha, derruba os outros aparelhos e mantém o que pediu", async () => {
    const aparelhoA = await entrarComSenha(EMAIL, SENHA);
    const aparelhoB = await entrarComSenha(EMAIL, SENHA);
    assert.ok(aparelhoA && aparelhoB);

    const nova = "senha-nova-do-teste-2";
    assert.equal(await alterarSenha(aparelhoA.token, SENHA, nova), null);

    assert.equal(
      (await contaDaSessao(aparelhoA.token))?.id,
      parceiroId,
      "quem trocou a senha não é expulso",
    );
    assert.equal(
      await contaDaSessao(aparelhoB.token),
      null,
      "o outro aparelho cai — é para isso que se troca a senha",
    );

    assert.equal(await entrarComSenha(EMAIL, SENHA), null, "a senha velha morreu");
    assert.ok(await entrarComSenha(EMAIL, nova), "a nova entra");
  });
});
