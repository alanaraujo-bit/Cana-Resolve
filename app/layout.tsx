import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { themeScript } from "@/lib/theme-script";
import { site } from "@/lib/site";
import { PwaBootstrap } from "@/components/pwa";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — profissionais e serviços em ${site.city}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "serviços em Canaã dos Carajás",
    "profissionais em Canaã dos Carajás",
    "eletricista Canaã dos Carajás",
    "ar-condicionado Canaã dos Carajás",
    "guincho Canaã dos Carajás",
    "orçamento de serviços Canaã dos Carajás",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: site.url,
    siteName: site.name,
    title: `${site.name} — quem resolve o que você precisa em ${site.city}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — quem resolve o que você precisa em ${site.city}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
  authors: [{ name: site.company, url: site.companyUrl }],
  creator: site.company,
  // Instalado, o site (e o acompanhamento do morador, que vive sob o mesmo
  // escopo) abre em tela cheia no iOS, sem a barra do Safari.
  appleWebApp: { capable: true, statusBarStyle: "default", title: site.name },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1310" },
  ],
  colorScheme: "light dark",
  // Sem isto, `env(safe-area-inset-bottom)` resolve para 0 — a barra fixa do
  // mobile em /parceiros e a navegação inferior do Portal do Morador ficam
  // sob a barra de gestos em vez de acima dela.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Sem JS, nada pode ficar invisível esperando uma revelação. */}
        <noscript>
          <style>{`.cr-reveal{opacity:1;transform:none;filter:none}.cr-enter{animation:none}`}</style>
        </noscript>
      </head>
      <body className="flex min-h-full flex-col"><PwaBootstrap />{children}</body>
    </html>
  );
}
