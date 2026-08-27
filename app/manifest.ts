import type { MetadataRoute } from "next";

/**
 * O manifest do site — que também é o do Portal do Morador, porque
 * `/acompanhar` vive sob o mesmo escopo "/". Não existe um segundo manifest
 * para o morador: ele não tem conta, e instalar "o site" já cobre o link de
 * acompanhamento que ele recebe pelo WhatsApp. Só o Parceiro, com sessão
 * própria, ganha um manifest à parte (`parceiro-app.webmanifest`), no mesmo
 * padrão do Operations.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Canaã Resolve",
    short_name: "Canaã Resolve",
    description: "Uma rede local para resolver o que você precisa em Canaã dos Carajás.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    lang: "pt-BR",
    dir: "ltr",
    background_color: "#fbf9f5",
    theme_color: "#0e5c42",
    categories: ["business", "lifestyle"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Pedir ajuda", short_name: "Pedir ajuda", url: "/solicitar" },
      { name: "Acompanhar solicitação", short_name: "Acompanhar", url: "/acompanhar" },
    ],
  };
}
