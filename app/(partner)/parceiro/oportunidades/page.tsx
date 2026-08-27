import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge, EmptyState } from "@/components/ops/ui";
import { PartnerShell } from "@/components/portal/shell";
import { getPartnerViewer } from "@/lib/auth/audience";
import { partnerOpportunities } from "@/lib/domain/audience";
import { stateTone } from "@/lib/domain/states";

export const metadata = { title: "Oportunidades", robots: { index: false, follow: false } };

export default async function PartnerOpportunitiesPage() {
  const viewer = await getPartnerViewer();
  if (!viewer) redirect("/parceiro/entrar");

  const items = await partnerOpportunities(viewer.id);

  return (
    <PartnerShell title="Oportunidades">
      <p className="text-brand-ink text-xs font-bold tracking-[0.14em] uppercase">Histórico</p>
      <h2 className="mt-2 text-3xl">Oportunidades</h2>
      <p className="text-muted mt-2">Pedidos que a operação relacionou à sua empresa.</p>

      <div className="mt-7 space-y-3">
        {items.length ? (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/parceiro/oportunidades/${item.id}`}
              className="border-line bg-surface hover:border-brand-line block rounded-2xl border p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{item.description}</h3>
                  <p className="text-muted mt-1 text-sm">
                    {item.neighborhood || "Canaã dos Carajás"} · {item.categoryName || "Serviço"}
                  </p>
                </div>
                <Badge tone={stateTone("opportunity", item.status)}>
                  {item.status === "encaminhado" ? "Aguardando você" : item.status.replaceAll("_", " ")}
                </Badge>
              </div>
            </Link>
          ))
        ) : (
          <EmptyState
            className="border-line bg-surface rounded-2xl border"
            title="Nenhuma oportunidade recebida ainda."
            hint="A operação só envia pedidos compatíveis com o que sua empresa atende."
          />
        )}
      </div>
    </PartnerShell>
  );
}
