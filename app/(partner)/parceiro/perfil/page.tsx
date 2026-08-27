import { redirect } from "next/navigation";

import { updateAvailability } from "@/app/actions/audience";
import { Badge } from "@/components/ops/ui";
import { PartnerShell } from "@/components/portal/shell";
import { buttonClass } from "@/components/ui";
import { getPartnerViewer } from "@/lib/auth/audience";
import { partnerProfile } from "@/lib/domain/audience";

export const metadata = { title: "Perfil da empresa", robots: { index: false, follow: false } };

export default async function PartnerProfilePage() {
  const viewer = await getPartnerViewer();
  if (!viewer) redirect("/parceiro/entrar");

  const profile = await partnerProfile(viewer.id);
  if (!profile) redirect("/parceiro/entrar");

  const { partner } = profile;
  const disponivel = partner.status === "ativo";
  const podeAlternar = partner.status === "ativo" || partner.status === "pausado";

  return (
    <PartnerShell title="Perfil">
      <p className="text-brand-ink text-xs font-bold tracking-[0.14em] uppercase">Perfil profissional</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl">{partner.name}</h2>
          <p className="text-muted mt-2 max-w-xl">
            {partner.description || "A equipe completa os dados públicos da empresa durante o onboarding."}
          </p>
        </div>
        {partner.founder ? <Badge tone="positive">Parceiro Fundador</Badge> : null}
      </div>

      <section className="border-line bg-surface mt-7 rounded-2xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl">Receber oportunidades</h3>
            <p className="text-muted mt-1 text-sm">
              {podeAlternar
                ? "Pause quando estiver sem equipe ou com a agenda cheia. Você pode voltar quando quiser."
                : "Sua entrada na distribuição é acompanhada pela equipe."}
            </p>
          </div>
          {podeAlternar ? (
            <form action={updateAvailability}>
              <button name="available" value={disponivel ? "false" : "true"} className={buttonClass(disponivel ? "brand" : "outline", "md")}>
                {disponivel ? "Recebendo oportunidades" : "Voltar a receber"}
              </button>
            </form>
          ) : (
            <Badge tone="neutral">Aguardando equipe</Badge>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="border-line rounded-2xl border p-5">
          <h3 className="text-lg">Categorias</h3>
          {profile.categories.length ? (
            <ul className="text-muted mt-3 space-y-2 text-sm">
              {profile.categories.map((item) => (
                <li key={item.id}>
                  {item.name}
                  {item.primary ? " · principal" : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted mt-3 text-sm">A equipe ainda precisa confirmar as categorias atendidas.</p>
          )}
        </div>
        <div className="border-line rounded-2xl border p-5">
          <h3 className="text-lg">Serviços</h3>
          {profile.services.length ? (
            <ul className="text-muted mt-3 space-y-2 text-sm">
              {profile.services.map((item) => (
                <li key={item.id}>
                  {item.name} <span className="text-faint">· {item.categoryName}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted mt-3 text-sm">Os serviços ainda serão configurados com a equipe.</p>
          )}
        </div>
      </section>

      <section className="border-line bg-surface mt-8 rounded-2xl border p-5">
        <h3 className="text-xl">Área de atendimento</h3>
        <p className="text-muted mt-2 text-sm">
          {partner.servesWholeCity
            ? "Atende toda Canaã dos Carajás."
            : partner.neighborhoods.length
              ? `Atende: ${partner.neighborhoods.join(", ")}.`
              : "Área ainda não informada."}
        </p>
      </section>

      {partner.founder ? (
        <section className="border-brand-line bg-brand-soft mt-8 rounded-2xl border p-5">
          <h3 className="text-xl">Condição de Fundador</h3>
          <p className="text-muted mt-2 text-sm">
            A condição do Beta Fundador é acompanhada pela equipe. O período de 90 dias começa
            somente com o lançamento oficial da operação.
          </p>
        </section>
      ) : null}
    </PartnerShell>
  );
}
