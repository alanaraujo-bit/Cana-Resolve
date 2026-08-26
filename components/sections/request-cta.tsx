import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { Container, cx } from "@/components/ui";

export function RequestCta() {
  return (
    <section className="bg-band border-band-line relative isolate overflow-hidden border-y">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.14] dark:opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-radial-gradient(circle at 15% 120%, #ffffff 0 1px, transparent 1px 44px)",
          }}
        />
        {/* Luz que atravessa a faixa devagar, como um fim de tarde. */}
        <div className="cr-drift-a absolute -top-32 left-1/4 h-[26rem] w-[26rem] rounded-full bg-white opacity-[0.06] blur-[100px]" />
        <div className="cr-drift-b absolute -bottom-40 right-1/5 h-[22rem] w-[22rem] rounded-full bg-white opacity-[0.04] blur-[110px]" />
        <div className="cr-grain absolute inset-0 opacity-70" />
      </div>

      <Container className="relative py-20 sm:py-24 lg:py-28">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-band-text text-[1.875rem] leading-[1.12] text-balance sm:text-[2.5rem] lg:text-[3rem]">
            Descreva seu problema uma vez.
            <span className="text-band-muted block">
              A gente ajuda você a encontrar quem resolve.
            </span>
          </h2>
          <p className="text-band-muted mx-auto mt-6 max-w-lg text-[1.0625rem] leading-relaxed text-pretty">
            Sem cadastro, sem custo e sem precisar ligar para uma lista de
            números até alguém atender.
          </p>
          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/solicitar"
              className={cx(
                "bg-band-btn text-band-btn-text inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl px-7 text-base font-medium transition-[transform,filter] duration-150 hover:brightness-[0.96] active:translate-y-px sm:w-auto",
              )}
            >
              Solicitar serviço
              <IconArrowRight className="cr-nudge h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/#como-funciona"
              className="text-band-text border-band-line inline-flex h-[3.25rem] w-full items-center justify-center rounded-xl border px-7 text-base font-medium transition-colors hover:bg-white/5 sm:w-auto"
            >
              Ver como funciona
            </Link>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
