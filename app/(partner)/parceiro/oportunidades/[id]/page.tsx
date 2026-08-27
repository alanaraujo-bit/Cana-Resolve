import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updateOpportunity } from "@/app/actions/audience";
import { Badge, formatDate } from "@/components/ops/ui";
import { PartnerShell } from "@/components/portal/shell";
import { buttonClass } from "@/components/ui";
import { getPartnerViewer } from "@/lib/auth/audience";
import { partnerOpportunity } from "@/lib/domain/audience";
import { waLinkTo } from "@/lib/domain/phone";
import { stateTone } from "@/lib/domain/states";

export const metadata = { title: "Oportunidade", robots: { index: false, follow: false } };

const atualizacoes: { status: string; label: string }[] = [
  { status: "contato_realizado", label: "Entrei em contato" },
  { status: "orcamento", label: "Enviei orçamento" },
  { status: "contratado", label: "Serviço contratado" },
  { status: "cliente_nao_respondeu", label: "Cliente não respondeu" },
  { status: "nao_fechou", label: "Não fechou" },
];

export default async function PartnerOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getPartnerViewer();
  if (!viewer) redirect("/parceiro/entrar");

  const { id } = await params;
  const item = await partnerOpportunity(viewer.id, id);
  if (!item) notFound();

  const isNew = item.status === "encaminhado";

  return (
    <PartnerShell title={item.description}>
      <Link href="/parceiro/oportunidades" className="text-brand-ink text-sm font-semibold">
        ← Oportunidades
      </Link>

      <section className="mt-6">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <p className="text-faint text-xs font-semibold tracking-[0.12em] uppercase">{item.requestCode}</p>
            <h2 className="mt-2 text-3xl leading-tight">{item.description}</h2>
          </div>
          <Badge tone={stateTone("opportunity", item.status)}>
            {isNew ? "Nova oportunidade" : item.status.replaceAll("_", " ")}
          </Badge>
        </div>
        <dl className="border-line mt-6 grid grid-cols-2 gap-4 rounded-2xl border p-4 text-sm">
          <div>
            <dt className="text-faint">Região</dt>
            <dd className="mt-1 font-medium">{item.neighborhood || "Canaã dos Carajás"}</dd>
          </div>
          <div>
            <dt className="text-faint">Urgência</dt>
            <dd className="mt-1 font-medium">{item.urgency || "A combinar"}</dd>
          </div>
          <div>
            <dt className="text-faint">Categoria</dt>
            <dd className="mt-1 font-medium">{item.categoryName || "A definir"}</dd>
          </div>
        </dl>
      </section>

      {isNew ? (
        <section className="border-accent-line bg-accent-soft mt-7 rounded-2xl border p-5">
          <h3 className="text-xl">Você consegue atender?</h3>
          <p className="text-muted mt-1 text-sm">
            Ao demonstrar interesse, liberamos os dados necessários para você falar com o morador.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={updateOpportunity}>
              <input type="hidden" name="id" value={item.id} />
              <button name="status" value="respondeu" className={buttonClass("brand", "md")}>
                Tenho interesse
              </button>
            </form>
            <form action={updateOpportunity}>
              <input type="hidden" name="id" value={item.id} />
              <button name="status" value="recusou" className={buttonClass("outline", "md")}>
                Não consigo atender
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {item.contactAllowed && item.residentWhatsapp ? (
        <section className="border-brand-line bg-brand-soft mt-7 rounded-2xl border p-5">
          <h3 className="text-xl">Contato do morador</h3>
          <p className="mt-2 font-semibold">{item.residentName}</p>
          <a
            href={waLinkTo(item.residentWhatsapp, `Olá, sou parceiro do Canaã Resolve e recebi seu pedido ${item.requestCode}.`)}
            target="_blank"
            rel="noreferrer"
            className="text-brand-ink mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
          >
            Falar pelo WhatsApp
          </a>
        </section>
      ) : null}

      {item.contactAllowed && !["contratado", "nao_fechou", "cliente_nao_respondeu"].includes(item.status) ? (
        <section className="mt-8">
          <h3 className="text-xl">Atualizar andamento</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {atualizacoes.map(({ status, label }) => (
              <form key={status} action={updateOpportunity}>
                <input type="hidden" name="id" value={item.id} />
                <button name="status" value={status} className={buttonClass("outline", "sm")}>
                  {label}
                </button>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      {item.timeline.length ? (
        <section className="mt-9">
          <h3 className="text-xl">Histórico</h3>
          <ol className="border-line mt-4 border-l pl-5">
            {item.timeline.map((entry) => (
              <li
                key={entry.id}
                className="before:bg-brand relative pb-5 text-sm before:absolute before:top-1.5 before:-left-[1.72rem] before:h-2.5 before:w-2.5 before:rounded-full"
              >
                <p className="font-medium">{entry.summary}</p>
                <time className="text-faint mt-1 block text-xs">{formatDate(entry.at)}</time>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </PartnerShell>
  );
}
