/**
 * Os tipos de interação que uma pessoa registra à mão.
 *
 * Vivem separados de `activity.ts` porque aquele módulo é `server-only` — e
 * esta lista precisa chegar ao navegador para montar o seletor do formulário.
 */
export const interactionKinds = [
  { id: "nota", label: "Observação" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "ligacao", label: "Ligação" },
  { id: "reuniao", label: "Reunião" },
  { id: "email", label: "E-mail" },
  { id: "presencial", label: "Visita" },
] as const;

export type InteractionKind = (typeof interactionKinds)[number]["id"];

export function interactionLabel(kind: string) {
  return interactionKinds.find((k) => k.id === kind)?.label ?? "Registro";
}

export function isInteractionKind(value: unknown): value is InteractionKind {
  return interactionKinds.some((k) => k.id === value);
}
