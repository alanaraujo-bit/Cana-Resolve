/**
 * Manifest do Operations.
 *
 * Fica fora de `/ops` de propósito: aquele caminho é protegido pelo porteiro, e
 * o navegador busca o manifest sem as credenciais da página — de dentro de
 * `/ops` ele voltaria como um redirecionamento para a tela de entrada, e a
 * instalação simplesmente não aconteceria.
 *
 * `display: standalone` + `start_url` em `/ops` fazem o aplicativo instalado
 * abrir direto na operação, sem barra de navegador. Quem não estiver logado
 * cai na tela de entrada dentro do próprio aplicativo.
 */
export function GET() {
  return Response.json({
    id: "/ops",
    name: "Canaã Resolve · Operations",
    short_name: "CR Operations",
    description:
      "O centro de comando do Canaã Resolve: prospects, parceiros, solicitações e encaminhamentos.",
    start_url: "/ops",
    scope: "/ops",
    display: "standalone",
    orientation: "portrait-primary",
    lang: "pt-BR",
    dir: "ltr",
    background_color: "#f7f4ec",
    theme_color: "#0e5c42",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/ops-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/ops-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/ops-icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Solicitações novas",
        short_name: "Pedidos",
        url: "/ops/solicitacoes?estado=nova",
      },
      { name: "Funil comercial", short_name: "Funil", url: "/ops/comercial" },
    ],
  });
}
