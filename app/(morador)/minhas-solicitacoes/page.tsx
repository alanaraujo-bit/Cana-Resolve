import Link from "next/link";
import { redirect } from "next/navigation";
import { getResidentViewer } from "@/lib/auth/audience";
import { residentRequests, residentState } from "@/lib/domain/audience";
import { AudienceShell, StatusPill } from "@/components/audience/shell";

export const metadata = { title: "Minhas solicitações", robots: { index: false, follow: false } };

export default async function ResidentRequestsPage() {
  const viewer = await getResidentViewer();
  if (!viewer) redirect("/acompanhar");
  const requests = await residentRequests(viewer.whatsapp);
  const open = requests.filter((item) => !["resolvida", "cancelada", "invalida", "duplicada"].includes(item.status));
  return <AudienceShell audience="resident" title="Minhas solicitações"><section className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-brand-ink text-xs font-bold tracking-[0.14em] uppercase">Olá</p><h2 className="mt-2 text-3xl">O que podemos ajudar a resolver?</h2></div><Link href="/solicitar" className="bg-brand text-on-brand min-h-11 content-center rounded-xl px-4 text-sm font-semibold">Pedir ajuda</Link></section>
    {open[0] ? <section className="border-brand-line bg-brand-soft mt-7 rounded-2xl border p-5"><p className="text-brand-ink text-sm font-semibold">Acompanhando agora</p><Link href={`/minhas-solicitacoes/${open[0].id}`} className="mt-2 block text-lg font-semibold">{open[0].description}</Link><p className="text-muted mt-1 text-sm">{residentState(open[0].status).hint}</p></section> : null}
    <section className="mt-9"><h3 className="text-xl">Suas solicitações</h3>{requests.length ? <div className="mt-4 space-y-3">{requests.map((item) => { const state = residentState(item.status); return <Link key={item.id} href={`/minhas-solicitacoes/${item.id}`} className="border-line bg-surface hover:border-brand-line block rounded-2xl border p-4 transition sm:p-5"><div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold">{item.description}</h4><p className="text-muted mt-1 text-sm">{state.title}{item.neighborhood ? ` · ${item.neighborhood}` : ""}</p></div><StatusPill tone={item.status === "resolvida" ? "good" : item.status === "nova" ? "warn" : "neutral"}>{item.code}</StatusPill></div></Link>})}</div> : <div className="border-line bg-surface mt-4 rounded-2xl border p-6"><p className="font-semibold">Ainda não há solicitações.</p><p className="text-muted mt-1 text-sm">Quando precisar, conte seu problema em poucas palavras.</p></div>}</section>
  </AudienceShell>;
}
