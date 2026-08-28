import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DIAS_DE_AVISO_DO_FIM,
  DIAS_DO_BETA,
  estaTerminando,
  fimDoBeta,
  inicioDoBeta,
  janelaDoBeta,
} from "@/lib/domain/beta";
import {
  CODIGO_DO_BETA,
  SEMENTE_DO_BETA,
  condicaoLegivel,
  condicaoFalada,
  lerOferta,
  ofertaValida,
  paraOAplicativo,
  periodicidadeLegivel,
  precoFalado,
  precoLegivel,
  renovaAutomaticamente,
  validarBeneficio,
  type Oferta,
} from "@/lib/domain/comercial/catalogo";
import {
  ENTITLEMENTS,
  SEMPRE_DISPONIVEL,
  acessoDesconhecido,
  derivarAcesso,
  podeReceberOportunidades,
  situacaoConhecida,
} from "@/lib/domain/comercial/entitlements";
import {
  ehFalha,
  ehFundador,
  jaPagou,
  pagamentoConfirmado,
  pagamentoDesfeito,
  pagamentoEmCurso,
  podeContratar,
  assinaturaDaAcesso,
  ESTADOS_DA_ADESAO,
  ESTADOS_DO_PAGAMENTO,
  type EstadoDaAdesao,
} from "@/lib/domain/comercial/estados";
import {
  chaveDaTentativa,
  chaveDoEvento,
  paraOLog,
  reconciliar,
  type EventoFinanceiro,
} from "@/lib/domain/comercial/eventos";
import { montarSituacao, type EntradaDaSituacao } from "@/lib/domain/comercial/situacao";
import {
  avisoDeParticipacao,
  canalDoTipo,
  conferirPrivacidade,
  preferenciaDoTipo,
  type FatoComercial,
} from "@/lib/push/mensagens";
import { comoRota } from "../mobile/src/notificacoes/rotas";

const FATOS: FatoComercial[] = [
  "pagamento-confirmado",
  "beta-comecou",
  "beta-terminando",
  "cobranca-com-problema",
];

/**
 * A camada comercial — as regras que nenhuma captura de tela mostra.
 *
 * Dinheiro é a área em que um erro não aparece: uma média errada dá para ver,
 * um "90 dias" contado a partir da data errada parece exatamente igual ao
 * certo, e só é descoberto por quem perdeu um mês de participação. Por isso
 * estes testes existem antes de qualquer rota e de qualquer tela — e por isso
 * são mais insistentes do que o padrão da casa (§165).
 *
 * As duas asserções que sustentam a fase inteira estão logo no começo:
 *
 * 1. pagar em 10 de setembro, com a operação abrindo em 1º de outubro, dá
 *    início em **1º de outubro** e **90** dias restantes — nunca `pago + 90`;
 * 2. o mesmo evento do provedor, aplicado duas vezes, é **um** evento.
 */

const DIA = 86_400_000;
const em = (texto: string) => new Date(texto);

/* ========================================================================== */
/*  A regra dos 90 dias                                                       */
/* ========================================================================== */

