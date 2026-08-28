import "server-only";

import { activities, type SubjectType } from "@/lib/db/schema";
import type { Db } from "@/lib/db/client";

/**
 * A memória do que entrou.
 *
 * Já foi a memória da operação inteira — transições conferidas contra a
 * máquina de estados, linha do tempo, interações registradas por operador,
 * notificações nascidas de cada mudança. Tudo isso era o Operations, e saiu
 * daqui com ele.
 *
 * O que fica é a metade que a captura de leads ainda usa: gravar que alguma
 * coisa aconteceu. Um pedido do site nasce com uma atividade dizendo que
 * nasceu, na mesma transação que o cria — se a atividade não puder ser
 * gravada, o pedido também não é. Continua valendo a regra antiga: a história
 * nunca fica devendo um capítulo.
 *
 * `recordActivity` recebe a transação (`tx`) em vez de abrir a sua. É o que
 * torna a garantia acima possível, e é por isso que o parâmetro não tem valor
 * padrão.
 */

export type Actor = { id: string } | null;

export type ActivityInput = {
  subjectType: SubjectType;
  subjectId: string;
  type: string;
  summary: string;
  fromState?: string | null;
  toState?: string | null;
  meta?: Record<string, unknown>;
  actor?: Actor;
};

export async function recordActivity(tx: Db, input: ActivityInput) {
  await tx.insert(activities).values({
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    type: input.type,
    summary: input.summary,
    fromState: input.fromState ?? null,
    toState: input.toState ?? null,
    meta: input.meta ?? {},
    operatorId: input.actor?.id ?? null,
  });
}
