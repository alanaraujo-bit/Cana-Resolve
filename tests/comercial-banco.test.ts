import "./setup-db";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import {
  abrirOperacao,
  adesaoDoParceiro,
  aprovarParaOBeta,
  confirmarPagamento,
  desfazerPagamento,
  encerrarBetasVencidos,
  vagasOcupadas,
} from "@/lib/comercial/adesao";
import { ofertaAtiva, ofertaPorVersao, ofertasAtivas } from "@/lib/comercial/catalogo";
import { historiaDoParceiro } from "@/lib/comercial/livro";
import { definirInicioDaOperacao, inicioDaOperacao } from "@/lib/comercial/operacao";
import { cobrancasDoParceiro, situacaoDoParceiro } from "@/lib/comercial/situacao";
import { db, getPool } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { CODIGO_DO_BETA } from "@/lib/domain/comercial/catalogo";

/**
 * A camada comercial contra o Postgres de verdade.
 *
 * O que `tests/comercial.test.ts` prova sem banco é a **regra**. O que só o
 * banco prova, e é o que está aqui, são as três garantias que nenhum dublê em
 * memória saberia fingir:
 *
 * 1. **O índice único que torna a idempotência real.** Duas confirmações do
 *    mesmo pagamento produzem uma adesão, uma cobrança e um evento — e a
 *    garantia é do índice, não de um `if` que teria janela.
 * 2. **A transação.** Adesão, cobrança e o espelho nas colunas antigas
 *    entram juntos ou não entram.
 * 3. **A migração dos parceiros da operação manual.** O §72 é uma promessa
 *    sobre gente que já pagou; ela se prova rodando o SQL da migração sobre
 *    dados como os que existem hoje, e não lendo o SQL.
 */

const DIA = 86_400_000;
const em = (texto: string) => new Date(texto);

let alice: string;
let bruno: string;
let carla: string;

before(async () => {
  await migrate(db, { migrationsFolder: "lib/db/migrations" });
});

beforeEach(async () => {
  await db.execute(sql`
    truncate table
      activities, interactions, opportunities, service_requests,
      partner_applications, payments, partner_services, partner_categories,
      partner_devices, partner_sessions, prospects, partners, sessions,
      operators, settings, commercial_events, founder_enrollments,
      payment_transactions, subscriptions, product_mappings
    restart identity cascade
  `);

  /*
   * O catálogo **não** é truncado: a semente do Beta foi escrita pela migração,
   * e apagá-la deixaria os testes seguintes sem oferta nenhuma. O que se limpa
   * são as ofertas que os próprios testes criam — sem isto, uma oferta
   * malformada inserida por um teste sobrevive no banco e derruba o teste que
   * conta quantas ofertas ativas existem, inclusive numa execução seguinte.
   */
  await db.execute(sql`delete from commercial_offers where code <> 'beta-fundador'`);

  const criados = await db
    .insert(schema.partners)
    .values([
      {
        code: "PA-9201",
        name: "Alice Refrigeração",
        email: "alice.comercial@exemplo.com",
        whatsapp: "5594980000201",
        status: "aguardando_lancamento",
      },
      {
        code: "PA-9202",
        name: "Bruno Elétrica",
        email: "bruno.comercial@exemplo.com",
        whatsapp: "5594980000202",
        status: "aguardando_lancamento",
      },
      {
        code: "PA-9203",
        name: "Carla Pinturas",
        email: "carla.comercial@exemplo.com",
        whatsapp: "5594980000203",
        status: "aguardando_lancamento",
      },
    ])
    .returning({ id: schema.partners.id, code: schema.partners.code });

  alice = criados.find((p) => p.code === "PA-9201")!.id;
  bruno = criados.find((p) => p.code === "PA-9202")!.id;
  carla = criados.find((p) => p.code === "PA-9203")!.id;
});

after(async () => {
  await getPool().end();
});

/* ========================================================================== */

