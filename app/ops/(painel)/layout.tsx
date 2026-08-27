import type { Metadata, Viewport } from "next";

import { IconExit } from "@/components/ops/icons";
import { OpsShell } from "@/components/ops/shell";
import { requireOperator } from "@/lib/auth/guard";
import { sair } from "../actions";

export const metadata: Metadata = {
  title: { default: "Operations", template: "%s · Operations" },
  robots: { index: false, follow: false },
  // Instalado, o Operations abre em tela cheia e se comporta como aplicativo.
  manifest: "/ops-app.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CR Operations" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ec" },
    { media: "(prefers-color-scheme: dark)", color: "#17241e" },
  ],
  // Sem isto, o conteúdo passa por baixo do notch e da barra de gestos.
  viewportFit: "cover",
  colorScheme: "light dark",
};

/**
 * O layout do Operations confere a sessão para montar o cabeçalho — mas essa
 * conferência **não** é a proteção da área. Layouts são reaproveitados entre
 * navegações do cliente, então cada página e cada ação chamam
 * `requireOperator()` por conta própria.
 */
export default async function OpsLayout({ children }: LayoutProps<"/ops">) {
  const user = await requireOperator();

  const sairButton = (
    <form action={sair}>
      <button
        type="submit"
        className="text-muted hover:text-ink hover:bg-surface-2 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.8125rem] transition-colors"
      >
        <IconExit className="h-4 w-4" />
        Sair
      </button>
    </form>
  );

  return (
    <OpsShell user={user} sairButton={sairButton}>
      {children}
    </OpsShell>
  );
}
