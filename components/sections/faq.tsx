import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { Container, Section, SectionHead } from "@/components/ui";

export const faq = [
  {
    q: "O Canaã Resolve cobra do cliente?",
    a: "Não. Pedir um serviço é gratuito e a plataforma não fica com nenhuma parte do valor combinado. Quem mantém o Canaã Resolve são os profissionais e as empresas parceiras.",
  },
  {
    q: "Como recebo contato de um profissional?",
    a: "Você descreve o que precisa e deixa o seu WhatsApp. O pedido é encaminhado a profissionais da categoria e o contato acontece por lá. Quantos vão responder depende de quem atende aquela área no momento.",
  },
  {
    q: "Os profissionais são de Canaã dos Carajás?",
    a: "Sim. A plataforma nasceu para Canaã dos Carajás e trabalha com quem atende a cidade e a região. Se isso mudar em algum momento, estará dito com clareza aqui.",
  },
  {
    q: "Posso escolher com quem fazer o serviço?",
    a: "Sempre. Você conversa com quem responder, compara preço e prazo e decide. Nada é fechado automaticamente e ninguém é designado no seu lugar.",
  },
  {
    q: "Como a minha empresa pode participar?",
    a: "Pelo programa Parceiro Fundador. Fale com a equipe pelo WhatsApp: confirmamos a sua categoria, explicamos como os pedidos chegam e montamos o seu perfil na plataforma.",
  },
  {
    q: "O Canaã Resolve realiza o serviço?",
    a: "Não. Quem executa é o profissional ou a empresa contratada. O nosso papel é fazer o seu pedido chegar até quem sabe resolver; o serviço, o preço e a garantia são combinados diretamente entre vocês.",
  },
];

export function Faq() {
  return (
    <Section id="duvidas" className="border-line bg-surface-2 scroll-mt-24 border-t">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <SectionHead
            eyebrow="Dúvidas"
            title="Dúvidas importantes antes de começar"
            className="lg:sticky lg:top-28"
          />

          <div className="border-line border-t">
            {faq.map((item, i) => (
              <Reveal key={item.q} delay={i * 55}>
                <details className="group border-line border-b">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
                    <h3 className="text-ink font-sans text-[1.0625rem] font-medium tracking-normal">
                      {item.q}
                    </h3>
                    <span
                      aria-hidden="true"
                      className="border-line text-faint group-hover:border-brand-line group-hover:text-brand-ink relative mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors"
                    >
                      <span className="bg-current absolute h-[1.5px] w-2.5 rounded-full" />
                      <span className="bg-current absolute h-2.5 w-[1.5px] rounded-full transition-transform duration-300 group-open:rotate-90 group-open:scale-x-0" />
                    </span>
                  </summary>
                  <p className="text-muted max-w-prose pb-6 text-[0.9375rem] leading-relaxed">
                    {item.a}
                  </p>
                </details>
              </Reveal>
            ))}

            <p className="text-faint mt-6 text-[0.875rem] leading-relaxed">
              Ficou alguma dúvida sobre os seus dados? Está tudo explicado na{" "}
              <Link
                href="/privacidade"
                className="text-brand-ink underline underline-offset-4"
              >
                Política de Privacidade
              </Link>
              .
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
