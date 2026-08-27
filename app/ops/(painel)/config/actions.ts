"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { falha, type ActionResult } from "@/lib/action-result";
import { operatorOrNull } from "@/lib/auth/guard";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { destroyAllSessions } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { operators } from "@/lib/db/schema";
import { registerLaunch } from "@/lib/domain/partners";
import { launchedAt } from "@/lib/domain/settings";
import { eq } from "drizzle-orm";

const SEM_SESSAO: ActionResult = {
  ok: false,
  erro: "Sua sessão expirou. Entre de novo para continuar.",
};

/**
 * O lançamento da operação.
 *
 * É a ação mais consequente do sistema: ela dispara, de uma vez, o relógio de
 * 90 dias de todos os Fundadores prontos. Por isso pede confirmação escrita —
 * não é um botão que se aperta sem querer — e não tem desfazer, porque uma
 * data de lançamento que pode ser desfeita não é uma data de lançamento.
 */
export async function registrarLancamento(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;
  if (actor.role !== "owner") {
    return { ok: false, erro: "Só o responsável pela operação pode registrar o lançamento." };
  }

  const confirmacao = String(formData.get("confirmacao") ?? "").trim().toUpperCase();
  if (confirmacao !== "LANCAR") {
    return { ok: false, erro: 'Escreva LANCAR para confirmar.' };
  }

  const jaLancou = await launchedAt();
  if (jaLancou) {
    return { ok: false, erro: "A operação já foi lançada. Isso acontece uma vez só." };
  }

  const dataBruta = String(formData.get("data") ?? "").trim();
  const quando = dataBruta ? new Date(`${dataBruta}T12:00:00`) : new Date();
  if (Number.isNaN(quando.getTime())) {
    return { ok: false, erro: "A data não parece válida." };
  }

  try {
    const { iniciados, ativados } = await registerLaunch({ at: quando, actor });
    revalidatePath("/ops", "layout");
    return {
      ok: true,
      mensagem:
        `Operação aberta. ${ativados} ${ativados === 1 ? "parceiro entrou" : "parceiros entraram"} ` +
        `na distribuição e ${iniciados} ${iniciados === 1 ? "teve" : "tiveram"} os 90 dias iniciados.`,
    };
  } catch (error) {
    return falha(error, "Não deu para registrar o lançamento.");
  }
}

export async function trocarSenha(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const schema = z.object({
    atual: z.string().min(1, "Informe a senha atual."),
    nova: z.string().min(10, "A senha nova precisa de pelo menos 10 caracteres."),
    confirma: z.string(),
  });

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Confira os campos." };
  }
  if (parsed.data.nova !== parsed.data.confirma) {
    return { ok: false, erro: "As duas senhas novas não são iguais." };
  }

  try {
    const [operador] = await db
      .select({ passwordHash: operators.passwordHash })
      .from(operators)
      .where(eq(operators.id, actor.id))
      .limit(1);

    if (!operador || !(await verifyPassword(parsed.data.atual, operador.passwordHash))) {
      return { ok: false, erro: "A senha atual não confere." };
    }

    await db
      .update(operators)
      .set({ passwordHash: await hashPassword(parsed.data.nova), updatedAt: new Date() })
      .where(eq(operators.id, actor.id));

    return {
      ok: true,
      mensagem: "Senha trocada. As outras sessões continuam abertas — use o botão abaixo para encerrá-las.",
    };
  } catch (error) {
    return falha(error, "Não deu para trocar a senha.");
  }
}

export async function encerrarSessoes(): Promise<void> {
  const actor = await operatorOrNull();
  if (!actor) return;
  await destroyAllSessions(actor.id);
}
