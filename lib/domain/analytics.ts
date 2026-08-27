import "server-only";

import { and, count, eq, gte, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  categories,
  opportunities,
  partnerApplications,
  partners,
  prospects,
  serviceRequests,
} from "@/lib/db/schema";
import { prospectFunnel } from "./states";

/**
 * Analytics.
 *
 * A régua deste arquivo é uma só: **não fabricar número**. Cada métrica aqui
 * sai de um registro que existe de verdade no banco. Onde o dado ainda não
 * existe — visita no site, mensagem entregue, tempo de resposta do parceiro —
 * não há métrica, e a tela diz isso em vez de mostrar zero como se fosse
 * resultado.
 *
 * Por isso o funil B2C começa em "solicitação criada", e não em "visita": a
 * visita mora na ferramenta de analytics do site, que ainda não foi instalada
 * (ver BLOCKERS.md).
 */

export type Periodo = 7 | 30 | 90 | 0;

function desde(dias: Periodo) {
  if (dias === 0) return new Date(0);
  return new Date(Date.now() - dias * 86_400_000);
}

export async function loadAnalytics(dias: Periodo = 30) {
  const inicio = desde(dias);

  const [
    funilProspects,
    perdas,
    cadastros,
    pagamentos,
    solicitacoes,
    porCategoria,
    porBairro,
    porUrgencia,
    desfechos,
    tempoAteEncaminhar,
    totalParceiros,
  ] = await Promise.all([
    db
      .select({ status: prospects.status, n: count() })
      .from(prospects)
      .where(gte(prospects.createdAt, inicio))
      .groupBy(prospects.status),

    db
      .select({ reason: prospects.lostReason, n: count() })
      .from(prospects)
      .where(and(eq(prospects.status, "nao_avancou"), gte(prospects.createdAt, inicio)))
      .groupBy(prospects.lostReason)
      .orderBy(sql`count(*) desc`),

    db
      .select({ status: partnerApplications.status, n: count() })
      .from(partnerApplications)
      .where(gte(partnerApplications.createdAt, inicio))
      .groupBy(partnerApplications.status),

    db
      .select({
        n: count(),
        fundadores: sql<number>`count(*) filter (where ${partners.founder})::int`,
      })
      .from(partners)
      .where(and(isNotNull(partners.betaPaidAt), gte(partners.createdAt, inicio))),

    db
      .select({ status: serviceRequests.status, n: count() })
      .from(serviceRequests)
      .where(gte(serviceRequests.createdAt, inicio))
      .groupBy(serviceRequests.status),

    db
      .select({
        id: serviceRequests.categoryId,
        nome: categories.name,
        n: count(),
      })
      .from(serviceRequests)
      .leftJoin(categories, eq(categories.id, serviceRequests.categoryId))
      .where(gte(serviceRequests.createdAt, inicio))
      .groupBy(serviceRequests.categoryId, categories.name)
      .orderBy(sql`count(*) desc`),

    db
      .select({ bairro: serviceRequests.neighborhood, n: count() })
      .from(serviceRequests)
      .where(and(gte(serviceRequests.createdAt, inicio), isNotNull(serviceRequests.neighborhood)))
      .groupBy(serviceRequests.neighborhood)
      .orderBy(sql`count(*) desc`)
      .limit(8),

    db
      .select({ urgencia: serviceRequests.urgency, n: count() })
      .from(serviceRequests)
      .where(gte(serviceRequests.createdAt, inicio))
      .groupBy(serviceRequests.urgency),

    db
      .select({ status: opportunities.status, n: count() })
      .from(opportunities)
      .where(gte(opportunities.createdAt, inicio))
      .groupBy(opportunities.status),

    // Da entrada do pedido até o primeiro encaminhamento. É a métrica que mais
    // conta sobre a operação: quanto tempo o morador ficou esperando.
    db
      .select({
        mediana: sql<number | null>`percentile_cont(0.5) within group (
          order by extract(epoch from (${serviceRequests.dispatchedAt} - ${serviceRequests.createdAt}))
        )`,
        n: count(),
      })
      .from(serviceRequests)
      .where(
        and(isNotNull(serviceRequests.dispatchedAt), gte(serviceRequests.createdAt, inicio)),
      ),

    db.select({ n: count() }).from(partners),
  ]);

  const mapa = (linhas: { status: string; n: number }[]) => {
    const out: Record<string, number> = {};
    for (const l of linhas) out[l.status] = l.n;
    return out;
  };

  const prospectsPorEstado = mapa(funilProspects);
  const solicitacoesPorEstado = mapa(solicitacoes);
  const oportunidadesPorEstado = mapa(desfechos);

  const somaProspects = Object.values(prospectsPorEstado).reduce((a, b) => a + b, 0);
  const totalSolicitacoes = Object.values(solicitacoesPorEstado).reduce((a, b) => a + b, 0);
  const totalOportunidades = Object.values(oportunidadesPorEstado).reduce((a, b) => a + b, 0);

  /**
   * O funil comercial acumulado: quantos chegaram *até pelo menos* cada etapa.
   * Contar só quem está parado em cada uma esconderia todo mundo que já passou.
   */
  const etapasComercial = prospectFunnel.map((etapa, indice) => {
    const alcancaram = prospectFunnel
      .slice(indice)
      .reduce((soma, e) => soma + (prospectsPorEstado[e] ?? 0), 0);
    return { etapa, n: alcancaram };
  });

  const segundos = tempoAteEncaminhar[0]?.mediana;

  return {
    dias,
    comercial: {
      etapas: etapasComercial,
      total: somaProspects,
      perdidos: prospectsPorEstado.nao_avancou ?? 0,
      perdas: perdas.filter((p) => p.n > 0),
      cadastros: mapa(cadastros),
      pagos: pagamentos[0]?.n ?? 0,
      fundadores: pagamentos[0]?.fundadores ?? 0,
    },
    demanda: {
      total: totalSolicitacoes,
      porEstado: solicitacoesPorEstado,
      porCategoria: porCategoria.map((c) => ({
        nome: c.nome ?? "Sem categoria",
        n: c.n,
      })),
      porBairro: porBairro.map((b) => ({ nome: b.bairro ?? "—", n: b.n })),
      porUrgencia: porUrgencia.map((u) => ({ id: u.urgencia, n: u.n })),
      medianaAteEncaminhar: segundos == null ? null : Number(segundos),
      encaminhadas: tempoAteEncaminhar[0]?.n ?? 0,
    },
    distribuicao: {
      total: totalOportunidades,
      porEstado: oportunidadesPorEstado,
      contratados: oportunidadesPorEstado.contratado ?? 0,
    },
    rede: { parceiros: totalParceiros[0]?.n ?? 0 },
  };
}

export { duracaoLegivel } from "@/lib/format";
