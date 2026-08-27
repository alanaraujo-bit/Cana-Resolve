import Link from "next/link";
import { notFound } from "next/navigation";

import { BetaPanel } from "@/components/ops/beta-panel";
import { NoteForm, StatusChanger } from "@/components/ops/forms";
import { PartnerProfileForm } from "@/components/ops/partner-profile-form";
import { Timeline } from "@/components/ops/timeline";
import {
  Badge,
  Dash,
  EmptyState,
  KeyValue,
  Metric,
  Panel,
  PanelHeader,
  PageHeader,
  StatusBadge,
  When,
  formatDateTime,
} from "@/components/ops/ui";
import { requireOperator } from "@/lib/auth/guard";
import { timelineOf } from "@/lib/domain/activity";
import { betaStatus } from "@/lib/domain/beta";
import { listCatalog } from "@/lib/domain/catalog";
import { partnerOpportunities, partnerScorecard } from "@/lib/domain/opportunities";
import { getPartner } from "@/lib/domain/partners";
import { formatPhone, waLinkTo } from "@/lib/domain/phone";
import {
  concluirOnboarding,
  mudarEstadoParceiro,
  registrarInteracaoParceiro,
  registrarPagamento,
  salvarParceiro,
} from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dados = await getPartner(id);
  return { title: dados ? dados.partner.name : "Parceiro" };
}

