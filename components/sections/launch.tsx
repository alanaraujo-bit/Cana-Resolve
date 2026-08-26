import Link from "next/link";
import { categories } from "@/lib/categories";
import { categoryIcons, IconArrowRight, IconCheck } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { Container, Section, SectionHead } from "@/components/ui";

const agora = [
  "O sistema já está preparado para receber o seu pedido e encaminhá-lo pela equipe.",
  "Estamos formando o primeiro grupo de profissionais parceiros, categoria por categoria.",
];

const depois = [
  "Perfis com os serviços de cada profissional e empresa.",
  "Acompanhamento do pedido dentro da plataforma.",
  "Avaliações escritas por clientes que realmente contrataram.",
];

export function Launch() {
  return (
    <Section className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="cr-grain pointer-events-none absolute inset-0 -z-10" />
      <Container>
        <SectionHead
          eyebrow="Profissionais e empresas"
          title="Estamos começando agora — e preferimos dizer isso"
          lead="O Canaã Resolve está em fase de lançamento em Canaã dos Carajás. Em vez de exibir números que ainda não existem, contamos exatamente em que ponto estamos."
        />

        <div className="mt-12 grid gap-6 lg:mt-14 lg:grid-cols-[1fr_1fr] lg:gap-8">
          <Reveal className="border-line bg-surface shadow-card rounded-2xl border p-7 sm:p-9">
            <h3 className="text-ink text-xl tracking-[-0.015em]">
              O que já funciona hoje
            </h3>
            <ul className="mt-5 space-y-3.5">
              {agora.map((item, i) => (
                <Reveal as="li" key={item} delay={120 + i * 90} className="flex gap-3">
                  <span className="bg-brand-soft text-brand-ink mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full">
                    <IconCheck className="h-3 w-3" strokeWidth={2.4} />
                  </span>
                  <span className="text-muted text-[0.9375rem] leading-relaxed">
                    {item}
                  </span>
                </Reveal>
              ))}
            </ul>

            <div className="cr-rule my-7 h-px" />

            <h3 className="text-ink text-xl tracking-[-0.015em]">
              O que vem em seguida
            </h3>
            <ul className="mt-5 space-y-3.5">
              {depois.map((item, i) => (
                <Reveal as="li" key={item} delay={i * 80} className="flex gap-3">
                  <span className="border-line-strong text-faint mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-dashed">
                    <span className="bg-faint h-1 w-1 rounded-full" />
                  </span>
                  <span className="text-muted text-[0.9375rem] leading-relaxed">
                    {item}
                  </span>
                </Reveal>
              ))}
            </ul>
          </Reveal>

          <Reveal
            delay={90}
            className="border-line bg-surface-2 flex flex-col rounded-2xl border p-7 sm:p-9"
          >
            <h3 className="text-ink text-xl tracking-[-0.015em]">
              Categorias abrindo vagas de parceiro
            </h3>
            <p className="text-muted mt-2.5 text-[0.9375rem] leading-relaxed">
              A entrada é organizada por categoria para construir uma rede
              inicial cuidadosa, sem concentrar profissionais demais na mesma área.
            </p>

            <ul className="border-line mt-6 divide-y divide-[var(--cr-border)] border-t">
              {categories.map((c, i) => {
                const Icon = categoryIcons[c.id];
                return (
                  <li
                    key={c.id}
                    className="group flex items-center gap-3 py-3.5"
                  >
                    <Icon className="text-faint group-hover:text-brand-ink h-[18px] w-[18px] shrink-0 transition-colors duration-300" />
                    <span className="text-ink flex-1 text-[0.9375rem]">
                      {c.name}
                    </span>
                    <span className="border-brand-line bg-brand-soft text-brand-ink flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide uppercase">
                      <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
                        <span
                          className="bg-brand cr-ping absolute inline-flex h-full w-full rounded-full"
                          style={{ animationDelay: `${i * 0.4}s` }}
                        />
                        <span className="bg-brand relative inline-flex h-1.5 w-1.5 rounded-full" />
                      </span>
                      Vagas abertas
                    </span>
                  </li>
                );
              })}
            </ul>

            <Link
              href="/parceiros"
              className="text-brand-ink hover:text-brand-hover group mt-7 inline-flex items-center gap-2 text-[0.9375rem] font-medium transition-colors"
            >
              <span className="cr-link">Ver o programa Parceiro Fundador</span>
              <IconArrowRight className="cr-nudge h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
