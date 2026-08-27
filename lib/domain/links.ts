import type { SubjectType } from "@/lib/db/schema";

/**
 * Para onde cada tipo de registro leva.
 *
 * A linha do tempo e a atividade recente guardam apenas `subjectType` +
 * `subjectId` — sem isto, cada tela que mostra histórico precisaria repetir a
 * mesma cadeia de `if`. O cadastro é o caso especial: ele não tem tela própria,
 * ele vive dentro da fila de qualificação.
 */
export function subjectHref(type: SubjectType, id: string) {
  switch (type) {
    case "prospect":
      return `/ops/comercial/${id}`;
    case "partner":
      return `/ops/parceiros/${id}`;
    case "application":
      return `/ops/cadastros?cadastro=${id}`;
    case "request":
      return `/ops/solicitacoes/${id}`;
    case "opportunity":
      return `/ops/oportunidades?oportunidade=${id}`;
  }
}

const labels: Record<SubjectType, string> = {
  prospect: "Prospect",
  partner: "Parceiro",
  application: "Cadastro",
  request: "Solicitação",
  opportunity: "Encaminhamento",
};

export function subjectLabel(type: SubjectType) {
  return labels[type];
}
