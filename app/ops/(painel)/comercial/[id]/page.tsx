import Link from "next/link";
import { notFound } from "next/navigation";

import { NoteForm, StatusChanger } from "@/components/ops/forms";
import { ProspectForm } from "@/components/ops/prospect-form";
import { Timeline } from "@/components/ops/timeline";
import {
  Badge,
  Dash,
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
import { formatPhone, waLinkTo } from "@/lib/domain/phone";
import { getProspect, prospectApplications } from "@/lib/domain/prospects";
import { prospectLostReasons } from "@/lib/domain/states";
import { site } from "@/lib/site";
import {
  mudarEstadoProspect,
  registrarInteracaoProspect,
  salvarProspect,
} from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const linha = await getProspect(id);
  return { title: linha ? linha.prospect.name : "Prospect" };
}

export default async function ProspectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ja?: string }>;
}) {
  await requireOperator();
  const [{ id }, { ja }] = await Promise.all([params, searchParams]);

  const linha = await getProspect(id);
  if (!linha) notFound();

  const p = linha.prospect;
  const [historico, cadastros, catalogo] = await Promise.all([
    timelineOf("prospect", p.id),
    prospectApplications(p.id),
    listCatalog(),
  ]);

  const mensagemPagina = [
    `Olá! Aqui é do Canaã Resolve.`,
    "",
    `Estamos montando a rede inicial de profissionais e empresas de Canaã dos Carajás, e a ${p.name} entra bem na proposta.`,
    "",
    `Dá uma olhada aqui: ${site.url}/parceiros`,
    "",
    "Qualquer dúvida, é só me chamar por aqui.",
  ].join("\n");

  return (
    <>
      <PageHeader
        eyebrow={<span className="font-mono tabular-nums">{p.code}</span>}
        title={p.name}
        lead={p.contactName ? `Falando com ${p.contactName}` : undefined}
        actions={
          <>
            <a
              href={waLinkTo(p.whatsapp, mensagemPagina)}
              target="_blank"
              rel="noopener noreferrer"
              className="border-line-strong text-ink hover:bg-surface-2 inline-flex h-9 items-center rounded-lg border px-3.5 text-[0.875rem] font-medium transition-colors"
            >
              Enviar a página
            </a>
            {p.partnerId ? (
              <Link
                href={`/ops/parceiros/${p.partnerId}`}
                className="bg-brand text-on-brand hover:bg-brand-hover inline-flex h-9 items-center rounded-lg px-3.5 text-[0.875rem] font-medium transition-colors"
              >
                Ver como parceiro
              </Link>
            ) : null}
            <Link
              href="/ops/comercial"
              className="text-muted hover:text-ink inline-flex h-9 items-center px-1 text-[0.875rem] transition-colors"
            >
              Voltar
            </Link>
          </>
        }
      />

      {ja ? (
        <Panel className="border-accent-line bg-accent-soft/50 mb-5 px-4 py-3">
          <p className="text-accent-ink text-[0.875rem] leading-snug">
            Esta empresa já estava no funil com esse mesmo WhatsApp. Nada foi
            duplicado — você está vendo o registro que já existia.
          </p>
        </Panel>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-5">
          <Panel>
            <PanelHeader
              title="A empresa"
              hint={`No funil desde ${formatDateTime(p.createdAt)}.`}
              actions={<StatusBadge machine="prospect" status={p.status} />}
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
              <KeyValue label="Categoria">{linha.categoryName ?? <Dash />}</KeyValue>
              <KeyValue label="Origem">{p.source || <Dash />}</KeyValue>
              <KeyValue label="Última conversa">
                {p.lastInteractionAt ? formatDateTime(p.lastInteractionAt) : <Dash />}
              </KeyValue>
              {p.lostReason ? (
                <KeyValue label="Motivo de não avançar">
                  {prospectLostReasons.find((r) => r.id === p.lostReason)?.label ??
                    p.lostReason}
                </KeyValue>
              ) : null}
            </dl>
          </Panel>

          <Panel>
            <PanelHeader
              title="Cadastros enviados pelo site"
              hint="O que a empresa declarou em /parceiros, preservado como veio."
            />
            {cadastros.length === 0 ? (
              <p className="text-faint px-4 py-4 text-[0.875rem] leading-relaxed">
                Nenhum ainda. Quando a empresa preencher o formulário de{" "}
                <code className="text-muted">/parceiros</code>, o cadastro cai
                automaticamente aqui — e não some se ela fechar o WhatsApp.
              </p>
            ) : (
              <ul className="divide-line divide-y">
                {cadastros.map((c) => (
                  <li key={c.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-ink text-[0.9375rem] font-medium">
                        {c.company}
                      </span>
                      <StatusBadge machine="application" status={c.status} />
                    </div>
                    <p className="text-faint mt-1 text-[0.8125rem]">
                      {c.name} · {formatPhone(c.whatsapp)} ·{" "}
                      {c.servesCanaa ? "atende Canaã" : "ainda não atende Canaã"}
                      {c.howFound ? ` · conheceu por ${c.howFound}` : ""}
                    </p>
                    <p className="text-faint mt-0.5 text-[0.75rem]">
                      {formatDateTime(c.createdAt)}
                    </p>
                    {["recebido", "em_analise"].includes(c.status) ? (
                      <Link
                        href={`/ops/cadastros?cadastro=${c.id}`}
                        className="text-brand-ink hover:text-brand-hover mt-1.5 inline-block text-[0.8125rem] font-medium"
                      >
                        Analisar este cadastro →
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Dados" hint="O que a gente sabe sobre a empresa." />
            <ProspectForm
              action={salvarProspect}
              valores={p}
              categorias={catalogo.map((c) => ({ id: c.id, name: c.name }))}
            />
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Etapa do funil" />
            <StatusChanger
              machine="prospect"
              current={p.status}
              action={mudarEstadoProspect}
              id={p.id}
            />
          </Panel>

          {p.nextActionAt ? (
            <Panel className="px-4 py-3">
              <p className="text-faint text-[0.75rem] font-medium tracking-[0.03em] uppercase">
                Próximo retorno
              </p>
              <p className="text-ink mt-1.5 text-[0.9375rem] leading-snug">
                {p.nextAction || "Sem descrição"}
              </p>
              <p className="mt-2">
                <Badge
                  tone={
                    p.nextActionAt.getTime() <= linha.agora.getTime()
                      ? "attention"
                      : "neutral"
                  }
                  dot={false}
                >
                  {formatDateTime(p.nextActionAt)}
                </Badge>
              </p>
            </Panel>
          ) : null}

          <Panel className="overflow-hidden">
            <PanelHeader title="Histórico" hint="Como esta empresa chegou até aqui." />
            <Timeline
              entries={historico}
              vazio="Registre a primeira conversa abaixo — é assim que o funil deixa de depender de memória."
            />
            <NoteForm action={registrarInteracaoProspect} id={p.id} />
          </Panel>
        </div>
      </div>
    </>
  );
}