describe("Beta — os 90 dias não começam no pagamento", () => {
  const PAGOU = em("2026-09-10T14:30:00.000Z");
  const ABRIU = em("2026-10-01T03:00:00.000Z");

  it("o cenário do briefing: paga em 10/09, opera a partir de 01/10", () => {
    const inicio = inicioDoBeta(PAGOU, ABRIU);
    assert.equal(inicio?.toISOString(), ABRIU.toISOString());

    const janela = janelaDoBeta(inicio, ABRIU);
    assert.equal(janela.fase, "ativo");
    assert.equal(janela.diasRestantes, 90, "no instante da abertura restam 90 dias inteiros");
    assert.equal(janela.diasDecorridos, 0);
    assert.equal(janela.fim?.toISOString(), new Date(ABRIU.getTime() + 90 * DIA).toISOString());
  });

  it("nenhum dia é consumido entre o pagamento e a abertura", () => {
    // Vinte e um dias esperando. Se o prazo corresse, sobrariam 69.
    const janela = janelaDoBeta(inicioDoBeta(PAGOU, ABRIU), em("2026-10-01T03:00:00.000Z"));
    assert.equal(janela.diasRestantes, 90);
    assert.notEqual(janela.diasRestantes, 69);
  });

  it("sem data de operação não existe janela, e não existe data inventada", () => {
    assert.equal(inicioDoBeta(PAGOU, null), null);
    const janela = janelaDoBeta(null, em("2026-09-20T00:00:00.000Z"));
    assert.equal(janela.fase, "aguardando-lancamento");
    assert.equal(janela.inicio, null);
    assert.equal(janela.fim, null);
    assert.equal(janela.diasRestantes, null, "null e não 90 — não começou não é faltam 90");
    assert.equal(janela.diasDecorridos, null);
  });

  it("quem paga depois da abertura recebe 90 dias a partir do próprio pagamento", () => {
    const tardio = em("2026-11-15T12:00:00.000Z");
    const inicio = inicioDoBeta(tardio, ABRIU);
    assert.equal(inicio?.toISOString(), tardio.toISOString());
    assert.equal(janelaDoBeta(inicio, tardio).diasRestantes, 90, "90 vendidos, 90 entregues");
  });

  it("sem pagamento não há início, mesmo com a operação aberta", () => {
    assert.equal(inicioDoBeta(null, ABRIU), null);
  });

  it("a contagem regride dia a dia e termina em zero", () => {
    const inicio = ABRIU;
    assert.equal(janelaDoBeta(inicio, new Date(inicio.getTime() + 1 * DIA)).diasRestantes, 89);
    assert.equal(janelaDoBeta(inicio, new Date(inicio.getTime() + 83 * DIA)).diasRestantes, 7);
    assert.equal(janelaDoBeta(inicio, new Date(inicio.getTime() + 89.5 * DIA)).diasRestantes, 1);
    const fim = janelaDoBeta(inicio, new Date(inicio.getTime() + 90 * DIA));
    assert.equal(fim.fase, "encerrado");
    assert.equal(fim.diasRestantes, 0);
  });

  it("depois do fim continua encerrado, e a contagem não vira negativa", () => {
    const janela = janelaDoBeta(ABRIU, new Date(ABRIU.getTime() + 200 * DIA));
    assert.equal(janela.fase, "encerrado");
    assert.equal(janela.diasRestantes, 0);
    assert.equal(janela.diasDecorridos, DIAS_DO_BETA, "decorridos não passa de 90");
  });

  it("o fuso não muda a janela — o cálculo é em instantes", () => {
    // O mesmo instante escrito de três maneiras. Nenhuma delas pode divergir.
    const utc = em("2026-10-01T03:00:00.000Z");
    const belem = em("2026-10-01T00:00:00.000-03:00");
    const tokio = em("2026-10-01T12:00:00.000+09:00");
    const alvo = fimDoBeta(utc).toISOString();
    assert.equal(fimDoBeta(belem).toISOString(), alvo);
    assert.equal(fimDoBeta(tokio).toISOString(), alvo);
    assert.equal(janelaDoBeta(belem, tokio).diasRestantes, 90);
  });

  it("a virada do horário de verão do hemisfério norte não encurta o período", () => {
    // 1º de outubro a 30 de dezembro atravessa a virada europeia e a americana.
    const inicio = em("2026-10-01T03:00:00.000Z");
    const fim = fimDoBeta(inicio);
    assert.equal(fim.getTime() - inicio.getTime(), 90 * DIA, "exatamente 90 × 24 h");
  });

  it("o aviso de fim aparece a sete dias, e nem um antes", () => {
    const inicio = ABRIU;
    const aos8 = janelaDoBeta(inicio, new Date(inicio.getTime() + 82 * DIA));
    const aos7 = janelaDoBeta(inicio, new Date(inicio.getTime() + 83 * DIA));
    assert.equal(aos8.diasRestantes, 8);
    assert.equal(estaTerminando(aos8), false);
    assert.equal(aos7.diasRestantes, DIAS_DE_AVISO_DO_FIM);
    assert.equal(estaTerminando(aos7), true);
  });

  it("um Beta já encerrado não está terminando — está terminado", () => {
    const janela = janelaDoBeta(ABRIU, new Date(ABRIU.getTime() + 120 * DIA));
    assert.equal(estaTerminando(janela), false);
  });

  it("aguardando lançamento nunca está terminando", () => {
    assert.equal(estaTerminando(janelaDoBeta(null, new Date())), false);
  });
});

/* ========================================================================== */
/*  Os quatro conceitos, e a separação entre eles                             */
/* ========================================================================== */

describe("Estados — quatro conceitos que não se confundem", () => {
  it("só quem foi aprovado pode contratar", () => {
    for (const estado of ESTADOS_DA_ADESAO) {
      assert.equal(
        podeContratar(estado),
        estado === "aprovado",
        `podeContratar("${estado}") deveria ser ${estado === "aprovado"}`,
      );
    }
  });

  it("em análise não vê checkout", () => {
    assert.equal(podeContratar("em_analise"), false);
  });

  it("categoria cheia e não elegível também não", () => {
    assert.equal(podeContratar("categoria_cheia"), false);
    assert.equal(podeContratar("nao_elegivel"), false);
  });

  it("Fundador é histórico: sobrevive ao fim do Beta", () => {
    assert.equal(ehFundador("reservado"), true);
    assert.equal(ehFundador("ativo"), true);
    assert.equal(ehFundador("encerrado"), true, "o Beta acabou; a história não");
    assert.equal(ehFundador("aprovado"), false, "aprovado sem pagar não é Fundador");
    assert.equal(ehFundador("em_analise"), false);
    assert.equal(ehFundador("cancelado"), false);
  });

  it("jaPagou e podeContratar são disjuntos — nunca as duas coisas", () => {
    for (const estado of ESTADOS_DA_ADESAO) {
      assert.equal(jaPagou(estado) && podeContratar(estado), false, estado);
    }
  });

  it("só o pagamento aprovado confirma; os outros seis não", () => {
    for (const estado of ESTADOS_DO_PAGAMENTO) {
      assert.equal(pagamentoConfirmado(estado), estado === "aprovado", estado);
    }
  });

  it("cancelar o checkout não é falha", () => {
    assert.equal(ehFalha("cancelado"), false, "quem desistiu não merece banner vermelho");
    assert.equal(ehFalha("falhou"), true);
  });

  it("pendente não libera e não acusa", () => {
    assert.equal(pagamentoEmCurso("aguardando"), true);
    assert.equal(pagamentoConfirmado("aguardando"), false);
    assert.equal(ehFalha("aguardando"), false);
  });

  it("reembolso e contestação são desfazimentos, não estados neutros", () => {
    assert.equal(pagamentoDesfeito("reembolsado"), true);
    assert.equal(pagamentoDesfeito("contestado"), true);
    assert.equal(pagamentoDesfeito("aprovado"), false);
    assert.equal(pagamentoDesfeito("falhou"), false);
  });

  it("assinatura cancelada ainda dá acesso; expirada não", () => {
    assert.equal(assinaturaDaAcesso("cancelada"), true, "cancelar desliga a renovação");
    assert.equal(assinaturaDaAcesso("ativa"), true);
    assert.equal(assinaturaDaAcesso("tolerancia"), true);
    assert.equal(assinaturaDaAcesso("expirada"), false);
    assert.equal(assinaturaDaAcesso("pendente"), false, "pendente ainda não é nada");
  });
});

