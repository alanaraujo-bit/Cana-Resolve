/**
 * A navegação do Operations.
 *
 * A ordem não é alfabética nem estética: é a ordem em que o trabalho acontece.
 * Primeiro o que está acontecendo agora, depois o funil que traz parceiros,
 * depois a rede pronta, depois a demanda que chega e o que foi feito com ela.
 * Catálogo, analytics e configuração ficam por último porque se mexe neles de
 * vez em quando, não todo dia.
 */
export type NavItem = {
  href: string;
  label: string;
  /** Rótulo curto da barra do celular, onde só cabem uma ou duas palavras. */
  short: string;
  icon: "pulse" | "funnel" | "inbox" | "network" | "request" | "handoff" | "catalog" | "chart" | "gear";
  hint: string;
  /** Aparece na barra inferior do celular. */
  primary?: boolean;
};

export const opsNav: NavItem[] = [
  {
    href: "/ops",
    label: "Visão geral",
    short: "Visão",
    icon: "pulse",
    hint: "O que está acontecendo agora",
    primary: true,
  },
  {
    href: "/ops/solicitacoes",
    label: "Solicitações",
    short: "Pedidos",
    icon: "request",
    hint: "O que os moradores estão pedindo",
    primary: true,
  },
  {
    href: "/ops/comercial",
    label: "Comercial",
    short: "Funil",
    icon: "funnel",
    hint: "Empresas a caminho de virar parceiras",
    primary: true,
  },
  {
    href: "/ops/parceiros",
    label: "Parceiros",
    short: "Rede",
    icon: "network",
    hint: "A rede que atende Canaã",
    primary: true,
  },
  {
    href: "/ops/cadastros",
    label: "Cadastros",
    short: "Cadastros",
    icon: "inbox",
    hint: "O que chegou pelo formulário e espera análise",
  },
  {
    href: "/ops/oportunidades",
    label: "Oportunidades",
    short: "Encaminhamentos",
    icon: "handoff",
    hint: "Cada pedido encaminhado e o que deu nele",
  },
  {
    href: "/ops/catalogo",
    label: "Catálogo",
    short: "Catálogo",
    icon: "catalog",
    hint: "Categorias e serviços",
  },
  {
    href: "/ops/analytics",
    label: "Analytics",
    short: "Números",
    icon: "chart",
    hint: "Aquisição, conversão e demanda",
  },
  {
    href: "/ops/config",
    label: "Configurações",
    short: "Ajustes",
    icon: "gear",
    hint: "Lançamento, acessos e preferências",
  },
];

/** O item ativo é o mais específico que casa com o caminho atual. */
export function activeNav(pathname: string) {
  return opsNav
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
