/**
 * O catálogo comercial — o que existe para ser contratado.
 *
 * A decisão que organiza este arquivo inteiro: **o catálogo é dado, não
 * código** (§13, §96). Não existe, em lugar nenhum do sistema, um
 * `if (plano === "profissional") preco = 79`. Existe uma tabela
 * (`commercial_offers`), e este arquivo é o contrato dela — os tipos, a
 * validação e a leitura.
 *
 * Por que isso importa mais aqui do que parece: os valores de R$79 / R$129 /
 * R$199 para os planos pós-Beta **são hipóteses a validar durante o Beta**
 * (§12), e a diferença entre uma hipótese e uma constante é justamente onde
 * ela mora. Uma hipótese escrita em código vira uma decisão que ninguém tomou,
 * e que passa a exigir uma atualização de aplicativo para ser revista. Por isso
 * **nenhum plano pós-Beta existe neste repositório** — nem como constante, nem
 * como semente, nem como comentário que alguém possa descomentar.
 *
 * O que existe é uma oferta só, porque é a única oficialmente definida:
 * **Parceiro Fundador — R$79 pelos primeiros 90 dias.**
 *
 * ## Versionamento (§15)
 *
 * `codigo` identifica a oferta; `versao` identifica **esta** condição. Quando
 * o preço ou a composição mudarem, nasce a versão seguinte e a anterior fica
 * encerrada — nunca reescrita. Uma compra guarda o par `(codigo, versao)`, de
 * modo que o significado histórico do que alguém comprou continua legível
 * depois de a oferta atual ter mudado.
 */

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*  O contrato                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Como a cobrança se repete.
 *
 * O Beta é `unica`, e a palavra é a garantia do §8: uma compra única de 90
 * dias não vira renovação automática por descuido de tipagem. Para renovar,
 * seria preciso existir uma oferta `mensal` — que não existe.
 */
export type Recorrencia = "unica" | "mensal" | "anual";

/**
 * Onde a oferta pode ser contratada.
 *
 * `administrativa` é a de hoje: a venda acontece por conversa e a ativação é
 * registrada pela administração (§70). Não é um atalho — é o modelo comercial
 * corrente, e a arquitetura o trata como um provedor legítimo, com validação e
 * trilha de auditoria como qualquer outro.
 */
export type Plataforma = "ios" | "android" | "web" | "administrativa";

export type EstadoDaOferta =
  /** Existe, ninguém pode contratar. É o estado das hipóteses. */
  | "rascunho"
  /** Pode ser apresentada e contratada por quem for elegível. */
  | "ativa"
  /** Não aceita novas contratações. Quem já comprou mantém a condição. */
  | "encerrada";

export type Oferta = {
  /** Estável entre versões. Ex.: `beta-fundador`. */
  codigo: string;
  /** Sobe a cada mudança de condição. Nunca reaproveitado. */
  versao: number;
  /** O nome que o profissional lê. */
  nome: string;
  /** Uma linha. O que ele está comprando. */
  resumo: string;
  /** O parágrafo que explica a condição, inclusive o que ela não promete. */
  descricao: string;
  /**
   * Em centavos, inteiro. **Nunca ponto flutuante** (§91): `0.1 + 0.2` não é
   * `0.3`, e dinheiro que não fecha na terceira casa vira disputa com cliente.
   * Igual a `payments.amountCents`, que já era assim.
   */
  precoCentavos: number;
  /** ISO 4217. Hoje sempre `BRL`; o tipo não presume isso. */
  moeda: string;
  /** Quanto tempo a compra cobre. `null` para recorrente sem prazo fixo. */
  periodoDias: number | null;
  recorrencia: Recorrencia;
  /** Em que plataformas ela pode ser contratada. */
  plataformas: Plataforma[];
  /** Mercado, no padrão ISO 3166-1 alfa-2. Hoje `BR`. */
  mercado: string;
  /**
   * O que a participação inclui. Frases verificáveis apenas.
   *
   * Nenhuma delas pode prometer resultado: "X leads garantidos", "clientes
   * garantidos" e "retorno garantido" são proibidos (§60), e
   * `validarBeneficio` recusa qualquer benefício que contenha essas palavras.
   */
  beneficios: string[];
  estado: EstadoDaOferta;
  /**
   * A contratação exige aprovação prévia?
   *
   * `true` no Beta: a rede é controlada por categoria e o processo é análise →
   * aprovação → condição → aceite → pagamento (§75, §76).
   */
  exigeAprovacao: boolean;
  /** Nota operacional, para a administração. Nunca vai para o aplicativo. */
  observacao: string | null;
};

/**
 * A oferta como o aplicativo a recebe.
 *
 * `observacao` fica de fora, e a diferença entre os dois tipos é o que impede
 * uma nota interna de aparecer numa tela.
 */
export type OfertaPublica = Omit<Oferta, "observacao">;

