import Link from "next/link";
import { categories } from "@/lib/categories";
import { categoryIcons, IconArrowRight } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { Container, Section, SectionHead } from "@/components/ui";

export function Services() {
  return (
    <Section id="servicos" className="border-line bg-surface-2 border-y">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHead
            eyebrow="Serviços"
            title="As primeiras categorias abertas em Canaã"
            lead="Começamos pelo que mais aparece no dia a dia da cidade. Escolha uma categoria ou descreva o seu caso — a gente identifica para você."
          />
          <Link
            href="/solicitar"
            className="text-brand-ink hover:text-brand-hover inline-flex shrink-0 items-center gap-2 text-[0.9375rem] font-medium transition-colors"
          >
            Não achei o que preciso
            <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => {
            const Icon = categoryIcons[c.id];
            return (
              <Reveal as="li" key={c.id} delay={i * 45} className="flex">
                <Link
                  href={`/solicitar?categoria=${c.id}`}
                  className="group bg-surface hover:bg-surface-3 focus-visible:bg-surface-3 relative flex w-full flex-col gap-3 p-6 transition-colors sm:p-7"
                >
                  <span className="bg-brand-soft text-brand-ink border-brand-line grid h-11 w-11 place-items-center rounded-xl border transition-transform duration-300 group-hover:-translate-y-0.5">
                    <Icon className="h-[22px] w-[22px]" />
                  </span>
                  <span className="text-ink mt-1 font-display text-[1.0625rem] font-semibold tracking-[-0.01em]">
                    {c.name}
                  </span>
                  <span className="text-muted text-[0.9375rem] leading-relaxed">
                    {c.blurb}
                  </span>
                  <span className="text-brand-ink mt-auto inline-flex items-center gap-1.5 pt-3 text-[0.8125rem] font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                    Pedir orçamento
                    <IconArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </Reveal>
            );
          })}

          <li className="bg-surface flex h-full flex-col justify-center gap-2 p-6 sm:p-7 lg:col-span-2">
            <span className="text-ink font-display text-[1.0625rem] font-semibold">
              E o que vier depois
            </span>
            <span className="text-muted text-[0.9375rem] leading-relaxed">
              Novas categorias entram conforme profissionais locais se juntam à
              plataforma. Se a sua não está aqui,{" "}
              <Link href="/#parceiro-fundador" className="text-brand-ink underline underline-offset-4">
                fale com a gente
              </Link>
              .
            </span>
          </li>
        </ul>
      </Container>
    </Section>
  );
}
