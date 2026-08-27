import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Parceiro", template: "%s · Parceiro Canaã Resolve" },
  robots: { index: false, follow: false },
  // Instalado, o Portal do Parceiro abre em tela cheia — mesmo tratamento do
  // manifest dedicado que o Operations já usa.
  manifest: "/parceiro-app.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CR Parceiro" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1310" },
  ],
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