describe("Catálogo no banco", () => {
  it("a semente do Beta sobreviveu à migração e é a única oferta ativa", async () => {
    const ativas = await ofertasAtivas();
    assert.equal(ativas.length, 1, "só o Beta Fundador — nenhum plano pós-Beta semeado");
    assert.equal(ativas[0]!.codigo, CODIGO_DO_BETA);
    assert.equal(ativas[0]!.precoCentavos, 7900);
    assert.equal(ativas[0]!.periodoDias, 90);
    assert.equal(ativas[0]!.recorrencia, "unica");
  });

  it("a oferta é encontrável pelo par que identifica a condição comprada", async () => {
    const v1 = await ofertaPorVersao(CODIGO_DO_BETA, 1);
    assert.equal(v1?.versao, 1);
    assert.equal(await ofertaPorVersao(CODIGO_DO_BETA, 99), null);
  });

  it("uma linha inválida some do catálogo sem derrubá-lo", async () => {
    await db.insert(schema.commercialOffers).values({
      code: "quebrada",
      version: 1,
      name: "Oferta quebrada",
      summary: "resumo",
      description: "descrição",
      priceCents: 1000,
      currency: "reais que não é ISO",
      periodDays: 30,
      recurrence: "unica",
      platforms: ["administrativa"],
      market: "BR",
      benefits: [],
      status: "ativa",
      requiresApproval: true,
    });

    const ativas = await ofertasAtivas();
    assert.equal(ativas.length, 1, "a boa continua de pé");
    assert.equal(ativas[0]!.codigo, CODIGO_DO_BETA);
  });

  it("uma oferta com promessa de resultado é recusada na leitura", async () => {
    await db.insert(schema.commercialOffers).values({
      code: "promessa",
      version: 1,
      name: "Plano com promessa",
      summary: "resumo",
      description: "descrição",
      priceCents: 9900,
      currency: "BRL",
      periodDays: 30,
      recurrence: "mensal",
      platforms: ["administrativa"],
      market: "BR",
      benefits: ["10 clientes garantidos por mês"],
      status: "ativa",
      requiresApproval: false,
    });

    const ativas = await ofertasAtivas();
    assert.equal(ativas.some((o) => o.codigo === "promessa"), false);
  });
});

/* ========================================================================== */

describe("A data da operação", () => {
  it("não existe por padrão, e nada a inventa", async () => {
    assert.equal(await inicioDaOperacao(), null);
    const s = await situacaoDoParceiro(alice);
    assert.equal(s.operacao.em, null);
    assert.equal(s.operacao.iniciada, false);
  });

  it("uma vez gravada, não é sobrescrita por acidente", async () => {
    const primeira = em("2026-10-01T03:00:00.000Z");
    assert.equal((await definirInicioDaOperacao(primeira)).gravada, true);

    const segunda = await definirInicioDaOperacao(em("2026-11-01T03:00:00.000Z"));
    assert.equal(segunda.gravada, false, "sem forcar, a data não muda");
    assert.equal((await inicioDaOperacao())?.toISOString(), primeira.toISOString());

    const forcada = await definirInicioDaOperacao(em("2026-11-01T03:00:00.000Z"), {
      forcar: true,
    });
    assert.equal(forcada.gravada, true);
    assert.equal(forcada.jaHavia?.toISOString(), primeira.toISOString());
  });

  it("uma linha ilegível é lida como ausência, não como NaN", async () => {
    await db.insert(schema.settings).values({
      key: "operacao.inicio",
      value: { em: "não é uma data" },
    });
    assert.equal(await inicioDaOperacao(), null);
  });
});

/* ========================================================================== */

