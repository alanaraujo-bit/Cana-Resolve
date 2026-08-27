import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { categories, services } from "@/lib/db/schema";

/**
 * O catálogo, do banco.
 *
 * `lib/categories.ts` continua existindo e continua sendo a fonte do site
 * público — ele precisa renderizar rápido, sem consulta, e as sete categorias
 * iniciais são estáveis. Aqui é a versão administrável: é o que a operação
 * edita, e é onde os serviços vivem.
 */

export type CategoriaComServicos = {
  id: string;
  name: string;
  short: string;
  blurb: string;
  active: boolean;
  position: number;
  parceiros: number;
  servicos: {
    id: string;
    slug: string;
    name: string;
    active: boolean;
    position: number;
  }[];
};

export async function listCatalog({
  somenteAtivas = false,
}: { somenteAtivas?: boolean } = {}): Promise<CategoriaComServicos[]> {
  const [cats, servs] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        short: categories.short,
        blurb: categories.blurb,
        active: categories.active,
        position: categories.position,
        parceiros: sql<number>`(
          select count(*)::int from partner_categories pc
          where pc.category_id = categories.id
        )`,
      })
      .from(categories)
      .orderBy(asc(categories.position), asc(categories.name)),
    db
      .select({
        id: services.id,
        categoryId: services.categoryId,
        slug: services.slug,
        name: services.name,
        active: services.active,
        position: services.position,
      })
      .from(services)
      .orderBy(asc(services.position), asc(services.name)),
  ]);

  return cats
    .filter((c) => !somenteAtivas || c.active)
    .map((c) => ({
      ...c,
      servicos: servs
        .filter((s) => s.categoryId === c.id && (!somenteAtivas || s.active))
        .map((s) => ({
          id: s.id,
          slug: s.slug,
          name: s.name,
          active: s.active,
          position: s.position,
        })),
    }));
}

export async function servicesOf(categoryId: string) {
  return db
    .select({ id: services.id, name: services.name })
    .from(services)
    .where(eq(services.categoryId, categoryId))
    .orderBy(asc(services.position));
}
