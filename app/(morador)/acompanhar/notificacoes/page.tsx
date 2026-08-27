import { redirect } from "next/navigation";

import { EmptyState, formatDateTime } from "@/components/ops/ui";
import { ResidentShell } from "@/components/portal/shell";
import { getResidentViewer } from "@/lib/auth/audience";
import { residentNotifications } from "@/lib/domain/audience";

export const metadata = { title: "Atualizações", robots: { index: false, follow: false } };

export default async function AcompanharNotificacoesPage() {
  const viewer = await getResidentViewer();
  if (!viewer) redirect("/acompanhar");

  const items = await residentNotifications(viewer.whatsapp);

  return (
    <ResidentShell title="Atualizações">
      <p className="text-brand-ink text-xs font-bold tracking-[0.14em] uppercase">Atualizações</p>
      <h2 className="mt-2 text-3xl">Tudo que precisa da sua atenção.</h2>
      {items.length ? (
        <div className="mt-7 space-y-3">
          {items.map((item) => (
            <a key={item.id} href={item.href || "/acompanhar"} className="border-line bg-surface block rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{item.title}</p>
                {!item.readAt ? <span aria-hidden="true" className="bg-brand mt-1.5 h-2 w-2 shrink-0 rounded-full" /> : null}
              </div>
              <p className="text-muted mt-1 text-sm">{item.body}</p>
              <p className="text-faint mt-2 text-xs">{formatDateTime(item.createdAt)}</p>
            </a>
          ))}
        </div>
      ) : (
        <EmptyState
          className="border-line bg-surface mt-7 rounded-2xl border"
          title="Sem novas atualizações."
          hint="Quando houver algo importante sobre uma solicitação, avisaremos aqui."
        />
      )}
    </ResidentShell>
  );
}
