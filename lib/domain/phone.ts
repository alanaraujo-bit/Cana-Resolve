/**
 * WhatsApp normalizado.
 *
 * O número é a chave natural de deduplicação do sistema inteiro: é como se
 * descobre que o cadastro que acabou de chegar é daquela empresa que já estava
 * no funil há duas semanas. Para isso funcionar, "(94) 99120-5078",
 * "94991205078" e "+55 94 99120-5078" precisam virar exatamente a mesma coisa.
 */

const DDI_BR = "55";

/**
 * Devolve só os dígitos, com DDI do Brasil, ou `null` quando o que veio não
 * pode ser um número brasileiro.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  const digits = (input ?? "").replace(/\D/g, "");
  if (!digits) return null;

  // 10 ou 11 dígitos: DDD + número, sem DDI.
  if (digits.length === 10 || digits.length === 11) return DDI_BR + digits;

  // 12 ou 13 dígitos começando em 55: já veio com DDI.
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith(DDI_BR)) {
    return digits;
  }

  return null;
}

/** Formata para leitura: (94) 99120-5078. Números fora do padrão saem crus. */
export function formatPhone(value: string | null | undefined) {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith(DDI_BR) ? digits.slice(2) : digits;

  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return value;
}

/** Link direto de conversa, opcionalmente com a mensagem já escrita. */
export function waLinkTo(phone: string, message?: string) {
  const base = `https://wa.me/${phone.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
