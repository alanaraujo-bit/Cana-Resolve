import { NextResponse } from "next/server";
import { z } from "zod";

import { verificarAdministracao } from "@/lib/billing/webhook";
import {
  abrirOperacao,
  aprovarParaOBeta,
  confirmarPagamento,
  desfazerPagamento,
  encerrarBetasVencidos,
} from "@/lib/comercial/adesao";
import { ofertaAtiva } from "@/lib/comercial/catalogo";
import { definirInicioDaOperacao } from "@/lib/comercial/operacao";
import { isDatabaseConfigured } from "@/lib/db/client";
import { CODIGO_DO_BETA } from "@/lib/domain/comercial/catalogo";

/**
 * A porta da administração — a única por onde uma ativação entra.
 *
 *     POST /api/v1/comercial/administracao   x-cr-admin: <segredo>
 *
 * ## Por que ela existe
 *
 * O modelo comercial de hoje é venda e qualificação pelo canal oficial (§70):
 * o interessado conversa, é analisado, é aprovado, aceita a condição e paga.
 * Esse pagamento precisa virar estado no sistema — e precisa virar por um
 * caminho auditável, idempotente e autenticado, e não por alguém editando o
 * banco à mão.
 *
 * ## Por que o aplicativo nunca a alcança
 *
 * O §70 é explícito: **não existe botão escondido no app para "marcar como
 * pago"**. A garantia disso não é um `if` de permissão — é o segredo. Ele vive
 * só no ambiente do servidor, nunca numa variável `EXPO_PUBLIC_*`, e sem ele a
 * rota inteira responde 503. Um aplicativo distribuído nas lojas não tem como
 * carregá-lo sem entregá-lo a quem descompactar o pacote.
 *
 * ## As quatro operações
 *
 * | ação | o que faz |
 * | --- | --- |
 * | `aprovar` | o parceiro passa a ver a condição comercial (§78) |
 * | `confirmar-pagamento` | reserva a vaga; **não** inicia os 90 dias |
 * | `abrir-operacao` | inicia os 90 dias de todo mundo, de uma vez (§155) |
 * | `desfazer-pagamento` | reembolso ou contestação: acesso cai, história fica |
 *
 * Todas passam pelo livro de eventos, então repetir uma chamada não repete o
 * efeito. A resposta diz `novo: false` quando nada mudou — o que é a resposta
 * certa a uma retentativa, e não um erro.
 */

const corpo = z.discriminatedUnion("acao", [
  z.object({
    acao: z.literal("aprovar"),
    parceiroId: z.string().uuid(),
    categoria: z.string().trim().max(64).nullish(),
  }),
  z.object({
    acao: z.literal("confirmar-pagamento"),
    parceiroId: z.string().uuid(),
    /**
     * O identificador do pagamento no mundo real — o comprovante do Pix, o
     * número do recibo, a referência combinada. É ele que torna a operação
     * idempotente: reenviar o mesmo identificador não cria uma segunda adesão.
     */
    referencia: z.string().trim().min(4).max(120),
    valorCentavos: z.number().int().positive().optional(),
    em: z.string().datetime().optional(),
    observacao: z.string().trim().max(200).nullish(),
  }),
  z.object({
    acao: z.literal("abrir-operacao"),
    em: z.string().datetime(),
    forcar: z.boolean().optional(),
  }),
  z.object({
    acao: z.literal("desfazer-pagamento"),
    parceiroId: z.string().uuid(),
    motivo: z.enum(["reembolso", "contestacao"]),
    /** O identificador **deste** estorno. Torna a operação idempotente. */
    referencia: z.string().trim().min(4).max(120),
    /**
     * A referência da **compra original** que está sendo desfeita — a mesma
     * que foi usada em `confirmar-pagamento`.
     *
     * Separada de `referencia` de propósito: um estorno tem identidade própria
     * (senão reenviar a chamada reprocessaria), e a cobrança que ele desfaz
     * também. Confundir as duas faria um estorno alcançar cobrança errada.
     */
    referenciaDaCobranca: z.string().trim().min(4).max(120),
    em: z.string().datetime().optional(),
  }),
  z.object({ acao: z.literal("encerrar-vencidos") }),
]);