/* ========================================================================== */
/*  Entitlements                                                              */
/* ========================================================================== */

describe("Entitlements — o que a conta pode usar agora", () => {
  const AGORA = em("2026-10-15T12:00:00.000Z");
  const INICIO = em("2026-10-01T03:00:00.000Z");
  const FIM = fimDoBeta(INICIO);

  it("pago mas aguardando lançamento: nenhum entitlement, e isso não é erro", () => {
    const acesso = derivarAcesso({
      adesao: { estado: "reservado", betaFim: null },
      assinatura: null,
      agora: AGORA,
    });
    assert.deepEqual(acesso.entitlements, []);
    assert.equal(acesso.origem, "aguardando-lancamento");
    assert.equal(podeReceberOportunidades(acesso), false);
    assert.equal(situacaoConhecida(acesso), true, "conhecida: só ainda não começou");
  });

  it("Beta ativo dentro da janela concede os dois entitlements", () => {
    const acesso = derivarAcesso({
      adesao: { estado: "ativo", betaFim: FIM },
      assinatura: null,
      agora: AGORA,
    });
    assert.deepEqual(acesso.entitlements.slice().sort(), ENTITLEMENTS.slice().sort());
    assert.equal(acesso.origem, "beta");
    assert.equal(acesso.ate?.toISOString(), FIM.toISOString());
    assert.equal(podeReceberOportunidades(acesso), true);
  });

  it("Beta ativo com a janela vencida não concede — o estado não vence sozinho", () => {
    // O caso perigoso: ninguém rodou a rotina que muda `ativo` para
    // `encerrado`, e o registro continua dizendo "ativo". A data manda.
    const acesso = derivarAcesso({
      adesao: { estado: "ativo", betaFim: FIM },
      assinatura: null,
      agora: new Date(FIM.getTime() + DIA),
    });
    assert.deepEqual(acesso.entitlements, []);
    assert.equal(podeReceberOportunidades(acesso), false);
  });

  it("Beta encerrado: sem acesso, com Fundador preservado e história escrita", () => {
    const acesso = derivarAcesso({
      adesao: { estado: "encerrado", betaFim: FIM },
      assinatura: null,
      agora: new Date(FIM.getTime() + 5 * DIA),
    });
    assert.deepEqual(acesso.entitlements, []);
    assert.match(acesso.justificativa, /Fundador/);
    assert.equal(ehFundador("encerrado"), true);
  });

  it("desconhecido não concede, e é distinguível de encerrado", () => {
    const acesso = acessoDesconhecido();
    assert.deepEqual(acesso.entitlements, []);
    assert.equal(podeReceberOportunidades(acesso), false);
    assert.equal(situacaoConhecida(acesso), false, "a tela precisa saber que não sabe");
  });

  it("nenhum estado que não seja pago concede acesso", () => {
    const nunca: EstadoDaAdesao[] = [
      "em_analise",
      "aprovado",
      "pagamento_pendente",
      "categoria_cheia",
      "nao_elegivel",
      "cancelado",
    ];
    for (const estado of nunca) {
      const acesso = derivarAcesso({
        adesao: { estado, betaFim: FIM },
        assinatura: null,
        agora: AGORA,
      });
      assert.deepEqual(acesso.entitlements, [], `"${estado}" não pode conceder nada`);
    }
  });

  it("pagamento pendente não libera acesso antecipado", () => {
    const acesso = derivarAcesso({
      adesao: { estado: "pagamento_pendente", betaFim: FIM },
      assinatura: null,
      agora: AGORA,
    });
    assert.equal(podeReceberOportunidades(acesso), false);
  });

  it("assinatura cancelada mantém acesso até o fim do período pago", () => {
    const fimDoPeriodo = new Date(AGORA.getTime() + 10 * DIA);
    const dentro = derivarAcesso({
      adesao: null,
      assinatura: { estado: "cancelada", periodoFim: fimDoPeriodo },
      agora: AGORA,
    });
    assert.equal(podeReceberOportunidades(dentro), true);
    assert.equal(dentro.ate?.toISOString(), fimDoPeriodo.toISOString());

    const depois = derivarAcesso({
      adesao: null,
      assinatura: { estado: "cancelada", periodoFim: fimDoPeriodo },
      agora: new Date(fimDoPeriodo.getTime() + 1),
    });
    assert.equal(podeReceberOportunidades(depois), false, "acabou o período, acabou o acesso");
  });

  it("uma assinatura viva prevalece sobre um Beta encerrado", () => {
    const acesso = derivarAcesso({
      adesao: { estado: "encerrado", betaFim: FIM },
      assinatura: { estado: "ativa", periodoFim: new Date(FIM.getTime() + 30 * DIA) },
      agora: new Date(FIM.getTime() + DIA),
    });
    assert.equal(acesso.origem, "assinatura");
    assert.equal(podeReceberOportunidades(acesso), true);
  });

  it("conta sem nada: sem acesso, e a justificativa diz por quê", () => {
    const acesso = derivarAcesso({ adesao: null, assinatura: null, agora: AGORA });
    assert.deepEqual(acesso.entitlements, []);
    assert.equal(acesso.origem, "nenhuma");
    assert.match(acesso.justificativa, /Nenhuma adesão/);
  });

  it("toda derivação diz por que — nenhuma justificativa vazia", () => {
    for (const estado of ESTADOS_DA_ADESAO) {
      const acesso = derivarAcesso({
        adesao: { estado, betaFim: FIM },
        assinatura: null,
        agora: AGORA,
      });
      assert.ok(acesso.justificativa.length > 10, `"${estado}" precisa de justificativa`);
    }
  });

  it("o que nunca é entitlement está escrito, e não é vazio", () => {
    assert.ok(SEMPRE_DISPONIVEL.length >= 6);
    assert.ok(SEMPRE_DISPONIVEL.some((t) => t.includes("cobrança")));
    assert.ok(SEMPRE_DISPONIVEL.some((t) => t.includes("histórico")));
    // Nada do §104 pode ter virado entitlement por engano.
    for (const nome of ENTITLEMENTS) {
      assert.ok(
        !String(SEMPRE_DISPONIVEL).includes(nome),
        `"${nome}" não pode estar nos dois lugares`,
      );
    }
  });
});

