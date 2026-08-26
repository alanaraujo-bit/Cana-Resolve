import { IconArrowRight, IconPin } from "@/components/icons";
import { Container } from "@/components/ui";
import { PartnerCta } from "./cta";
import { OpportunityDemo } from "./opportunity-demo";
import { founder } from "@/lib/partners";
import { PointerAura } from "@/components/motion";

const marcadores = [
  "Sem comissão sobre o valor do serviço",
  "Contato direto com o cliente",
  "Só pedidos da sua categoria",
];

export function PartnersHero() {
  return (
    <PointerAura id="topo-parceiros" className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-bg absolute inset-0" />
        <div className="cr-contour absolute inset-0 opacity-70" />
        <div className="from-brand-soft absolute inset-x-0 top-0 h-[34rem] bg-gradient-to-b to-transparent opacity-60 dark:opacity-40" />
        <div className="cr-drift-a cr-aura bg-brand absolute -top-28 -left-20 h-[26rem] w-[26rem] rounded-full opacity-[0.07] blur-[90px] dark:opacity-[0.10]" />
        <div className="cr-drift-b cr-aura-far bg-accent absolute top-10 right-[-6rem] h-[22rem] w-[22rem] rounded-full opacity-[0.05] blur-[100px] dark:opacity-[0.07]" />
        <div className="cr-grain absolute inset-0" />
      </div>

      <Container className="pt-12 pb-14 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <p className="cr-enter border-brand-line bg-surface/70 text-brand-ink inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium backdrop-blur-sm">
              <IconPin className="h-4 w-4" />
              Rede de parceiros — Canaã dos Carajás
            </p>

            <h1
              className="cr-enter mt-6 text-[2.25rem] leading-[1.06] tracking-[-0.03em] text-balance sm:text-[3rem] lg:text-[3.375rem]"
              style={{ "--cr-delay": "80ms" } as React.CSSProperties}
            >
              Sua empresa pode estar pronta para{" "}
              {/* Marca-texto em vez de traço desenhado: a frase é longa e
                  precisa poder quebrar em duas linhas no celular. */}
              <span
                className="cr-mark text-brand-ink"
                style={{ "--cr-delay": "620ms" } as React.CSSProperties}
              >
                receber pedidos compatíveis
              </span>
              .
            </h1>

            <p
              className="cr-enter text-muted mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-pretty sm:text-lg"
              style={{ "--cr-delay": "160ms" } as React.CSSProperties}
            >
              O Canaã Resolve está preparado para encaminhar pedidos de quem
              precisa resolver algo na cidade a quem atende essa área. Entre
              para a rede e participe das oportunidades compatíveis.
            </p>

            <ul
              className="cr-enter mt-7 flex flex-wrap gap-x-5 gap-y-2"
              style={{ "--cr-delay": "230ms" } as React.CSSProperties}
            >
              {marcadores.map((m) => (
                <li key={m} className="text-muted flex items-center gap-2 text-[0.875rem]">
                  <span aria-hidden="true" className="bg-brand h-1.5 w-1.5 rounded-full" />
                  {m}
                </li>
              ))}
            </ul>

            <div
              className="cr-enter mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
              style={{ "--cr-delay": "300ms" } as React.CSSProperties}
            >
              <PartnerCta href="#cadastro" local="hero" variant="brand" size="lg">
                Quero ser parceiro
                <IconArrowRight className="h-[18px] w-[18px]" />
              </PartnerCta>
              <PartnerCta href="#como-funciona-parceiro" local="hero-secundario" variant="outline" size="lg">
                Entender como funciona
              </PartnerCta>
            </div>

            <p
              className="cr-enter text-faint mt-5 text-[0.8125rem] leading-relaxed"
              style={{ "--cr-delay": "360ms" } as React.CSSProperties}
            >
              Beta Fundador: {founder.price} pelos {founder.period}, com entrada
              limitada por categoria. Depois, você decide se quer continuar.
            </p>
          </div>

          <div
            className="cr-enter lg:pl-4"
            style={{ "--cr-delay": "260ms" } as React.CSSProperties}
          >
            <OpportunityDemo />
          </div>
        </div>
      </Container>
    </PointerAura>
  );
}
