import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatPhone, normalizePhone } from "@/lib/domain/phone";
import { slugify } from "@/lib/domain/catalog-seed";
import { partnerApplicationSchema, serviceRequestSchema } from "@/lib/forms";

/**
 * O que sobrou de regra pura depois que o Operations saiu.
 *
 * Este arquivo já cobriu máquinas de estado, o prazo do Beta Fundador e a
 * mensagem enviada ao parceiro. Nada disso tem código aqui agora. O que
 * continua valendo é a fronteira que a landing ainda atravessa: o telefone,
 * que é a chave de deduplicação, e o contrato dos dois formulários públicos.
 */

describe("telefone: a chave de deduplicação", () => {
  it("normaliza os formatos que a mesma pessoa escreve de jeitos diferentes", () => {
    const esperado = "5594991205078";
    for (const entrada of [
      "94991205078",
      "(94) 99120-5078",
      "+55 94 99120-5078",
      "55 94 9 9120 5078",
      "  94 99120-5078  ",
    ]) {
      assert.equal(normalizePhone(entrada), esperado, `falhou em "${entrada}"`);
    }
  });

  it("aceita número fixo de 10 dígitos", () => {
    assert.equal(normalizePhone("(94) 3356-1234"), "559433561234");
  });

  it("recusa o que não pode ser um número brasileiro", () => {
    for (const ruim of ["", "   ", "123", "9912050", "1".repeat(20), null, undefined]) {
      assert.equal(normalizePhone(ruim), null, `deveria recusar "${ruim}"`);
    }
  });

  it("formata para leitura sem perder o número quando o formato é estranho", () => {
    assert.equal(formatPhone("5594991205078"), "(94) 99120-5078");
    assert.equal(formatPhone("559433561234"), "(94) 3356-1234");
    assert.equal(formatPhone(null), "—");
    assert.equal(formatPhone("qualquer coisa"), "qualquer coisa");
  });
});

describe("formulários públicos", () => {
  const pedidoValido = {
    descricao: "Meu ar-condicionado liga mas não está gelando.",
    nome: "Maria Silva",
    telefone: "(94) 99120-5078",
    consentimento: true,
  };

  it("aceita o mínimo necessário para atender alguém", () => {
    assert.equal(serviceRequestSchema.safeParse(pedidoValido).success, true);
  });

  it("exige a autorização de compartilhamento", () => {
    const r = serviceRequestSchema.safeParse({ ...pedidoValido, consentimento: false });
    assert.equal(r.success, false);
  });

  it("recusa descrição curta demais para encaminhar", () => {
    const r = serviceRequestSchema.safeParse({ ...pedidoValido, descricao: "quebrou" });
    assert.equal(r.success, false);
  });

  it("recusa telefone sem DDD", () => {
    const r = serviceRequestSchema.safeParse({ ...pedidoValido, telefone: "99120-5078" });
    assert.equal(r.success, false);
  });

  it("o cadastro de parceiro exige categoria", () => {
    const base = {
      nome: "João",
      empresa: "Refrigeração do João",
      telefone: "94991205078",
      atendeCanaa: true,
    };
    assert.equal(partnerApplicationSchema.safeParse(base).success, false);
    assert.equal(
      partnerApplicationSchema.safeParse({ ...base, categoria: "ar-condicionado" }).success,
      true,
    );
  });
});

describe("apoio", () => {
  it("slugifica sem acento e sem espaço", () => {
    assert.equal(slugify("Instalação de split"), "instalacao-de-split");
    assert.equal(slugify("Câmaras frias / balcão"), "camaras-frias-balcao");
  });
});
