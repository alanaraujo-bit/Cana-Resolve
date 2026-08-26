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
    <Container className="flex min-h-[70vh] items-center py-16 sm:py-24">
      <div className="mx-auto max-w-xl text-center">
        <Eyebrow className="justify-center">Área de conta</Eyebrow>
        <h1 className="mt-4 text-[2rem] leading-[1.12] tracking-[-0.03em] text-balance sm:text-[2.5rem]">
          Ainda estamos construindo esta parte
        </h1>
        <p className="text-muted mt-4 text-[1.0625rem] leading-relaxed text-pretty">
          As contas de cliente e a área do parceiro entram em seguida, com o
          acompanhamento dos pedidos dentro da plataforma. Preferimos publicar
          isso funcionando do que mostrar uma tela de login que não leva a
          lugar nenhum.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/solicitar" className={buttonClass("brand", "lg")}>
            Solicitar um serviço
            <IconArrowRight className="h-[18px] w-[18px]" />
          </Link>
          <Link href="/#parceiro-fundador" className={buttonClass("outline", "lg")}>
            Sou profissional
          </Link>
        </div>

        <div className="border-line mt-12 border-t pt-8">
          <p className="text-muted text-[0.9375rem]">
            Já é Parceiro Fundador e precisa de alguma coisa?
          </p>
          <a
            href={waLink(contactMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-ink hover:text-brand-hover mt-2 inline-flex items-center gap-2 text-[0.9375rem] font-medium transition-colors"
          >
            <IconWhatsApp className="h-[18px] w-[18px]" />
            Falar com a equipe — {site.whatsappDisplay}
          </a>
        </div>
      </div>
    </Container>
  );
}
