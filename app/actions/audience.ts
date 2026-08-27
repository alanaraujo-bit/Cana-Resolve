"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { endAudienceSession, getPartnerViewer, getResidentViewer, startPartnerSession, startResidentSession } from "@/lib/auth/audience";
import { residentRequests, residentResolution, setPartnerAvailability, setPartnerOpportunityStatus } from "@/lib/domain/audience";
import { opportunityStates, type OpportunityStatus } from "@/lib/domain/states";

export type AccessState = { error?: string } | undefined;

export async function residentAccess(_state: AccessState, formData: FormData): Promise<AccessState> {
  const result = await startResidentSession(String(formData.get("codigo") ?? ""), String(formData.get("telefone") ?? ""));
  if (!result.ok) return { error: result.error === "indisponivel" ? "Não foi possível acessar agora. Tente novamente em alguns minutos." : "Confira o código e o WhatsApp usados na solicitação." };
  redirect("/minhas-solicitacoes");
}

export async function partnerAccess(_state: AccessState, formData: FormData): Promise<AccessState> {
  const result = await startPartnerSession(String(formData.get("codigo") ?? ""), String(formData.get("telefone") ?? ""));
  if (!result.ok) return { error: result.error === "indisponivel" ? "Não foi possível acessar agora. Tente novamente em alguns minutos." : "Confira o código de parceiro e o WhatsApp cadastrado." };
  redirect("/parceiro");
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
  revalidatePath("/minhas-solicitacoes");
  revalidatePath(`/minhas-solicitacoes/${requestId}`);
}