/* ========================================================================== */
/*  Catálogo                                                                  */
/* ========================================================================== */

describe("Catálogo — configurável, versionado e sem promessa de resultado", () => {
  it("a semente do Beta é válida e diz exatamente a oferta", () => {
    const oferta = lerOferta(SEMENTE_DO_BETA);
    assert.equal(oferta.codigo, CODIGO_DO_BETA);
    assert.equal(oferta.precoCentavos, 7900);
    assert.equal(oferta.periodoDias, 90);
    assert.equal(oferta.recorrencia, "unica");
    assert.equal(oferta.exigeAprovacao, true);
    assert.equal(
      condicaoLegivel(oferta).replace(/ /g, " "),
      "R$ 79,00 pelos primeiros 90 dias",
    );
    assert.equal(renovaAutomaticamente(oferta), false, "o Beta não renova sozinho");
  });

  it("a descrição do Beta explica a regra dos 90 dias e a ausência de fidelidade", () => {
    assert.match(SEMENTE_DO_BETA.descricao, /oficialmente aberto aos moradores/);
    assert.match(SEMENTE_DO_BETA.descricao, /não na data do pagamento/);
    assert.match(SEMENTE_DO_BETA.descricao, /renovação automática/);
    assert.match(SEMENTE_DO_BETA.descricao, /fidelidade/);
  });

  it("nenhum benefício promete resultado", () => {
    for (const beneficio of SEMENTE_DO_BETA.beneficios) {
      assert.equal(validarBeneficio(beneficio), null, beneficio);
    }
    assert.ok(validarBeneficio("10 clientes garantidos por mês"));
    assert.ok(validarBeneficio("Retorno garantido em 30 dias"));
    assert.ok(validarBeneficio("Faturamento assegurado"));
    assert.ok(validarBeneficio("   "));
  });

  it("uma oferta com promessa de resultado é recusada pelo catálogo inteiro", () => {
    const ruim: Oferta = { ...SEMENTE_DO_BETA, beneficios: ["5 leads garantidos por semana"] };
    assert.equal(ofertaValida(ruim), null);
    assert.throws(() => lerOferta(ruim));
  });

  it("a oferta que chega ao aplicativo não carrega nota interna", () => {
    const publica = paraOAplicativo(SEMENTE_DO_BETA);
    assert.equal("observacao" in publica, false);
    assert.equal(JSON.stringify(publica).includes("administração"), false);
  });

  it("nenhum plano pós-Beta existe no código", () => {
    // Os valores de 129 e 199 são hipóteses a validar (§12). Se algum dia
    // aparecerem aqui como oferta, foi porque alguém decidiu sem decidir.
    const texto = JSON.stringify(SEMENTE_DO_BETA);
    assert.equal(texto.includes("12900"), false);
    assert.equal(texto.includes("19900"), false);
    assert.equal(/empresarial|destaque/i.test(texto), false);
  });

  it("uma linha malformada não derruba a leitura — devolve null", () => {
    assert.equal(ofertaValida({ codigo: "x" }), null);
    assert.equal(ofertaValida(null), null);
    assert.equal(ofertaValida({ ...SEMENTE_DO_BETA, precoCentavos: 79.5 }), null);
    assert.equal(ofertaValida({ ...SEMENTE_DO_BETA, moeda: "reais" }), null);
    assert.equal(ofertaValida({ ...SEMENTE_DO_BETA, versao: 0 }), null);
  });

  it("versionamento: o mesmo código com versões diferentes são condições diferentes", () => {
    const v2: Oferta = { ...SEMENTE_DO_BETA, versao: 2, precoCentavos: 9900, estado: "ativa" };
    assert.equal(lerOferta(v2).versao, 2);
    assert.equal(SEMENTE_DO_BETA.versao, 1, "a versão antiga não foi reescrita");
    assert.equal(SEMENTE_DO_BETA.precoCentavos, 7900);
  });
});

