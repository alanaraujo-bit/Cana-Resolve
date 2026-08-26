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

/* ---------------------------------------------------------------
   Palpite de categoria a partir do texto do morador.

   Serve para dar uma resposta imediata a quem está escrevendo — "parece
   Eletricista" — e para pré-selecionar a categoria no formulário. É um
   palpite assumido como palpite: a pessoa sempre pode trocar, e o texto
   dela continua sendo o que vale.
   --------------------------------------------------------------- */

const categoryHints: Record<string, string[]> = {
  "ar-condicionado": [
    "ar condicionado", "ar-condicionado", "arcondicionado", "split", "gelando",
    "gela", "geladeira", "freezer", "refrigera", "climatiz", "compressor",
    "recarga de gas", "ar de casa", "condensadora",
  ],
  eletricista: [
    "eletricista", "eletrica", "tomada", "disjuntor", "curto", "chuveiro",
    "fiacao", "fio queimado", "quadro de energia", "padrao de energia",
    "lampada", "luminaria", "choque", "sem energia", "sem luz", "ventilador de teto",
  ],
  guincho: [
    "guincho", "reboque", "rebocar", "pane seca", "sem gasolina", "bateria arriada",
    "bateria descarregada", "chaveiro", "carro quebrou", "quebrei na br",
    "na estrada", "atolado", "pneu furado", "chave trancada", "auto socorro",
  ],
  mecanica: [
    "mecanic", "motor", "freio", "suspensao", "embreagem", "injecao",
    "troca de oleo", "revisao", "radiador", "correia", "escapamento",
    "cambio", "superaquec", "barulho no carro",
  ],
  construcao: [
    "pedreiro", "reforma", "reformar", "pintura", "pintar", "hidraulic",
    "encanador", "vazamento", "telhado", "goteira", "gesso", "piso",
    "azulejo", "obra", "alvenaria", "muro", "laje", "banheiro", "cozinha",
    "acabamento", "drywall", "calha",
  ],
  seguranca: [
    "camera", "cftv", "alarme", "cerca eletrica", "portao", "interfone",
    "monitoramento", "controle de acesso", "fechadura eletronica",
    "concertina", "vigilancia",
  ],
  informatica: [
    "notebook", "computador", "pc ", "formatar", "internet", "wifi", "wi-fi",
    "roteador", "rede de computadores", "impressora", "windows",
    "nao liga mais", "sistema da empresa", "backup", "cabeamento de rede",
  ],
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Devolve o id da categoria mais provável, ou `null` quando o texto ainda
 * é curto demais ou não se parece com nada em especial.
 */
export function guessCategory(text: string): string | null {
  const t = normalize(text);
  if (t.trim().length < 8) return null;

  let best: { id: string; score: number } | null = null;

  for (const [id, hints] of Object.entries(categoryHints)) {
    let score = 0;
    for (const hint of hints) {
      if (t.includes(hint)) score += hint.length;
    }
    if (score > 0 && (!best || score > best.score)) best = { id, score };
  }

  return best ? best.id : null;
}
