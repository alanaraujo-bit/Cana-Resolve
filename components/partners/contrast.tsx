import { IconMegaphone, IconTarget } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { Container, Section, SectionHead } from "@/components/ui";

const lados = [
  {
    Icon: IconMegaphone,
    eyebrow: "Divulgação",
    title: "A empresa espera ser encontrada",
    text: "Você aparece para muita gente e torce para que, entre elas, esteja alguém precisando exatamente do seu serviço naquele dia.",
    tone: "neutro" as const,
  },
  {
    Icon: IconTarget,
    eyebrow: "Canaã Resolve",
    title: "A solicitação é analisada antes do encaminhamento",
    text: "Quando alguém descreve uma necessidade, a equipe identifica a categoria e pode encaminhá-la a quem atende aquela área.",
    tone: "marca" as const,
  },
];

export function PartnersContrast() {
  return (
    <Section id="a-diferenca" className="border-line bg-surface-2 scroll-mt-24 border-y">
      <Container>
        <SectionHead
          eyebrow="A diferença"
          title="Isto não é um espaço de anúncio"
          lead="Divulgar tem o seu valor e continua fazendo sentido para a sua empresa. O Canaã Resolve complementa esse trabalho com um encaminhamento assistido de solicitações compatíveis, quando elas chegarem."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:mt-14 lg:gap-6">
          {lados.map((lado, i) => (
            <Reveal
              key={lado.title}
              delay={i * 90}
              anim="scale"
              className={
                lado.tone === "marca"
                  ? "cr-lift border-brand-line bg-surface shadow-card rounded-2xl border p-7 sm:p-8"
                  : "border-line bg-bg/40 rounded-2xl border border-dashed p-7 sm:p-8"
              }
            >
              <span
                className={
                  lado.tone === "marca"
                    ? "bg-brand-soft text-brand-ink grid h-11 w-11 place-items-center rounded-xl"
                    : "border-line text-faint grid h-11 w-11 place-items-center rounded-xl border"
                }
              >
                <lado.Icon className="h-5 w-5" />
              </span>
              <p
                className={
                  lado.tone === "marca"
                    ? "text-brand-ink mt-5 text-[0.6875rem] font-semibold tracking-[0.14em] uppercase"
                    : "text-faint mt-5 text-[0.6875rem] font-semibold tracking-[0.14em] uppercase"
                }
              >
                {lado.eyebrow}
              </p>
              <h3 className="text-ink mt-2.5 text-xl tracking-[-0.015em]">
                {lado.title}
              </h3>
              <p className="text-muted mt-3 text-[0.9375rem] leading-relaxed">
                {lado.text}
              </p>
            </Reveal>
          ))}
        </div>

        <p className="text-faint mt-8 max-w-2xl text-[0.875rem] leading-relaxed">
          Um não substitui o outro. Quem já investe em divulgação continua
          colhendo o que ela traz — o Canaã Resolve entra como mais um canal,
          local e ligado a quem está com o problema na mão.
        </p>
      </Container>
    </Section>
  );
}
