import Link from "next/link";

import {
  Badge,
  EmptyState,
  Metric,
  Panel,
  PanelHeader,
  PageHeader,
} from "@/components/ops/ui";
import { cx } from "@/components/ui";
import { requireOperator } from "@/lib/auth/guard";
import { urgencias } from "@/lib/categories";
import { duracaoLegivel, loadAnalytics, type Periodo } from "@/lib/domain/analytics";
import {
  prospectLostReasons,
  stateLabel,
  statesOf,
} from "@/lib/domain/states";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const periodos: { id: string; label: string; dias: Periodo }[] = [
  { id: "7", label: "7 dias", dias: 7 },
  { id: "30", label: "30 dias", dias: 30 },
  { id: "90", label: "90 dias", dias: 90 },
  { id: "tudo", label: "Desde o início", dias: 0 },
];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  await requireOperator();
  const { periodo } = await searchParams;
  const escolhido = periodos.find((p) => p.id === periodo) ?? periodos[1];

  const dados = await loadAnalytics(escolhido.dias);
  const { comercial, demanda, distribuicao } = dados;

  const maiorEtapa = Math.max(1, ...comercial.etapas.map((e) => e.n));
  const maiorCategoria = Math.max(1, ...demanda.porCategoria.map((c) => c.n));

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="O que os dados dizem"
        lead="Só o que existe de verdade no banco. Onde ainda não há dado, a tela diz que não há — em vez de mostrar zero como se fosse resultado."
        actions={
          <div className="flex gap-1">
            {periodos.map((p) => (
              <Link
                key={p.id}
                href={`/ops/analytics?periodo=${p.id}`}
                className={cx(
                  "inline-flex h-9 items-center rounded-lg border px-3 text-[0.8125rem] font-medium transition-colors",
                  p.id === escolhido.id
                    ? "border-brand-line bg-brand-soft text-brand-ink"
                    : "border-line text-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {p.label}
              </Link>
            ))}
          </div>
        }
      />

      {/* ---------- comercial ---------- */}
      <Panel className="mb-5 overflow-hidden">
        <PanelHeader
          title="Aquisição de parceiros"
          hint="Quantas empresas chegaram até pelo menos cada etapa, no período."
        />
        {comercial.total === 0 ? (
          <EmptyState
            title="Nenhuma empresa entrou no funil no período"
            hint="Cadastre empresas em Comercial ou espere os cadastros do site. O funil aparece assim que houver o primeiro registro."
          />
        ) : (
          <div className="px-4 py-4">
            <ul className="space-y-2">
              {comercial.etapas.map((etapa) => (
                <li key={etapa.etapa} className="flex items-center gap-3">
                  <span className="text-muted w-[11rem] shrink-0 text-[0.8125rem]">
                    {stateLabel("prospect", etapa.etapa)}
                  </span>
                  <span className="bg-surface-3 h-5 min-w-0 flex-1 overflow-hidden rounded">
                    <span
                      className="bg-brand block h-full rounded"
                      style={{ width: `${Math.max(2, (etapa.n / maiorEtapa) * 100)}%` }}
                    />
                  </span>
                  <span className="text-ink w-10 shrink-0 text-right text-[0.875rem] font-medium tabular-nums">
                    {etapa.n}
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-line mt-4 grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-4">
              <Metric label="No funil" value={comercial.total} hint="entraram no período" />
              <Metric
                label="Pagaram"
                value={comercial.pagos}
                hint="participação reservada"
              />
              <Metric
                label="Fundadores"
                value={comercial.fundadores}
                hint="na primeira fase"
              />
              <Metric
                label="Não avançaram"
                value={comercial.perdidos}
                hint="saíram do funil"
                tone={comercial.perdidos > 0 ? "attention" : undefined}
              />
            </div>
          </div>
        )}
      </Panel>

      <div className="mb-5 grid items-start gap-5 lg:grid-cols-2">
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Por que não avançam"
            hint="O motivo registrado na saída do funil."
          />
          {comercial.perdas.length === 0 ? (
            <EmptyState
              title="Nenhuma perda registrada"
              hint="Quando marcar uma empresa como “Não avançou”, escolha o motivo — é o que revela se o problema é preço, categoria ou abordagem."
            />
          ) : (
            <ul className="divide-line divide-y">
              {comercial.perdas.map((p) => (
                <li
                  key={p.reason ?? "sem"}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <span className="text-muted text-[0.875rem]">
                    {prospectLostReasons.find((r) => r.id === p.reason)?.label ??
                      "Sem motivo registrado"}
                  </span>
                  <span className="text-ink text-[0.875rem] font-medium tabular-nums">
                    {p.n}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="overflow-hidden">
          <PanelHeader
            title="Cadastros do site"
            hint="O que chegou pelo formulário de /parceiros."
          />
          {Object.keys(comercial.cadastros).length === 0 ? (
            <EmptyState
              title="Nenhum cadastro no período"
              hint="O formulário de /parceiros grava direto aqui, antes do WhatsApp."
            />
          ) : (
            <ul className="divide-line divide-y">
              {statesOf("application").map((estado) => (
                <li
                  key={estado.id}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <span className="text-muted text-[0.875rem]">{estado.label}</span>
                  <span
                    className={cx(
                      "text-[0.875rem] font-medium tabular-nums",
                      comercial.cadastros[estado.id] ? "text-ink" : "text-faint",
                    )}
                  >
                    {comercial.cadastros[estado.id] ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ---------- demanda ---------- */}
      <Panel className="mb-5 overflow-hidden">
        <PanelHeader
          title="Demanda dos moradores"
          hint="O que Canaã está pedindo — e quanto tempo leva até chegar a um parceiro."
        />
        {demanda.total === 0 ? (
          <EmptyState
            title="Nenhum pedido no período"
            hint="Cada solicitação enviada em /solicitar entra aqui na hora, com código próprio, mesmo que a conversa no WhatsApp não aconteça."
          />
        ) : (
          <div className="px-4 py-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Pedidos" value={demanda.total} hint="no período" />
              <Metric
                label="Encaminhados"
                value={demanda.encaminhadas}
                hint="chegaram a algum parceiro"
              />
              <Metric
                label="Tempo até encaminhar"
                value={duracaoLegivel(demanda.medianaAteEncaminhar) ?? "—"}
                hint={
                  demanda.medianaAteEncaminhar == null
                    ? "sem encaminhamento ainda"
                    : "mediana"
                }
              />
              <Metric
                label="Contratações"
                value={distribuicao.contratados}
                hint="que a gente sabe"
              />
            </div>

            {demanda.porCategoria.length > 0 ? (
              <div className="border-line mt-5 border-t pt-4">
                <p className="text-faint text-[0.75rem] font-medium tracking-[0.03em] uppercase">
                  Por categoria
                </p>
                <ul className="mt-2.5 space-y-2">
                  {demanda.porCategoria.map((c) => (
                    <li key={c.nome} className="flex items-center gap-3">
                      <span className="text-muted w-[11rem] shrink-0 truncate text-[0.8125rem]">
                        {c.nome}
                      </span>
                      <span className="bg-surface-3 h-5 min-w-0 flex-1 overflow-hidden rounded">
                        <span
                          className="bg-accent block h-full rounded"
                          style={{
                            width: `${Math.max(2, (c.n / maiorCategoria) * 100)}%`,
                          }}
                        />
                      </span>
                      <span className="text-ink w-10 shrink-0 text-right text-[0.875rem] font-medium tabular-nums">
                        {c.n}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="border-line mt-5 grid gap-5 border-t pt-4 sm:grid-cols-2">
              <div>
                <p className="text-faint text-[0.75rem] font-medium tracking-[0.03em] uppercase">
                  Urgência
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {demanda.porUrgencia.map((u) => (
                    <li key={u.id ?? "sem"}>
                      <Badge tone={u.id === "urgente" ? "attention" : "neutral"}>
                        {urgencias.find((x) => x.id === u.id)?.label ?? "Não informada"}:{" "}
                        {u.n}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-faint text-[0.75rem] font-medium tracking-[0.03em] uppercase">
                  Bairros
                </p>
                {demanda.porBairro.length === 0 ? (
                  <p className="text-faint mt-2 text-[0.8125rem]">
                    Nenhum pedido informou o bairro ainda.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {demanda.porBairro.map((b) => (
                      <li key={b.nome}>
                        <Badge tone="neutral" dot={false}>
                          {b.nome}: {b.n}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </Panel>

      {/* ---------- distribuição ---------- */}
      <Panel className="overflow-hidden">
        <PanelHeader
          title="Desfecho dos encaminhamentos"
          hint="O que aconteceu depois que o pedido chegou ao parceiro."
        />
        {distribuicao.total === 0 ? (
          <EmptyState
            title="Nenhum encaminhamento no período"
            hint="Assim que os primeiros pedidos forem para parceiros, esta é a tela que mostra se a rede está respondendo."
          />
        ) : (
          <ul className="divide-line divide-y">
            {statesOf("opportunity")
              .filter((estado) => (distribuicao.porEstado[estado.id] ?? 0) > 0)
              .map((estado) => {
                const n = distribuicao.porEstado[estado.id] ?? 0;
                const parte = Math.round((n / distribuicao.total) * 100);
                return (
                  <li
                    key={estado.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span className="text-muted w-[12rem] shrink-0 text-[0.875rem]">
                      {estado.label}
                    </span>
                    <span className="bg-surface-3 h-4 min-w-0 flex-1 overflow-hidden rounded">
                      <span
                        className={cx(
                          "block h-full rounded",
                          estado.tone === "positive"
                            ? "bg-brand"
                            : estado.tone === "negative"
                              ? "bg-danger"
                              : "bg-line-strong",
                        )}
                        style={{ width: `${Math.max(2, parte)}%` }}
                      />
                    </span>
                    <span className="text-ink w-16 shrink-0 text-right text-[0.875rem] tabular-nums">
                      {n} · {parte}%
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
      </Panel>

      <p className="text-faint mt-5 text-[0.8125rem] leading-relaxed">
        Não aparecem aqui: visitas ao site, mensagens entregues e tempo de
        resposta do parceiro. Nenhum dos três é medido hoje — visita depende de
        uma ferramenta de analytics ainda não instalada, e os outros dois o
        WhatsApp não nos informa. Preferimos a ausência à invenção.
      </p>
    </>
  );
}