export function paraOAplicativo(oferta: Oferta): OfertaPublica {
  // Campo a campo, e não `delete` sobre uma cópia: um campo interno novo em
  // `Oferta` quebra o tipo aqui, em vez de vazar em silêncio para a tela.
  return {
    codigo: oferta.codigo,
    versao: oferta.versao,
    nome: oferta.nome,
    resumo: oferta.resumo,
    descricao: oferta.descricao,
    precoCentavos: oferta.precoCentavos,
    moeda: oferta.moeda,
    periodoDias: oferta.periodoDias,
    recorrencia: oferta.recorrencia,
    plataformas: oferta.plataformas,
    mercado: oferta.mercado,
    beneficios: oferta.beneficios,
    estado: oferta.estado,
    exigeAprovacao: oferta.exigeAprovacao,
  };
}

/* -------------------------------------------------------------------------- */
/*  Validação                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Palavras que não podem aparecer num benefício.
 *
 * Não é preciosismo de redação: uma promessa de resultado dentro de uma oferta
 * paga é o que transforma "possibilidade de receber oportunidades compatíveis"
 * em obrigação de entregar volume. O catálogo é remoto e configurável — então
 * a proibição precisa morar na validação, e não no bom senso de quem escreve.
 */
const PROMESSAS_PROIBIDAS = [
  "garantido",
  "garantida",
  "garantia de",
  "assegurado",
  "retorno certo",
];

export function validarBeneficio(texto: string): string | null {
  const limpo = texto.trim().replace(/\s+/g, " ");
  if (!limpo) return "Benefício vazio.";
  const minusculo = limpo.toLowerCase();
  for (const proibida of PROMESSAS_PROIBIDAS) {
    if (minusculo.includes(proibida)) {
      return `Um benefício não pode prometer resultado ("${proibida}").`;
    }
  }
  return null;
}

const esquemaDaOferta = z.object({
  codigo: z.string().regex(/^[a-z0-9-]{3,40}$/),
  versao: z.number().int().positive(),
  nome: z.string().min(1).max(60),
  resumo: z.string().min(1).max(160),
  descricao: z.string().min(1).max(1200),
  precoCentavos: z.number().int().nonnegative(),
  moeda: z.string().regex(/^[A-Z]{3}$/),
  periodoDias: z.number().int().positive().nullable(),
  recorrencia: z.enum(["unica", "mensal", "anual"]),
  plataformas: z.array(z.enum(["ios", "android", "web", "administrativa"])).min(1),
  mercado: z.string().regex(/^[A-Z]{2}$/),
  beneficios: z
    .array(z.string())
    .max(8)
    .refine((lista) => lista.every((b) => validarBeneficio(b) === null), {
      message: "Um benefício não pode prometer resultado.",
    }),
  estado: z.enum(["rascunho", "ativa", "encerrada"]),
  exigeAprovacao: z.boolean(),
  observacao: z.string().nullable(),
});

/** Lê uma linha do catálogo. Lança quando a linha não é uma oferta válida. */
export function lerOferta(bruto: unknown): Oferta {
  return esquemaDaOferta.parse(bruto);
}

export function ofertaValida(bruto: unknown): Oferta | null {
  const r = esquemaDaOferta.safeParse(bruto);
  return r.success ? r.data : null;
}

/* -------------------------------------------------------------------------- */
/*  Apresentação                                                              */
/* -------------------------------------------------------------------------- */

/**
 * O preço escrito.
 *
 * `Intl` e não `"R$ " + valor` (§90): o dia em que houver outra moeda ou outro
 * mercado, a concatenação estaria errada em todo lugar de uma vez. E quando a
 * loja fornecer o preço já localizado, é o texto **dela** que deve aparecer —
 * esta função serve ao que a nossa própria camada apresenta.
 */
export function precoLegivel(centavos: number, moeda = "BRL", local = "pt-BR"): string {
  return new Intl.NumberFormat(local, {
    style: "currency",
    currency: moeda,
    minimumFractionDigits: 2,
  }).format(centavos / 100);
}

const UNIDADES = [
  "zero",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "catorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const DEZENAS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];
const CENTENAS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function porExtenso(n: number): string {
  if (n < 20) return UNIDADES[n]!;
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    return u ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]!;
  }
  if (n === 100) return "cem";
  if (n < 1000) {
    const c = Math.floor(n / 100);
    const r = n % 100;
    return r ? `${CENTENAS[c]} e ${porExtenso(r)}` : CENTENAS[c]!;
  }
  const milhares = Math.floor(n / 1000);
  const r = n % 1000;
  const cabeca = milhares === 1 ? "mil" : `${porExtenso(milhares)} mil`;
  if (!r) return cabeca;
  // "mil e cinquenta", mas "mil duzentos e noventa e nove": o "e" depois do
  // milhar só entra quando o que sobra é menor que cem ou é centena redonda.
  const ligacao = r < 100 || r % 100 === 0 ? " e " : " ";
  return `${cabeca}${ligacao}${porExtenso(r)}`;
}

