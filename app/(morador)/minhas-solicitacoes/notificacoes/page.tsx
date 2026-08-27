import { redirect } from "next/navigation";
import { getResidentViewer } from "@/lib/auth/audience";
import { residentNotifications } from "@/lib/domain/audience";
import { AudienceShell } from "@/components/audience/shell";

export const metadata = { title: "Atualizações", robots: { index: false, follow: false } };
export default async function ResidentNotificationsPage() { const viewer = await getResidentViewer(); if (!viewer) redirect("/acompanhar"); const items = await residentNotifications(viewer.whatsapp); return <AudienceShell audience="resident" title="Atualizações"><p className="text-brand-ink text-xs font-bold tracking-[0.14em] uppercase">Atualizações</p><h2 className="mt-2 text-3xl">Tudo que precisa da sua atenção.</h2>{items.length ? <div className="mt-7 space-y-3">{items.map((item) => <a key={item.id} href={item.href || "#"} className="border-line bg-surface block rounded-2xl border p-4"><p className="font-semibold">{item.title}</p><p className="text-muted mt-1 text-sm">{item.body}</p></a>)}</div> : <div className="border-line bg-surface mt-7 rounded-2xl border p-6"><p className="font-semibold">Sem novas atualizações.</p><p className="text-muted mt-1 text-sm">Quando houver algo importante sobre uma solicitação, avisaremos aqui.</p></div>}</AudienceShell>; }
