import type { Metadata } from "next";
import Link from "next/link";
import { RequestForm } from "@/components/request-form";
import { IconChat, IconPin, IconTag } from "@/components/icons";
import { Container, Eyebrow } from "@/components/ui";
import { site } from "@/lib/site";
import { ConsumerAnalytics } from "@/components/consumer-analytics";

export const metadata: Metadata = {
  title: "Solicitar serviço",
  description: `Conte o que você precisa resolver em ${site.city} e o Canaã Resolve encaminha o seu pedido a profissionais e empresas locais da área.`,
  alternates: { canonical: "/solicitar" },
};

const lembretes = [
  {
    Icon: IconChat,
    title: "Você fala direto",
    text: "O contato acontece entre você e o profissional, pelo WhatsApp.",
  },
  {
    Icon: IconTag,
    title: "Nada é cobrado de você",
    text: "Pedir orçamento é gratuito e não há taxa sobre o serviço contratado.",
  },
  {
    Icon: IconPin,
    title: "Gente daqui",
    text: `Profissionais e empresas que atendem ${site.city} e região.`,
  },
];

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function SolicitarPage({
  searchParams,
}: PageProps<"/solicitar">) {
  const params = await searchParams;
  const descricao = first(params.descricao).slice(0, 500);
  const categoria = first(params.categoria).slice(0, 40);

  return (
    <div className="relative isolate">
      <ConsumerAnalytics page="solicitar" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="from-brand-soft absolute inset-x-0 top-0 h-80 bg-gradient-to-b to-transparent opacity-60" />
        <div className="cr-grain absolute inset-0" />
      </div>

      <Container className="py-12 sm:py-16 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Eyebrow>Solicitar serviço</Eyebrow>
            <h1 className="mt-4 text-[2rem] leading-[1.1] tracking-[-0.03em] text-balance sm:text-[2.5rem]">
              Conte o que precisa resolver
            </h1>
            <p className="text-muted mt-4 max-w-md text-[1.0625rem] leading-relaxed text-pretty">
              São poucas informações. Com elas, a equipe entende o seu pedido
              e pode encaminhá-lo a quem atende essa área em {site.city}.
            </p>

            <ul className="mt-9 space-y-6">
              {lembretes.map(({ Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <span className="border-line bg-surface text-brand-ink grid h-10 w-10 shrink-0 place-items-center rounded-xl border">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-ink font-sans text-[0.9375rem] font-medium">
                      {title}
                    </h2>
                    <p className="text-muted mt-1 text-[0.875rem] leading-relaxed">
                      {text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-faint mt-9 text-[0.8125rem] leading-relaxed">
              É profissional e quer receber pedidos?{" "}
              <Link
                href="/parceiros"
                className="text-brand-ink underline underline-offset-4"
              >
                Conheça o Parceiro Fundador
              </Link>
              .
            </p>
          </div>

          <RequestForm initialDescricao={descricao} initialCategoria={categoria} />
        </div>
      </Container>
    </div>
  );
}
