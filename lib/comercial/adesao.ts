import "server-only";

import { and, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { founderEnrollments, partners, paymentTransactions } from "@/lib/db/schema";
import { DIAS_DO_BETA, fimDoBeta, inicioDoBeta } from "@/lib/domain/beta";
import { CODIGO_DO_BETA } from "@/lib/domain/comercial/catalogo";
import { jaPagou, type EstadoDaAdesao } from "@/lib/domain/comercial/estados";
import type { Ambiente, Provedor } from "@/lib/domain/comercial/eventos";
import { registrarEvento } from "./livro";
import { inicioDaOperacao } from "./operacao";

/**
 * A adesão ao Beta Fundador — as operações que mexem no estado comercial.
 *
 * Quatro coisas acontecem aqui, e cada uma tem uma armadilha própria:
 *
 * 1. **Confirmar um pagamento.** A armadilha é a reentrega: o mesmo evento
 *    chegando duas vezes não pode gerar duas adesões. A defesa é o livro
 *    (`livro.ts`) — o efeito só roda quando o evento é novo.
 * 2. **Abrir a operação.** A armadilha é a data: quem escreve
 *    `betaStartedAt` é este momento, e nada mais. Nenhum caminho de pagamento
 *    escreve essa coluna.
 * 3. **Encerrar Betas vencidos.** A armadilha é achar que isso decide acesso.
 *    Não decide: `derivarAcesso` já confere a data. Esta rotina é higiene do
 *    registro, e o sistema continua correto se ela não rodar.
 * 4. **Desfazer um pagamento** (reembolso, contestação). A armadilha é a
 *    omissão: um caminho que não trata reembolso é um caminho que mantém
 *    acesso pago por dinheiro devolvido.
 *
 * **Nada aqui aceita ordem vinda do aplicativo.** Todas as funções são
 * chamadas por rotas administrativas e por adaptadores de provedor que já
 * validaram a origem. O aplicativo só lê.
 */

export type LinhaDaAdesao = typeof founderEnrollments.$inferSelect;

export async function adesaoDoParceiro(partnerId: string): Promise<LinhaDaAdesao | null> {
  const db = getDb();
  const [linha] = await db
    .select()
    .from(founderEnrollments)
    .where(eq(founderEnrollments.partnerId, partnerId))
    .limit(1);
  return linha ?? null;
}

/**
 * Marca um parceiro como aprovado e elegível a receber a condição comercial.
 *
 * É o portão do §75: sem passar por aqui, ninguém vê oferta nenhuma. Cria a
 * adesão se ela não existir — o cadastro público não cria.
 */
export async function aprovarParaOBeta(
  partnerId: string,
  categoria: string | null = null,
): Promise<LinhaDaAdesao> {
  const db = getDb();
  const agora = new Date();

  const [linha] = await db
    .insert(founderEnrollments)
    .values({
      partnerId,
      status: "aprovado",
      categoryId: categoria,
      approvedAt: agora,
      offerCode: CODIGO_DO_BETA,
      offerVersion: 1,
    })
    .onConflictDoUpdate({
      target: founderEnrollments.partnerId,
      set: { status: "aprovado", approvedAt: agora, categoryId: categoria, updatedAt: agora },
      // Aprovar de novo quem já pagou seria um retrocesso: o funil comercial
      // só anda para a frente, como já vale para os cadastros do site.
      where: sql`${founderEnrollments.status} in ('em_analise', 'aprovado', 'categoria_cheia', 'nao_elegivel')`,
    })
    .returning();

  return linha ?? (await adesaoDoParceiro(partnerId))!;
}

export type ConfirmacaoDePagamento = {
  partnerId: string;
  provedor: Provedor;
  ambiente: Ambiente;
  /** O identificador que o provedor deu ao evento. É a chave da idempotência. */
  idNoProvedor: string;
  valorCentavos: number;
  moeda: string;
  ofertaCodigo: string;
  ofertaVersao: number;
  em: Date;
  descricao: string;
  /** Referência da compra no provedor, quando existir. */
  referencia?: string | null;
  comprovante?: string | null;
};

export type ResultadoDaConfirmacao = {
  /** `false` quando este pagamento já tinha sido processado antes. */
  novo: boolean;
  estado: EstadoDaAdesao;
  betaInicio: Date | null;
};

/**
 * Confirma um pagamento validado e reserva a vaga.
 *
 * **Não recebe nada do aplicativo.** Quem chama já validou a origem — o
 * adaptador da loja contra o servidor da loja, ou a rota administrativa contra
 * o segredo de administração. O §17 e o §49 vivem nessa fronteira: aqui dentro
 * já não existe a pergunta "será que pagou mesmo?".
 *
 * O estado resultante depende de a operação já estar aberta, e **nunca** da
 * data do pagamento sozinha:
 *
 * - operação fechada → `reservado`, sem `betaStartedAt`, zero dias consumidos;
 * - operação aberta → `ativo`, com a janela começando agora.
 */
export async function confirmarPagamento(
  dados: ConfirmacaoDePagamento,
): Promise<ResultadoDaConfirmacao> {
  const db = getDb();

  const { novo } = await registrarEvento(
    {
      provedor: dados.provedor,
      ambiente: dados.ambiente,
      idNoProvedor: dados.idNoProvedor,
      tipo: dados.provedor === "administrativo" ? "ativacao_administrativa" : "compra",
      em: dados.em,
      parceiroId: dados.partnerId,
      valorCentavos: dados.valorCentavos,
      moeda: dados.moeda,
      ofertaCodigo: dados.ofertaCodigo,
      ofertaVersao: dados.ofertaVersao,
    },
    "Pagamento confirmado; adesão ao Beta Fundador registrada.",
  );

  if (!novo) {
    // Reentrega. O efeito já aconteceu; devolver o estado atual é a resposta
    // certa — e é o que impede uma compra de virar duas adesões (§51).
    const atual = await adesaoDoParceiro(dados.partnerId);
    return {
      novo: false,
      estado: atual?.status ?? "reservado",
      betaInicio: atual?.betaStartedAt ?? null,
    };
  }

  const abertura = await inicioDaOperacao();
  const comeca = inicioDoBeta(dados.em, abertura);
  const estado: EstadoDaAdesao = comeca ? "ativo" : "reservado";

  await db.transaction(async (tx) => {
    await tx
      .insert(founderEnrollments)
      .values({
        partnerId: dados.partnerId,
        status: estado,
        offerCode: dados.ofertaCodigo,
        offerVersion: dados.ofertaVersao,
        paidAt: dados.em,
        betaStartedAt: comeca,
        betaEndsAt: comeca ? fimDoBeta(comeca) : null,
        provider: dados.provedor,
      })
      .onConflictDoUpdate({
        target: founderEnrollments.partnerId,
        set: {
          status: estado,
          offerCode: dados.ofertaCodigo,
          offerVersion: dados.ofertaVersao,
          paidAt: dados.em,
          betaStartedAt: comeca,
          betaEndsAt: comeca ? fimDoBeta(comeca) : null,
          provider: dados.provedor,
          canceledAt: null,
          updatedAt: new Date(),
        },
      });

    await tx
      .insert(paymentTransactions)
      .values({
        partnerId: dados.partnerId,
        status: "aprovado",
        offerCode: dados.ofertaCodigo,
        offerVersion: dados.ofertaVersao,
        amountCents: dados.valorCentavos,
        currency: dados.moeda,
        provider: dados.provedor,
        environment: dados.ambiente,
        providerRef: dados.referencia ?? null,
        // A mesma chave do evento: uma cobrança por evento confirmado.
        idempotencyKey: `pagamento:${dados.provedor}:${dados.ambiente}:${dados.idNoProvedor}`,
        receiptUrl: dados.comprovante ?? null,
        description: dados.descricao,
        settledAt: dados.em,
      })
      .onConflictDoNothing({ target: paymentTransactions.idempotencyKey });

    // As colunas antigas continuam sendo escritas para que ferramentas e
    // consultas herdadas não fiquem cegas. Elas são espelho, não autoridade.
    await tx
      .update(partners)
      .set({
        founder: true,
        betaPaidAt: dados.em,
        betaStartedAt: comeca,
        updatedAt: new Date(),
      })
      .where(eq(partners.id, dados.partnerId));
  });

  return { novo: true, estado, betaInicio: comeca };
}

/**
 * Abre a operação para os moradores. **É este momento que dispara os 90 dias.**
 *
 * Todo mundo que estava `reservado` passa a `ativo` na mesma escrita, com a
 * mesma data — que é o §144: uma referência única, e não noventa cálculos
 * independentes.
 *
 * Idempotente pelo livro: chamar duas vezes com a mesma data não move ninguém
 * duas vezes e não empurra o fim do período de ninguém para a frente.
 */
export async function abrirOperacao(em: Date): Promise<{ novo: boolean; ativados: number }> {
  const db = getDb();

  const { novo } = await registrarEvento(
    {
      provedor: "administrativo",
      ambiente: "producao",
      idNoProvedor: `inicio-da-operacao:${em.toISOString()}`,
      tipo: "inicio_da_operacao",
      em,
      parceiroId: null,
      valorCentavos: null,
      moeda: null,
      ofertaCodigo: null,
      ofertaVersao: null,
    },
    "Operação aberta aos moradores; os 90 dias dos Fundadores reservados começam.",
  );

  if (!novo) return { novo: false, ativados: 0 };

  /*
   * `greatest(em, paid_at)`, e não `em` seco.
   *
   * O caso normal é todo mundo ter pago antes da abertura, e aí `em` vence
   * sempre. O caso que esta linha protege é estreito e caro: alguém que pagou
   * **depois** do instante registrado como abertura e ainda estava `reservado`
   * quando esta rotina rodou — o que acontece quando a data é registrada
   * retroativamente, ou quando um pagamento entra entre a abertura e o
   * processamento.
   *
   * Com `em` seco, essa pessoa receberia menos do que os 90 dias que comprou.
   * É a mesma regra de `inicioDoBeta` em `lib/domain/beta.ts` — 90 vendidos,
   * 90 entregues —, aplicada aqui porque é aqui que a data é escrita.
   */
  const inicioEfetivo = sql`greatest(${em}::timestamptz, coalesce(${founderEnrollments.paidAt}, ${em}::timestamptz))`;

  const movidos = await db
    .update(founderEnrollments)
    .set({
      status: "ativo",
      betaStartedAt: inicioEfetivo as unknown as Date,
      // `make_interval` com parâmetro ligado, em vez de `sql.raw` dentro de um
      // literal de intervalo: `DIAS_DO_BETA` é uma constante do módulo e não
      // haveria injeção, mas um `sql.raw` num caminho financeiro é o tipo de
      // padrão que alguém copia para um lugar onde o valor **vem de fora**.
      betaEndsAt: sql`${inicioEfetivo} + make_interval(days => ${DIAS_DO_BETA})` as unknown as Date,
      updatedAt: new Date(),
    })
    .where(
      and(eq(founderEnrollments.status, "reservado"), isNull(founderEnrollments.betaStartedAt)),
    )
    .returning({ partnerId: founderEnrollments.partnerId });

  if (movidos.length > 0) {
    await db
      .update(partners)
      .set({ betaStartedAt: em, status: "ativo", updatedAt: new Date() })
      .where(
        sql`${partners.id} in (${sql.join(
          movidos.map((m) => sql`${m.partnerId}::uuid`),
          sql`, `,
        )})`,
      );
  }

  return { novo: true, ativados: movidos.length };
}

/**
 * Move para `encerrado` as adesões cuja janela já passou.
 *
 * Higiene, e não segurança: `derivarAcesso` já confere a data, então um Beta
 * que passou do fim não concede acesso mesmo que esta rotina nunca rode. O que
 * ela melhora é a leitura — um registro que diz "ativo" três meses depois do
 * fim confunde quem for auditar.
 */
export async function encerrarBetasVencidos(agora = new Date()): Promise<number> {
  const db = getDb();
  const encerradas = await db
    .update(founderEnrollments)
    .set({ status: "encerrado", updatedAt: new Date() })
    .where(
      and(
        eq(founderEnrollments.status, "ativo"),
        isNotNull(founderEnrollments.betaEndsAt),
        lte(founderEnrollments.betaEndsAt, agora),
      ),
    )
    .returning({ id: founderEnrollments.id });
  return encerradas.length;
}

/**
 * Desfaz um pagamento — reembolso ou contestação.
 *
 * **A política de cada um não está definida** e está registrada em
 * `BLOCKERS.md`. O que está definido é o comportamento seguro na ausência
 * dela: a adesão vai para `cancelado`, o acesso cai, e o status histórico de
 * Fundador **não** é apagado — apagar história por causa de um estorno é
 * decisão comercial, e ninguém a tomou.
 */
export async function desfazerPagamento(
  partnerId: string,
  motivo: "reembolso" | "contestacao",
  dados: { provedor: Provedor; ambiente: Ambiente; idNoProvedor: string; em: Date },
): Promise<{ novo: boolean }> {
  const db = getDb();

  const { novo } = await registrarEvento(
    {
      provedor: dados.provedor,
      ambiente: dados.ambiente,
      idNoProvedor: dados.idNoProvedor,
      tipo: motivo === "reembolso" ? "reembolso" : "contestacao",
      em: dados.em,
      parceiroId: partnerId,
      valorCentavos: null,
      moeda: null,
      ofertaCodigo: null,
      ofertaVersao: null,
    },
    motivo === "reembolso"
      ? "Pagamento reembolsado; adesão cancelada e acesso revogado."
      : "Pagamento contestado; adesão cancelada e acesso revogado.",
  );

  if (!novo) return { novo: false };

  await db.transaction(async (tx) => {
    await tx
      .update(founderEnrollments)
      .set({ status: "cancelado", canceledAt: dados.em, updatedAt: new Date() })
      .where(eq(founderEnrollments.partnerId, partnerId));

    await tx
      .update(paymentTransactions)
      .set({
        status: motivo === "reembolso" ? "reembolsado" : "contestado",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(paymentTransactions.partnerId, partnerId),
          eq(paymentTransactions.status, "aprovado"),
        ),
      );
  });

  return { novo: true };
}

/** Quantas adesões pagas existem numa categoria — o limite do §74. */
export async function vagasOcupadas(categoria: string): Promise<number> {
  const db = getDb();
  const linhas = await db
    .select({ status: founderEnrollments.status })
    .from(founderEnrollments)
    .where(eq(founderEnrollments.categoryId, categoria));
  return linhas.filter((l) => jaPagou(l.status)).length;
}
