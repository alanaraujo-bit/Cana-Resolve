import { visitSource } from "./analytics";

/**
 * O envio dos formulários públicos, do lado do navegador.
 *
 * Uma regra manda neste arquivo: **nada aqui pode atrapalhar o WhatsApp**. Os
 * formulários já funcionavam sem banco nenhum, e o banco entrou para o pedido
 * não sumir — não para virar mais um lugar onde a conversa pode travar.
 *
 * Por isso a promessa nunca é aguardada antes de abrir a conversa e nenhuma
 * falha vira erro na tela. Quando dá certo, volta o código do registro
 * (CR-00021) e a tela de confirmação fica melhor. Quando não dá, a experiência
 * é exatamente a que existia antes.
 */

/** Origem e UTM em formato de texto, sem nada que identifique a pessoa. */
export function attribution(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(visitSource())) {
    if (typeof value === "string" && value) out[key] = value.slice(0, 200);
  }
  return out;
}

async function post(url: string, body: unknown): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Mantém a requisição viva se a aba for embora antes de terminar.
      keepalive: true,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { ok?: boolean; codigo?: string };
    return data.ok && data.codigo ? data.codigo : null;
  } catch {
    return null;
  }
}

export type SolicitacaoPayload = {
  descricao: string;
  categoria?: string | null;
  nome: string;
  telefone: string;
  bairro?: string | null;
  urgencia?: string | null;
  consentimento: boolean;
};

export function enviarSolicitacao(payload: SolicitacaoPayload) {
  const dados = attribution();
  return post("/api/publico/solicitacoes", {
    ...payload,
    origem: dados.origem ?? null,
    atribuicao: dados,
  });
}

export type CadastroPayload = {
  nome: string;
  empresa: string;
  telefone: string;
  categoria: string;
  atendeCanaa: boolean;
  comoConheceu?: string | null;
};

export function enviarCadastro(payload: CadastroPayload) {
  const dados = attribution();
  return post("/api/publico/cadastros", {
    ...payload,
    origem: dados.origem ?? null,
    atribuicao: dados,
  });
}
