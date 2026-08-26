import { IconArrowRight, IconCheck, IconWhatsApp } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { Container, Section, SectionHead } from "@/components/ui";
import { PartnerCta } from "./cta";
import { FounderSeal } from "./founder-seal";
import { founder, founderIncludes } from "@/lib/partners";
import { partnerDoubtMessage, waLink } from "@/lib/whatsapp";

const transparencia = [
  {
    title: "Por que a entrada é limitada por categoria",
    text: "Para não colocar um número excessivo de profissionais disputando a mesma solicitação logo no início. Quanto mais gente na mesma categoria, menos vale cada oportunidade — e é justamente isso que queremos preservar.",
  },
  {
    title: "Em que ponto o produto está",
    text: "O Canaã Resolve está em lançamento em Canaã dos Carajás. Os pedidos já chegam e são encaminhados pela nossa equipe; os recursos de acompanhamento dentro da plataforma vêm em seguida. Quem entra agora entra na construção da rede.",
  },
  {
    title: "O que não prometemos",
    text: "Nenhum número de clientes, de orçamentos ou de faturamento. Não há como garantir volume no começo de uma rede local, e preferimos dizer isso a inventar uma promessa. O que existe é a sua vaga na categoria e a condição especial de quem começou junto.",
  },
];

export function PartnersFounder() {
  return (
    <Section id="parceiro-fundador" className="scroll-mt-24">
      <Container>
        <SectionHead
          eyebrow="Programa de lançamento"
          title="Parceiro Fundador Canaã Resolve"
          lead="O grupo inicial de profissionais e empresas que entram junto com a plataforma na cidade — e ajudam a definir como ela funciona."
        />

        <Reveal className="border-line bg-surface shadow-lift mt-12 overflow-hidden rounded-2xl border lg:mt-14">
          <div
            aria-hidden="true"
            className="bg-accent h-[3px] w-full opacity-80"
          />

          {/* Cabeçalho da oferta */}
          <div className="border-line flex flex-col gap-7 border-b p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
              <FounderSeal
                className="text-brand-ink h-14 w-14 shrink-0 sm:h-[4.5rem] sm:w-[4.5rem]"
                id="selo-fundador-oferta"
              />
              <div>
                <h3 className="text-ink text-2xl leading-tight tracking-[-0.02em]">
                  Condição de lançamento
                </h3>
                <p className="text-muted mt-1.5 max-w-sm text-[0.9375rem] leading-relaxed">
                  Vaga na sua categoria durante todo o período do programa.
                </p>
              </div>
            </div>

            <div className="border-line shrink-0 sm:border-l sm:pl-9">
              <div className="flex items-end gap-2.5">
                <span className="font-display text-[2.75rem] leading-none font-semibold tracking-[-0.03em]">
                  {founder.price}
                </span>
                <span className="text-muted pb-1 text-[0.9375rem]">
                  por {founder.period}
                </span>
              </div>
              <p className="text-faint mt-2 text-[0.8125rem]">
                Valor único do período. Sem comissão sobre os serviços.
              </p>
            </div>
          </div>

          <div className="grid gap-10 p-7 sm:p-9 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div>
              <h4 className="text-faint text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">
                O que está incluído
              </h4>
              <ul className="mt-5 space-y-5">
                {founderIncludes.map((item) => (
                  <li key={item.title} className="flex gap-3.5">
                    <span
                      className={
                        item.lead
                          ? "bg-brand-soft text-brand-ink mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full"
                          : "border-line text-faint mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border"
                      }
                    >
                      <IconCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </span>
                    <div>
                      <h5
                        className={
                          item.lead
                            ? "text-ink font-sans text-[1rem] font-semibold"
                            : "text-ink font-sans text-[0.9375rem] font-medium"
                        }
                      >
                        {item.title}
                      </h5>
                      <p className="text-muted mt-1 text-[0.875rem] leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <PartnerCta href="#cadastro" local="oferta-fundador" variant="brand" size="lg" className="flex-1">
                  <span className="sm:hidden">Quero ser parceiro</span>
                  <span className="hidden sm:inline">Quero ser Parceiro Fundador</span>
                  <IconArrowRight className="h-[18px] w-[18px]" />
                </PartnerCta>
                <PartnerCta
                  href={waLink(partnerDoubtMessage)}
                  local="oferta-fundador-duvida"
                  variant="outline"
                  size="lg"
                  external
                >
                  <IconWhatsApp className="h-[18px] w-[18px]" />
                  Tirar uma dúvida
                </PartnerCta>
              </div>
              <p className="text-faint mt-4 text-[0.8125rem] leading-relaxed">
                Demonstrar interesse não gera cobrança. O pagamento só entra na
                conversa depois da análise cadastral e da confirmação da vaga.
              </p>
            </div>

            <div className="border-line lg:border-l lg:pl-14">
              <h4 className="text-faint text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">
                O que precisa ficar claro
              </h4>
              <div className="mt-5 space-y-6">
                {transparencia.map((t) => (
                  <div key={t.title}>
                    <h5 className="text-ink font-sans text-[0.9375rem] font-medium">
                      {t.title}
                    </h5>
                    <p className="text-muted mt-1.5 text-[0.875rem] leading-relaxed">
                      {t.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* O significado do selo */}
        <Reveal
          delay={80}
          className="border-line bg-surface-2 mt-6 flex flex-col gap-6 rounded-2xl border p-7 sm:flex-row sm:items-center sm:gap-9 sm:p-9"
        >
          <FounderSeal
            className="text-accent-ink h-14 w-14 shrink-0"
            id="selo-fundador-significado"
          />
          <div>
            <h3 className="text-ink text-xl tracking-[-0.015em]">
              O selo não é enfeite
            </h3>
            <p className="text-muted mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed">
              Ele identifica as empresas e os profissionais que estavam aqui
              quando o Canaã Resolve começou em Canaã dos Carajás. A ideia é que
              essa marca continue aparecendo no perfil do parceiro mesmo depois
              do período de lançamento — porque começar junto é um fato, e ele
              não expira.
            </p>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
