import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight, IconWhatsApp } from "@/components/icons";
import { buttonClass, Container, Eyebrow } from "@/components/ui";
import { site } from "@/lib/site";
import { contactMessage, waLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Entrar",
  description:
    "A área de conta do Canaã Resolve está em construção. Enquanto isso, solicite um serviço ou fale com a equipe.",
  alternates: { canonical: "/entrar" },
  robots: { index: false, follow: true },
};

export default function EntrarPage() {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="cr-contour absolute inset-0 opacity-60" />
        <div className="cr-drift-a bg-brand absolute top-0 left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full opacity-[0.06] blur-[100px] dark:opacity-[0.09]" />
        <div className="cr-grain absolute inset-0" />
      </div>

      <Container className="flex min-h-[70vh] items-center py-16 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <Eyebrow className="cr-enter justify-center">Área de conta</Eyebrow>
          <h1
            className="cr-enter mt-4 text-[2rem] leading-[1.12] tracking-[-0.03em] text-balance sm:text-[2.5rem]"
            style={{ "--cr-delay": "90ms" } as React.CSSProperties}
          >
            Ainda estamos construindo esta parte
          </h1>
          <p
            className="cr-enter text-muted mt-4 text-[1.0625rem] leading-relaxed text-pretty"
            style={{ "--cr-delay": "170ms" } as React.CSSProperties}
          >
            As contas de cliente e a área do parceiro entram em seguida, com o
            acompanhamento dos pedidos dentro da plataforma. Preferimos publicar
            isso funcionando do que mostrar uma tela de login que não leva a
            lugar nenhum.
          </p>

          <div
            className="cr-enter mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center"
            style={{ "--cr-delay": "250ms" } as React.CSSProperties}
          >
            <Link href="/solicitar" className={buttonClass("brand", "lg", "cr-sheen")}>
              Solicitar um serviço
              <IconArrowRight className="cr-nudge h-[18px] w-[18px]" />
            </Link>
            <Link href="/parceiros" className={buttonClass("outline", "lg")}>
              Sou profissional
            </Link>
          </div>

          <div
            className="cr-enter border-line mt-12 border-t pt-8"
            style={{ "--cr-delay": "330ms" } as React.CSSProperties}
          >
            <p className="text-muted text-[0.9375rem]">
              Já é Parceiro Fundador e precisa de alguma coisa?
            </p>
            <a
              href={waLink(contactMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-ink hover:text-brand-hover group mt-2 inline-flex items-center gap-2 text-[0.9375rem] font-medium transition-colors"
            >
              <IconWhatsApp className="h-[18px] w-[18px]" />
              <span className="cr-link">
                Falar com a equipe — {site.whatsappDisplay}
              </span>
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