/**
 * O preço **falado** — o que o leitor de tela lê (§139).
 *
 * "R$79" é lido de maneiras diferentes e nem sempre corretas por cada leitor,
 * e "79/90" pode virar "setenta e nove barra noventa". Escrever o rótulo de
 * acessibilidade à mão é o que garante que a informação comercial chegue
 * inteira a quem não a vê: *setenta e nove reais*.
 *
 * Só português e real — que é o mercado de hoje. Fora dele, devolve o formato
 * do `Intl`, que já é melhor do que uma tradução errada.
 */
export function precoFalado(centavos: number, moeda = "BRL"): string {
  if (moeda !== "BRL") return precoLegivel(centavos, moeda);

  const reais = Math.floor(centavos / 100);
  const resto = centavos % 100;
  const parteReais =
    reais === 1 ? "um real" : `${porExtenso(reais)} ${reais === 0 ? "reais" : "reais"}`;
  if (!resto) return parteReais;
  const parteCentavos = resto === 1 ? "um centavo" : `${porExtenso(resto)} centavos`;
  return `${parteReais} e ${parteCentavos}`;
}

/**
 * A periodicidade escrita — e ela nunca é omitida (§58).
 *
 * "R$79" sozinho, numa oferta recorrente, é a omissão que faz alguém descobrir
 * a segunda cobrança pelo extrato. Por isso quem monta o texto do preço passa
 * por aqui, e o caso `unica` devolve o período em dias em vez de nada.
 */
export function periodicidadeLegivel(oferta: Pick<Oferta, "recorrencia" | "periodoDias">): string {
  if (oferta.recorrencia === "mensal") return "por mês";
  if (oferta.recorrencia === "anual") return "por ano";
  if (oferta.periodoDias === null) return "pagamento único";
  return `pelos primeiros ${oferta.periodoDias} dias`;
}

/** Preço e período numa frase só. É o texto que a tela comercial mostra. */
export function condicaoLegivel(
  oferta: Pick<Oferta, "precoCentavos" | "moeda" | "recorrencia" | "periodoDias">,
): string {
  return `${precoLegivel(oferta.precoCentavos, oferta.moeda)} ${periodicidadeLegivel(oferta)}`;
}

export function condicaoFalada(
  oferta: Pick<Oferta, "precoCentavos" | "moeda" | "recorrencia" | "periodoDias">,
): string {
  return `${precoFalado(oferta.precoCentavos, oferta.moeda)} ${periodicidadeLegivel(oferta)}`;
}

/** Renova sozinha? A resposta precisa caber numa palavra na tela (§57). */
export function renovaAutomaticamente(oferta: Pick<Oferta, "recorrencia">): boolean {
  return oferta.recorrencia !== "unica";
}

/* -------------------------------------------------------------------------- */
/*  A semente                                                                 */
/* -------------------------------------------------------------------------- */

/** O código da única oferta oficialmente definida hoje. */
export const CODIGO_DO_BETA = "beta-fundador";

/**
 * A oferta do Beta Fundador, **como semente da tabela** — não como constante
 * consultada em tempo de execução.
 *
 * A distinção é o §13 inteiro. Este objeto é escrito uma vez em
 * `commercial_offers` pela migração `0006`, e a partir daí quem manda é a
 * linha: mudar o preço é um `update`, não um `deploy`. Se alguém apagar a
 * tabela, o sistema não "cai de volta" para cá — ele diz que não há oferta,
 * porque um catálogo vazio é um fato e não um erro a mascarar.
 *
 * O texto é o compromisso real: R$79 pelos primeiros 90 dias, sem renovação
 * automática, sem fidelidade, e com os 90 dias começando na abertura da
 * operação para moradores.
 */
export const SEMENTE_DO_BETA: Oferta = {
  codigo: CODIGO_DO_BETA,
  versao: 1,
  nome: "Parceiro Fundador",
  resumo: "R$79 pelos primeiros 90 dias de operação.",
  descricao:
    "Participação na rede do Canaã Resolve como Parceiro Fundador, com a " +
    "possibilidade de receber oportunidades compatíveis com os seus serviços. " +
    "Os 90 dias começam quando o Canaã Resolve for oficialmente aberto aos " +
    "moradores — e não na data do pagamento. Não há renovação automática e não " +
    "há fidelidade: ao fim do período, você decide se quer continuar.",
  precoCentavos: 7900,
  moeda: "BRL",
  periodoDias: 90,
  recorrencia: "unica",
  plataformas: ["administrativa"],
  mercado: "BR",
  beneficios: [
    "Participação na rede durante os 90 dias do Beta",
    "Possibilidade de receber oportunidades compatíveis",
    "Perfil profissional visível para os moradores",
    "Condição de Parceiro Fundador registrada no seu histórico",
  ],
  estado: "ativa",
  exigeAprovacao: true,
  observacao: "Venda e qualificação pelo canal oficial; ativação registrada pela administração.",
};
