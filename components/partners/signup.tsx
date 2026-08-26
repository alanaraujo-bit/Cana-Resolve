import { IconWhatsApp } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { Container, Eyebrow, Section } from "@/components/ui";
import { PartnerCta } from "./cta";
import { FounderSeal } from "./founder-seal";
import { CountUp } from "@/components/motion";
import { PartnerForm } from "./partner-form";
import { founder } from "@/lib/partners";
import { partnerDoubtMessage, waLink } from "@/lib/whatsapp";

const resumo = [
  "Vaga na sua categoria durante os 90 dias",
  "Participação nas oportunidades compatíveis",
  "Contato direto, sem comissão sobre o serviço",
];

export function PartnersSignup() {
  return (
    <Section id="cadastro" className="scroll-mt-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Eyebrow>Entrar para a rede</Eyebrow>
            <h2 className="mt-4 text-[1.875rem] leading-[1.1] tracking-[-0.03em] text-balance sm:text-[2.375rem]">
              Comece resolvendo Canaã com a gente
            </h2>
            <p className="text-muted mt-4 max-w-md text-[1.0625rem] leading-relaxed text-pretty">
              Seis informações e o primeiro passo está dado. A partir daí a
              conversa é humana: entendemos o seu trabalho, explicamos as
              condições por escrito e confirmamos a sua vaga.
            </p>

            <div className="border-line bg-surface-2 mt-9 rounded-2xl border p-6">
              <div className="flex items-center gap-4">
                <FounderSeal
                  className="text-brand-ink h-12 w-12 shrink-0"
                  id="selo-fundador-cadastro"
                  spin
                />
                <div>
                  <p className="text-faint text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">
                    Parceiro Fundador
                  </p>
                  <p className="mt-1 flex items-end gap-2">
                    <span className="font-display text-2xl leading-none font-semibold tracking-[-0.02em]">
                      R$ <CountUp to={founder.priceValue} />
                    </span>
                    <span className="text-muted text-[0.875rem]">
                      por {founder.period}
                    </span>
                  </p>
                </div>
              </div>

              <ul className="border-line mt-5 space-y-2 border-t pt-5">
                {resumo.map((r) => (
                  <li key={r} className="text-muted flex gap-2.5 text-[0.875rem] leading-snug">
                    <span aria-hidden="true" className="bg-brand mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-faint mt-7 text-[0.8125rem] leading-relaxed">
              Prefere conversar antes de preencher?{" "}
              <PartnerCta
                href={waLink(partnerDoubtMessage)}
                local="cadastro-whatsapp"
                variant="ghost"
                size="sm"
                className="text-brand-ink hover:bg-transparent px-0 underline underline-offset-4"
                external
              >
                <IconWhatsApp className="h-4 w-4" />
                Falar com a equipe
              </PartnerCta>
            </p>
          </div>

          <Reveal>
            <PartnerForm />
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
