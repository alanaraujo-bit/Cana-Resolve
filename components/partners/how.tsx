import { IconArrowRight } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { InView } from "@/components/motion";
import { Container, Eyebrow, Section } from "@/components/ui";
import { PartnerCta } from "./cta";
import { partnerSteps } from "@/lib/partners";

export function PartnersHow() {
  return (
    <Section id="como-funciona-parceiro" className="scroll-mt-24">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Eyebrow>Como funciona</Eyebrow>
            <h2 className="mt-4 text-[1.75rem] leading-[1.15] text-balance sm:text-[2.125rem] lg:text-[2.5rem]">
              Do problema de alguém até a sua conversa
            </h2>
            <p className="text-muted mt-4 text-[1.0625rem] leading-relaxed text-pretty">
              Cinco passos, nenhum deles burocrático. Você não precisa aprender
              a usar um sistema novo para começar a receber oportunidades.
            </p>

            <div className="mt-8 hidden lg:block">
              <PartnerCta href="#cadastro" local="como-funciona" variant="brand" size="lg">
                Quero ser parceiro
                <IconArrowRight className="h-[18px] w-[18px]" />
              </PartnerCta>
            </div>
          </div>

          <ol className="relative">
            {/* Trilho que costura os passos, como um caminho — e que se
                desenha de cima para baixo quando a lista entra na tela. */}
            <InView className="pointer-events-none absolute inset-0">
              <div
                aria-hidden="true"
                className="cr-rail bg-line absolute top-6 bottom-8 left-[1.375rem] w-px"
              />
            </InView>
            {partnerSteps.map((step, i) => (
              <Reveal
                as="li"
                key={step.n}
                delay={i * 70}
                className="relative pb-9 last:pb-0"
              >
                <div className="flex gap-5">
                  <span className="bg-bg border-line-strong text-brand-ink hover:border-brand hover:text-brand font-display relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border text-[0.9375rem] font-semibold transition-colors duration-300">
                    {step.n}
                  </span>
                  <div className="pt-1">
                    <p className="text-faint text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">
                      {step.beat}
                    </p>
                    <h3 className="text-ink mt-1.5 text-xl tracking-[-0.015em]">
                      {step.title}
                    </h3>
                    <p className="text-muted mt-2 max-w-xl text-[0.9375rem] leading-relaxed">
                      {step.text}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        <div className="mt-12 lg:hidden">
          <PartnerCta href="#cadastro" local="como-funciona-mobile" variant="brand" size="lg" className="w-full">
            Quero ser parceiro
            <IconArrowRight className="h-[18px] w-[18px]" />
          </PartnerCta>
        </div>
      </Container>
    </Section>
  );
}
