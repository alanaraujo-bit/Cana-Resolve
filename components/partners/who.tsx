import { categoryIcons, IconShield } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { Container, Eyebrow, Section } from "@/components/ui";
import { PartnerCta } from "./cta";
import { categories } from "@/lib/categories";

const criterios = [
  {
    title: "Quem atende Canaã dos Carajás",
    text: "Autônomo, MEI, pequena empresa ou empresa já estruturada — o que importa é atender a cidade de verdade.",
  },
  {
    title: "Informações mínimas confirmadas",
    text: "Um cadastro simples, com os dados que mostram quem é você e o que a sua empresa faz.",
  },
  {
    title: "Análise antes da confirmação",
    text: "Nenhuma vaga é aprovada só porque foi paga. A análise vem primeiro; a cobrança, depois.",
  },
];

export function PartnersWho() {
  return (
    <Section id="quem-participa" className="scroll-mt-24">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <Reveal>
            <Eyebrow>Quem pode participar</Eyebrow>
            <h2 className="mt-4 text-[1.75rem] leading-[1.15] text-balance sm:text-[2.125rem]">
              As categorias que abrem primeiro
            </h2>
            <p className="text-muted mt-4 text-[1.0625rem] leading-relaxed text-pretty">
              O programa começa pelas áreas mais procuradas na cidade. A
              plataforma foi feita para receber novas categorias conforme a
              rede cresce.
            </p>

            <ul className="border-line mt-8 divide-y divide-[var(--cr-border)] border-t border-b">
              {categories.map((c) => {
                const Icon = categoryIcons[c.id];
                return (
                  <li key={c.id} className="flex items-center gap-3.5 py-3.5">
                    <Icon className="text-faint h-[18px] w-[18px] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-ink text-[0.9375rem]">{c.name}</p>
                      <p className="text-faint mt-0.5 text-[0.8125rem] leading-snug">
                        {c.blurb}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <p className="text-muted mt-6 text-[0.9375rem] leading-relaxed">
              Não encontrou a sua área?{" "}
              <span className="text-ink">Demonstre interesse assim mesmo.</span>{" "}
              Saber que existe demanda para uma categoria é o que faz ela ser
              aberta.
            </p>
          </Reveal>

          <Reveal delay={90} className="lg:pt-10">
            <div className="border-line bg-surface shadow-card rounded-2xl border p-7 sm:p-9">
              <span className="bg-brand-soft text-brand-ink grid h-11 w-11 place-items-center rounded-xl">
                <IconShield className="h-5 w-5" />
              </span>
              <h3 className="text-ink mt-5 text-xl tracking-[-0.015em]">
                Como a entrada é analisada
              </h3>
              <p className="text-muted mt-3 text-[0.9375rem] leading-relaxed">
                Queremos construir uma rede local confiável. Quem contrata pelo
                Canaã Resolve precisa saber que do outro lado tem gente séria —
                e quem já é parceiro merece estar ao lado de profissionais no
                mesmo padrão.
              </p>

              <ul className="mt-7 space-y-5">
                {criterios.map((c, i) => (
                  <li key={c.title} className="flex gap-4">
                    <span className="border-line-strong text-brand-ink font-display grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[0.75rem] font-semibold">
                      {i + 1}
                    </span>
                    <div>
                      <h4 className="text-ink font-sans text-[0.9375rem] font-medium">
                        {c.title}
                      </h4>
                      <p className="text-muted mt-1 text-[0.875rem] leading-relaxed">
                        {c.text}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="border-line mt-8 border-t pt-6">
                <PartnerCta
                  href="#cadastro"
                  local="quem-participa"
                  variant="outline"
                  size="md"
                  className="w-full"
                >
                  Demonstrar interesse
                </PartnerCta>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