export default async function ParceiroPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  await requireOperator();
  const [{ id }, { novo }] = await Promise.all([params, searchParams]);

  const dados = await getPartner(id);
  if (!dados) notFound();

  const p = dados.partner;
  const [historico, catalogo, oportunidades, placar] = await Promise.all([
    timelineOf("partner", p.id),
    listCatalog(),
    partnerOpportunities(p.id),
    partnerScorecard(p.id),
  ]);

  const beta = betaStatus(p);

  return (
    <>
      <PageHeader
        eyebrow={<span className="font-mono tabular-nums">{p.code}</span>}
        title={p.name}
        lead={p.ownerName ? `Responsável: ${p.ownerName}` : undefined}
        actions={
          <>
            <a
              href={waLinkTo(p.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="border-line-strong text-ink hover:bg-surface-2 inline-flex h-9 items-center rounded-lg border px-3.5 text-[0.875rem] font-medium transition-colors"
            >
              WhatsApp
            </a>
            <Link
              href="/ops/parceiros"
              className="text-muted hover:text-ink inline-flex h-9 items-center px-1 text-[0.875rem] transition-colors"
            >
              Voltar
            </Link>
          </>
        }
      />

      {novo ? (
        <Panel className="border-brand-line bg-brand-soft/40 mb-5 px-4 py-3">
          <p className="text-brand-ink text-[0.875rem] leading-relaxed">
            <strong className="font-semibold">Parceiro criado.</strong> Complete
            o perfil abaixo — categorias, serviços e região são o que fazem os
            pedidos certos chegarem até ele. Depois registre o pagamento e
            conclua o onboarding.
          </p>
        </Panel>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-5">
          <Panel>
            <PanelHeader
              title="Identidade"
              hint={`Na rede desde ${formatDateTime(p.createdAt)}.`}
              actions={
                <>
                  {p.founder ? <Badge tone="neutral">Fundador</Badge> : null}
                  <StatusBadge machine="partner" status={p.status} />
                </>
              }
            />
            <dl className="grid grid-cols-2 gap-x-5 gap-y-4 px-4 py-4 sm:grid-cols-3">
              <KeyValue label="WhatsApp">
                <a
                  href={waLinkTo(p.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-ink hover:text-brand-hover tabular-nums"
                >
                  {formatPhone(p.whatsapp)}
                </a>
              </KeyValue>
              <KeyValue label="Categorias">
                {dados.categorias.length === 0 ? (
                  <span className="text-danger">Nenhuma — não recebe pedidos</span>
                ) : (
                  dados.categorias
                    .map((c) => (c.isPrimary ? `${c.name} (principal)` : c.name))
                    .join(", ")
                )}
              </KeyValue>
              <KeyValue label="Região">
                {p.servesWholeCity
                  ? "Canaã inteira"
                  : p.neighborhoods.length > 0
                    ? p.neighborhoods.join(", ")
                    : "Não informada"}
              </KeyValue>
              <KeyValue label="Disponibilidade">{p.availability || <Dash />}</KeyValue>
              <KeyValue label="Serviços marcados">
                {dados.servicos.length || <Dash />}
              </KeyValue>
              <KeyValue label="Origem">
                {dados.prospect ? (
                  <Link
                    href={`/ops/comercial/${dados.prospect.id}`}
                    className="text-brand-ink hover:text-brand-hover font-mono text-[0.875rem]"
                  >
                    {dados.prospect.code}
                  </Link>
                ) : (
                  <Dash />
                )}
              </KeyValue>
            </dl>
          </Panel>

          {/* ---------- desempenho conhecido ---------- */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Recebeu" value={placar.total} hint="pedidos no total" />
            <Metric label="Em aberto" value={placar.vivos} hint="ainda podem fechar" />
            <Metric
              label="Contratou"
              value={placar.contratados}
              hint="até onde sabemos"
            />
            <Metric
              label="Sem resposta"
              value={placar.semResposta}
              hint="não deu retorno"
              tone={placar.semResposta > 0 ? "attention" : undefined}
            />
          </div>

          <Panel>
            <PanelHeader
              title="Perfil"
              hint="É daqui que o encaminhamento tira quem combina com cada pedido."
            />
            <PartnerProfileForm
              action={salvarParceiro}
              valores={{
                id: p.id,
                name: p.name,
                ownerName: p.ownerName,
                whatsapp: p.whatsapp,
                email: p.email,
                document: p.document,
                description: p.description,
                availability: p.availability,
                servesWholeCity: p.servesWholeCity,
                neighborhoods: p.neighborhoods,
                categoryIds: dados.categorias.map((c) => c.id),
                serviceIds: dados.servicos,
                notes: p.notes,
              }}
              categorias={catalogo.map((c) => ({
                id: c.id,
                name: c.name,
                servicos: c.servicos.map((s) => ({ id: s.id, name: s.name })),
              }))}
            />
          </Panel>

          <Panel className="overflow-hidden">
            <PanelHeader
              title="Pedidos que ele recebeu"
              hint="Cada encaminhamento e o desfecho conhecido."
            />
            {oportunidades.length === 0 ? (
              <EmptyState
                title="Ainda não recebeu nada"
                hint="Quando um pedido compatível entrar e for encaminhado para ele, aparece aqui com o desfecho."
              />
            ) : (
              <ul className="divide-line divide-y">
                {oportunidades.map((o) => (
                  <li key={o.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link
                        href={`/ops/solicitacoes/${o.requestId}`}
                        className="text-ink hover:text-brand-ink min-w-0 flex-1 text-[0.9375rem] leading-snug transition-colors"
                      >
                        {o.requestDescription}
                      </Link>
                      <StatusBadge machine="opportunity" status={o.status} />
                    </div>
                    <p className="text-faint mt-1 text-[0.75rem]">
                      <span className="font-mono tabular-nums">{o.requestCode}</span>
                      {o.categoryName ? ` · ${o.categoryName}` : ""} ·{" "}
                      <When value={o.createdAt} />
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Beta Fundador" />
            <BetaPanel
              partnerId={p.id}
              founder={p.founder}
              beta={beta}
              pagamentos={dados.pagamentos}
              registrarPagamento={registrarPagamento}
              concluirOnboarding={concluirOnboarding}
            />
          </Panel>

          <Panel>
            <PanelHeader title="Situação na rede" />
            <StatusChanger
              machine="partner"
              current={p.status}
              action={mudarEstadoParceiro}
              id={p.id}
            />
          </Panel>

          <Panel className="overflow-hidden">
            <PanelHeader title="Histórico" hint="Tudo que aconteceu com este parceiro." />
            <Timeline
              entries={historico}
              vazio="Conversas, pagamentos, mudanças de situação e pedidos recebidos aparecem aqui."
            />
            <NoteForm action={registrarInteracaoParceiro} id={p.id} />
          </Panel>
        </div>
      </div>
    </>
  );
}
