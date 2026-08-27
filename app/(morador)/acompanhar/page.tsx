import Link from "next/link";

import { PortalHeader, ResidentShell } from "@/components/portal/shell";
import { Badge, EmptyState, formatDate } from "@/components/ops/ui";
import { buttonClass } from "@/components/ui";
import { getResidentViewer } from "@/lib/auth/audience";
import { residentRequests, residentState } from "@/lib/domain/audience";
import { stateTone } from "@/lib/domain/states";

export const metadata = { title: "Acompanhar solicitação", robots: { index: false, follow: false } };

const encerrados = ["resolvida", "cancelada", "invalida", "duplicada", "sem_parceiro"];

/**
 * Quem chega aqui sem cookie não recebe formulário nenhum para tentar
 * adivinhar um código — não existe formulário de acesso do morador. O link
 * assinado enviado depois do pedido é o único caminho, e essa é a explicação
 * que a tela dá. Ver `lib/auth/audience.ts` e HANDOFF.md §3.1/§4.2.
 */
function SemAcesso({ linkInvalido }: { linkInvalido: boolean }) {
  return (
    <main className="cr-contour bg-bg min-h-dvh">
      <PortalHeader />
      <div className="mx-auto max-w-lg px-4 pt-6 pb-16 text-center sm:pt-10">
        <p className="text-brand-ink text-xs font-bold tracking-[0.14em] uppercase">Acompanhar solicitação</p>
        <h1 className="mt-3 text-3xl leading-tight sm:text-4xl">Seu problema continua por aqui.</h1>
        {linkInvalido ? (
          <p className="text-danger mt-5 text-sm font-medium">
            Esse link de acompanhamento não é mais válido.
          </p>
        ) : null}
        <p className="text-muted mt-4 text-base leading-relaxed">
          Depois de enviar um pedido em <span className="text-ink font-medium">/solicitar</span>, a
          tela de confirmação mostra um link de acompanhamento. Abra esse link neste aparelho — ou de
          qualquer outro — para ver o andamento do seu pedido, sem precisar de senha nem cadastro.
        </p>
        <p className="text-faint mt-5 text-sm">
          Perdeu o link? Fale com a gente pelo WhatsApp que reenviamos.
        </p>
        <Link href="/solicitar" className={buttonClass("brand", "lg", "mt-8")}>
          Pedir ajuda agora
        </Link>
      </div>
    </main>
  );
}

export default async function AcompanharPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const viewer = await getResidentViewer();
  if (!viewer) {
    const { erro } = await searchParams;
    return <SemAcesso linkInvalido={erro === "link"} />;
  }

  const requests = await residentRequests(viewer.whatsapp);
  const abertos = requests.filter((item) => !encerrados.includes(item.status));
  const emDestaque = abertos[0];

  return (
    <ResidentShell title="Minhas solicitações">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-brand-ink text-xs font-bold tracking-[0.14em] uppercase">Olá</p>
          <h2 className="mt-2 text-3xl">O que podemos ajudar a resolver?</h2>
        </div>
        <Link href="/solicitar" className={buttonClass("brand", "md")}>
          Pedir ajuda
        </Link>
      </section>

      {emDestaque ? (
        <section className="border-brand-line bg-brand-soft mt-7 rounded-2xl border p-5">
          <p className="text-brand-ink text-sm font-semibold">Acompanhando agora</p>
          <Link href={`/acompanhar/${emDestaque.id}`} className="mt-2 block text-lg font-semibold">
            {emDestaque.description}
          </Link>
          <p className="text-muted mt-1 text-sm">{residentState(emDestaque.status).hint}</p>
        </section>
      ) : null}

      <section className="mt-9">
        <h3 className="text-xl">Suas solicitações</h3>
        {requests.length ? (
          <div className="mt-4 space-y-3">
            {requests.map((item) => {
              const estado = residentState(item.status);
              return (
                <Link
                  key={item.id}
                  href={`/acompanhar/${item.id}`}
                  className="border-line bg-surface hover:border-brand-line block rounded-2xl border p-4 transition sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate font-semibold">{item.description}</h4>
                      <p className="text-muted mt-1 text-sm">
                        {estado.title}
                        {item.neighborhood ? ` · ${item.neighborhood}` : ""}
                      </p>
                    </div>
                    <Badge tone={stateTone("request", item.status)} dot={false}>
                      {item.code}
                    </Badge>
                  </div>
                  <p className="text-faint mt-2 text-xs">Enviado em {formatDate(item.createdAt)}</p>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            className="border-line bg-surface mt-4 rounded-2xl border"
            title="Ainda não há solicitações."
            hint="Quando precisar, conte seu problema em poucas palavras."
            action={
              <Link href="/solicitar" className={buttonClass("outline", "md")}>
                Pedir ajuda
              </Link>
            }
          />
        )}
      </section>
    </ResidentShell>
  );
}
