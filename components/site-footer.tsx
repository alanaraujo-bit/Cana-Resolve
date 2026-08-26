import Link from "next/link";
import { Logo } from "./logo";
import { IconPin, IconWhatsApp } from "./icons";
import { Container } from "./ui";
import { site } from "@/lib/site";
import { contactMessage, waLink } from "@/lib/whatsapp";

const columns = [
  {
    title: "Plataforma",
    links: [
      { label: "Serviços", href: "/#servicos" },
      { label: "Como funciona", href: "/#como-funciona" },
      { label: "Solicitar serviço", href: "/solicitar" },
      { label: "Perguntas frequentes", href: "/#duvidas" },
    ],
  },
  {
    title: "Profissionais",
    links: [
      { label: "Para profissionais", href: "/#profissionais" },
      { label: "Parceiro Fundador", href: "/#parceiro-fundador" },
      { label: "Entrar", href: "/entrar" },
    ],
  },
  {
    title: "Institucional",
    links: [
      { label: "Termos de Uso", href: "/termos" },
      { label: "Política de Privacidade", href: "/privacidade" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-line bg-bg-deep relative isolate overflow-hidden border-t">
      <div className="cr-grain pointer-events-none absolute inset-0" aria-hidden="true" />
      <Container className="relative py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Logo markClassName="h-9 w-9" />
            <p className="text-muted mt-5 max-w-xs text-[0.9375rem] leading-relaxed">
              Uma forma simples de encontrar quem resolve o que você precisa em{" "}
              {site.city}.
            </p>
            <p className="text-faint mt-5 flex items-center gap-2 text-sm">
              <IconPin className="h-4 w-4 shrink-0" />
              {site.city} — {site.state}
            </p>
            <a
              href={waLink(contactMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-brand-ink mt-2 inline-flex items-center gap-2 text-sm transition-colors"
            >
              <IconWhatsApp className="h-4 w-4 shrink-0" />
              {site.whatsappDisplay}
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <h2 className="font-sans text-[0.6875rem] font-semibold tracking-[0.14em] text-faint uppercase">
                  {col.title}
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-muted hover:text-ink text-[0.9375rem] transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-line mt-14 flex flex-col gap-4 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-faint text-[0.8125rem]">
            © {new Date().getFullYear()} {site.name}. Todos os direitos reservados.
          </p>
          <a
            href={site.companyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-faint hover:text-muted inline-flex items-center gap-1.5 text-[0.8125rem] transition-colors"
          >
            Uma plataforma
            <span className="text-muted font-medium">{site.company}</span>
          </a>
        </div>
      </Container>
    </footer>
  );
}
