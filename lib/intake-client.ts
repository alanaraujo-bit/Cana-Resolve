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

async function post(url: string, body: unknown): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Mantém a requisição viva se a aba for embora antes de terminar.
      keepalive: true,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { ok?: boolean } & Record<string, unknown>;
    return data.ok ? data : null;
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

/**
 * `link` é o acompanhamento assinado (ver `/acesso`) — só existe quando
 * `CR_SESSION_SECRET` está configurado no ambiente que respondeu.
 */
export type SolicitacaoResultado = { codigo: string; link: string | null } | null;

export async function enviarSolicitacao(payload: SolicitacaoPayload): Promise<SolicitacaoResultado> {
  const dados = attribution();
  const data = await post("/api/publico/solicitacoes", {
    ...payload,
    origem: dados.origem ?? null,
    atribuicao: dados,
  });
  if (!data || typeof data.codigo !== "string") return null;
  return { codigo: data.codigo, link: typeof data.link === "string" ? data.link : null };
}

export type CadastroPayload = {
  nome: string;
  empresa: string;
  telefone: string;
  categoria: string;
  atendeCanaa: boolean;
  comoConheceu?: string | null;
};

export async function enviarCadastro(payload: CadastroPayload): Promise<string | null> {
  const dados = attribution();
  const data = await post("/api/publico/cadastros", {
    ...payload,
    origem: dados.origem ?? null,
    atribuicao: dados,
  });
  return data && typeof data.codigo === "string" ? data.codigo : null;
}