describe("Preço — um, dois e três dígitos, e o que o leitor de tela lê", () => {
  it("escrito", () => {
    assert.equal(precoLegivel(900).replace(/ /g, " "), "R$ 9,00");
    assert.equal(precoLegivel(7900).replace(/ /g, " "), "R$ 79,00");
    assert.equal(precoLegivel(19900).replace(/ /g, " "), "R$ 199,00");
    assert.equal(precoLegivel(129900).replace(/ /g, " "), "R$ 1.299,00");
    assert.equal(precoLegivel(7950).replace(/ /g, " "), "R$ 79,50");
    assert.equal(precoLegivel(0).replace(/ /g, " "), "R$ 0,00");
  });

  it("falado", () => {
    assert.equal(precoFalado(100), "um real");
    assert.equal(precoFalado(900), "nove reais");
    assert.equal(precoFalado(7900), "setenta e nove reais");
    assert.equal(precoFalado(12900), "cento e vinte e nove reais");
    assert.equal(precoFalado(19900), "cento e noventa e nove reais");
    assert.equal(precoFalado(10000), "cem reais");
    assert.equal(precoFalado(129900), "mil duzentos e noventa e nove reais");
    assert.equal(precoFalado(7950), "setenta e nove reais e cinquenta centavos");
    assert.equal(precoFalado(7901), "setenta e nove reais e um centavo");
  });

  it("outra moeda não recebe tradução errada — recebe o formato oficial", () => {
    assert.ok(precoFalado(7900, "USD").includes("US$"));
  });

  it("a periodicidade nunca é omitida", () => {
    assert.equal(periodicidadeLegivel({ recorrencia: "unica", periodoDias: 90 }), "pelos primeiros 90 dias");
    assert.equal(periodicidadeLegivel({ recorrencia: "mensal", periodoDias: null }), "por mês");
    assert.equal(periodicidadeLegivel({ recorrencia: "anual", periodoDias: null }), "por ano");
    assert.equal(periodicidadeLegivel({ recorrencia: "unica", periodoDias: null }), "pagamento único");
  });

  it("uma oferta recorrente sempre mostra o /mês — nunca o valor sozinho", () => {
    const mensal = {
      precoCentavos: 7900,
      moeda: "BRL",
      recorrencia: "mensal" as const,
      periodoDias: null,
    };
    assert.equal(condicaoLegivel(mensal).replace(/ /g, " "), "R$ 79,00 por mês");
    assert.equal(condicaoFalada(mensal), "setenta e nove reais por mês");
    assert.equal(renovaAutomaticamente(mensal), true);
  });
});

/* ========================================================================== */
/*  Idempotência e reconciliação                                              */
/* ========================================================================== */

describe("Eventos — o mesmo evento duas vezes é um evento", () => {
  const base: EventoFinanceiro = {
    provedor: "administrativo",
    ambiente: "producao",
    idNoProvedor: "ativacao-PA-0002-2026-09-10",
    tipo: "ativacao_administrativa",
    em: em("2026-09-10T14:30:00.000Z"),
    parceiroId: "00000000-0000-0000-0000-000000000001",
    valorCentavos: 7900,
    moeda: "BRL",
    ofertaCodigo: CODIGO_DO_BETA,
    ofertaVersao: 1,
  };

  it("a chave é estável para o mesmo evento", () => {
    assert.equal(chaveDoEvento(base), chaveDoEvento({ ...base }));
    // Reentregas trazem carimbos e valores diferentes; a chave não muda.
    assert.equal(chaveDoEvento({ ...base, ambiente: "producao" }), chaveDoEvento(base));
  });

  it("sandbox e produção nunca colidem", () => {
    assert.notEqual(chaveDoEvento({ ...base, ambiente: "sandbox" }), chaveDoEvento(base));
  });

  it("dois provedores com o mesmo número são dois eventos", () => {
    assert.notEqual(chaveDoEvento({ ...base, provedor: "apple" }), chaveDoEvento(base));
    assert.notEqual(
      chaveDoEvento({ ...base, provedor: "apple" }),
      chaveDoEvento({ ...base, provedor: "google" }),
    );
  });

  it("a chave tem tamanho fixo e cabe num índice", () => {
    const curta = chaveDoEvento({ ...base, idNoProvedor: "1" });
    const longa = chaveDoEvento({ ...base, idNoProvedor: "x".repeat(4000) });
    assert.equal(curta.length, longa.length);
    assert.match(curta, /^[A-Za-z0-9_-]+$/, "base64url: seguro em índice e em log");
  });

  it("o toque duplo produz a mesma tentativa", () => {
    const a = chaveDaTentativa("p1", CODIGO_DO_BETA, 1);
    const b = chaveDaTentativa("p1", CODIGO_DO_BETA, 1);
    assert.equal(a, b, "dois toques, uma transação");
    assert.notEqual(a, chaveDaTentativa("p2", CODIGO_DO_BETA, 1));
    assert.notEqual(a, chaveDaTentativa("p1", CODIGO_DO_BETA, 2));
  });

  it("o log financeiro não carrega segredo nem identificador cru do provedor", () => {
    const registro = paraOLog(base);
    const texto = JSON.stringify(registro);
    assert.equal(texto.includes(base.idNoProvedor), false, "o id cru não entra no log");
    assert.equal("recibo" in registro, false);
    assert.equal("token" in registro, false);
    assert.ok(texto.includes("administrativo"));
    assert.ok(texto.includes("7900"));
  });

  it("reconciliação nomeia a divergência em vez de escondê-la", () => {
    assert.equal(reconciliar("aprovado", "aprovado"), "nenhuma");
    assert.equal(reconciliar("aprovado", "falhou"), "provedor-adiante");
    assert.equal(reconciliar("reembolsado", "aprovado"), "registro-adiante");
    assert.equal(reconciliar(null, "aprovado"), "indeterminada", "não perguntar não é discordar");
  });
});