describe("O ciclo do Fundador, do começo ao fim", () => {
  const PAGOU = em("2026-09-10T14:30:00.000Z");
  const ABRIU = em("2026-10-01T03:00:00.000Z");

  it("em análise não vê oferta; aprovado vê", async () => {
    const antes = await situacaoDoParceiro(alice);
    assert.equal(antes.adesao, null);
    assert.equal(antes.ofertaDisponivel, null);

    await aprovarParaOBeta(alice, "eletrica");
    const depois = await situacaoDoParceiro(alice);
    assert.equal(depois.adesao?.estado, "aprovado");
    assert.equal(depois.ofertaDisponivel?.codigo, CODIGO_DO_BETA);
    assert.equal(depois.ofertaDisponivel?.precoCentavos, 7900);
    assert.equal(depois.fundador, false, "aprovado ainda não é Fundador");
  });

  it("pagar com a operação fechada reserva a vaga e não consome dia nenhum", async () => {
    await aprovarParaOBeta(alice, "eletrica");
    const oferta = (await ofertaAtiva(CODIGO_DO_BETA))!;

    const r = await confirmarPagamento({
      partnerId: alice,
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: "pagamento:pix-001",
      valorCentavos: oferta.precoCentavos,
      moeda: oferta.moeda,
      ofertaCodigo: oferta.codigo,
      ofertaVersao: oferta.versao,
      em: PAGOU,
      descricao: "Parceiro Fundador — Beta de 90 dias",
      referencia: "pix-001",
    });

    assert.equal(r.novo, true);
    assert.equal(r.estado, "reservado");
    assert.equal(r.betaInicio, null, "sem operação aberta, não há início");

    const s = await situacaoDoParceiro(alice, em("2026-09-25T00:00:00.000Z"));
    assert.equal(s.fundador, true);
    assert.equal(s.adesao?.estado, "reservado");
    assert.equal(s.adesao?.beta.fase, "aguardando-lancamento");
    assert.equal(s.adesao?.beta.diasRestantes, null);
    assert.equal(s.acesso.origem, "aguardando-lancamento");
    assert.deepEqual(s.acesso.entitlements, []);
    assert.equal(s.ofertaDisponivel, null, "quem pagou não é convidado a pagar de novo");
  });

  it("as colunas antigas continuam sendo escritas — nada fica cego", async () => {
    await aprovarParaOBeta(alice);
    const oferta = (await ofertaAtiva(CODIGO_DO_BETA))!;
    await confirmarPagamento({
      partnerId: alice,
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: "pagamento:pix-002",
      valorCentavos: oferta.precoCentavos,
      moeda: "BRL",
      ofertaCodigo: oferta.codigo,
      ofertaVersao: oferta.versao,
      em: PAGOU,
      descricao: "Beta",
      referencia: "pix-002",
    });

    const [p] = await db
      .select({ founder: schema.partners.founder, pago: schema.partners.betaPaidAt })
      .from(schema.partners)
      .where(eq(schema.partners.id, alice));
    assert.equal(p!.founder, true);
    assert.equal(p!.pago?.toISOString(), PAGOU.toISOString());
  });

  it("o mesmo pagamento duas vezes é uma adesão, uma cobrança e um evento", async () => {
    await aprovarParaOBeta(alice);
    const oferta = (await ofertaAtiva(CODIGO_DO_BETA))!;
    const dados = {
      partnerId: alice,
      provedor: "administrativo" as const,
      ambiente: "producao" as const,
      idNoProvedor: "pagamento:pix-003",
      valorCentavos: oferta.precoCentavos,
      moeda: "BRL",
      ofertaCodigo: oferta.codigo,
      ofertaVersao: oferta.versao,
      em: PAGOU,
      descricao: "Beta",
      referencia: "pix-003",
    };

    const primeira = await confirmarPagamento(dados);
    const segunda = await confirmarPagamento(dados);
    const terceira = await confirmarPagamento(dados);

    assert.equal(primeira.novo, true);
    assert.equal(segunda.novo, false, "reentrega não reprocessa");
    assert.equal(terceira.novo, false);
    assert.equal(segunda.estado, "reservado", "e devolve o estado atual, não um erro");

    const adesoes = await db
      .select()
      .from(schema.founderEnrollments)
      .where(eq(schema.founderEnrollments.partnerId, alice));
    const cobrancas = await db
      .select()
      .from(schema.paymentTransactions)
      .where(eq(schema.paymentTransactions.partnerId, alice));
    const eventos = await db
      .select()
      .from(schema.commercialEvents)
      .where(eq(schema.commercialEvents.partnerId, alice));

    assert.equal(adesoes.length, 1);
    assert.equal(cobrancas.length, 1);
    assert.equal(eventos.length, 1);
  });

  it("abrir a operação inicia os 90 dias de todo mundo, contados do lançamento", async () => {
    for (const parceiro of [alice, bruno]) {
      await aprovarParaOBeta(parceiro);
      await confirmarPagamento({
        partnerId: parceiro,
        provedor: "administrativo",
        ambiente: "producao",
        idNoProvedor: `pagamento:${parceiro}`,
        valorCentavos: 7900,
        moeda: "BRL",
        ofertaCodigo: CODIGO_DO_BETA,
        ofertaVersao: 1,
        em: PAGOU,
        descricao: "Beta",
        referencia: parceiro,
      });
    }

    await definirInicioDaOperacao(ABRIU);
    const resultado = await abrirOperacao(ABRIU);
    assert.equal(resultado.novo, true);
    assert.equal(resultado.ativados, 2);

    const s = await situacaoDoParceiro(alice, ABRIU);
    assert.equal(s.adesao?.estado, "ativo");
    assert.equal(s.adesao?.beta.inicio, ABRIU.toISOString());
    assert.equal(
      s.adesao?.beta.fim,
      new Date(ABRIU.getTime() + 90 * DIA).toISOString(),
      "o fim é o lançamento + 90 dias, e não o pagamento + 90",
    );
    assert.equal(s.adesao?.beta.diasRestantes, 90);
    assert.equal(s.acesso.origem, "beta");
    assert.equal(s.acesso.entitlements.includes("receber_oportunidades"), true);
  });

  it("abrir a operação duas vezes não empurra o fim de ninguém", async () => {
    await aprovarParaOBeta(alice);
    await confirmarPagamento({
      partnerId: alice,
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: "pagamento:pix-004",
      valorCentavos: 7900,
      moeda: "BRL",
      ofertaCodigo: CODIGO_DO_BETA,
      ofertaVersao: 1,
      em: PAGOU,
      descricao: "Beta",
      referencia: "pix-004",
    });

    await abrirOperacao(ABRIU);
    const depoisDaPrimeira = await adesaoDoParceiro(alice);
    const segunda = await abrirOperacao(ABRIU);
    const depoisDaSegunda = await adesaoDoParceiro(alice);

    assert.equal(segunda.novo, false);
    assert.equal(segunda.ativados, 0);
    assert.equal(
      depoisDaSegunda!.betaEndsAt?.toISOString(),
      depoisDaPrimeira!.betaEndsAt?.toISOString(),
    );
  });

  it("abrir a operação não encurta o Beta de quem pagou depois da data de abertura", async () => {
    /*
     * O caso estreito que a verificação contra o servidor revelou.
     *
     * A abertura é registrada com uma data — que pode ser retroativa, ou pode
     * simplesmente ser anterior a um pagamento que entrou entre o registro e o
     * processamento. Carimbar `em` seco em todo mundo daria a essa pessoa menos
     * do que os 90 dias que ela comprou.
     */
    const abertura = em("2026-10-01T03:00:00.000Z");
    const pagouDepois = em("2026-10-20T10:00:00.000Z");

    await aprovarParaOBeta(alice);
    await confirmarPagamento({
      partnerId: alice,
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: "pagamento:pix-tardio",
      valorCentavos: 7900,
      moeda: "BRL",
      ofertaCodigo: CODIGO_DO_BETA,
      ofertaVersao: 1,
      em: pagouDepois,
      descricao: "Beta",
      referencia: "pix-tardio",
    });
    // Sem data de operação gravada, ele fica `reservado` — que é o estado que
    // `abrirOperacao` vai encontrar.
    assert.equal((await adesaoDoParceiro(alice))!.status, "reservado");

    await definirInicioDaOperacao(abertura);
    await abrirOperacao(abertura);

    const adesao = await adesaoDoParceiro(alice);
    assert.equal(
      adesao!.betaStartedAt?.toISOString(),
      pagouDepois.toISOString(),
      "o início é o pagamento, não a abertura anterior a ele",
    );
    assert.equal(
      Math.round((adesao!.betaEndsAt!.getTime() - pagouDepois.getTime()) / DIA),
      90,
      "90 vendidos, 90 entregues",
    );

    const s = await situacaoDoParceiro(alice, pagouDepois);
    assert.equal(s.adesao?.beta.diasRestantes, 90);
  });

  it("quem paga depois da abertura entra ativo, com 90 dias a partir do pagamento", async () => {
    await definirInicioDaOperacao(ABRIU);
    await abrirOperacao(ABRIU);

    const tardio = em("2026-11-15T12:00:00.000Z");
    await aprovarParaOBeta(carla);
    const r = await confirmarPagamento({
      partnerId: carla,
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: "pagamento:pix-005",
      valorCentavos: 7900,
      moeda: "BRL",
      ofertaCodigo: CODIGO_DO_BETA,
      ofertaVersao: 1,
      em: tardio,
      descricao: "Beta",
      referencia: "pix-005",
    });

    assert.equal(r.estado, "ativo");
    assert.equal(r.betaInicio?.toISOString(), tardio.toISOString());
    const s = await situacaoDoParceiro(carla, tardio);
    assert.equal(s.adesao?.beta.diasRestantes, 90, "90 vendidos, 90 entregues");
  });

  it("o Beta vencido para de conceder acesso mesmo sem a rotina de encerramento", async () => {
    await aprovarParaOBeta(alice);
    await confirmarPagamento({
      partnerId: alice,
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: "pagamento:pix-006",
      valorCentavos: 7900,
      moeda: "BRL",
      ofertaCodigo: CODIGO_DO_BETA,
      ofertaVersao: 1,
      em: PAGOU,
      descricao: "Beta",
      referencia: "pix-006",
    });
    await abrirOperacao(ABRIU);

    const depois = new Date(ABRIU.getTime() + 100 * DIA);
    const s = await situacaoDoParceiro(alice, depois);
    assert.deepEqual(s.acesso.entitlements, [], "a data manda, não o rótulo do registro");
    assert.equal(s.fundador, true, "e o Fundador continua Fundador");

    assert.equal(await encerrarBetasVencidos(depois), 1);
    const arrumado = await situacaoDoParceiro(alice, depois);
    assert.equal(arrumado.adesao?.estado, "encerrado");
    assert.equal(arrumado.fundador, true);
  });

  it("reembolso derruba o acesso e não apaga a história", async () => {
    await aprovarParaOBeta(alice);
    await confirmarPagamento({
      partnerId: alice,
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: "pagamento:pix-007",
      valorCentavos: 7900,
      moeda: "BRL",
      ofertaCodigo: CODIGO_DO_BETA,
      ofertaVersao: 1,
      em: PAGOU,
      descricao: "Beta",
      referencia: "pix-007",
    });
    await abrirOperacao(ABRIU);

    const r = await desfazerPagamento(alice, "reembolso", {
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: "reembolso:pix-007",
      em: em("2026-10-10T00:00:00.000Z"),
      referenciaDaCobranca: "pix-007",
    });
    assert.equal(r.novo, true);
    assert.equal(r.cobrancasAfetadas, 1);

    const s = await situacaoDoParceiro(alice, em("2026-10-11T00:00:00.000Z"));
    assert.equal(s.adesao?.estado, "cancelado");
    assert.deepEqual(s.acesso.entitlements, []);

    const cobrancas = await cobrancasDoParceiro(alice);
    assert.equal(cobrancas[0]!.estado, "reembolsado");
    assert.equal(cobrancas.length, 1, "a cobrança não é apagada — ela muda de estado");

    const historia = await historiaDoParceiro(alice);
    assert.equal(historia.length, 2, "pagamento e reembolso, os dois no livro");

    // Repetir o reembolso não faz nada de novo.
    const repetido = await desfazerPagamento(alice, "reembolso", {
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: "reembolso:pix-007",
      em: em("2026-10-10T00:00:00.000Z"),
      referenciaDaCobranca: "pix-007",
    });
    assert.equal(repetido.novo, false);
  });

  it("um estorno alcança uma cobrança, e não todas as do parceiro", async () => {
    /*
     * O defeito que este teste existe para impedir: o `update` filtrava só por
     * parceiro e por estado `aprovado`, então um estorno de R$79 marcaria como
     * reembolsada **toda** cobrança aprovada daquela conta. No histórico — que
     * existe justamente para ser prova do que aconteceu — apareceriam duas
     * devoluções onde houve uma.
     */
    await aprovarParaOBeta(alice);

    const primeira = {
      partnerId: alice,
      provedor: "administrativo" as const,
      ambiente: "producao" as const,
      valorCentavos: 7900,
      moeda: "BRL",
      ofertaCodigo: CODIGO_DO_BETA,
      ofertaVersao: 1,
      descricao: "Beta",
    };

    await confirmarPagamento({
      ...primeira,
      idNoProvedor: "pagamento:pix-A",
      em: em("2026-09-10T00:00:00.000Z"),
      referencia: "pix-A",
    });
    await confirmarPagamento({
      ...primeira,
      idNoProvedor: "pagamento:pix-B",
      em: em("2027-01-15T00:00:00.000Z"),
      referencia: "pix-B",
    });

    assert.equal((await cobrancasDoParceiro(alice)).length, 2);

    const r = await desfazerPagamento(alice, "reembolso", {
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: "reembolso:pix-A",
      em: em("2027-02-01T00:00:00.000Z"),
      referenciaDaCobranca: "pix-A",
    });
    assert.equal(r.cobrancasAfetadas, 1, "uma cobrança, não duas");

    const cobrancas = await cobrancasDoParceiro(alice);
    const porEstado = Object.fromEntries(cobrancas.map((c) => [c.descricao + c.em, c.estado]));
    assert.equal(
      Object.values(porEstado).filter((e) => e === "reembolsado").length,
      1,
      "só a cobrança estornada mudou de estado",
    );
    assert.equal(
      Object.values(porEstado).filter((e) => e === "aprovado").length,
      1,
      "a outra continua aprovada",
    );
  });

  it("o histórico de cobrança fala português e nunca some", async () => {
    await aprovarParaOBeta(alice);
    await confirmarPagamento({
      partnerId: alice,
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: "pagamento:pix-008",
      valorCentavos: 7900,
      moeda: "BRL",
      ofertaCodigo: CODIGO_DO_BETA,
      ofertaVersao: 1,
      em: PAGOU,
      descricao: "Parceiro Fundador — Beta de 90 dias",
      referencia: "pix-008",
    });

    const cobrancas = await cobrancasDoParceiro(alice);
    assert.equal(cobrancas.length, 1);
    assert.equal(cobrancas[0]!.valorCentavos, 7900);
    assert.equal(cobrancas[0]!.origem, "Pagamento direto");
    assert.equal(cobrancas[0]!.estado, "aprovado");
    assert.equal(cobrancas[0]!.comprovante, null, "sem recibo inventado");
    assert.equal(/gateway|provider|transaction/i.test(JSON.stringify(cobrancas)), false);
  });

  it("o livro responde por que este parceiro está ativo", async () => {
    await aprovarParaOBeta(alice);
    await confirmarPagamento({
      partnerId: alice,
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: "pagamento:pix-009",
      valorCentavos: 7900,
      moeda: "BRL",
      ofertaCodigo: CODIGO_DO_BETA,
      ofertaVersao: 1,
      em: PAGOU,
      descricao: "Beta",
      referencia: "pix-009",
    });
    await abrirOperacao(ABRIU);

    const historia = await historiaDoParceiro(alice);
    assert.ok(historia.some((e) => e.tipo === "ativacao_administrativa"));
    assert.ok(historia.every((e) => e.efeito && e.efeito.length > 10));

    const s = await situacaoDoParceiro(alice, ABRIU);
    assert.match(s.acesso.justificativa, /Beta Fundador em curso/);
  });

  it("o evento gravado não carrega o identificador cru nem segredo", async () => {
    await aprovarParaOBeta(alice);
    await confirmarPagamento({
      partnerId: alice,
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: "pagamento:pix-segredo-abc",
      valorCentavos: 7900,
      moeda: "BRL",
      ofertaCodigo: CODIGO_DO_BETA,
      ofertaVersao: 1,
      em: PAGOU,
      descricao: "Beta",
      referencia: "pix-segredo-abc",
    });

    const [evento] = await db
      .select()
      .from(schema.commercialEvents)
      .where(eq(schema.commercialEvents.partnerId, alice));
    assert.equal(JSON.stringify(evento!.payload).includes("pix-segredo-abc"), false);
  });

  it("as vagas por categoria contam só quem pagou", async () => {
    await aprovarParaOBeta(alice, "eletrica");
    await aprovarParaOBeta(bruno, "eletrica");
    assert.equal(await vagasOcupadas("eletrica"), 0, "aprovado não ocupa vaga");

    await confirmarPagamento({
      partnerId: alice,
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: "pagamento:pix-010",
      valorCentavos: 7900,
      moeda: "BRL",
      ofertaCodigo: CODIGO_DO_BETA,
      ofertaVersao: 1,
      em: PAGOU,
      descricao: "Beta",
      referencia: "pix-010",
    });
    assert.equal(await vagasOcupadas("eletrica"), 1);
  });

  it("aprovar de novo quem já pagou não o puxa de volta no funil", async () => {
    await aprovarParaOBeta(alice, "eletrica");
    await confirmarPagamento({
      partnerId: alice,
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: "pagamento:pix-011",
      valorCentavos: 7900,
      moeda: "BRL",
      ofertaCodigo: CODIGO_DO_BETA,
      ofertaVersao: 1,
      em: PAGOU,
      descricao: "Beta",
      referencia: "pix-011",
    });

    await aprovarParaOBeta(alice, "eletrica");
    assert.equal((await adesaoDoParceiro(alice))!.status, "reservado");
  });
});

