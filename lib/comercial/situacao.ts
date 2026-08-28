import "server-only";

import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { paymentTransactions, subscriptions } from "@/lib/db/schema";
import { CODIGO_DO_BETA } from "@/lib/domain/comercial/catalogo";
import {
  montarSituacao,
  type Cobranca,
  type SituacaoComercial,
} from "@/lib/domain/comercial/situacao";
import { adesaoDoParceiro } from "./adesao";
import { ofertaAtiva, ofertaPorVersao } from "./catalogo";
import { inicioDaOperacao } from "./operacao";

/**
 * A montagem da situação comercial de um parceiro — o que a rota devolve.
 *
 * Este arquivo é fino de propósito. Ele **lê** o banco e chama `montarSituacao`,
 * que é pura e mora no domínio. Nenhuma regra vive aqui: não há um `if` que
 * decida acesso, não há aritmética de datas, não há "se for fundador então".
 *
 * A separação é o que torna a fase testável de verdade. As dezenas de asserções
 * de `tests/comercial.test.ts` exercitam a regra sem banco nenhum; o que sobra
 * para testar contra Postgres é o que só o Postgres faz — índice único,
 * transação, idempotência.
 */

export async function situacaoDoParceiro(
  partnerId: string,
  agora = new Date(),
): Promise<SituacaoComercial> {
  const db = getDb();

  const [adesao, abertura] = await Promise.all([
    adesaoDoParceiro(partnerId),
    inicioDaOperacao(),
  ]);

  const [assinatura] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.partnerId, partnerId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  // A oferta contratada é lida pelo par (código, versão) — a condição como ela
  // era quando foi comprada, e não a que está em vigor hoje (§15).
  const contratada =
    adesao?.offerCode && adesao.offerVersion
      ? await ofertaPorVersao(adesao.offerCode, adesao.offerVersion)
      : null;

  // A disponível só é buscada para quem pode contratar. Buscá-la sempre não
  // seria errado, mas manda ao servidor uma pergunta cuja resposta a situação
  // vai descartar.
  const disponivel =
    adesao?.status === "aprovado" ? await ofertaAtiva(CODIGO_DO_BETA) : null;

  return montarSituacao({
    agora,
    inicioDaOperacao: abertura,
    adesao: adesao
      ? {
          estado: adesao.status,
          pagoEm: adesao.paidAt,
          betaInicio: adesao.betaStartedAt,
          ofertaCodigo: adesao.offerCode,
          ofertaVersao: adesao.offerVersion,
          categoria: adesao.categoryId,
        }
      : null,
    assinatura: assinatura
      ? {
          estado: assinatura.status,
          ofertaCodigo: assinatura.offerCode,
          ofertaVersao: assinatura.offerVersion,
          periodoFim: assinatura.periodEnd,
          renova: assinatura.renews,
          provedor: assinatura.provider,
        }
      : null,
    ofertaContratada: contratada,
    ofertaDisponivel: disponivel,
  });
}

const ORIGEM_LEGIVEL: Record<string, string> = {
  administrativo: "Pagamento direto",
  apple: "App Store",
  google: "Google Play",
  alternativo: "Pagamento pelo site",
};

/**
 * O histórico de cobrança que o profissional vê (§63).
 *
 * Data, descrição, valor, estado e comprovante quando houver. Nada de nome de
 * gateway, nada de código de transação, nada de status técnico — a linguagem é
 * a mesma do resto do aplicativo.
 *
 * **Este histórico nunca é bloqueado por falta de plano** (§104): é dinheiro
 * que a pessoa pagou, e ele pertence a ela.
 */
export async function cobrancasDoParceiro(partnerId: string): Promise<Cobranca[]> {
  const db = getDb();
  const linhas = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.partnerId, partnerId))
    .orderBy(desc(paymentTransactions.createdAt))
    .limit(50);

  return linhas.map((l) => ({
    id: l.id,
    em: (l.settledAt ?? l.createdAt).toISOString(),
    descricao: l.description,
    valorCentavos: l.amountCents,
    moeda: l.currency,
    estado: l.status,
    origem: ORIGEM_LEGIVEL[l.provider] ?? "Pagamento",
    comprovante: l.receiptUrl,
  }));
}
