/**
 * URL pública do site, na ordem em que vale confiar:
 * uma variável explícita e, por último, o endereço comercial definitivo.
 * O domínio temporário da Vercel nunca deve aparecer em canonicals ou previews.
 */
function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/[/]$/, "");

  return "https://canaaresolve.aionixdev.com";
}

export const site = {
  name: "Canaã Resolve",
  shortName: "Canaã Resolve",
  city: "Canaã dos Carajás",
  state: "PA",
  url: resolveSiteUrl(),
  description:
    "O Canaã Resolve aproxima quem precisa resolver algo em Canaã dos Carajás de profissionais e empresas que atendem a região. Descreva o que você precisa para a equipe fazer o encaminhamento inicial.",
  company: "Aionix",
  companyUrl: "https://aionixdev.com",
  email: "contato@canaaresolve.aionixdev.com",
  /** Número no formato internacional, apenas dígitos (wa.me). */
  whatsapp: "5594991205078",
  whatsappDisplay: "(94) 99120-5078",
} as const;

export const nav = [
  { label: "Serviços", href: "/#servicos" },
  { label: "Como funciona", href: "/#como-funciona" },
  { label: "Seja parceiro", href: "/parceiros" },
] as const;
