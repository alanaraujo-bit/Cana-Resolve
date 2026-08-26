import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import { buttonClass, Container, Eyebrow } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="flex min-h-[70vh] items-center py-16 sm:py-24">
      <div className="mx-auto max-w-lg text-center">
        <Eyebrow className="justify-center">Página não encontrada</Eyebrow>
        <h1 className="mt-4 text-[2rem] leading-[1.12] tracking-[-0.03em] text-balance sm:text-[2.5rem]">
          Esse endereço não existe por aqui
        </h1>
        <p className="text-muted mt-4 text-[1.0625rem] leading-relaxed text-pretty">
          Pode ser um link antigo ou um erro de digitação. Se você precisa
          resolver alguma coisa, comece por aqui.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/solicitar" className={buttonClass("brand", "lg")}>
            Solicitar serviço
            <IconArrowRight className="h-[18px] w-[18px]" />
          </Link>
          <Link href="/" className={buttonClass("outline", "lg")}>
            Voltar ao início
          </Link>
        </div>
      </div>
    </Container>
  );
}
