/**
 * CORS das rotas do aplicativo — só para o desenvolvimento local.
 *
 * No aparelho não existe CORS: o `fetch` do React Native não tem origem e
 * nunca faz preflight, então o aplicativo de verdade fala com estas rotas sem
 * nada disto. Quem precisa é a prévia no navegador (`expo start --web`), que
 * roda em `localhost` e é barrada antes mesmo de sair da máquina.
 *
 * Por isso a liberação é estreita: máquina local e rede local, nada além. Um
 * `*` aqui deixaria qualquer página da internet disparar tentativas de login
 * ou de troca de senha pelo navegador de quem a visita.
 *
 * Isto nasceu dentro de `auth/sessoes/route.ts` e saiu de lá quando a segunda
 * rota do aplicativo apareceu — a regra é a mesma para todas, e uma cópia
 * divergente seria o tipo de erro que ninguém percebe até doer.
 */

const ORIGEM_LOCAL =
  /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/;

export function cabecalhosDeCors(
  request: Request,
  metodos: string,
): Record<string, string> {
  const origem = request.headers.get("origin");
  if (!origem || !ORIGEM_LOCAL.test(origem)) return {};
  return {
    "Access-Control-Allow-Origin": origem,
    "Access-Control-Allow-Methods": metodos,
    "Access-Control-Allow-Headers": "content-type, authorization, x-cr-plataforma",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

/** O token cru do cabeçalho `Authorization: Bearer <token>`. */
export function tokenDoCabecalho(request: Request): string {
  const cabecalho = request.headers.get("authorization") ?? "";
  return cabecalho.toLowerCase().startsWith("bearer ") ? cabecalho.slice(7).trim() : "";
}
