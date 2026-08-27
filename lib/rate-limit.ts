/**
 * Freio de abuso, em memória.
 *
 * É honesto sobre o que é: cada instância da função tem a própria contagem, e
 * a memória some quando a instância some. Não é uma defesa contra um ataque
 * distribuído — é o suficiente para impedir que um formulário público seja
 * enviado cinquenta vezes seguidas por engano ou por um robô simples.
 *
 * Quando o volume justificar, o lugar de trocar isto por um contador
 * compartilhado é aqui dentro, sem tocar em nenhuma rota.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  // Varre o que já venceu de vez em quando, para o mapa não crescer sem fim.
  if (buckets.size > 500) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  return { ok: true, remaining: limit - bucket.count, retryAfter: 0 };
}

/** Identificador aproximado de quem chamou. Não é guardado em lugar nenhum. */
export function callerKey(headers: Headers, scope: string) {
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "desconhecido";
  return `${scope}:${ip}`;
}
