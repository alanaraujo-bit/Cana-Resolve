"use client";

import { Reveal } from "@/components/reveal";
import { Container, Section, SectionHead } from "@/components/ui";
import { track } from "@/lib/analytics";
import { partnerFaq } from "@/lib/partners";

export function PartnersFaq() {
  return (
    <Section id="duvidas-parceiro" className="border-line bg-surface-2 scroll-mt-24 border-y">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <SectionHead
            eyebrow="Dúvidas"
            title="O que os profissionais perguntam antes de entrar"
            className="lg:sticky lg:top-28"
          />

          <div className="border-line border-t">
            {partnerFaq.map((item, i) => (
              <Reveal key={item.q} delay={Math.min(i, 6) * 45}>
                <details
                  className="group border-line border-b"
                  onToggle={(e) => {
                    if ((e.currentTarget as HTMLDetailsElement).open) {
                      track("parceiros_faq_open", { pergunta: item.q });
                    }
                  }}
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
                    <h3 className="text-ink font-sans text-[1.0625rem] font-medium tracking-normal">
                      {item.q}
                    </h3>
                    <span
                      aria-hidden="true"
                      className="border-line text-faint group-hover:border-brand-line group-hover:text-brand-ink relative mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors"
                    >
                      <span className="bg-current absolute h-[1.5px] w-2.5 rounded-full" />
                      <span className="bg-current absolute h-2.5 w-[1.5px] rounded-full transition-transform duration-300 group-open:rotate-90 group-open:scale-x-0" />
                    </span>
                  </summary>
                  <p className="text-muted max-w-prose pb-6 text-[0.9375rem] leading-relaxed">
                    {item.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
