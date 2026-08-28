import { categories } from "@/lib/categories";

/**
 * Semente do catálogo.
 *
 * As categorias vêm de `lib/categories.ts` — as mesmas que o site público usa
 * desde o começo, com os mesmos identificadores. Os serviços nascem aqui.
 *
 * Categoria não é a menor unidade: "Eletricista" é o balcão, "chuveiro não
 * esquenta" é o que a pessoa realmente tem. O serviço é o que torna o
 * encaminhamento preciso — e, mais para frente, o que permite entender qual
 * tipo de problema aparece mais em Canaã.
 *
 * A lista não pretende ser completa. Enquanto não existir tela para
 * administrá-la, ela cresce editando este arquivo e rodando `npm run db:seed`.
 */
export const serviceSeed: Record<string, string[]> = {
  "ar-condicionado": [
    "Instalação de split",
    "Limpeza e higienização",
    "Manutenção preventiva",
    "Não está gelando",
    "Vazamento de água",
    "Carga de gás",
    "Geladeira ou freezer",
    "Câmara fria e balcão refrigerado",
  ],
  eletricista: [
    "Instalação elétrica",
    "Curto-circuito",
    "Tomadas e interruptores",
    "Chuveiro elétrico",
    "Padrão de entrada",
    "Quadro e disjuntores",
    "Iluminação",
    "Aterramento",
  ],
  guincho: [
    "Reboque",
    "Pane seca",
    "Bateria descarregada",
    "Chaveiro automotivo",
    "Retirada de atolamento",
    "Troca de pneu",
  ],
  mecanica: [
    "Revisão geral",
    "Freios",
    "Suspensão",
    "Motor",
    "Injeção eletrônica",
    "Elétrica automotiva",
    "Ar-condicionado automotivo",
    "Funilaria e pintura",
  ],
  construcao: [
    "Pedreiro e alvenaria",
    "Pintura",
    "Hidráulica e vazamentos",
    "Telhado e calhas",
    "Gesso e drywall",
    "Piso e revestimento",
    "Reforma de banheiro",
    "Marcenaria e móveis planejados",
  ],
  seguranca: [
    "Câmeras e CFTV",
    "Alarme",
    "Cerca elétrica e concertina",
    "Portão automático",
    "Interfone",
    "Controle de acesso",
  ],
  informatica: [
    "Manutenção de computador",
    "Notebook",
    "Redes e wi-fi",
    "Instalação de internet",
    "Impressoras",
    "Suporte para empresas",
    "Recuperação de dados",
  ],
};

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const catalogSeed = categories.map((category, index) => ({
  id: category.id,
  name: category.name,
  short: category.short,
  blurb: category.blurb,
  position: index,
  services: (serviceSeed[category.id] ?? []).map((name, position) => ({
    slug: slugify(name),
    name,
    position,
  })),
}));
