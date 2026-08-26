/**
 * URL pública do site, na ordem em que vale confiar:
 * uma variável explícita, o domínio de produção que a Vercel resolve
 * (que passa a ser o domínio próprio assim que ele é apontado) e, por
 * último, o endereço definitivo — usado no build local.
 */
function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/[/]$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "https://canaaresolve.aionixdev.com";
}

export const site = {
  name: "Canaã Resolve",
  shortName: "Canaã Resolve",
  city: "Canaã dos Carajás",
  state: "PA",
  url: resolveSiteUrl(),
  description:
    "O Canaã Resolve conecta quem precisa resolver alguma coisa em Canaã dos Carajás a profissionais e empresas locais. Descreva o que você precisa e receba contato de quem pode resolver.",
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
  { label: "Para profissionais", href: "/#profissionais" },
] as const;
