import "./setup-db";

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { db, getPool } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { timelineOf } from "@/lib/domain/activity";
import { betaStatus } from "@/lib/domain/beta";
import { catalogSeed } from "@/lib/domain/catalog-seed";
import { receivePartnerApplication, receiveServiceRequest } from "@/lib/domain/intake";
import { findCandidates } from "@/lib/domain/matching";
import {
  createOpportunities,
  setOpportunityStatus,
} from "@/lib/domain/opportunities";
import {
  approveApplication,
  completeOnboarding,
  registerLaunch,
  registerPayment,
  updatePartner,
} from "@/lib/domain/partners";
import { setRequestStatus } from "@/lib/domain/requests";
import { launchedAt } from "@/lib/domain/settings";

/**
 * O cenário do briefing, ponta a ponta, contra um Postgres de verdade.
 *
 *   empresa se cadastra → é aprovada → paga → onboarding → lançamento
 *   morador pede → triagem → matching → encaminhamento → contratação
 *
 * Não é um teste de unidade: é a prova de que as peças se encaixam. Se um dia
 * alguém mudar a regra do Beta, o encaminhamento ou a deduplicação, é aqui que
 * a mudança aparece antes de virar conversa com um parceiro.
 */

const operador = { id: "" };

before(async () => {
  await migrate(db, { migrationsFolder: "lib/db/migrations" });

  // Cada rodada começa do zero. `truncate ... cascade` respeita as chaves
  // estrangeiras e reinicia as sequências, então os códigos são previsíveis.
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
    alter sequence partner_code_seq restart with 1;
  `);

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

    for (const servico of categoria.services) {
      await db
        .insert(schema.services)
        .values({
          categoryId: categoria.id,
          slug: servico.slug,
          name: servico.name,
          position: servico.position,
        })
        .onConflictDoNothing();
    }
  }

  const [row] = await db
    .insert(schema.operators)
    .values({
      email: "teste@canaaresolve.local",
      name: "Operador de Teste",
      passwordHash: "scrypt$1$1$1$x$x",
      role: "owner",
    })
    .returning({ id: schema.operators.id });
  operador.id = row.id;
});

after(async () => {
  await getPool().end();
});

describe("do primeiro contato ao Parceiro Fundador", () => {
  let applicationId = "";
  let partnerId = "";
  let prospectId = "";

  it("o cadastro do site cria o prospect e preserva o que a empresa declarou", async () => {
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
    applicationId = r.id;

    const [prospect] = await db.select().from(schema.prospects);
    prospectId = prospect.id;
    assert.equal(prospect.status, "cadastro_recebido");
    assert.equal(prospect.whatsapp, "5594981112222");
  });

  it("o mesmo número em outro formato não cria uma segunda empresa", async () => {
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

  it("aprovar cria o parceiro, fecha o cadastro e conclui o funil de uma vez", async () => {
    const r = await approveApplication({
      applicationId,
      actor: operador,
      founder: true,
      categoryIds: ["ar-condicionado"],
      notes: "Conferi o Instagram e o endereço.",
    });

    partnerId = r.partnerId;
    assert.equal(r.code, "PA-0001");

    const [parceiro] = await db
      .select()
      .from(schema.partners)
      .where(eq(schema.partners.id, partnerId));
    assert.equal(parceiro.status, "aguardando_lancamento");
    assert.equal(parceiro.founder, true);

    const [cadastro] = await db
      .select()
      .from(schema.partnerApplications)
      .where(eq(schema.partnerApplications.id, applicationId));
    assert.equal(cadastro.status, "aprovado");
    assert.equal(cadastro.partnerId, partnerId);

    const [prospect] = await db
      .select()
      .from(schema.prospects)
      .where(eq(schema.prospects.id, prospectId));
    assert.equal(prospect.status, "parceiro_fundador");
    assert.equal(prospect.partnerId, partnerId);
  });

  it("pagar reserva a participação, mas não começa os 90 dias", async () => {
    await registerPayment({
      partnerId,
      method: "Pix",
      reference: "E123",
      paidAt: new Date("2026-02-01T12:00:00Z"),
      notes: null,
      actor: operador,
    });

    const [parceiro] = await db
      .select()
      .from(schema.partners)
      .where(eq(schema.partners.id, partnerId));

    assert.ok(parceiro.betaPaidAt, "o pagamento ficou registrado");
    assert.equal(parceiro.betaStartedAt, null, "o relógio NÃO pode ter começado");
    assert.equal(betaStatus(parceiro).phase, "aguardando_onboarding");
  });

  it("com o onboarding pronto, o Beta ainda espera o lançamento", async () => {
    await updatePartner({
      id: partnerId,
      name: "Refrigeração Canaã",
      ownerName: "João Batista",
      whatsapp: "94981112222",
      email: null,
      description: "Instalação e manutenção de ar-condicionado.",
      document: null,
      availability: "Seg a sáb, 7h às 18h",
      servesWholeCity: true,
      neighborhoods: [],
      categoryIds: ["ar-condicionado"],
      serviceIds: [],
      notes: null,
    });

    await completeOnboarding({ partnerId, actor: operador });

    const [parceiro] = await db
      .select()
      .from(schema.partners)
      .where(eq(schema.partners.id, partnerId));

    assert.equal(betaStatus(parceiro).phase, "aguardando_lancamento");
    assert.equal(betaStatus(parceiro).endsAt, null);
  });

  it("o lançamento inicia o prazo e coloca o parceiro na distribuição", async () => {
    const quando = new Date("2026-03-01T12:00:00Z");
    const r = await registerLaunch({ at: quando, actor: operador });

    assert.equal(r.iniciados, 1);
    assert.equal(r.ativados, 1);

    const [parceiro] = await db
      .select()
      .from(schema.partners)
      .where(eq(schema.partners.id, partnerId));

    assert.equal(parceiro.status, "ativo");
    assert.equal(parceiro.betaStartedAt?.toISOString(), quando.toISOString());

    const status = betaStatus(parceiro, quando);
    assert.equal(status.phase, "em_andamento");
    assert.equal(status.daysLeft, 90);

    assert.equal((await launchedAt())?.toISOString(), quando.toISOString());
  });

  it("a história do parceiro pode ser reconstruída sem ninguém ter escrito nada", async () => {
    const historico = await timelineOf("partner", partnerId);
    const resumos = historico.map((h) => h.summary).join(" | ");

    assert.ok(resumos.includes("entrou na rede"), "falta a entrada");
    assert.ok(resumos.includes("Pagamento"), "falta o pagamento");
    assert.ok(resumos.includes("Onboarding"), "falta o onboarding");
    assert.ok(resumos.includes("operação foi aberta"), "falta o lançamento");
  });
});

describe("do pedido do morador ao desfecho", () => {
  let requestId = "";
  let partnerId = "";
  let opportunityId = "";

  before(async () => {
    const [p] = await db.select().from(schema.partners);
    partnerId = p.id;
  });

  it("a solicitação nasce com código antes de qualquer conversa", async () => {
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
    requestId = r.id;

    const [pedido] = await db
      .select()
      .from(schema.serviceRequests)
      .where(eq(schema.serviceRequests.id, requestId));

    assert.equal(pedido.status, "nova");
    assert.equal(pedido.whatsapp, "5594993334444");
    assert.ok(pedido.consentAt, "o consentimento ficou datado");
  });

  it("o matching acha o parceiro certo e explica por quê", async () => {
    const candidatos = await findCandidates({
      requestId,
      categoryId: "ar-condicionado",
      serviceId: null,
      neighborhood: "Novo Horizonte",
    });

    assert.equal(candidatos.length, 1);
    const [c] = candidatos;
    assert.equal(c.id, partnerId);
    assert.ok(c.score > 50, `pontuação baixa demais: ${c.score}`);
    assert.ok(
      c.motivos.some((m) => m.includes("categoria")),
      "o motivo da escolha precisa estar escrito",
    );
    assert.equal(c.jaEncaminhado, false);
  });

  it("encaminhar cria a oportunidade e move o pedido pelo caminho inteiro", async () => {
    const r = await createOpportunities({
      requestId,
      partnerIds: [partnerId],
      actor: operador,
      jaEnviado: true,
    });

    assert.equal(r.criados, 1);

    const [oportunidade] = await db.select().from(schema.opportunities);
    opportunityId = oportunidade.id;
    assert.equal(oportunidade.status, "encaminhado");
    assert.ok(oportunidade.sentAt);

    const [pedido] = await db
      .select()
      .from(schema.serviceRequests)
      .where(eq(schema.serviceRequests.id, requestId));
    assert.equal(pedido.status, "encaminhada");
    assert.ok(pedido.dispatchedAt, "o carimbo do encaminhamento é o que mede a espera");
  });

  it("encaminhar de novo para o mesmo parceiro não duplica nada", async () => {
    const r = await createOpportunities({
      requestId,
      partnerIds: [partnerId],
      actor: operador,
      jaEnviado: true,
    });

    assert.equal(r.criados, 0);
    const todas = await db.select().from(schema.opportunities);
    assert.equal(todas.length, 1);
  });

  it("o desfecho da oportunidade reflete no pedido", async () => {
    await setOpportunityStatus({
      id: opportunityId,
      to: "contato_realizado",
      actor: operador,
    });

    let [pedido] = await db
      .select()
      .from(schema.serviceRequests)
      .where(eq(schema.serviceRequests.id, requestId));
    assert.equal(pedido.status, "em_atendimento");

    await setOpportunityStatus({
      id: opportunityId,
      to: "orcamento",
      actor: operador,
      quoteAmountCents: 45000,
    });

    await setOpportunityStatus({
      id: opportunityId,
      to: "contratado",
      actor: operador,
    });

    const [oportunidade] = await db.select().from(schema.opportunities);
    assert.equal(oportunidade.status, "contratado");
    assert.equal(oportunidade.quoteAmountCents, 45000);
    assert.ok(oportunidade.closedAt);

    [pedido] = await db
      .select()
      .from(schema.serviceRequests)
      .where(eq(schema.serviceRequests.id, requestId));
    assert.equal(pedido.status, "resolvida");
  });

  it("a máquina de estados recusa um salto impossível", async () => {
    const outro = await receiveServiceRequest({
      descricao: "Preciso de um eletricista para o chuveiro.",
      categoria: "eletricista",
      nome: "Pedro",
      telefone: "94995556666",
      bairro: null,
      urgencia: null,
      consentimento: true,
      origem: null,
    });

    await assert.rejects(
      () => setRequestStatus({ id: outro.id, to: "resolvida", actor: operador }),
      /Não dá para ir de/,
      "um pedido não pode nascer resolvido",
    );

    const [pedido] = await db
      .select()
      .from(schema.serviceRequests)
      .where(eq(schema.serviceRequests.id, outro.id));
    assert.equal(pedido.status, "nova", "o estado não pode ter mudado");
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
