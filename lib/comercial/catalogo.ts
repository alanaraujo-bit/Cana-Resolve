import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { commercialOffers } from "@/lib/db/schema";
import { ofertaValida, type Oferta } from "@/lib/domain/comercial/catalogo";

/**
 * A leitura do catálogo comercial.
 *
 * Uma decisão atravessa este arquivo inteiro: **uma linha malformada não
 * derruba o catálogo**. `ofertaValida` devolve `null` em vez de lançar, e a
 * oferta ruim simplesmente não aparece.
 *
 * O motivo é comercial, não defensivo: o catálogo é configurável remotamente,
 * o que significa que alguém vai editá-lo às pressas um dia. Se uma vírgula
 * errada num benefício derrubasse a tela de plano do aplicativo inteiro, a
 * configurabilidade teria custado mais do que deu. Uma oferta que não valida
 * some — e some com registro no log do servidor, não em silêncio.
 */

function converter(linha: typeof commercialOffers.$inferSelect): Oferta | null {
  const oferta = ofertaValida({
    codigo: linha.code,
    versao: linha.version,
    nome: linha.name,
    resumo: linha.summary,
    descricao: linha.description,
    precoCentavos: linha.priceCents,
    moeda: linha.currency,
    periodoDias: linha.periodDays,
    recorrencia: linha.recurrence,
    plataformas: linha.platforms,
    mercado: linha.market,
    beneficios: linha.benefits,
    estado: linha.status,
    exigeAprovacao: linha.requiresApproval,
    observacao: linha.notes,
  });

  if (!oferta) {
    console.warn(
      `[comercial] oferta ignorada por não validar: ${linha.code} v${linha.version}`,
    );
  }
  return oferta;
}

/** Todas as ofertas ativas, da versão mais nova para a mais antiga. */
export async function ofertasAtivas(): Promise<Oferta[]> {
  const db = getDb();
  const linhas = await db
    .select()
    .from(commercialOffers)
    .where(eq(commercialOffers.status, "ativa"))
    .orderBy(desc(commercialOffers.version));

  return linhas.map(converter).filter((o): o is Oferta => o !== null);
}

/**
 * Uma oferta pelo par que a identifica historicamente (§15).
 *
 * Encontra inclusive a encerrada: quem comprou a versão 1 continua tendo
 * direito de ler o que a versão 1 dizia, mesmo depois de a versão 2 existir.
 */
export async function ofertaPorVersao(codigo: string, versao: number): Promise<Oferta | null> {
  const db = getDb();
  const [linha] = await db
    .select()
    .from(commercialOffers)
    .where(and(eq(commercialOffers.code, codigo), eq(commercialOffers.version, versao)))
    .limit(1);

  return linha ? converter(linha) : null;
}

/** A versão ativa mais recente de um código. `null` quando não há nenhuma. */
export async function ofertaAtiva(codigo: string): Promise<Oferta | null> {
  const db = getDb();
  const [linha] = await db
    .select()
    .from(commercialOffers)
    .where(and(eq(commercialOffers.code, codigo), eq(commercialOffers.status, "ativa")))
    .orderBy(desc(commercialOffers.version))
    .limit(1);

  return linha ? converter(linha) : null;
}
