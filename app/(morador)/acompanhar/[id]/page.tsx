import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updateResidentResolution } from "@/app/actions/audience";
import { Badge, formatDate } from "@/components/ops/ui";
import { ResidentShell } from "@/components/portal/shell";
import { buttonClass } from "@/components/ui";
import { getResidentViewer } from "@/lib/auth/audience";
import { residentRequest, residentState } from "@/lib/domain/audience";
import { stateTone } from "@/lib/domain/states";
import { waLinkTo } from "@/lib/domain/phone";

export const metadata = { title: "Detalhes da solicitação", robots: { index: false, follow: false } };

const respostas: { id: "sim" | "ainda_nao" | "nao_precisei"; label: string }[] = [
  { id: "sim", label: "Sim, consegui" },
  { id: "ainda_nao", label: "Ainda não" },
  { id: "nao_precisei", label: "Não precisei mais" },
];

/** Perguntamos só enquanto o pedido está com algum profissional relacionado. */
const perguntaResolucao = ["encaminhada", "em_atendimento"];

export default async function AcompanharDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getResidentViewer();
  if (!viewer) redirect("/acompanhar");

  const { id } = await params;
  const data = await residentRequest(viewer.whatsapp, id);
  if (!data) notFound();

  const { request, related, timeline } = data;
  const estado = residentState(request.status);

  return (
    <ResidentShell title={request.description}>
      <Link href="/acompanhar" className="text-brand-ink text-sm font-semibold">
        ← Minhas solicitações
      </Link>

      <section className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-faint text-xs font-semibold tracking-[0.12em] uppercase">{request.code}</p>
            <h2 className="mt-2 max-w-2xl text-3xl leading-tight">{request.description}</h2>
          </div>
          <Badge tone={stateTone("request", request.status)}>{estado.title}</Badge>
        </div>
        <p className="text-muted mt-3 max-w-2xl leading-relaxed">{estado.hint}</p>

        <dl className="border-line mt-6 grid grid-cols-2 gap-4 rounded-2xl border p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-faint">Categoria</dt>
            <dd className="mt-1 font-medium">{request.categoryName || "A definir"}</dd>
          </div>
          <div>
            <dt className="text-faint">Bairro</dt>
            <dd className="mt-1 font-medium">{request.neighborhood || "Não informado"}</dd>
          </div>
          <div>
            <dt className="text-faint">Enviado em</dt>
            <dd className="mt-1 font-medium">{formatDate(request.createdAt)}</dd>
          </div>
        </dl>
      </section>

      {related.length ? (
        <section className="mt-9">
          <h3 className="text-xl">Profissionais relacionados</h3>
          <p className="text-muted mt-1 text-sm">Mostramos apenas quem realmente foi relacionado ao seu pedido.</p>
          <div className="mt-4 space-y-3">
            {related.map((partner) => (
              <article key={partner.id} className="border-line bg-surface rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold">{partner.name}</h4>
                    <p className="text-muted mt-1 text-sm">{partner.description || "Parceiro Canaã Resolve"}</p>
                  </div>
                  <Badge tone={partner.contactAllowed ? "positive" : "neutral"} dot={false}>
                    {partner.contactAllowed ? "Pode entrar em contato" : "Aguardando resposta"}
                  </Badge>
                </div>
                {partner.contactAllowed && partner.whatsapp ? (
                  <a
                    className="text-brand-ink mt-4 inline-flex min-h-10 items-center text-sm font-semibold underline underline-offset-4"
                    href={waLinkTo(partner.whatsapp, `Olá, vi seu contato pelo Canaã Resolve sobre a solicitação ${request.code}.`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Falar pelo WhatsApp
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {perguntaResolucao.includes(request.status) ? (
        <section className="border-line bg-surface mt-9 rounded-2xl border p-5">
          <h3 className="text-xl">Conseguiu resolver?</h3>
          <p className="text-muted mt-1 text-sm">Sua resposta ajuda a equipe a saber se ainda precisa acompanhar este pedido.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {respostas.map((resposta) => (
              <form key={resposta.id} action={updateResidentResolution}>
                <input type="hidden" name="id" value={request.id} />
                <button name="answer" value={resposta.id} className={buttonClass("outline", "sm")}>
                  {resposta.label}
                </button>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      {timeline.length ? (
        <section className="mt-9">
          <h3 className="text-xl">Atualizações</h3>
          <ol className="border-line mt-4 border-l pl-5">
            {timeline.map((item) => (
              <li
                key={item.id}
                className="before:bg-brand relative pb-5 text-sm before:absolute before:top-1.5 before:-left-[1.72rem] before:h-2.5 before:w-2.5 before:rounded-full"
              >
                <p className="font-medium">{item.summary}</p>
                <time className="text-faint mt-1 block text-xs">{formatDate(item.at)}</time>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </ResidentShell>
  );
}