export async function POST(request: Request) {
  // Sem segredo, a rota não existe. É a mesma postura dos webhooks: recusar
  // por falta de credencial, nunca aceitar por falta dela.
  const verificacao = verificarAdministracao(request);
  if (!verificacao.ok) {
    const status = verificacao.motivo === "sem-segredo" ? 503 : 401;
    if (status === 503) {
      console.error("[comercial] CR_ADMIN_SEGREDO ausente — a administração está fechada");
    }
    return NextResponse.json({ ok: false, erro: verificacao.motivo }, { status });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, erro: "indisponivel" }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "corpo_invalido" }, { status: 400 });
  }

  const lido = corpo.safeParse(payload);
  if (!lido.success) {
    return NextResponse.json({ ok: false, erro: "corpo_invalido" }, { status: 400 });
  }

  try {
    const dados = lido.data;

    if (dados.acao === "aprovar") {
      const adesao = await aprovarParaOBeta(dados.parceiroId, dados.categoria ?? null);
      return NextResponse.json({ ok: true, estado: adesao.status });
    }

    if (dados.acao === "confirmar-pagamento") {
      /*
       * O preço vem do catálogo, e não do corpo da requisição (§16). O campo
       * `valorCentavos` existe para o caso legítimo de um valor combinado
       * diferente do de tabela — e quando ele vem, é registrado como veio, não
       * como "o preço da oferta".
       */
      const oferta = await ofertaAtiva(CODIGO_DO_BETA);
      if (!oferta) {
        return NextResponse.json({ ok: false, erro: "sem_oferta_ativa" }, { status: 409 });
      }

      const resultado = await confirmarPagamento({
        partnerId: dados.parceiroId,
        provedor: "administrativo",
        ambiente: "producao",
        idNoProvedor: `pagamento:${dados.referencia}`,
        valorCentavos: dados.valorCentavos ?? oferta.precoCentavos,
        moeda: oferta.moeda,
        ofertaCodigo: oferta.codigo,
        ofertaVersao: oferta.versao,
        em: dados.em ? new Date(dados.em) : new Date(),
        descricao: `${oferta.nome} — Beta de ${oferta.periodoDias ?? 90} dias`,
        referencia: dados.referencia,
      });

      return NextResponse.json({
        ok: true,
        novo: resultado.novo,
        estado: resultado.estado,
        betaInicio: resultado.betaInicio?.toISOString() ?? null,
      });
    }

    if (dados.acao === "abrir-operacao") {
      const em = new Date(dados.em);
      const gravada = await definirInicioDaOperacao(em, { forcar: dados.forcar });
      // A data é gravada primeiro; só então os Betas começam. Invertido, um
      // erro no meio deixaria adesões ativas sem data oficial que as explique.
      const resultado = await abrirOperacao(em);
      return NextResponse.json({
        ok: true,
        dataGravada: gravada.gravada,
        jaHavia: gravada.jaHavia?.toISOString() ?? null,
        novo: resultado.novo,
        ativados: resultado.ativados,
      });
    }

    if (dados.acao === "desfazer-pagamento") {
      const resultado = await desfazerPagamento(dados.parceiroId, dados.motivo, {
        provedor: "administrativo",
        ambiente: "producao",
        idNoProvedor: `${dados.motivo}:${dados.referencia}`,
        em: dados.em ? new Date(dados.em) : new Date(),
        referenciaDaCobranca: dados.referenciaDaCobranca,
      });
      return NextResponse.json({
        ok: true,
        novo: resultado.novo,
        cobrancasAfetadas: resultado.cobrancasAfetadas,
      });
    }

    return NextResponse.json({ ok: true, encerradas: await encerrarBetasVencidos() });
  } catch (error) {
    console.error(
      "[comercial] falha numa operação administrativa",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ ok: false, erro: "falha" }, { status: 500 });
  }
}
