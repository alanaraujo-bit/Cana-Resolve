import Link from "next/link";

import { OpportunityRow } from "@/components/ops/opportunity-row";
import { FilterSelect, FilterBar, QuickFilters } from "@/components/ops/filters";
import { EmptyState, Panel, PageHeader, ListFooter } from "@/components/ops/ui";
import { buttonClass } from "@/components/ui";
import { requireOperator } from "@/lib/auth/guard";
import { listOpportunities } from "@/lib/domain/opportunities";
import { statesOf } from "@/lib/domain/states";
import { mudarEstadoOportunidade } from "./actions";

export const metadata = { title: "Oportunidades" };
export const dynamic = "force-dynamic";

const atalhos = [
  { id: "vivas", label: "Em aberto" },
  { id: "encaminhado", label: "Encaminhados" },
  { id: "contato_realizado", label: "Com contato feito" },
  { id: "contratado", label: "Contratados" },
  { id: "sem_resposta", label: "Sem resposta" },
  { id: "todas", label: "Todas" },
];

export default async function OportunidadesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOperator();
  const params = await searchParams;
  const um = (chave: string) => {
    const valor = params[chave];
    return Array.isArray(valor) ? valor[0] : valor;
  };

  const { linhas, total, pagina, paginas } = await listOpportunities({
    estado: um("estado") ?? "vivas",
    pagina: Number(um("pagina") ?? 1),
  });

  return (
    <>
      <PageHeader
        eyebrow="Distribuição"
        title="Encaminhamentos"
        lead="Cada pedido entregue a um parceiro, com o desfecho que a gente conhece. Um pedido encaminhado a três parceiros são três linhas aqui."
      />

      <FilterBar>
        <FilterSelect
          param="estado"
          label="Desfecho"
          todos="Qualquer desfecho"
          opcoes={statesOf("opportunity").map((s) => ({ id: s.id, label: s.label }))}
          soDesktop
        />
      </FilterBar>

      <div className="mb-4">
        <QuickFilters param="estado" opcoes={atalhos} padrao="vivas" />
      </div>

      <Panel className="overflow-hidden">
        {linhas.length === 0 ? (
          <EmptyState
            title={total === 0 ? "Nada foi encaminhado ainda" : "Nenhum com esse desfecho"}
            hint={
              total === 0
                ? "Um encaminhamento nasce na tela de uma solicitação, quando você escolhe os parceiros que vão receber o pedido."
                : "Tente outro recorte."
            }
            action={
              total === 0 ? (
                <Link href="/ops/solicitacoes" className={buttonClass("brand", "sm")}>
                  Ver solicitações
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            <ul className="divide-line divide-y">
              {linhas.map((o) => (
                <li key={o.id}>
                  <div className="bg-surface-2/40 px-4 pt-2.5 pb-0">
                    <Link
                      href={`/ops/solicitacoes/${o.requestId}`}
                      className="text-muted hover:text-brand-ink text-[0.8125rem] transition-colors"
                    >
                      <span className="font-mono tabular-nums">{o.requestCode}</span>
                      {" · "}
                      {o.requestDescription.slice(0, 90)}
                      {o.requestDescription.length > 90 ? "…" : ""}
                    </Link>
                  </div>
                  <OpportunityRow
                    oportunidade={{
                      id: o.id,
                      status: o.status,
                      createdAt: o.createdAt,
                      sentAt: o.sentAt,
                      respondedAt: o.respondedAt,
                      quoteAmountCents: o.quoteAmountCents,
                      outcomeReason: o.outcomeReason,
                      partnerId: o.partnerId,
                      partnerName: o.partnerName,
                      partnerFounder: o.partnerFounder,
                    }}
                    action={mudarEstadoOportunidade}
                  />
                </li>
              ))}
            </ul>
            <ListFooter total={total} singular="encaminhamento" plural="encaminhamentos">
              {paginas > 1 ? (
                <span className="flex items-center gap-3">
                  {pagina > 1 ? (
                    <Link
                      href={`/ops/oportunidades?estado=${um("estado") ?? "vivas"}&pagina=${pagina - 1}`}
                      className="text-brand-ink hover:text-brand-hover"
                    >
                      Anterior
                    </Link>
                  ) : null}
                  <span>
                    {pagina} de {paginas}
                  </span>
                  {pagina < paginas ? (
                    <Link
                      href={`/ops/oportunidades?estado=${um("estado") ?? "vivas"}&pagina=${pagina + 1}`}
                      className="text-brand-ink hover:text-brand-hover"
                    >
                      Próxima
                    </Link>
                  ) : null}
                </span>
              ) : null}
            </ListFooter>
          </>
        )}
      </Panel>
    </>
  );
}
