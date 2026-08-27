import Link from "next/link";
import { leavePartner, leaveResident } from "@/app/actions/audience";

const residentNav = [
  ["/minhas-solicitacoes", "Solicitações"],
  ["/solicitar", "Pedir ajuda"],
  ["/minhas-solicitacoes/notificacoes", "Atualizações"],
] as const;
const partnerNav = [
  ["/parceiro", "Início"],
  ["/parceiro/oportunidades", "Oportunidades"],
  ["/parceiro/perfil", "Perfil"],
  ["/parceiro/notificacoes", "Atualizações"],
] as const;

export function AudienceShell({ audience, title, children }: { audience: "resident" | "partner"; title: string; children: React.ReactNode }) {
  const nav = audience === "resident" ? residentNav : partnerNav;
  const leave = audience === "resident" ? leaveResident : leavePartner;
  return (
    <div className="bg-bg min-h-dvh pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0">
      <header className="border-line bg-bg/90 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href={audience === "resident" ? "/minhas-solicitacoes" : "/parceiro"} className="text-ink text-base font-semibold tracking-tight">
            Canaã <span className="text-brand-ink">Resolve</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-faint hidden text-xs sm:block">{audience === "resident" ? "Seu espaço" : "Partner App"}</span>
            <form action={leave}><button className="text-muted min-h-10 rounded-lg px-2 text-sm hover:text-ink">Sair</button></form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl lg:grid-cols-[13rem_1fr] lg:gap-10 lg:px-6">
        <aside className="hidden py-8 lg:block">
          <p className="text-faint mb-4 px-3 text-xs font-semibold tracking-[0.12em] uppercase">{audience === "resident" ? "Minha conta" : "Minha empresa"}</p>
          <nav className="space-y-1">{nav.map(([href, label]) => <Link key={href} href={href} className="text-muted hover:bg-surface-2 hover:text-ink block rounded-xl px-3 py-2.5 text-sm font-medium">{label}</Link>)}</nav>
        </aside>
        <main className="px-4 py-7 sm:px-6 sm:py-9 lg:px-0"><h1 className="sr-only">{title}</h1>{children}</main>
      </div>
      <nav aria-label="Navegação principal" className={`border-line bg-surface/95 fixed inset-x-0 bottom-0 z-40 grid ${nav.length === 4 ? "grid-cols-4" : "grid-cols-3"} border-t px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur lg:hidden`}>
        {nav.map(([href, label]) => <Link key={href} href={href} className="text-muted hover:text-brand-ink min-h-14 content-center rounded-xl text-center text-xs font-medium">{label}</Link>)}
      </nav>
    </div>
  );
}

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" }) {
  const colors = tone === "good" ? "bg-brand-soft text-brand-ink" : tone === "warn" ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-muted";
  return <span className={`${colors} inline-flex rounded-full px-2.5 py-1 text-xs font-semibold`}>{children}</span>;
}
