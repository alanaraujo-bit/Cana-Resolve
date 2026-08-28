/**
 * Lápide do service worker.
 *
 * O Canaã Resolve deixou de ser PWA: o app de morador e o de parceiro passam a
 * ser nativos (Play Store e App Store), e o que fica na web é a landing. Mas
 * apagar este arquivo não desinstala nada — um service worker registrado
 * continua vivo no aparelho de quem já abriu o site, servindo `/_next/static/`
 * de um cache que ninguém mais atualiza.
 *
 * Então o arquivo continua existindo e faz uma coisa só: se desinstalar. O
 * navegador rebusca `sw.js` sozinho ao navegar dentro do escopo, vê que o
 * conteúdo mudou, instala esta versão — e esta versão apaga os caches, se
 * desregistra e recarrega as abas abertas, que a partir daí falam direto com a
 * rede. Só depois que essa limpeza tiver rodado em campo é que este arquivo
 * pode sumir de verdade.
 */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(nomes.map((nome) => caches.delete(nome)));
      await self.registration.unregister();
      const clientes = await self.clients.matchAll({ type: "window" });
      for (const cliente of clientes) cliente.navigate(cliente.url);
    })(),
  );
});
