import "./setup-db";

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { definirSenha } from "@/lib/auth/parceiro";
import { db, getPool } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import {
  destinosDoParceiro,
  dispositivosDoParceiro,
  invalidarToken,
  registrarDispositivo,
  revogarDispositivo,
  revogarOutras,
} from "@/lib/push/dispositivos";
import {
  avisoDeNovaOportunidade,
  chaveDoEvento,
  conferirPrivacidade,
  preferenciaDoTipo,
} from "@/lib/push/mensagens";

/**
 * O cadastro de aparelhos — a base de tudo que a Fase 06 promete.
 *
 * Estes testes rodam contra o Postgres de verdade porque as três garantias que
 * eles precisam provar **são do banco**, não do código: o índice único que faz
 * o registro ser idempotente, a escrita única que reaponta a instalação na
 * troca de conta, e a revogação que não apaga a linha.
 *
 * Um dublê em memória fingiria as três funcionando.
 */

const SENHA = "senha-de-teste-1";

let alice: string;
let bruno: string;

before(async () => {
  await migrate(db, { migrationsFolder: "lib/db/migrations" });
});

beforeEach(async () => {
  await db.execute(sql`
    truncate table
      activities, interactions, opportunities, service_requests,
      partner_applications, payments, partner_services, partner_categories,
      partner_devices, partner_sessions, prospects, partners, sessions,
      operators, settings
    restart identity cascade
  `);

  const criados = await db
    .insert(schema.partners)
    .values([
      {
        code: "PA-9101",
        name: "Alice Refrigeração",
        email: "alice.dispositivo@exemplo.com",
        whatsapp: "5594980000101",
        status: "ativo",
      },
      {
        code: "PA-9102",
        name: "Bruno Elétrica",
        email: "bruno.dispositivo@exemplo.com",
        whatsapp: "5594980000102",
        status: "ativo",
      },
    ])
    .returning({ id: schema.partners.id, code: schema.partners.code });

  alice = criados.find((p) => p.code === "PA-9101")!.id;
  bruno = criados.find((p) => p.code === "PA-9102")!.id;
  await definirSenha(alice, SENHA);
});

after(async () => {
  await getPool().end();
});

const registro = (over: Partial<Parameters<typeof registrarDispositivo>[1]> = {}) => ({
  installationId: "inst-aaaaaaaaaaaa",
  pushToken: "ExponentPushToken[AAAAAAAAAAAAAAAAAAAAAA]",
  platform: "ios" as const,
  environment: "development" as const,
  descricao: "iPhone 15 · iOS 18.2",
  appVersion: "0.1.0",
  ...over,
});

describe("o registro do aparelho", () => {
  it("registrar dez vezes continua sendo um aparelho só", async () => {
    for (let i = 0; i < 10; i += 1) {
      await registrarDispositivo(alice, registro());
    }

    const linhas = await db
      .select({ id: schema.partnerDevices.id })
      .from(schema.partnerDevices);

    assert.equal(linhas.length, 1, "idempotência: uma instalação, uma linha (§99)");
  });

  it("guarda o token novo quando ele muda, sem criar outra linha", async () => {
    await registrarDispositivo(alice, registro());
    await registrarDispositivo(
      alice,
      registro({ pushToken: "ExponentPushToken[BBBBBBBBBBBBBBBBBBBBBB]" }),
    );

    const destinos = await destinosDoParceiro(alice);
    assert.equal(destinos.length, 1);
    assert.equal(destinos[0].pushToken, "ExponentPushToken[BBBBBBBBBBBBBBBBBBBBBB]");
  });

  it("o mesmo parceiro em dois aparelhos recebe nos dois", async () => {
    await registrarDispositivo(alice, registro());
    await registrarDispositivo(
      alice,
      registro({
        installationId: "inst-bbbbbbbbbbbb",
        pushToken: "ExponentPushToken[CCCCCCCCCCCCCCCCCCCCCC]",
        platform: "android",
      }),
    );

    assert.equal((await destinosDoParceiro(alice)).length, 2, "§60");
  });

  it("não devolve o token do aparelho na listagem da conta", async () => {
    await registrarDispositivo(alice, registro());

    const [visivel] = await dispositivosDoParceiro(alice);
    assert.ok(visivel);
    assert.ok(
      !JSON.stringify(visivel).includes("ExponentPushToken"),
      "o endereço de entrega nunca sai para a interface (§54)",
    );
    assert.equal(visivel.descricao, "iPhone 15 · iOS 18.2");
  });
});

describe("a troca de conta no mesmo aparelho", () => {
  it("reaponta a instalação e a conta anterior para de receber", async () => {
    await registrarDispositivo(alice, registro());
    assert.equal((await destinosDoParceiro(alice)).length, 1);

    // O Bruno entra no aparelho da Alice, sem desinstalar nada.
    await registrarDispositivo(bruno, registro());

    assert.equal(
      (await destinosDoParceiro(alice)).length,
      0,
      "a conta anterior não pode continuar entregando aqui (§58)",
    );
    assert.equal((await destinosDoParceiro(bruno)).length, 1);
  });
});

