import { IconArrowRight, IconPin } from "@/components/icons";
import { Container } from "@/components/ui";
import { PartnerCta } from "./cta";
import { OpportunityDemo } from "./opportunity-demo";
import { founder } from "@/lib/partners";

const marcadores = [
  "Sem comissão sobre o valor do serviço",
  "Contato direto com o cliente",
  "Só pedidos da sua categoria",
];

export function PartnersHero() {
  return (
    <section id="topo-parceiros" className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-bg absolute inset-0" />
        <div className="cr-contour absolute inset-0 opacity-70" />
        <div className="from-brand-soft absolute inset-x-0 top-0 h-[34rem] bg-gradient-to-b to-transparent opacity-60 dark:opacity-40" />
        <div className="cr-grain absolute inset-0" />
      </div>

      <Container className="pt-12 pb-14 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <p className="border-brand-line bg-surface/70 text-brand-ink inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium backdrop-blur-sm">
              <IconPin className="h-4 w-4" />
              Rede de parceiros — Canaã dos Carajás
            </p>

            <h1 className="mt-6 text-[2.25rem] leading-[1.06] tracking-[-0.03em] text-balance sm:text-[3rem] lg:text-[3.375rem]">
              Sua empresa pode estar pronta para{" "}
              <span className="text-brand-ink relative whitespace-nowrap">
                receber pedidos compatíveis
                <svg
                  aria-hidden="true"
                  viewBox="0 0 260 12"
                  preserveAspectRatio="none"
                  className="text-brand/30 absolute -bottom-[0.06em] left-0 h-[0.3em] w-full"
                >
                  <path
                    d="M2 8.5C46 4 108 2.5 152 3.5c40 .9 74 3.4 106 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              .
            </h1>

            <p className="text-muted mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-pretty sm:text-lg">
              O Canaã Resolve está preparado para encaminhar pedidos de quem
              precisa resolver algo na cidade a quem atende essa área. Entre
              para a rede e participe das oportunidades compatíveis.
            </p>

            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
              {marcadores.map((m) => (
                <li key={m} className="text-muted flex items-center gap-2 text-[0.875rem]">
                  <span aria-hidden="true" className="bg-brand h-1.5 w-1.5 rounded-full" />
                  {m}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <PartnerCta href="#cadastro" local="hero" variant="brand" size="lg">
                Quero ser parceiro
                <IconArrowRight className="h-[18px] w-[18px]" />
              </PartnerCta>
              <PartnerCta href="#como-funciona-parceiro" local="hero-secundario" variant="outline" size="lg">
                Entender como funciona
              </PartnerCta>
            </div>

            <p className="text-faint mt-5 text-[0.8125rem] leading-relaxed">
              Programa de lançamento: {founder.price} por {founder.period}, com
              entrada limitada por categoria. Demonstrar interesse não gera
              cobrança.
            </p>
          </div>

          <div className="lg:pl-4">
            <OpportunityDemo />
          </div>
        </div>
      </Container>
    </section>
  );
}
