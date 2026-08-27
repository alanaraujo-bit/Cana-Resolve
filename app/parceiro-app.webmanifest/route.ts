/**
 * Manifest do Portal do Parceiro — o mesmo padrão do Operations
 * (`ops-app.webmanifest`), porque a razão é a mesma: fica fora de `/parceiro`
 * de propósito, porque o navegador busca o manifest sem cookie nenhum, e um
 * caminho protegido devolveria o redirecionamento para `/parceiro/entrar` em
 * vez do manifest.
 *
 * `start_url` e `scope` em `/parceiro` fazem o aplicativo instalado abrir
 * direto nas oportunidades da empresa — não na landing pública de `/parceiros`
 * (que é outra rota, outro público, sem manifest próprio).
 */
export function GET() {
  return Response.json({
    id: "/parceiro",
    name: "Canaã Resolve · Parceiro",
    short_name: "CR Parceiro",
    description: "Oportunidades locais para profissionais e empresas parceiras do Canaã Resolve.",
    start_url: "/parceiro",
    scope: "/parceiro",
    display: "standalone",
    orientation: "portrait-primary",
    lang: "pt-BR",
    dir: "ltr",
    background_color: "#fbf9f5",
    theme_color: "#0e5c42",
    categories: ["business"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/parceiro-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/parceiro-icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Oportunidades", short_name: "Oportunidades", url: "/parceiro/oportunidades" }],
  });
}