/* ========================================================================== */

describe("A migração dos parceiros da operação manual (§72)", () => {
  /**
   * Este teste roda **o SQL da migração**, e não uma cópia dele.
   *
   * A alternativa seria reescrever a lógica em TypeScript e testar a
   * reescrita — que é como se descobre, seis meses depois, que a migração real
   * fazia outra coisa. Extrair o bloco do arquivo mantém as duas pontas presas.
   */
  const migracao = readFileSync("lib/db/migrations/0006_fancy_loners.sql", "utf8");

  function blocoQueInsereEm(tabela: string): string {
    const blocos = migracao.split("--> statement-breakpoint");
    const achado = blocos.find((b) => b.includes(`INSERT INTO "${tabela}"`) && b.includes("SELECT"));
    assert.ok(achado, `o bloco que popula ${tabela} sumiu da migração 0006`);
    return achado!;
  }

  it("um fundador que pagou e ainda espera o lançamento vira adesão reservada", async () => {
    await db
      .update(schema.partners)
      .set({ founder: true, betaPaidAt: em("2026-09-10T14:30:00.000Z") })
      .where(eq(schema.partners.id, alice));

    await db.execute(sql.raw(blocoQueInsereEm("founder_enrollments")));

    const adesao = await adesaoDoParceiro(alice);
    assert.equal(adesao?.status, "reservado");
    assert.equal(adesao?.offerCode, CODIGO_DO_BETA);
    assert.equal(adesao?.paidAt?.toISOString(), "2026-09-10T14:30:00.000Z");
    assert.equal(adesao?.betaStartedAt, null, "nenhum dia consumido pela migração");
    assert.match(adesao!.notes!, /Migrado/);
  });

  it("um fundador com Beta em curso vira adesão ativa, com o fim já calculado", async () => {
    const inicio = new Date(Date.now() - 10 * DIA);
    await db
      .update(schema.partners)
      .set({
        founder: true,
        betaPaidAt: new Date(Date.now() - 40 * DIA),
        betaStartedAt: inicio,
      })
      .where(eq(schema.partners.id, bruno));

    await db.execute(sql.raw(blocoQueInsereEm("founder_enrollments")));

    const adesao = await adesaoDoParceiro(bruno);
    assert.equal(adesao?.status, "ativo");
    assert.equal(
      Math.round((adesao!.betaEndsAt!.getTime() - inicio.getTime()) / DIA),
      90,
      "o fim é o início + 90 dias",
    );

    const s = await situacaoDoParceiro(bruno);
    assert.equal(s.adesao?.beta.diasRestantes, 80);
    assert.equal(s.acesso.origem, "beta");
  });

  it("um fundador com Beta já vencido vira adesão encerrada, e continua Fundador", async () => {
    await db
      .update(schema.partners)
      .set({
        founder: true,
        betaPaidAt: new Date(Date.now() - 200 * DIA),
        betaStartedAt: new Date(Date.now() - 150 * DIA),
      })
      .where(eq(schema.partners.id, carla));

    await db.execute(sql.raw(blocoQueInsereEm("founder_enrollments")));

    const s = await situacaoDoParceiro(carla);
    assert.equal(s.adesao?.estado, "encerrado");
    assert.equal(s.fundador, true);
    assert.deepEqual(s.acesso.entitlements, []);
  });

  it("quem nunca foi fundador não ganha adesão nenhuma", async () => {
    await db.execute(sql.raw(blocoQueInsereEm("founder_enrollments")));
    assert.equal(await adesaoDoParceiro(alice), null);
  });

  it("rodar a migração duas vezes não duplica nem sobrescreve", async () => {
    await db
      .update(schema.partners)
      .set({ founder: true, betaPaidAt: em("2026-09-10T14:30:00.000Z") })
      .where(eq(schema.partners.id, alice));

    const bloco = blocoQueInsereEm("founder_enrollments");
    await db.execute(sql.raw(bloco));
    await db.execute(sql.raw(bloco));

    const linhas = await db
      .select()
      .from(schema.founderEnrollments)
      .where(eq(schema.founderEnrollments.partnerId, alice));
    assert.equal(linhas.length, 1);
  });

  it("as cobranças da operação manual aparecem no histórico do aplicativo", async () => {
    await db.insert(schema.payments).values({
      partnerId: alice,
      kind: "beta_fundador",
      amountCents: 7900,
      paidAt: em("2026-09-10T14:30:00.000Z"),
    });

    await db.execute(sql.raw(blocoQueInsereEm("payment_transactions")));
    await db.execute(sql.raw(blocoQueInsereEm("commercial_events")));

    const cobrancas = await cobrancasDoParceiro(alice);
    assert.equal(cobrancas.length, 1);
    assert.equal(cobrancas[0]!.valorCentavos, 7900);
    assert.equal(cobrancas[0]!.estado, "aprovado");
    assert.match(cobrancas[0]!.descricao, /Parceiro Fundador/);

    const historia = await historiaDoParceiro(alice);
    assert.equal(historia.length, 1);
    assert.equal(historia[0]!.tipo, "ativacao_administrativa");
  });

  it("a chave do evento migrado é a mesma que o TypeScript produziria", async () => {
    await db.insert(schema.payments).values({
      partnerId: alice,
      kind: "beta_fundador",
      amountCents: 7900,
      paidAt: em("2026-09-10T14:30:00.000Z"),
    });
    const [pagamento] = await db
      .select({ id: schema.payments.id })
      .from(schema.payments)
      .where(eq(schema.payments.partnerId, alice));

    await db.execute(sql.raw(blocoQueInsereEm("commercial_events")));

    const { chaveDoEvento } = await import("@/lib/domain/comercial/eventos");
    const esperada = chaveDoEvento({
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: `payment:${pagamento!.id}`,
    });

    const [evento] = await db
      .select({ chave: schema.commercialEvents.eventKey })
      .from(schema.commercialEvents)
      .where(eq(schema.commercialEvents.partnerId, alice));

    assert.equal(
      evento!.chave,
      esperada,
      "o sha256 do SQL e o do TypeScript precisam bater, ou o evento migrado " +
        "seria reprocessado pelo caminho normal",
    );
  });
});
