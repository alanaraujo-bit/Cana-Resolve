import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Canaã Resolve",
    short_name: "Canaã Resolve",
    description: "Uma rede local para resolver o que você precisa em Canaã dos Carajás.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbf9f5",
    theme_color: "#0e5c42",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
