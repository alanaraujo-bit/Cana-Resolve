import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { IconArrowRight } from "@/components/icons";
import { buttonClass, Container, Section, SectionHead } from "@/components/ui";

const steps = [
  {
    n: "01",
    title: "Conte o que precisa",
    text: "Uma frase basta. Você descreve o problema com as suas palavras e diz onde fica e para quando é.",
  },
  {
    n: "02",
    title: "A equipe faz o encaminhamento inicial",
    text: "Depois do envio pelo WhatsApp, a equipe identifica a categoria e pode encaminhar o pedido a profissionais e empresas que atendem essa área.",
  },
  {
    n: "03",
    title: "Converse e escolha",
    text: "Se houver encaminhamento, você conversa direto com os profissionais ou empresas, compara o que for proposto e decide com quem quer fechar.",
  },
];

export function HowItWorks() {
  return (
    <Section id="como-funciona">
      <Container>
        <SectionHead
          eyebrow="Como funciona"
          title="Três passos, sem burocracia"
          lead="Do problema até o profissional certo, sem cadastro longo, sem ligação para vários números, sem taxa para você."
          align="center"
        />

        <ol className="relative mt-14 grid gap-10 sm:mt-16 lg:grid-cols-3 lg:gap-8">
          {/* Trilho que liga os passos */}
          <div
            aria-hidden="true"
            className="bg-line absolute top-6 left-[1.4rem] hidden h-[calc(100%-3rem)] w-px sm:block lg:top-[1.375rem] lg:left-0 lg:h-px lg:w-full"
          />
          {steps.map((step, i) => (
            <Reveal as="li" key={step.n} delay={i * 110} className="relative">
              <div className="flex gap-5 lg:flex-col lg:gap-0">
                <span className="bg-bg border-line-strong text-brand-ink relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border font-display text-[0.9375rem] font-semibold">
                  {step.n}
                </span>
                <div className="lg:mt-6 lg:pr-6">
                  <h3 className="text-ink text-xl tracking-[-0.015em]">
                    {step.title}
                  </h3>
                  <p className="text-muted mt-2.5 text-[0.9375rem] leading-relaxed">
                    {step.text}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>

        <div className="mt-14 flex flex-col items-center gap-3 sm:mt-16">
          <Link href="/solicitar" className={buttonClass("brand", "lg")}>
            Descrever meu problema
            <IconArrowRight className="h-[18px] w-[18px]" />
          </Link>
          <p className="text-faint text-[0.8125rem]">
            Leva menos de um minuto.
          </p>
        </div>
      </Container>
    </Section>
  );
}
