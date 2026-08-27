import Link from "next/link";
import { notFound } from "next/navigation";

import { DistributePanel } from "@/components/ops/distribute";
import { NoteForm, StatusChanger } from "@/components/ops/forms";
import { OpportunityRow } from "@/components/ops/opportunity-row";
import { Timeline } from "@/components/ops/timeline";
import { TriageForm } from "@/components/ops/triage-form";
import {
  Dash,
  EmptyState,
  KeyValue,
  Panel,
  PanelHeader,
  PageHeader,
  StatusBadge,
  formatDateTime,
} from "@/components/ops/ui";
import { requireOperator } from "@/lib/auth/guard";
import { timelineOf } from "@/lib/domain/activity";
import { listCatalog } from "@/lib/domain/catalog";
import { findCandidates, networkSize } from "@/lib/domain/matching";
import { oportunidadeMensagem, moradorEncaminhadoMensagem } from "@/lib/domain/messages";
import { formatPhone, waLinkTo } from "@/lib/domain/phone";
import { getRequest, requestOpportunities } from "@/lib/domain/requests";
import { urgencias } from "@/lib/categories";
import { mudarEstadoOportunidade } from "../../oportunidades/actions";
import { encaminhar, mudarEstado, registrarInteracao, salvarTriagem } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const linha = await getRequest(id);
  return { title: linha ? linha.request.code : "Solicitação" };
}

export default async function SolicitacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOperator();
  const { id } = await params;

  const linha = await getRequest(id);
  if (!linha) notFound();

  const s = linha.request;

  const [encaminhamentos, catalogo, historico, tamanhoRede] = await Promise.all([
    requestOpportunities(s.id),
    listCatalog(),
    timelineOf("request", s.id),
    networkSize(),
  ]);

  const candidatos = await findCandidates({
    requestId: s.id,
    categoryId: s.categoryId,
    serviceId: s.serviceId,
    neighborhood: s.neighborhood,
  });

  const mensagemParceiro = oportunidadeMensagem({
    code: s.code,
    categoria: linha.categoryName,
    servico: linha.serviceName,
    descricao: s.description,
    bairro: s.neighborhood,
    urgencia: s.urgency,
    moradorNome: s.residentName,
    moradorWhatsapp: s.whatsapp,
  });

  const urgenciaLabel = urgencias.find((u) => u.id === s.urgency)?.label;

  return (
    <>
      <PageHeader
        eyebrow={<span className="font-mono tabular-nums">{s.code}</span>}
        title={s.description}
        actions={
          <>
            <a
              href={waLinkTo(
                s.whatsapp,
                moradorEncaminhadoMensagem({
                  code: s.code,
                  moradorNome: s.residentName,
                  quantidade: Math.max(1, encaminhamentos.length),
                }),
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="border-line-strong text-ink hover:bg-surface-2 inline-flex h-9 items-center rounded-lg border px-3.5 text-[0.875rem] font-medium transition-colors"
            >
              Falar com {s.residentName.split(/\s+/)[0]}
            </a>
            <Link
              href="/ops/solicitacoes"
              className="text-muted hover:text-ink inline-flex h-9 items-center px-1 text-[0.875rem] transition-colors"
            >
              Voltar
            </Link>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-5">
          {/* ---------- quem pediu ---------- */}
          <Panel>
            <PanelHeader
              title="O pedido"
              hint={`Entrou ${formatDateTime(s.createdAt)}.`}
              actions={<StatusBadge machine="request" status={s.status} />}
            />
            <dl className="grid grid-cols-2 gap-x-5 gap-y-4 px-4 py-4 sm:grid-cols-3">
              <KeyValue label="Morador">{s.residentName}</KeyValue>
              <KeyValue label="WhatsApp">
                <a
                  href={waLinkTo(s.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-ink hover:text-brand-hover"
                >
                  {formatPhone(s.whatsapp)}
                </a>
              </KeyValue>
              <KeyValue label="Bairro">{s.neighborhood || <Dash />}</KeyValue>
              <KeyValue label="Categoria">{linha.categoryName ?? <Dash />}</KeyValue>
              <KeyValue label="Serviço">{linha.serviceName ?? <Dash />}</KeyValue>
              <KeyValue label="Urgência">{urgenciaLabel ?? <Dash />}</KeyValue>
              <KeyValue label="Origem">{s.source || "direto"}</KeyValue>
              <KeyValue label="Autorização">
                {s.consent ? (
                  <span className="text-brand-ink">
                    Autorizou o encaminhamento
                    {s.consentAt ? ` em ${formatDateTime(s.consentAt)}` : ""}
                  </span>
                ) : (
                  <span className="text-danger">Sem autorização registrada</span>
                )}
              </KeyValue>
              {s.closeReason ? (
                <KeyValue label="Motivo do fechamento">{s.closeReason}</KeyValue>
              ) : null}
            </dl>

            {!s.consent ? (
              <p className="border-line bg-danger-soft text-danger border-t px-4 py-2.5 text-[0.8125rem] leading-snug">
                Este pedido não tem o consentimento registrado. Confirme com o
                morador antes de passar os dados dele para qualquer parceiro.
              </p>
            ) : null}
          </Panel>

          {/* ---------- triagem ---------- */}
          <Panel>
            <PanelHeader
              title="Triagem"
              hint="Confirme do que se trata. É o que faz o encaminhamento acertar."
            />
            <TriageForm
              requestId={s.id}
              action={salvarTriagem}
              categorias={catalogo.map((c) => ({
                id: c.id,
                name: c.name,
                servicos: c.servicos.map((sv) => ({ id: sv.id, name: sv.name })),
              }))}
              inicial={{
                categoria: s.categoryId,
                servico: s.serviceId,
                bairro: s.neighborhood,
                urgencia: s.urgency,
                observacoes: s.internalNotes,
              }}
            />
          </Panel>

          {/* ---------- encaminhar ---------- */}
          <Panel>
            <PanelHeader
              title="Encaminhar"
              hint="A ordem considera compatibilidade e distribuição justa — nunca quanto o parceiro paga."
            />
            <DistributePanel
              requestId={s.id}
              candidatos={candidatos}
              mensagem={mensagemParceiro}
              action={encaminhar}
              redeVazia={tamanhoRede === 0}
            />
          </Panel>

          {/* ---------- desfechos ---------- */}
          <Panel>
            <PanelHeader
              title="Quem recebeu"
              hint={
                encaminhamentos.length === 0
                  ? undefined
                  : "Cada parceiro tem o próprio desfecho."
              }
            />
            {encaminhamentos.length === 0 ? (
              <EmptyState
                title="Ainda não foi encaminhado"
                hint="Escolha os parceiros acima. Cada encaminhamento passa a ter história própria a partir daqui."
              />
            ) : (
              <ul className="divide-line divide-y">
                {encaminhamentos.map((o) => (
                  <li key={o.id}>
                    <OpportunityRow
                      oportunidade={o}
                      action={mudarEstadoOportunidade}
                      mensagem={mensagemParceiro}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* ---------- coluna lateral ---------- */}
        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Estado do pedido" />
            <StatusChanger
              machine="request"
              current={s.status}
              action={mudarEstado}
              id={s.id}
            />
          </Panel>

          <Panel className="overflow-hidden">
            <PanelHeader title="Histórico" hint="Como este pedido chegou até aqui." />
            <Timeline
              entries={historico}
              vazio="Assim que houver triagem, encaminhamento ou uma anotação, tudo aparece aqui em ordem."
            />
            <NoteForm action={registrarInteracao} id={s.id} />
          </Panel>
        </div>
      </div>
    </>
  );
}
