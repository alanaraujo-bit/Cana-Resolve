import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: `Regras de uso do ${site.name}, a plataforma que conecta moradores de ${site.city} a profissionais e empresas locais.`,
  alternates: { canonical: "/termos" },
};

export default function TermosPage() {
  return (
    <LegalPage eyebrow="Institucional" title="Termos de Uso" updatedAt="26 de agosto de 2026">
      <section>
        <h2>O que é o Canaã Resolve</h2>
        <p>
          O {site.name} é uma plataforma da {site.company} que conecta pessoas
          que precisam de um serviço a profissionais e empresas que atuam em{" "}
          {site.city} — {site.state}. Nós aproximamos as duas partes; a partir do
          contato, a relação é entre elas.
        </p>
      </section>

      <section>
        <h2>O que nós fazemos</h2>
        <ul>
          <li>Recebemos o seu pedido e encaminhamos a profissionais da categoria correspondente.</li>
          <li>Apresentamos quem pode atender e viabilizamos o contato direto.</li>
          <li>Mantemos a plataforma no ar e cuidamos dos dados que você nos envia.</li>
        </ul>
      </section>

      <section>
        <h2>O que nós não fazemos</h2>
        <ul>
          <li>Não executamos os serviços nem enviamos equipe própria.</li>
          <li>Não definimos preços, prazos ou condições do trabalho contratado.</li>
          <li>Não recebemos, retemos nem intermediamos o pagamento do serviço.</li>
          <li>Não garantimos o resultado do serviço prestado por terceiros.</li>
        </ul>
        <p>
          Preço, prazo, garantia, nota fiscal e qualquer acerto são combinados
          diretamente entre você e o profissional ou empresa contratada.
        </p>
      </section>

      <section>
        <h2>Uso da plataforma</h2>
        <ul>
          <li>Envie informações verdadeiras: elas são o que o profissional vai usar para te responder.</li>
          <li>Use a plataforma apenas para pedidos legítimos de serviço.</li>
          <li>Não envie conteúdo ofensivo, ilegal ou de terceiros sem autorização.</li>
        </ul>
        <p>
          Podemos recusar ou interromper o encaminhamento de pedidos que
          descumpram estas regras.
        </p>
      </section>

      <section>
        <h2>Parceiros</h2>
        <p>
          Profissionais e empresas que aderem ao programa Parceiro Fundador
          contratam a participação na plataforma pelo período informado na
          oferta. A adesão dá acesso às solicitações compatíveis com a categoria
          contratada; não constitui exclusividade, nem garantia de volume,
          fechamento ou faturamento. As condições comerciais de cada adesão são
          confirmadas com a equipe antes do pagamento.
        </p>
      </section>

      <section>
        <h2>Fase inicial</h2>
        <p>
          O {site.name} está em fase de lançamento. Funcionalidades podem mudar,
          ser adicionadas ou removidas enquanto o produto evolui. Mudanças
          relevantes nestes termos serão publicadas nesta página.
        </p>
      </section>

      <section>
        <h2>Contato</h2>
        <p>
          Dúvidas sobre estes termos podem ser enviadas pelo WhatsApp{" "}
          {site.whatsappDisplay}. Veja também a{" "}
          <Link href="/privacidade">Política de Privacidade</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