/* ========================================================================== */
/*  A situação inteira                                                        */
/* ========================================================================== */

describe("Push e deep link comerciais", () => {
  it("nenhum aviso comercial carrega valor em dinheiro", () => {
    for (const fato of FATOS) {
      const aviso = avisoDeParticipacao({ fato, partnerId: "p1", dias: 7 });
      const texto = `${aviso.titulo} ${aviso.corpo}`;
      assert.equal(/R\$|\d+,\d{2}|reais/i.test(texto), false, `"${texto}" fala de dinheiro`);
    }
  });

  it("nenhum aviso comercial vende nada", () => {
    for (const fato of FATOS) {
      const aviso = avisoDeParticipacao({ fato, partnerId: "p1", dias: 2 });
      const texto = `${aviso.titulo} ${aviso.corpo}`.toLowerCase();
      for (const proibida of ["assine", "aproveite", "última chance", "corra", "!!"]) {
        assert.equal(texto.includes(proibida), false, `"${texto}" contém "${proibida}"`);
      }
      assert.equal(texto.includes("!"), false, "sem exclamação: isto é operação, não campanha");
    }
  });

  it("todos passam pela mesma conferência de privacidade dos outros avisos", () => {
    for (const fato of FATOS) {
      assert.equal(
        conferirPrivacidade(avisoDeParticipacao({ fato, partnerId: "p1", dias: 5 })),
        null,
        fato,
      );
    }
  });

  it("o aviso de fim diz o número quando ele existe, e não o inventa quando não", () => {
    const com = avisoDeParticipacao({ fato: "beta-terminando", partnerId: "p1", dias: 7 });
    assert.match(com.corpo, /7 dias/);
    const um = avisoDeParticipacao({ fato: "beta-terminando", partnerId: "p1", dias: 1 });
    assert.match(um.corpo, /1 dia\b/);
    const sem = avisoDeParticipacao({ fato: "beta-terminando", partnerId: "p1" });
    assert.equal(/\d/.test(sem.corpo), false, "sem número, nenhuma contagem inventada");
  });

  it("a participação não é desligável, e cai no canal da conta", () => {
    assert.equal(preferenciaDoTipo["conta.participacao"], null);
    assert.equal(canalDoTipo["conta.participacao"], "conta");
  });

  it("dois avisos do mesmo fato no mesmo dia são o mesmo evento", () => {
    const manha = avisoDeParticipacao({
      fato: "beta-terminando",
      partnerId: "p1",
      dias: 7,
      em: new Date("2026-12-23T09:00:00.000Z"),
    });
    const tarde = avisoDeParticipacao({
      fato: "beta-terminando",
      partnerId: "p1",
      dias: 7,
      em: new Date("2026-12-23T18:00:00.000Z"),
    });
    assert.equal(manha.carga.evento, tarde.carga.evento, "duas execuções não são dois fatos");

    const outroDia = avisoDeParticipacao({
      fato: "beta-terminando",
      partnerId: "p1",
      dias: 6,
      em: new Date("2026-12-24T09:00:00.000Z"),
    });
    assert.notEqual(manha.carga.evento, outroDia.carga.evento);
  });

  it("o destino abre a área comercial, e não a Home", () => {
    for (const fato of FATOS) {
      const aviso = avisoDeParticipacao({ fato, partnerId: "p1" });
      assert.equal(aviso.carga.destino, "plano");
      assert.equal(comoRota(aviso.carga.destino), "/ajustes/plano");
    }
  });

  it("a tradução do destino é idempotente e aceita as três formas", () => {
    assert.equal(comoRota("plano"), "/ajustes/plano");
    assert.equal(comoRota("/ajustes/plano"), "/ajustes/plano");
    assert.equal(comoRota("canaaresolve://plano"), "/ajustes/plano");
    assert.equal(comoRota("https://canaaresolve.aionixdev.com/ajustes/cobrancas"), "/ajustes/cobrancas");
    // Idempotência: o que `restaurar()` lê do disco já é a forma traduzida.
    assert.equal(comoRota(comoRota("plano")!), "/ajustes/plano");
  });

  it("as rotas anteriores continuam funcionando", () => {
    assert.equal(comoRota("oportunidade/o1"), "/oportunidade/o1");
    assert.equal(comoRota("avaliacao/a1"), "/perfil/avaliacoes/a1");
    assert.equal(comoRota("ajustes/seguranca"), "/ajustes/seguranca");
    assert.equal(comoRota("ajustes/plano/algo/mais"), null);
  });
});

