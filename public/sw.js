/**
 * Cache mínimo, e só do que é seguro cachear em qualquer sessão.
 *
 * Esta é a mesma instalação do service worker para o site público, o Portal
 * do Morador e o Portal do Parceiro — todos vivem sob o escopo "/". Por isso a
 * regra é rígida: só entra em cache o que `/_next/static/` serve, porque o
 * nome do arquivo já carrega o hash do conteúdo — o mesmo arquivo nunca muda
 * de sentido, então nunca fica desatualizado nem vaza de uma sessão para
 * outra.
 *
 * HTML, RSC (a resposta que o Next busca ao navegar entre páginas, que não
 * tem `accept: text/html`) e qualquer coisa de `/api/` ficam de fora de
 * propósito: essas respostas variam por cookie — a oportunidade do parceiro A
 * não pode ser servida, do cache, para o parceiro B no mesmo aparelho.
 */
const CACHE = "cr-estatico-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((nome) => nome !== CACHE).map((nome) => caches.delete(nome))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (!url.pathname.startsWith("/_next/static/")) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