describe("sair da conta", () => {
  it("revoga o aparelho sem apagar a linha, e datado", async () => {
    await registrarDispositivo(alice, registro());

    const revogou = await revogarDispositivo(alice, "inst-aaaaaaaaaaaa");
    assert.equal(revogou, true);
    assert.equal((await destinosDoParceiro(alice)).length, 0, "§57");

    const [linha] = await db
      .select({
        revokedAt: schema.partnerDevices.revokedAt,
        revokedReason: schema.partnerDevices.revokedReason,
      })
      .from(schema.partnerDevices);

    assert.ok(linha.revokedAt instanceof Date, "a revogação é datada, não um DELETE");
    assert.equal(linha.revokedReason, "saiu");
  });

  it("uma conta não consegue calar o aparelho de outra", async () => {
    await registrarDispositivo(alice, registro());

    const revogou = await revogarDispositivo(bruno, "inst-aaaaaaaaaaaa");

    assert.equal(revogou, false);
    assert.equal(
      (await destinosDoParceiro(alice)).length,
      1,
      "conhecer o installationId não autoriza nada",
    );
  });

  it("entrar de novo no mesmo aparelho volta a receber", async () => {
    await registrarDispositivo(alice, registro());
    await revogarDispositivo(alice, "inst-aaaaaaaaaaaa");
    await registrarDispositivo(alice, registro());

    assert.equal((await destinosDoParceiro(alice)).length, 1);
    const linhas = await db.select({ id: schema.partnerDevices.id }).from(schema.partnerDevices);
    assert.equal(linhas.length, 1, "ressuscitar não é duplicar");
  });

  it("trocar a senha derruba os outros aparelhos, e não o que pediu", async () => {
    await registrarDispositivo(alice, registro());
    await registrarDispositivo(
      alice,
      registro({
        installationId: "inst-bbbbbbbbbbbb",
        pushToken: "ExponentPushToken[DDDDDDDDDDDDDDDDDDDDDD]",
      }),
    );

    const caiu = await revogarOutras(alice, "inst-aaaaaaaaaaaa");

    assert.equal(caiu, 1);
    const destinos = await destinosDoParceiro(alice);
    assert.equal(destinos.length, 1);
    assert.equal(destinos[0].installationId, "inst-aaaaaaaaaaaa");
  });
});

describe("um token que morreu", () => {
  it("some dos destinos quando o provedor diz que não existe mais", async () => {
    await registrarDispositivo(alice, registro());

    const quantos = await invalidarToken("ExponentPushToken[AAAAAAAAAAAAAAAAAAAAAA]");

    assert.equal(quantos, 1);
    assert.equal((await destinosDoParceiro(alice)).length, 0, "§59");

    const [linha] = await db
      .select({ motivo: schema.partnerDevices.revokedReason })
      .from(schema.partnerDevices);
    assert.equal(linha.motivo, "desinstalado");
  });

  it("invalidar duas vezes não conta duas", async () => {
    await registrarDispositivo(alice, registro());
    await invalidarToken("ExponentPushToken[AAAAAAAAAAAAAAAAAAAAAA]");

    assert.equal(await invalidarToken("ExponentPushToken[AAAAAAAAAAAAAAAAAAAAAA]"), 0);
  });
});

describe("o que a notificação diz", () => {
  it("o texto visível é categoria e bairro — nunca a necessidade", () => {
    const aviso = avisoDeNovaOportunidade({
      oportunidadeId: "o1",
      categoria: "Ar-condicionado",
      regiao: "Novo Horizonte",
      partnerId: alice,
    });

    assert.equal(aviso.titulo, "Nova oportunidade");
    assert.equal(aviso.corpo, "Ar-condicionado · Novo Horizonte");
    assert.equal(conferirPrivacidade(aviso), null);
  });

  it("carrega o identificador por dentro, e o destino da navegação", () => {
    const aviso = avisoDeNovaOportunidade({
      oportunidadeId: "o1",
      categoria: "Elétrica",
      regiao: "Centro",
      partnerId: alice,
    });

    assert.equal(aviso.carga.oportunidadeId, "o1");
    assert.equal(aviso.carga.destino, "oportunidade/o1");
    assert.equal(aviso.carga.para, alice, "o dono do aviso viaja junto (§19)");
    assert.equal(aviso.carga.evento, chaveDoEvento("oportunidade.nova", "o1"));
  });

  it("recusa um texto que carregue telefone, e-mail ou endereço", () => {
    const casos = [
      { corpo: "Ligar para (94) 98123-4567", suspeita: "telefone" },
      { corpo: "Falar com morador@exemplo.com", suspeita: "e-mail" },
      { corpo: "Rua das Flores, 120", suspeita: "endereço" },
    ];

    for (const caso of casos) {
      const problema = conferirPrivacidade({
        titulo: "Nova oportunidade",
        corpo: caso.corpo,
        grupo: "oportunidades",
        carga: {
          tipo: "oportunidade.nova",
          destino: "oportunidade/o1",
          em: new Date().toISOString(),
          evento: "e",
          para: alice,
        },
      });

      assert.ok(problema, `deveria ter barrado: ${caso.corpo}`);
      assert.equal(problema.suspeita, caso.suspeita);
    }
  });

  it("segurança não responde à mesma preferência que oportunidade", () => {
    assert.equal(preferenciaDoTipo["conta.seguranca"], null, "§37");
    assert.equal(preferenciaDoTipo["oportunidade.nova"], "oportunidades");
  });
});

describe("o aparelho pertence à conta", () => {
  it("apagar o parceiro leva os aparelhos dele junto", async () => {
    await registrarDispositivo(alice, registro());
    await db.delete(schema.partners).where(eq(schema.partners.id, alice));

    const linhas = await db.select({ id: schema.partnerDevices.id }).from(schema.partnerDevices);
    assert.equal(linhas.length, 0);
  });
});
