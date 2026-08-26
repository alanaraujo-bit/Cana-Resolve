import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: `Como o ${site.name} trata os dados enviados por quem solicita um serviço em ${site.city}.`,
  alternates: { canonical: "/privacidade" },
};

export default function PrivacidadePage() {
  return (
    <LegalPage
      eyebrow="Institucional"
      title="Política de Privacidade"
      updatedAt="26 de agosto de 2026"
    >
      <section>
        <h2>Em uma frase</h2>
        <p>
          Os dados que você envia servem para que profissionais compatíveis
          consigam falar com você sobre o serviço que pediu — nada além disso.
        </p>
      </section>

      <section>
        <h2>O que coletamos</h2>
        <p>
          Quando você preenche o formulário de solicitação, a mensagem é montada
          com o que você digitou: a descrição do que precisa, a categoria, o
          bairro ou referência, a urgência, o seu nome e o seu WhatsApp.
        </p>
        <p>
          Nesta primeira versão do site, esse conteúdo não é gravado aqui. Ele é
          enviado por você, pelo WhatsApp, para o número oficial do{" "}
          {site.name}, e passa a existir nessa conversa.
        </p>
      </section>

      <section>
        <h2>Como usamos</h2>
        <ul>
          <li>Para entender o seu pedido e identificar a categoria certa.</li>
          <li>Para encaminhá-lo a profissionais e empresas parceiras daquela categoria, com a sua autorização.</li>
          <li>Para falar com você sobre esse pedido, se precisarmos de algum detalhe.</li>
        </ul>
        <p>
          O compartilhamento com parceiros depende da autorização que você marca
          no formulário. Ela vem desmarcada e é você quem decide.
        </p>
      </section>

      <section>
        <h2>Com quem compartilhamos</h2>
        <p>
          Com os profissionais e empresas parceiras da categoria do seu pedido,
          para que possam entrar em contato. Não vendemos os seus dados e não os
          usamos para publicidade de terceiros.
        </p>
      </section>

      <section>
        <h2>Seus direitos</h2>
        <p>
          Você pode pedir a qualquer momento para ver, corrigir ou apagar os
          dados relacionados ao seu pedido, e pode retirar a autorização de
          compartilhamento. Basta escrever para o WhatsApp{" "}
          {site.whatsappDisplay}. Respondemos e resolvemos assim que possível.
        </p>
      </section>

      <section>
        <h2>Cookies e medição</h2>
        <p>
          Este site não usa cookies de rastreamento nem ferramentas de
          publicidade. A sua preferência de tema (claro ou escuro) fica guardada
          apenas no seu navegador e não sai dele.
        </p>
      </section>

      <section>
        <h2>Mudanças</h2>
        <p>
          Quando o Canaã Resolve passar a armazenar solicitações na própria
          plataforma, esta página será atualizada antes — dizendo o que muda,
          por quanto tempo os dados ficam guardados e como pedir a exclusão.
          Veja também os <Link href="/termos">Termos de Uso</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