/* ========================================================================== */
/*  A situação inteira                                                        */
/* ========================================================================== */

describe("Situação — o objeto que o aplicativo desenha", () => {
  const base: EntradaDaSituacao = {
    agora: em("2026-09-20T12:00:00.000Z"),
    inicioDaOperacao: null,
    adesao: null,
    assinatura: null,
    ofertaContratada: null,
    ofertaDisponivel: null,
  };

  it("Cenário A — aprovado, aguardando pagamento: a oferta aparece", () => {
    const s = montarSituacao({
      ...base,
      adesao: {
        estado: "aprovado",
        pagoEm: null,
        betaInicio: null,
        ofertaCodigo: null,
        ofertaVersao: null,
        categoria: "Elétrica",
      },
      ofertaDisponivel: SEMENTE_DO_BETA,
    });
    assert.ok(s.ofertaDisponivel);
    assert.equal(s.ofertaDisponivel?.precoCentavos, 7900);
    assert.equal(s.fundador, false);
    assert.deepEqual(s.acesso.entitlements, []);
  });

  it("em análise não recebe oferta, mesmo havendo uma ativa no catálogo", () => {
    const s = montarSituacao({
      ...base,
      adesao: {
        estado: "em_analise",
        pagoEm: null,
        betaInicio: null,
        ofertaCodigo: null,
        ofertaVersao: null,
        categoria: null,
      },
      ofertaDisponivel: SEMENTE_DO_BETA,
    });
    assert.equal(s.ofertaDisponivel, null, "não há checkout antes da elegibilidade");
  });

  it("uma oferta em rascunho nunca é apresentada", () => {
    const s = montarSituacao({
      ...base,
      adesao: {
        estado: "aprovado",
        pagoEm: null,
        betaInicio: null,
        ofertaCodigo: null,
        ofertaVersao: null,
        categoria: null,
      },
      ofertaDisponivel: { ...SEMENTE_DO_BETA, estado: "rascunho" },
    });
    assert.equal(s.ofertaDisponivel, null);
  });

  it("Cenário C — Fundador pago, aguardando lançamento: vaga garantida, zero dias consumidos", () => {
    const s = montarSituacao({
      ...base,
      adesao: {
        estado: "reservado",
        pagoEm: em("2026-09-10T14:30:00.000Z"),
        betaInicio: null,
        ofertaCodigo: CODIGO_DO_BETA,
        ofertaVersao: 1,
        categoria: "Elétrica",
      },
      ofertaContratada: SEMENTE_DO_BETA,
    });
    assert.equal(s.fundador, true);
    assert.equal(s.adesao?.beta.fase, "aguardando-lancamento");
    assert.equal(s.adesao?.beta.diasRestantes, null, "sem countdown falso");
    assert.equal(s.operacao.iniciada, false);
    assert.equal(s.operacao.em, null, "não se inventa data de lançamento");
    assert.equal(s.acesso.origem, "aguardando-lancamento");
    assert.equal(s.ofertaDisponivel, null, "quem já pagou não é convidado a pagar de novo");
  });

  it("Cenário D — Beta ativo com 72 dias restantes", () => {
    const inicio = em("2026-10-01T03:00:00.000Z");
    const s = montarSituacao({
      ...base,
      agora: new Date(inicio.getTime() + 18 * DIA),
      inicioDaOperacao: inicio,
      adesao: {
        estado: "ativo",
        pagoEm: em("2026-09-10T14:30:00.000Z"),
        betaInicio: inicio,
        ofertaCodigo: CODIGO_DO_BETA,
        ofertaVersao: 1,
        categoria: "Elétrica",
      },
      ofertaContratada: SEMENTE_DO_BETA,
    });
    assert.equal(s.adesao?.beta.diasRestantes, 72);
    assert.equal(s.adesao?.beta.diasDecorridos, 18);
    assert.equal(s.adesao?.terminando, false);
    assert.equal(s.operacao.iniciada, true);
    assert.equal(s.acesso.origem, "beta");
    assert.deepEqual(s.acesso.entitlements.slice().sort(), ENTITLEMENTS.slice().sort());
  });

  it("Cenário E — faltam 7 dias: o aviso liga, sem urgência inventada", () => {
    const inicio = em("2026-10-01T03:00:00.000Z");
    const s = montarSituacao({
      ...base,
      agora: new Date(inicio.getTime() + 83 * DIA),
      inicioDaOperacao: inicio,
      adesao: {
        estado: "ativo",
        pagoEm: em("2026-09-10T00:00:00.000Z"),
        betaInicio: inicio,
        ofertaCodigo: CODIGO_DO_BETA,
        ofertaVersao: 1,
        categoria: null,
      },
      ofertaContratada: SEMENTE_DO_BETA,
    });
    assert.equal(s.adesao?.terminando, true);
    assert.equal(s.adesao?.beta.diasRestantes, 7);
    assert.equal(s.continuidade.definida, false);
    assert.equal(s.continuidade.renovacaoAutomatica, false);
  });

  it("Cenário F — Beta encerrado sem plano posterior: Fundador fica, acesso não, e nada renova", () => {
    const inicio = em("2026-10-01T03:00:00.000Z");
    const s = montarSituacao({
      ...base,
      agora: new Date(inicio.getTime() + 95 * DIA),
      inicioDaOperacao: inicio,
      adesao: {
        estado: "encerrado",
        pagoEm: em("2026-09-10T00:00:00.000Z"),
        betaInicio: inicio,
        ofertaCodigo: CODIGO_DO_BETA,
        ofertaVersao: 1,
        categoria: null,
      },
      ofertaContratada: SEMENTE_DO_BETA,
    });
    assert.equal(s.fundador, true, "o status histórico permanece");
    assert.equal(s.adesao?.beta.fase, "encerrado");
    assert.deepEqual(s.acesso.entitlements, []);
    assert.equal(s.continuidade.renovacaoAutomatica, false, "ninguém é cobrado sem oferta");
    assert.equal(s.ofertaDisponivel, null);
  });

  it("Cenário G — assinatura futura ativa coexiste com o Fundador", () => {
    const s = montarSituacao({
      ...base,
      agora: em("2027-02-01T00:00:00.000Z"),
      inicioDaOperacao: em("2026-10-01T03:00:00.000Z"),
      adesao: {
        estado: "encerrado",
        pagoEm: em("2026-09-10T00:00:00.000Z"),
        betaInicio: em("2026-10-01T03:00:00.000Z"),
        ofertaCodigo: CODIGO_DO_BETA,
        ofertaVersao: 1,
        categoria: null,
      },
      assinatura: {
        estado: "ativa",
        ofertaCodigo: "profissional",
        ofertaVersao: 1,
        periodoFim: em("2027-03-01T00:00:00.000Z"),
        renova: true,
        provedor: "apple",
      },
    });
    assert.equal(s.fundador, true, "FounderStatus e plano coexistem");
    assert.equal(s.acesso.origem, "assinatura");
    assert.equal(s.assinatura?.renova, true);
  });

  it("Cenário I — assinatura cancelada ao fim do período: acesso até lá, e a tela sabe", () => {
    const fim = em("2027-03-01T00:00:00.000Z");
    const s = montarSituacao({
      ...base,
      agora: em("2027-02-01T00:00:00.000Z"),
      assinatura: {
        estado: "cancelada",
        ofertaCodigo: "profissional",
        ofertaVersao: 1,
        periodoFim: fim,
        renova: false,
        provedor: "apple",
      },
    });
    assert.equal(s.assinatura?.renova, false);
    assert.equal(s.acesso.ate, fim.toISOString());
    assert.deepEqual(s.acesso.entitlements.slice().sort(), ENTITLEMENTS.slice().sort());
    assert.match(s.acesso.justificativa, /fim do período já pago/);
  });

  it("a resposta carrega o relógio do servidor", () => {
    const s = montarSituacao(base);
    assert.equal(s.servidorEm, base.agora.toISOString());
  });

  it("nenhum campo de data vira número de dias no fio", () => {
    const inicio = em("2026-10-01T03:00:00.000Z");
    const s = montarSituacao({
      ...base,
      agora: new Date(inicio.getTime() + DIA),
      inicioDaOperacao: inicio,
      adesao: {
        estado: "ativo",
        pagoEm: inicio,
        betaInicio: inicio,
        ofertaCodigo: CODIGO_DO_BETA,
        ofertaVersao: 1,
        categoria: null,
      },
    });
    assert.match(s.adesao!.beta.inicio!, /^\d{4}-\d{2}-\d{2}T.*Z$/);
    assert.match(s.adesao!.beta.fim!, /^\d{4}-\d{2}-\d{2}T.*Z$/);
    assert.match(s.operacao.em!, /^\d{4}-\d{2}-\d{2}T.*Z$/);
  });

  it("uma conta sem nada comercial continua sendo uma situação válida", () => {
    const s = montarSituacao(base);
    assert.equal(s.adesao, null);
    assert.equal(s.assinatura, null);
    assert.equal(s.fundador, false);
    assert.equal(s.acesso.origem, "nenhuma");
    assert.equal(s.operacao.iniciada, false);
  });

  it("a situação nunca vaza a nota interna da oferta", () => {
    const s = montarSituacao({
      ...base,
      adesao: {
        estado: "reservado",
        pagoEm: em("2026-09-10T00:00:00.000Z"),
        betaInicio: null,
        ofertaCodigo: CODIGO_DO_BETA,
        ofertaVersao: 1,
        categoria: null,
      },
      ofertaContratada: SEMENTE_DO_BETA,
    });
    assert.equal(JSON.stringify(s).includes("observacao"), false);
  });
});
