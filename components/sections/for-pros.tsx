import Link from "next/link";
import { IconCheck, IconWhatsApp } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { buttonClass, Container, Eyebrow, Section } from "@/components/ui";
import { partnerMessage, waLink } from "@/lib/whatsapp";

const argumentos = [
  {
    title: "Pedido, não anúncio",
    text: "Chega até você a descrição de alguém que já decidiu resolver o problema — não um espaço de vitrine esperando ser visto.",
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
              Todo dia alguém na cidade procura exatamente o que você faz.
              O Canaã Resolve existe para que esse pedido chegue até você.
            </p>

            <ul className="mt-9 space-y-7">
              {argumentos.map((a) => (
                <li key={a.title} className="border-line border-l-2 pl-5">
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
              className="border-line bg-surface shadow-lift relative scroll-mt-24 overflow-hidden rounded-2xl border"
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
                    R$ 197
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
                  <a
                    href={waLink(partnerMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass("brand", "lg", "flex-1")}
                  >
                    <IconWhatsApp className="h-[18px] w-[18px]" />
                    Quero ser Parceiro Fundador
                  </a>
                  <Link
                    href="/#duvidas"
                    className={buttonClass("outline", "lg", "sm:w-auto")}
                  >
                    Tirar dúvidas
                  </Link>
                </div>

                <p className="text-faint mt-5 text-[0.8125rem] leading-relaxed">
                  As vagas são limitadas por categoria para preservar o valor de
                  quem entra primeiro. Ao tocar no botão você fala com a equipe
                  do Canaã Resolve pelo WhatsApp.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
