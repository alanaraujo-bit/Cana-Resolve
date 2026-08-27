import { sql } from "drizzle-orm";

import type { Db } from "@/lib/db/client";

/**
 * Os códigos que aparecem numa conversa: CR-00021, PR-0042, PA-0007.
 *
 * Vêm de sequências do Postgres porque `nextval` é atômico — dois pedidos que
 * chegam no mesmo milissegundo nunca recebem o mesmo número, o que um
 * `count(*) + 1` não garante. Buracos na numeração são aceitáveis: o código
 * serve para as pessoas se entenderem, não para contar registros.
 */

type Kind = "request" | "prospect" | "partner";

const sequences: Record<Kind, { name: string; prefix: string; width: number }> = {
  request: { name: "service_request_code_seq", prefix: "CR", width: 5 },
  prospect: { name: "prospect_code_seq", prefix: "PR", width: 4 },
  partner: { name: "partner_code_seq", prefix: "PA", width: 4 },
};

export async function nextCode(db: Db, kind: Kind) {
  const { name, prefix, width } = sequences[kind];
  const result = await db.execute<{ value: string }>(
    sql`select nextval(${name})::text as value`,
  );
  const value = Number(result.rows[0].value);
  return `${prefix}-${String(value).padStart(width, "0")}`;
}
