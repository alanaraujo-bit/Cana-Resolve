import { IconCheck } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { Container, Section, SectionHead } from "@/components/ui";
import { regularPlans } from "@/lib/partners";

export function PartnersPlans() {
  return (
    <Section id="planos" className="scroll-mt-24">
      <Container>
        <SectionHead eyebrow="Depois do beta" title="Você escolhe como continuar." lead="Esta é a estrutura prevista para a operação regular, sujeita a ajustes enquanto validamos o produto. A relevância para o cliente continuará guiando o encaminhamento das oportunidades — não o valor do plano." />
        <div className="border-line bg-surface-2 mt-10 grid overflow-hidden rounded-2xl border sm:grid-cols-2 lg:mt-12">
          <div className="border-line border-b p-6 sm:border-r sm:border-b-0 sm:p-7">
            <p className="text-faint text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">Beta Fundador</p>
            <p className="text-ink mt-2 text-2xl tracking-[-0.02em]">R$79 / 90 dias</p>
            <p className="text-muted mt-2 text-[0.875rem] leading-relaxed">Para entrar desde o início e testar a primeira fase da rede.</p>
          </div>
          <div className="p-6 sm:p-7">
            <p className="text-faint text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">Operação regular</p>
            <p className="text-ink mt-2 text-2xl tracking-[-0.02em]">Planos a partir de R$79/mês</p>
            <p className="text-muted mt-2 text-[0.875rem] leading-relaxed">Para escolher a continuidade ao final do beta, se fizer sentido para você.</p>
          </div>
        </div>
        <div className="mt-10 grid gap-5 lg:mt-12 lg:grid-cols-3 lg:gap-6">
          {regularPlans.map((plan, index) => (
            <Reveal key={plan.name} delay={index * 70} className="border-line bg-surface flex flex-col rounded-2xl border p-6 sm:p-7">
              <p className="text-faint text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">Estrutura prevista</p>
              <h3 className="text-ink mt-3 text-2xl tracking-[-0.02em]">{plan.name}</h3>
              <p className="text-brand-ink mt-3 text-[1.0625rem] font-semibold">{plan.price}</p>
              <p className="text-muted mt-3 text-[0.9375rem] leading-relaxed">{plan.audience}</p>
              <ul className="border-line mt-6 space-y-3 border-t pt-5">
                {plan.items.map((item) => <li key={item} className="text-muted flex gap-2.5 text-[0.875rem] leading-relaxed"><IconCheck className="text-brand-ink mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} />{item}</li>)}
              </ul>
            </Reveal>
          ))}
        </div>
        <p className="text-faint mt-6 max-w-3xl text-[0.8125rem] leading-relaxed">Recursos descritos como previstos ou futuros não são uma promessa de disponibilidade durante o beta. Antes de qualquer continuidade, as condições vigentes serão apresentadas com clareza.</p>
      </Container>
    </Section>
  );
}
