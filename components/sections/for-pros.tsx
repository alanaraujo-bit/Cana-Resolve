import Link from "next/link";
import { IconArrowRight, IconCheck } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { CountUp } from "@/components/motion";
import { buttonClass, Container, Eyebrow, Section } from "@/components/ui";

const argumentos = [
  {
    title: "Encaminhamento assistido",
    text: "Nesta fase, a equipe avalia solicitações recebidas e pode encaminhá-las a parceiros compatíveis — em vez de oferecer apenas uma vitrine.",
  },
  {
    title: "Só o que é da sua área",
    text: "As solicitações são distribuídas pela categoria em que você atua e pela região de Canaã que você atende.",
  },
  {
    title: "A negociação é sua",
    text: "Você fala direto com o cliente, define o preço e fecha do seu jeito. O Canaã Resolve não entra na conversa nem no pagamento.",
  },
];

const beneficios = [
  "Perfil profissional dentro da plataforma",
  "Participação nas solicitações compatíveis com a sua área",
  "Contato direto com quem pediu o serviço",
  "Apresentação dos serviços que você oferece",
  "Presença diferenciada no lançamento",
  "Identificação como Parceiro Fundador",
  "Prioridade inicial dentro da sua categoria",
  "Acompanhamento das oportunidades recebidas",
];

export function ForPros() {
  return (
    <Section id="profissionais" className="scroll-mt-24">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-16">
          <Reveal>
            <Eyebrow>Para profissionais</Eyebrow>
            <h2 className="mt-4 text-[1.75rem] leading-[1.15] text-balance sm:text-[2.125rem] lg:text-[2.5rem]">
              Você trabalha com serviços em Canaã?
            </h2>
            <p className="text-muted mt-4 text-[1.0625rem] leading-relaxed text-pretty">
              O Canaã Resolve está formando uma rede inicial para encaminhar,
              pela equipe, solicitações compatíveis com quem atende a cidade e a região.
            </p>

            <ul className="mt-9 space-y-7">
              {argumentos.map((a) => (
                <li
                  key={a.title}
                  className="border-line hover:border-brand relative border-l-2 pl-5 transition-colors duration-300"
                >
                  <h3 className="text-ink text-[1.0625rem] font-display font-semibold tracking-[-0.01em]">
                    {a.title}
                  </h3>
                  <p className="text-muted mt-1.5 text-[0.9375rem] leading-relaxed">
                    {a.text}
                  </p>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Parceiro Fundador */}
          <Reveal delay={100}>
            <div
              id="parceiro-fundador"
              className="cr-lift border-line bg-surface shadow-lift relative scroll-mt-24 overflow-hidden rounded-2xl border"
            >
              <div
                aria-hidden="true"
                className="bg-accent absolute inset-x-0 top-0 h-[3px] opacity-80"
              />
              <div className="p-7 sm:p-9">
                <p className="border-accent-line bg-accent-soft text-accent-ink inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                  Parceiro Fundador
                </p>
                <h3 className="mt-5 text-2xl leading-tight tracking-[-0.02em] sm:text-[1.75rem]">
                  Participe do começo da plataforma
                </h3>
                <p className="text-muted mt-3 text-[0.9375rem] leading-relaxed">
                  Um grupo inicial de profissionais e empresas de Canaã que
                  entram junto com o Canaã Resolve — e ajudam a definir como
                  ele funciona.
                </p>

                <div className="border-line mt-7 flex items-end gap-3 border-y py-5">
                  <span className="font-display text-4xl leading-none font-semibold tracking-[-0.03em]">
                    R$ <CountUp to={197} />
                  </span>
                  <span className="text-muted pb-1 text-[0.9375rem]">
                    por 90 dias
                  </span>
                </div>

                <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {beneficios.map((b) => (
                    <li key={b} className="flex gap-2.5">
                      <IconCheck
                        className="text-brand-ink mt-[3px] h-4 w-4 shrink-0"
                        strokeWidth={2}
                      />
                      <span className="text-muted text-[0.875rem] leading-snug">
                        {b}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/parceiros#cadastro"
                    className={buttonClass("brand", "lg", "cr-sheen flex-1")}
                  >
                    Quero ser Parceiro Fundador
                    <IconArrowRight className="cr-nudge h-[18px] w-[18px]" />
                  </Link>
                  <Link
                    href="/parceiros"
                    className={buttonClass("outline", "lg", "sm:w-auto")}
                  >
                    Ver o programa
                  </Link>
                </div>

                <p className="text-faint mt-5 text-[0.8125rem] leading-relaxed">
                  A entrada é organizada por categoria durante o lançamento.
                  Na página de parceiros está tudo
                  explicado — inclusive o que não prometemos.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
