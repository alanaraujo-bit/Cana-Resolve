import { IconCheck } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { Container, Section, SectionHead } from "@/components/ui";
import { benefits, boundaries } from "@/lib/partners";

export function PartnersBenefits() {
  return (
    <Section id="beneficios" className="border-line bg-surface-2 scroll-mt-24 border-y">
      <Container>
        <SectionHead
          eyebrow="O que você ganha"
          title="O que muda no dia a dia da sua empresa"
          lead="Nada aqui é promessa de resultado. É a base do programa para que sua empresa participe da rede inicial com clareza."
        />

        <div className="mt-12 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          {benefits.map((b, i) => (
            <Reveal key={b.title} delay={(i % 3) * 80} className="border-line border-t pt-5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <h3 className="text-ink font-display text-[1.0625rem] font-semibold tracking-[-0.01em]">
                  {b.title}
                </h3>
                {b.soon ? (
                  <span className="border-line text-faint shrink-0 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold tracking-[0.1em] uppercase">
                    Em breve
                  </span>
                ) : null}
              </div>
              <p className="text-muted mt-2 text-[0.9375rem] leading-relaxed">
                {b.text}
              </p>
            </Reveal>
          ))}
        </div>

        {/* Os limites, ditos antes de alguém precisar perguntar. */}
        <Reveal className="border-line bg-surface shadow-card mt-14 rounded-2xl border p-7 sm:p-9 lg:mt-16">
          <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
            <div>
              <h3 className="text-ink text-xl tracking-[-0.015em]">
                E o que o Canaã Resolve não faz
              </h3>
              <p className="text-muted mt-3 text-[0.9375rem] leading-relaxed">
                Preferimos deixar isso claro antes: o papel da plataforma é
                avaliar solicitações e, quando compatíveis, encaminhá-las pela
                equipe. O trabalho, o preço e a relação com o cliente continuam sendo seus.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:gap-x-6">
              {boundaries.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <IconCheck
                    className="text-brand-ink mt-[3px] h-4 w-4 shrink-0"
                    strokeWidth={2}
                  />
                  <span className="text-muted text-[0.875rem] leading-snug">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
