import { z } from "zod";

/**
 * O contrato dos formulários públicos.
 *
 * Fica fora de `lib/domain` de propósito: o navegador também importa daqui, e
 * nada neste arquivo pode depender do banco. A validação de verdade é a do
 * servidor — a do cliente existe só para o erro aparecer antes do envio.
 *
 * A régua é a menor possível. Cada campo obrigatório a mais é uma pessoa a
 * menos terminando o formulário, e o objetivo do morador é contar o problema,
 * não preencher cadastro.
 */

const texto = (max: number) => z.string().trim().max(max);

/** Aceita qualquer formato; a normalização para dígitos acontece no servidor. */
const telefone = z
  .string()
  .trim()
  .min(8, "Confira o número do WhatsApp.")
  .max(24, "Confira o número do WhatsApp.")
  .refine((v) => {
    const d = v.replace(/\D/g, "");
    return d.length >= 10 && d.length <= 13;
  }, "Confira o número do WhatsApp — precisa ter DDD.");

/** Origem e UTM. Só rótulos de campanha entram aqui; nunca dado pessoal. */
export const attributionSchema = z
  .record(z.string().max(40), z.string().max(200))
  .default({});

export const serviceRequestSchema = z.object({
  descricao: texto(2000).min(10, "Conte um pouco mais sobre o que você precisa."),
  categoria: texto(60).optional().nullable(),
  servico: z.uuid().optional().nullable(),
  nome: texto(120).min(2, "Como podemos te chamar?"),
  telefone,
  bairro: texto(120).optional().nullable(),
  urgencia: texto(40).optional().nullable(),
  consentimento: z
    .boolean()
    .refine((v) => v, "Precisamos da sua autorização para encaminhar o pedido."),
  origem: texto(60).optional().nullable(),
  atribuicao: attributionSchema.optional(),
});

export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;

export const partnerApplicationSchema = z.object({
  nome: texto(120).min(2, "Informe seu nome."),
  empresa: texto(160).min(2, "Informe o nome da empresa ou como você é conhecido."),
  telefone,
  categoria: texto(60).min(1, "Escolha a categoria principal."),
  atendeCanaa: z.boolean().default(true),
  comoConheceu: texto(200).optional().nullable(),
  origem: texto(60).optional().nullable(),
  atribuicao: attributionSchema.optional(),
});

export type PartnerApplicationInput = z.infer<typeof partnerApplicationSchema>;

/**
 * Erros por campo, no formato que os formulários já usam. Manter o formato
 * evita reescrever a camada de exibição só porque a validação mudou de lugar.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
