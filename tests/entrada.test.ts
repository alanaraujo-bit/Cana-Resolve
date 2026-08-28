import "./setup-db";

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { db, getPool } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { catalogSeed } from "@/lib/domain/catalog-seed";
import { receivePartnerApplication, receiveServiceRequest } from "@/lib/domain/intake";

/**
 * A entrada, contra um Postgres de verdade.
 *
 * Este arquivo substituiu um teste de fluxo que ia do primeiro contato
 * comercial até o Parceiro Fundador, passando por triagem, matching e
 * encaminhamento. Tudo isso era o Operations e saiu do repositório. O que
 * ficou é a única coisa que a landing ainda faz com o banco: gravar quem
 * chegou.
 *
 * E é justamente o que mais precisa de prova, porque falha em silêncio. Por
 * contrato, se a gravação der errado o formulário abre o WhatsApp do mesmo
 * jeito e a tela não muda uma vírgula — então uma captura quebrada parece
 * perfeita. Um dublê em memória não serviria: o que se prova aqui é
 * comportamento do Postgres (transação, índice único, sequência de códigos).
 */

before(async () => {
  await migrate(db, { migrationsFolder: "lib/db/migrations" });

  await db.execute(sql`
    truncate table
      activities, interactions, opportunities, service_requests,
      partner_applications, payments, partner_services, partner_categories,
      prospects, partners, sessions, operators, settings
    restart identity cascade
  `);
  await db.execute(sql`
    alter sequence service_request_code_seq restart with 1;
    alter sequence prospect_code_seq restart with 1;
  `);

  // O catálogo precisa existir: `service_requests.category_id` e
  // `prospects.category_id` apontam para `categories`, e um pedido com
  // categoria seria recusado pela chave estrangeira sem isto.
  for (const categoria of catalogSeed) {
    await db
      .insert(schema.categories)
      .values({
        id: categoria.id,
        name: categoria.name,
        short: categoria.short,
        blurb: categoria.blurb,
        position: categoria.position,
      })
      .onConflictDoNothing();
  }
});

after(async () => {
  await getPool().end();
});

describe("o pedido do morador", () => {
  it("nasce com código e com o consentimento datado, antes de qualquer conversa", async () => {
    const r = await receiveServiceRequest({
      descricao: "Meu ar-condicionado liga, mas não está gelando.",
      categoria: "ar-condicionado",
      nome: "Maria Silva",
      telefone: "(94) 99333-4444",
      bairro: "Novo Horizonte",
      urgencia: "urgente",
      consentimento: true,
      origem: "google",
    });

    assert.equal(r.code, "CR-00001");

    const [pedido] = await db
      .select()
      .from(schema.serviceRequests)
      .where(eq(schema.serviceRequests.id, r.id));

    assert.equal(pedido.status, "nova");
    assert.equal(pedido.whatsapp, "5594993334444", "o telefone é gravado normalizado");
    assert.ok(pedido.consentAt, "o consentimento ficou datado");
  });

  it("grava a atividade de entrada na mesma transação", async () => {
    // Se a atividade não puder ser gravada, o pedido também não é. É o que
    // impede um registro de existir sem explicação de como apareceu.
    const r = await receiveServiceRequest({
      descricao: "A geladeira parou de gelar de um dia para o outro.",
      categoria: "ar-condicionado",
      nome: "Antônio Souza",
      telefone: "94 99555-6666",
      consentimento: true,
      origem: null,
    });

    const atividades = await db
      .select()
      .from(schema.activities)
      .where(eq(schema.activities.subjectId, r.id));

    assert.equal(atividades.length, 1);
    assert.equal(atividades[0].toState, "nova");
  });

  it("cada solicitação recebe um código próprio, em sequência", async () => {
    const pedidos = await db
      .select({ code: schema.serviceRequests.code })
      .from(schema.serviceRequests)
      .orderBy(schema.serviceRequests.code);

    assert.deepEqual(
      pedidos.map((p) => p.code),
      ["CR-00001", "CR-00002"],
    );
  });
});

describe("o cadastro da empresa", () => {
  it("cria o prospect e preserva o que a empresa declarou", async () => {
    const r = await receivePartnerApplication({
      nome: "João Batista",
      empresa: "Refrigeração Canaã",
      telefone: "(94) 98111-2222",
      categoria: "ar-condicionado",
      atendeCanaa: true,
      comoConheceu: "Indicação",
      origem: "instagram",
      atribuicao: { origem: "instagram" },
    });

    assert.equal(r.merged, false);
    assert.equal(r.code, "PR-0001");

    const [prospect] = await db.select().from(schema.prospects);
    assert.equal(prospect.status, "cadastro_recebido");
    assert.equal(prospect.whatsapp, "5594981112222");
  });

  it("o mesmo número em outro formato não cria uma segunda empresa", async () => {
    // A deduplicação é pelo WhatsApp normalizado porque é o único dado que a
    // mesma empresa escreve igual em qualquer contexto.
    const r = await receivePartnerApplication({
      nome: "João",
      empresa: "Refrigeração Canaã LTDA",
      telefone: "+55 94 98111 2222",
      categoria: "ar-condicionado",
      atendeCanaa: true,
      comoConheceu: null,
      origem: null,
    });

    assert.equal(r.merged, true, "deveria ter se juntado ao prospect existente");

    const prospects = await db.select().from(schema.prospects);
    assert.equal(prospects.length, 1, "não pode existir a mesma empresa duas vezes");

    const cadastros = await db.select().from(schema.partnerApplications);
    assert.equal(cadastros.length, 2, "mas os dois cadastros continuam registrados");
  });

  it("um cadastro que chega depois não puxa a empresa de volta no funil", async () => {
    // O funil só anda para a frente. Sem esta regra, uma empresa já aprovada
    // que reenviasse o formulário voltaria para "cadastro recebido".
    const [antes] = await db.select().from(schema.prospects);
    await db
      .update(schema.prospects)
      .set({ status: "aprovado" })
      .where(eq(schema.prospects.id, antes.id));

    await receivePartnerApplication({
      nome: "João",
      empresa: "Refrigeração Canaã",
      telefone: "5594981112222",
      categoria: "ar-condicionado",
      atendeCanaa: true,
      comoConheceu: null,
      origem: null,
    });

    const [depois] = await db.select().from(schema.prospects);
    assert.equal(depois.status, "aprovado");
  });
});
