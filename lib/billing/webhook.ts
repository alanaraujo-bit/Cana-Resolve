import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { Provedor } from "@/lib/domain/comercial/eventos";

/**
 * Verificação de webhooks financeiros.
 *
 * Uma regra, e ela não tem exceção: **um evento financeiro não verificado não
 * é processado** (§111). Não existe "por enquanto aceita", não existe "só em
 * desenvolvimento", não existe rota que caia num `else` permissivo. Um endpoint
 * que aceita eventos não assinados é um botão de "conceder acesso pago" aberto
 * na internet.
 *
 * Daí a decisão que parece estranha e é a certa: **sem segredo configurado, a
 * rota recusa tudo**. Não é um estado degradado — é o estado correto até
 * alguém colocar a credencial. Um webhook que não chega é um problema visível;
 * um webhook falso que passa, não.
 */

export type Verificacao =
  | { ok: true }
  | { ok: false; motivo: "sem-segredo" | "sem-assinatura" | "assinatura-invalida" };

/** O nome da variável de ambiente que guarda o segredo de cada provedor. */
const VARIAVEL: Record<Provedor, string> = {
  apple: "CR_WEBHOOK_APPLE_SEGREDO",
  google: "CR_WEBHOOK_GOOGLE_SEGREDO",
  alternativo: "CR_WEBHOOK_ALTERNATIVO_SEGREDO",
  administrativo: "CR_ADMIN_SEGREDO",
};

export function segredoDe(provedor: Provedor): string | null {
  const valor = process.env[VARIAVEL[provedor]]?.trim();
  return valor ? valor : null;
}

export function nomeDaVariavel(provedor: Provedor): string {
  return VARIAVEL[provedor];
}

/**
 * Confere uma assinatura HMAC-SHA256 sobre o corpo cru da requisição.
 *
 * **O corpo cru**, e não o objeto já convertido: `JSON.parse` seguido de
 * `JSON.stringify` reordena chaves e muda espaços, e a assinatura deixa de
 * fechar por um motivo que ninguém encontra em duas horas de depuração.
 *
 * A comparação é em tempo constante. Um `===` sobre assinaturas vaza, pelo
 * tempo, quantos bytes iniciais estavam certos — e com tentativas suficientes
 * isso é uma assinatura descoberta byte a byte.
 *
 * Apple e Google usam formatos próprios (JWS assinado por certificado, no caso
 * da Apple; Pub/Sub com token de OIDC, no do Google). Quando as credenciais
 * existirem, cada um ganha sua verificação — e esta função continua servindo ao
 * provedor alternativo e à rota administrativa. O que **não** muda é o
 * princípio: falha na verificação é `401`, e nada é gravado.
 */
export function verificarHmac(
  provedor: Provedor,
  corpoCru: string,
  assinaturaRecebida: string | null,
): Verificacao {
  const segredo = segredoDe(provedor);
  if (!segredo) return { ok: false, motivo: "sem-segredo" };
  if (!assinaturaRecebida) return { ok: false, motivo: "sem-assinatura" };

  const esperada = createHmac("sha256", segredo).update(corpoCru, "utf8").digest("hex");
  const a = Buffer.from(esperada, "utf8");
  const b = Buffer.from(assinaturaRecebida.trim().toLowerCase(), "utf8");

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, motivo: "assinatura-invalida" };
  }
  return { ok: true };
}

/**
 * A verificação de uma requisição administrativa.
 *
 * A ativação manual do Beta é uma operação financeira legítima e frequente
 * (§70), e por isso precisa de uma porta — mas de uma porta que o aplicativo
 * não consegue abrir. O segredo vive só no servidor e em quem opera; nenhuma
 * variável `EXPO_PUBLIC_*` chega perto dele.
 *
 * Sem `CR_ADMIN_SEGREDO` configurado, a rota inteira responde 503. É de novo o
 * mesmo princípio: recusar por falta de credencial, nunca aceitar por falta
 * dela.
 */
export function verificarAdministracao(request: Request): Verificacao {
  const segredo = segredoDe("administrativo");
  if (!segredo) return { ok: false, motivo: "sem-segredo" };

  const cabecalho = request.headers.get("x-cr-admin")?.trim();
  if (!cabecalho) return { ok: false, motivo: "sem-assinatura" };

  const a = Buffer.from(segredo, "utf8");
  const b = Buffer.from(cabecalho, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, motivo: "assinatura-invalida" };
  }
  return { ok: true };
}
