import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";

/**
 * O início oficial da operação para moradores — uma data, uma fonte, uma porta.
 *
 * É o §143 e o §144 juntos. A data mora em `settings`, e não numa constante do
 * código nem numa coluna por parceiro, por três razões que se somam:
 *
 * 1. **Uma constante exigiria publicar aplicativo e servidor** no dia da
 *    abertura, que é o pior dia possível para depender de um deploy.
 * 2. **Uma coluna por parceiro** faria cada um calcular a partir de um evento
 *    diferente, e o Beta de noventa pessoas não teria uma resposta única.
 * 3. **Uma linha em `settings`** é auditável: dá para ver quando foi escrita e
 *    quem a escreveu, e o evento correspondente fica no livro comercial.
 *
 * `null` é a resposta de hoje, e é uma resposta legítima — não um erro a
 * mascarar com um valor padrão.
 */

/** A chave, num lugar só. */
export const CHAVE_DA_OPERACAO = "operacao.inicio";

type Guardado = { em: string; registradoEm?: string; observacao?: string | null };

/**
 * Quando a operação foi (ou será) aberta aos moradores.
 *
 * **Nunca devolve `new Date()` por omissão.** Um padrão aqui seria uma data de
 * lançamento inventada, e todo o resto do sistema — janela do Beta, dias
 * restantes, entitlement — passaria a mentir a partir dela.
 */
export async function inicioDaOperacao(): Promise<Date | null> {
  const db = getDb();
  const [linha] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, CHAVE_DA_OPERACAO))
    .limit(1);

  const guardado = linha?.value as Guardado | undefined;
  if (!guardado || typeof guardado.em !== "string") return null;

  const data = new Date(guardado.em);
  // Uma linha ilegível é o mesmo que linha ausente: melhor "ainda não começou"
  // do que uma data inválida propagando `NaN` por toda a aritmética do Beta.
  return Number.isNaN(data.getTime()) ? null : data;
}

/**
 * Grava a data oficial. Chamada pela administração, nunca pelo aplicativo.
 *
 * Não é idempotente por acidente: reescrever a data depois de o Beta ter
 * começado mudaria o fim de todo mundo retroativamente. Quem precisa disso
 * passa `forcar: true` e assume o efeito — e o evento correspondente fica no
 * livro, como qualquer outro fato comercial.
 */
export async function definirInicioDaOperacao(
  em: Date,
  opcoes: { forcar?: boolean; observacao?: string | null } = {},
): Promise<{ gravada: boolean; jaHavia: Date | null }> {
  const db = getDb();
  const atual = await inicioDaOperacao();
  if (atual && !opcoes.forcar) return { gravada: false, jaHavia: atual };

  const valor: Guardado = {
    em: em.toISOString(),
    registradoEm: new Date().toISOString(),
    observacao: opcoes.observacao ?? null,
  };

  await db
    .insert(settings)
    .values({ key: CHAVE_DA_OPERACAO, value: valor })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: valor, updatedAt: new Date() },
    });

  return { gravada: true, jaHavia: atual };
}

/** A operação já está aberta neste instante? */
export async function operacaoAberta(agora = new Date()): Promise<boolean> {
  const em = await inicioDaOperacao();
  return em !== null && em.getTime() <= agora.getTime();
}
