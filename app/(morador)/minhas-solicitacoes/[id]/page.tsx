import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getResidentViewer } from "@/lib/auth/audience";
import { residentRequest, residentState } from "@/lib/domain/audience";
import { updateResidentResolution } from "@/app/actions/audience";
import { AudienceShell, StatusPill } from "@/components/audience/shell";

export const metadata = { title: "Detalhes da solicitação", robots: { index: false, follow: false } };

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });

export default async function ResidentRequestDetail({ params }: PageProps<"/minhas-solicitacoes/[id]">) {
  const viewer = await getResidentViewer();
  if (!viewer) redirect("/acompanhar");
  const { id } = await params;
  const data = await residentRequest(viewer.whatsapp, id);
  if (!data) notFound();
  const { request, related, timeline } = data;
  const state = residentState(request.status);
  return <AudienceShell audience="resident" title={request.description}><Link href="/minhas-solicitacoes" className="text-brand-ink text-sm font-semibold">← Solicitações</Link>
    <section className="mt-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-faint text-xs font-semibold tracking-[0.12em] uppercase">{request.code}</p><h2 className="mt-2 max-w-2xl text-3xl leading-tight">{request.description}</h2></div><StatusPill tone={request.status === "resolvida" ? "good" : "warn"}>{state.title}</StatusPill></div><p className="text-muted mt-3 max-w-2xl leading-relaxed">{state.hint}</p><dl className="border-line mt-6 grid grid-cols-2 gap-4 rounded-2xl border p-4 text-sm sm:grid-cols-3"><div><dt className="text-faint">Categoria</dt><dd className="mt-1 font-medium">{request.categoryName || "A definir"}</dd></div><div><dt className="text-faint">Bairro</dt><dd className="mt-1 font-medium">{request.neighborhood || "Não informado"}</dd></div><div><dt className="text-faint">Enviado em</dt><dd className="mt-1 font-medium">{dateFormat.format(request.createdAt)}</dd></div></dl></section>
    {related.length ? <section className="mt-9"><h3 className="text-xl">Profissionais relacionados</h3><p className="text-muted mt-1 text-sm">Mostramos apenas quem realmente foi relacionado ao seu pedido.</p><div className="mt-4 space-y-3">{related.map((partner) => <article key={partner.id} className="border-line bg-surface rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold">{partner.name}</h4><p className="text-muted mt-1 text-sm">{partner.description || "Parceiro Canaã Resolve"}</p></div><StatusPill tone={partner.contactAllowed ? "good" : "neutral"}>{partner.contactAllowed ? "Pode entrar em contato" : "Aguardando resposta"}</StatusPill></div>{partner.contactAllowed ? <a className="text-brand-ink mt-4 inline-flex min-h-10 items-center text-sm font-semibold underline underline-offset-4" href={`https://wa.me/${partner.whatsapp}?text=${encodeURIComponent(`Olá, vi seu contato pelo Canaã Resolve sobre a solicitação ${request.code}.`)}`} target="_blank" rel="noreferrer">Falar pelo WhatsApp</a> : null}</article>)}</div></section> : null}
    <section className="border-line bg-surface mt-9 rounded-2xl border p-5"><h3 className="text-xl">Conseguiu resolver?</h3><p className="text-muted mt-1 text-sm">Sua resposta ajuda a equipe a saber se ainda precisa acompanhar este pedido.</p><div className="mt-4 flex flex-wrap gap-2">{[["sim", "Sim, consegui"], ["ainda_nao", "Ainda não"], ["nao_precisei", "Não precisei mais"]].map(([answer, label]) => <form key={answer} action={updateResidentResolution}><input type="hidden" name="id" value={request.id} /><button name="answer" value={answer} className="border-line hover:bg-surface-2 min-h-11 rounded-xl border px-3.5 text-sm font-semibold">{label}</button></form>)}</div></section>
    {timeline.length ? <section className="mt-9"><h3 className="text-xl">Atualizações</h3><ol className="border-line mt-4 border-l pl-5">{timeline.map((item) => <li key={item.id} className="relative pb-5 text-sm before:bg-brand before:absolute before:-left-[1.72rem] before:top-1.5 before:h-2.5 before:w-2.5 before:rounded-full"><p className="font-medium">{item.summary}</p><time className="text-faint mt-1 block text-xs">{dateFormat.format(item.at)}</time></li>)}</ol></section> : null}
  </AudienceShell>;
}
