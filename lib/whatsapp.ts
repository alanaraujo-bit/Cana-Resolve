import { site } from "./site";

/** Monta um link wa.me com a mensagem já escrita. */
export function waLink(message: string) {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const partnerMessage =
  "Olá! Vi a página do Canaã Resolve e quero entrar no Beta como Parceiro Fundador. " +
  "Meu nome é: \nMinha área de atuação é: ";

export const contactMessage =
  "Olá! Cheguei pelo site do Canaã Resolve e gostaria de falar com vocês.";

export const partnerDoubtMessage =
  "Olá! Estou vendo a página de parceiros do Canaã Resolve e ficou uma dúvida: ";

export type PartnerLead = {
  nome: string;
  empresa: string;
  telefone: string;
  categoria: string;
  atendeCanaa: boolean;
  comoConheceu: string;
};

/** Mensagem do interesse de parceria, já formatada para a equipe comercial. */
export function partnerLeadMessage(lead: PartnerLead) {
  return [
    "Olá! Quero fazer parte da rede de parceiros do Canaã Resolve.",
    "",
    `*Nome:* ${lead.nome.trim() || "—"}`,
    `*Empresa / nome profissional:* ${lead.empresa.trim() || "—"}`,
    `*WhatsApp:* ${lead.telefone || "—"}`,
    `*Categoria principal:* ${lead.categoria || "—"}`,
    `*Atende Canaã dos Carajás:* ${lead.atendeCanaa ? "Sim" : "Ainda não"}`,
    lead.comoConheceu ? `*Como conheci:* ${lead.comoConheceu}` : null,
    "",
    "Quero entender os próximos passos do Beta Parceiro Fundador (R$79 pelos primeiros 90 dias).",
  ]
    .filter((line) => line !== null)
    .join("\n");
}
