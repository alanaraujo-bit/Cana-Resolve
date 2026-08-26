import { IconChat, IconPin, IconTag } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { Container, Section } from "@/components/ui";

const pillars = [
  {
    Icon: IconPin,
    title: "Atendimento na região",
    text: "O foco é Canaã dos Carajás. A rede reúne profissionais e empresas que atendem a cidade e a região.",
  },
  {
    Icon: IconChat,
    title: "Contato direto",
    text: "A conversa, o preço e o combinado ficam entre você e o profissional.",
  },
  {
    Icon: IconTag,
    title: "Sem taxa sobre o serviço",
    text: "O Canaã Resolve não cobra do cliente nem fica com parte do valor do serviço.",
  },
];

export function Trust() {
  return (
    <Section className="border-line bg-surface-2 border-y py-16 sm:py-20">
      <Container>
        <ul className="grid gap-10 sm:grid-cols-3 sm:gap-8">
          {pillars.map(({ Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 90} anim="blur" className="group">
              <span className="border-brand-line bg-brand-soft text-brand-ink grid h-11 w-11 place-items-center rounded-xl border transition-transform duration-500 ease-[cubic-bezier(0.22,1.35,0.36,1)] group-hover:-translate-y-1 group-hover:rotate-3">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="text-ink mt-4 text-[1.0625rem] font-display font-semibold tracking-[-0.01em]">
                {title}
              </h3>
              <p className="text-muted mt-2 text-[0.9375rem] leading-relaxed">
                {text}
              </p>
            </Reveal>
          ))}
        </ul>
        <p className="text-faint mt-10 max-w-3xl text-[0.8125rem] leading-relaxed">
          O Canaã Resolve conecta pessoas a profissionais e empresas locais. A
          execução do serviço, o preço e as garantias são responsabilidade de
          quem foi contratado.
        </p>
      </Container>
    </Section>
  );
}
