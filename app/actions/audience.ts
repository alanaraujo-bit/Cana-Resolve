"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { endAudienceSession, getPartnerViewer, getResidentViewer, startPartnerSession } from "@/lib/auth/audience";
import { residentRequests, residentResolution, setPartnerAvailability, setPartnerOpportunityStatus } from "@/lib/domain/audience";
import { opportunityStates, type OpportunityStatus } from "@/lib/domain/states";

export type AccessState = { error?: string } | undefined;

/**
 * Não existe `residentAccess`. O morador não tem formulário de código+telefone
 * para entrar — o acesso chega pelo link assinado que `/acesso` recebe. Ver
 * `lib/auth/audience.ts` e HANDOFF.md §3.1/§4.2.
 */
export async function partnerAccess(_state: AccessState, formData: FormData): Promise<AccessState> {
  const result = await startPartnerSession(String(formData.get("codigo") ?? ""), String(formData.get("telefone") ?? ""));
  if (result.ok) {
    const proximo = String(formData.get("proximo") ?? "");
    // Só caminhos internos: um "proximo" vindo de fora não pode virar redirect.
    redirect(/^\/parceiro(\/|$)/.test(proximo) ? proximo : "/parceiro");
  }
  if (result.error === "muitas_tentativas") {
    const minutos = Math.max(1, Math.ceil(result.retryAfter / 60));
    return { error: `Muitas tentativas. Tente de novo em ${minutos} min.` };
  }
  return {
    error:
      result.error === "indisponivel"
        ? "Não foi possível acessar agora. Tente novamente em alguns minutos."
        : "Confira o código de parceiro e o WhatsApp cadastrado.",
  };
}

export async function leaveResident() { await endAudienceSession("resident"); redirect("/acompanhar"); }
export async function leavePartner() { await endAudienceSession("partner"); redirect("/parceiro/entrar"); }

export async function updateOpportunity(formData: FormData) {
  const viewer = await getPartnerViewer();
  if (!viewer) redirect("/parceiro/entrar");
  const id = String(formData.get("id") ?? "");
  const target = String(formData.get("status") ?? "");
  const reason = String(formData.get("motivo") ?? "");
  if (!id || !opportunityStates.is(target)) throw new Error("Atualização inválida.");
  await setPartnerOpportunityStatus({ partnerId: viewer.id, opportunityId: id, to: target as OpportunityStatus, reason });
  revalidatePath("/parceiro");
  revalidatePath(`/parceiro/oportunidades/${id}`);
}

export async function updateAvailability(formData: FormData) {
  const viewer = await getPartnerViewer();
  if (!viewer) redirect("/parceiro/entrar");
  await setPartnerAvailability(viewer.id, String(formData.get("available")) === "true");
  revalidatePath("/parceiro");
  revalidatePath("/parceiro/perfil");
}

export async function updateResidentResolution(formData: FormData) {
  const viewer = await getResidentViewer();
  if (!viewer) redirect("/acompanhar");
  const requestId = String(formData.get("id") ?? "");
  const answer = String(formData.get("answer") ?? "");
  if (!requestId || !["sim", "ainda_nao", "nao_precisei", "outro"].includes(answer)) throw new Error("Resposta inválida.");
  const requests = await residentRequests(viewer.whatsapp);
  if (!requests.some((request) => request.id === requestId)) throw new Error("Solicitação não encontrada.");
  await residentResolution({ whatsapp: viewer.whatsapp, requestId, answer: answer as "sim" | "ainda_nao" | "nao_precisei" | "outro" });
  revalidatePath("/acompanhar");
  revalidatePath(`/acompanhar/${requestId}`);
}
