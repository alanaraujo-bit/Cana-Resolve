import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buttonClass, Container, Eyebrow } from "@/components/ui";

/**
 * O 404 de toda a aplicação.
 *
 * Vive na raiz, acima dos dois layouts, então traz o próprio cabeçalho e
 * rodapé: quem cai aqui veio de um link antigo do site, e precisa encontrar a
 * casa de novo.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
    <section className="relative isolate overflow-hidden">
      {/* O mesmo fundo do hero, para que o erro continue parecendo a casa. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="cr-contour absolute inset-0 opacity-60" />
        <div className="cr-drift-a bg-brand absolute top-0 left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full opacity-[0.06] blur-[100px] dark:opacity-[0.09]" />
        <div className="cr-grain absolute inset-0" />
      </div>

      <Container className="flex min-h-[70vh] items-center py-16 sm:py-24">
        <div className="mx-auto max-w-lg text-center">
          <Eyebrow className="cr-enter justify-center">
            Página não encontrada
          </Eyebrow>
          <h1
            className="cr-enter mt-4 text-[2rem] leading-[1.12] tracking-[-0.03em] text-balance sm:text-[2.5rem]"
            style={{ "--cr-delay": "90ms" } as React.CSSProperties}
          >
            Esse endereço não existe por aqui
          </h1>
          <p
            className="cr-enter text-muted mt-4 text-[1.0625rem] leading-relaxed text-pretty"
            style={{ "--cr-delay": "170ms" } as React.CSSProperties}
          >
            Pode ser um link antigo ou um erro de digitação. Se você precisa
            resolver alguma coisa, comece por aqui.
          </p>
          <div
            className="cr-enter mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
            style={{ "--cr-delay": "250ms" } as React.CSSProperties}
          >
            <Link href="/solicitar" className={buttonClass("brand", "lg", "cr-sheen")}>
              Solicitar serviço
              <IconArrowRight className="cr-nudge h-[18px] w-[18px]" />
            </Link>
            <Link href="/" className={buttonClass("outline", "lg")}>
              Voltar ao início
            </Link>
          </div>
        </div>
      </Container>
    </section>
      </main>
      <SiteFooter />
    </>
  );
}
