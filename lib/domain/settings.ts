import "server-only";

import { eq } from "drizzle-orm";

import { db, type Db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";

/**
 * Configuração da operação.
 *
 * Uma tabela chave/valor em vez de colunas: o que existe aqui é um punhado de
 * decisões da empresa, não um modelo de dados. A mais importante é a data do
 * lançamento — é ela que dispara o relógio de 90 dias dos Fundadores.
 */

export const SETTING_LAUNCHED_AT = "operacao.lancada_em";

export async function readSetting<T>(key: string): Promise<T | null> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return (row?.value as T) ?? null;
}

export async function writeSetting(key: string, value: unknown, tx?: Db) {
  const target = tx ?? db;
  await target
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    });
}

/** Quando a operação abriu para os moradores, ou `null` se ainda não abriu. */
export async function launchedAt(): Promise<Date | null> {
  const raw = await readSetting<string>(SETTING_LAUNCHED_AT);
  return raw ? new Date(raw) : null;
}
