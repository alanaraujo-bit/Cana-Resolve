export type Category = {
  id: string;
  name: string;
  /** Rótulo curto, para chips e telas estreitas. */
  short: string;
  /** O que costuma chegar nesta categoria, em linguagem de morador. */
  blurb: string;
};

export const categories: Category[] = [
  {
    id: "ar-condicionado",
    name: "Ar-condicionado e refrigeração",
    short: "Ar-condicionado",
    blurb: "Instalação, limpeza, recarga de gás, geladeira e freezer.",
  },
  {
    id: "eletricista",
    name: "Eletricista",
    short: "Eletricista",
    blurb: "Instalações, quadro de energia, tomadas, chuveiro e curto-circuito.",
  },
  {
    id: "guincho",
    name: "Guincho e auto socorro",
    short: "Guincho",
    blurb: "Reboque, pane seca, bateria e chaveiro automotivo.",
  },
  {
    id: "mecanica",
    name: "Mecânica",
    short: "Mecânica",
    blurb: "Revisão, suspensão, freio, injeção eletrônica e elétrica automotiva.",
  },
  {
    id: "construcao",
name: "Construção e reformas",
    short: "Construção",
    blurb: "Pedreiro, pintura, hidráulica, telhado, gesso e acabamento.",
  },
  {
    id: "seguranca",
    name: "Segurança eletrônica",
    short: "Segurança",
    blurb: "Câmeras, alarmes, cerca elétrica, portão e controle de acesso.",
  },
  {
    id: "informatica",
    name: "Informática",
    short: "Informática",
    blurb: "Computador, notebook, redes, internet e suporte para empresas.",
  },
];

export const OTHER_CATEGORY = "outro";

export const categoryOptions = [
  ...categories.map((c) => ({ id: c.id, name: c.name, short: c.short })),
  { id: OTHER_CATEGORY, name: "Outro serviço", short: "Outro" },
];

export function categoryName(id: string | null | undefined) {
  if (!id) return "";
  return categoryOptions.find((c) => c.id === id)?.name ?? "";
}

/** Frases reais de pedido, usadas como exemplo no campo do hero. */
export const problemExamples = [
  "Meu ar-condicionado não está gelando.",
  "Preciso de um eletricista para instalar um chuveiro.",
  "Meu carro quebrou na BR e preciso de guincho.",
  "Quero orçamento para reformar o banheiro.",
  "Preciso instalar câmeras na minha loja.",
  "Meu notebook não liga mais.",
];

export const urgencias = [
  { id: "urgente", label: "É urgente", hint: "Preciso hoje" },
  { id: "esta-semana", label: "Esta semana", hint: "Dá para agendar" },
  { id: "sem-pressa", label: "Sem pressa", hint: "Só quero orçamento" },
];
