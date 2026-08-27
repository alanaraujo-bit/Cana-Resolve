import Link from "next/link";
import { AccessForm } from "@/components/audience/access-form";

export const metadata = { title: "Acompanhar solicitação", robots: { index: false, follow: false } };

export default function TrackRequestPage() {
  return (
    <main className="cr-contour bg-bg min-h-dvh px-4 py-[max(2.5rem,env(safe-area-inset-top))] sm:py-16">
      <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-[1fr_25rem] lg:items-center">
        <div><Link href="/" className="text-brand-ink text-sm font-semibold">← Canaã Resolve</Link><p className="text-brand-ink mt-10 text-xs font-bold tracking-[0.14em] uppercase">Acompanhe seu pedido</p><h1 className="mt-3 max-w-lg text-4xl leading-tight sm:text-5xl">Seu problema continua por aqui.</h1><p className="text-muted mt-5 max-w-xl text-base leading-relaxed">Use o código que apareceu depois do envio e o mesmo WhatsApp informado. Você verá atualizações e os profissionais relacionados ao seu pedido.</p><p className="text-faint mt-7 text-sm">Ainda precisa pedir ajuda? <Link href="/solicitar" className="text-brand-ink underline underline-offset-4">Começar uma solicitação</Link>.</p></div>
        <AccessForm audience="resident" />
      </div>
    </main>
  );
}
