import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  betaStatus,
  betaEndsAt,
  BETA_DAYS,
  formatBRL,
  readyForLaunch,
} from "@/lib/domain/beta";
import { formatPhone, normalizePhone } from "@/lib/domain/phone";
import { slugify } from "@/lib/domain/catalog-seed";
import {
  canTransition,
  nextStates,
  prospectFunnel,
  prospectTransitions,
  requestStates,
  stateLabel,
  statesOf,
} from "@/lib/domain/states";
import { duracaoLegivel } from "@/lib/format";
import { oportunidadeMensagem } from "@/lib/domain/messages";
import { partnerApplicationSchema, serviceRequestSchema } from "@/lib/forms";

/**
 * Os testes cobrem o que dói se estiver errado — regra de negócio, dinheiro e
 * datas — e não a interface. Uma tela quebrada aparece na inspeção do
 * navegador; um Beta que começa no dia errado só apareceria na conversa com o
 * parceiro, tarde demais.
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

describe("máquinas de estado", () => {
  it("não deixa uma solicitação pular da entrada para o fim", () => {
    assert.equal(canTransition("request", "nova", "resolvida"), false);
    assert.equal(canTransition("request", "nova", "em_triagem"), true);
    assert.equal(canTransition("request", "pronta", "encaminhada"), true);
  });

  it("não considera transição o estado que já é o atual", () => {
    assert.equal(canTransition("request", "nova", "nova"), false);
  });

  it("permite as saídas de exceção a partir de qualquer ponto aberto", () => {
    for (const aberto of ["nova", "em_triagem", "pronta", "encaminhada"]) {
      assert.equal(
        canTransition("request", aberto, "cancelada"),
        true,
        `${aberto} deveria poder ser cancelada`,
      );
    }
  });

  it("deixa o funil comercial andar para trás, mas não pular etapa que gera dado", () => {
    // A vida real anda para trás: alguém interessado some e volta a ser "contatado".
    assert.ok(prospectTransitions("interessado").includes("contatado"));
    // Mas não se pula da primeira etapa direto para a aprovação.
    assert.equal(canTransition("prospect", "mapeado", "aprovado"), false);
  });

  it("todo estado alcançável tem rótulo e explicação", () => {
    for (const maquina of ["prospect", "partner", "request", "opportunity", "application"] as const) {
      for (const estado of statesOf(maquina)) {
        assert.ok(estado.label.length > 0, `${maquina}/${estado.id} sem rótulo`);
        assert.ok(estado.hint.length > 10, `${maquina}/${estado.id} sem explicação`);
      }
    }
  });

  it("todo destino permitido é um estado conhecido da mesma máquina", () => {
    for (const maquina of ["prospect", "partner", "request", "opportunity", "application"] as const) {
      const conhecidos = new Set(statesOf(maquina).map((e) => e.id));
      for (const estado of statesOf(maquina)) {
        for (const destino of nextStates(maquina, estado.id)) {
          assert.ok(
            conhecidos.has(destino),
            `${maquina}: ${estado.id} aponta para "${destino}", que não existe`,
          );
        }
      }
    }
  });

  it("o funil comercial termina em Parceiro Fundador", () => {
    assert.equal(prospectFunnel.at(-1), "parceiro_fundador");
  });

  it("estado desconhecido não vira transição válida", () => {
    assert.equal(canTransition("request", "inventado", "resolvida"), false);
    assert.deepEqual(nextStates("request", "inventado"), []);
    assert.equal(stateLabel("request", null), "—");
    assert.equal(requestStates.is("nova"), true);
    assert.equal(requestStates.is("nao_existe"), false);
  });
});

describe("Beta Fundador: os 90 dias não começam no pagamento", () => {
  const base = {
    founder: true,
    betaPaidAt: null as Date | null,
    onboardingDoneAt: null as Date | null,
    betaStartedAt: null as Date | null,
  };

  it("quem não é fundador não tem Beta", () => {
    assert.equal(betaStatus({ ...base, founder: false }).phase, "sem_beta");
  });

  it("sem pagamento, o Beta espera o pagamento", () => {
    assert.equal(betaStatus(base).phase, "aguardando_pagamento");
  });

  it("pagar não inicia a contagem — nem hoje, nem daqui a um mês", () => {
    const pago = { ...base, betaPaidAt: new Date("2026-01-10T12:00:00Z") };

    const logoDepois = betaStatus(pago, new Date("2026-01-10T13:00:00Z"));
    assert.equal(logoDepois.phase, "aguardando_onboarding");
    assert.equal(logoDepois.startsAt, null);
    assert.equal(logoDepois.daysLeft, null);

    const umMesDepois = betaStatus(
      { ...pago, onboardingDoneAt: new Date("2026-01-11T12:00:00Z") },
      new Date("2026-02-10T12:00:00Z"),
    );
    assert.equal(umMesDepois.phase, "aguardando_lancamento");
    assert.equal(umMesDepois.endsAt, null, "sem lançamento não existe data de fim");
  });

  it("o prazo corre a partir do lançamento e termina 90 dias depois", () => {
    const lancamento = new Date("2026-03-01T12:00:00Z");
    const parceiro = {
      founder: true,
      betaPaidAt: new Date("2026-01-10T12:00:00Z"),
      onboardingDoneAt: new Date("2026-01-11T12:00:00Z"),
      betaStartedAt: lancamento,
    };

    const noComeco = betaStatus(parceiro, lancamento);
    assert.equal(noComeco.phase, "em_andamento");
    assert.equal(noComeco.daysLeft, BETA_DAYS);

    const fim = betaEndsAt(lancamento)!;
    const dias = Math.round((fim.getTime() - lancamento.getTime()) / 86_400_000);
    assert.equal(dias, BETA_DAYS);

    const depoisDoFim = betaStatus(parceiro, new Date(fim.getTime() + 86_400_000));
    assert.equal(depoisDoFim.phase, "encerrado");
    assert.equal(depoisDoFim.daysLeft, 0);
    assert.equal(depoisDoFim.progress, 1);
  });

  it("só entra na largada do lançamento quem está realmente pronto", () => {
    const pronto = {
      founder: true,
      betaPaidAt: new Date(),
      onboardingDoneAt: new Date(),
      betaStartedAt: null,
    };
    assert.equal(readyForLaunch(pronto), true);
    assert.equal(readyForLaunch({ ...pronto, betaPaidAt: null }), false);
    assert.equal(readyForLaunch({ ...pronto, onboardingDoneAt: null }), false);
    assert.equal(readyForLaunch({ ...pronto, founder: false }), false);
    // Quem já começou não recomeça: o lançamento acontece uma vez para cada um.
    assert.equal(readyForLaunch({ ...pronto, betaStartedAt: new Date() }), false);
  });

  it("o valor da condição aparece em reais", () => {
    assert.equal(formatBRL(7900).replace(/ /g, " "), "R$ 79,00");
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

describe("mensagem enviada ao parceiro", () => {
  it("leva o problema e o contato, e nada além do necessário", () => {
    const texto = oportunidadeMensagem({
      code: "CR-00021",
      categoria: "Ar-condicionado e refrigeração",
      servico: "Não está gelando",
      descricao: "O ar liga mas não gela.",
      bairro: "Novo Horizonte",
      urgencia: "urgente",
      moradorNome: "Maria Aparecida Silva",
      moradorWhatsapp: "5594991205078",
    });

    assert.ok(texto.includes("CR-00021"));
    assert.ok(texto.includes("Não está gelando"));
    assert.ok(texto.includes("Novo Horizonte"));
    assert.ok(texto.includes("(94) 99120-5078"));
    // Só o primeiro nome: o parceiro não precisa do nome completo para atender.
    assert.ok(texto.includes("Maria"));
    assert.ok(!texto.includes("Aparecida"));
  });
});

describe("apoio", () => {
  it("slugifica sem acento e sem espaço", () => {
    assert.equal(slugify("Instalação de split"), "instalacao-de-split");
    assert.equal(slugify("Câmaras frias / balcão"), "camaras-frias-balcao");
  });

  it("traduz duração em algo que alguém lê", () => {
    assert.equal(duracaoLegivel(null), null);
    assert.equal(duracaoLegivel(30), "menos de um minuto");
    assert.equal(duracaoLegivel(600), "10 min");
    assert.equal(duracaoLegivel(3600 * 2), "2 h");
    assert.equal(duracaoLegivel(3600 * 2 + 900), "2 h 15 min");
    assert.equal(duracaoLegivel(86_400 + 3600 * 4), "1 d 4 h");
  });
});
