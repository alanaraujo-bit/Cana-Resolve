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
          O formulário de interesse de parceiros monta uma mensagem semelhante,
          com nome, empresa ou nome profissional, WhatsApp, categoria, informação
          de atendimento em Canaã dos Carajás e, se você escolher informar, como
          conheceu o Canaã Resolve.
        </p>
        <p>
          Esse conteúdo é gravado no {site.name} no momento em que você envia o
          formulário, e recebe um código de identificação. A conversa continua
          pelo WhatsApp oficial, mas o registro não depende dela: se a conversa
          não acontecer, o pedido continua existindo — foi para isso que ele
          passou a ser guardado.
        </p>
        <p>
          Guardamos apenas o que você digitou no formulário, mais a origem da
          visita (por exemplo, o link de campanha que trouxe você) e a data. Não
          registramos o seu endereço de IP nem qualquer identificador de
          rastreamento junto do pedido.
        </p>
      </section>

      <section>
        <h2>Onde os dados ficam</h2>
        <p>
          Em um banco de dados sob nossa administração, hospedado na Railway, em
          servidores nos Estados Unidos. O acesso é restrito à equipe do{" "}
          {site.name}, com autenticação individual, e todo acesso administrativo
          é registrado.
        </p>
        <p>
          Mantemos o registro enquanto ele for útil para atender você e para o
          histórico da operação. Você pode pedir a exclusão a qualquer momento —
          e, quando pedir, apagamos.
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
          para que possam entrar em contato — e somente com aqueles a quem o
          pedido é efetivamente encaminhado. O parceiro recebe o problema, o
          bairro, a urgência, o seu primeiro nome e o seu WhatsApp: o necessário
          para atender, e nada além.
        </p>
        <p>
          Não vendemos os seus dados e não os usamos para publicidade de
          terceiros.
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
          Este site não usa cookies de publicidade. Para entender o desempenho
          comercial, pode registrar de forma agregada páginas vistas, cliques,
          etapas de formulário, categoria informada e origem de campanha (como
          links com UTM). Não enviamos a descrição do pedido, nome, telefone ou
          outros dados pessoais para essa medição. A sua preferência de tema
          (claro ou escuro) fica guardada apenas no seu navegador.
        </p>
      </section>

      <section>
        <h2>Mudanças</h2>
        <p>
          Esta página foi atualizada em 26 de agosto de 2026, quando o{" "}
          {site.name} passou a guardar as solicitações e os cadastros na própria
          plataforma. Antes disso, o conteúdo dos formulários existia apenas na
          conversa do WhatsApp.
        </p>
        <p>
          Se algo mudar de novo no que coletamos, onde guardamos ou com quem
          compartilhamos, esta página é atualizada antes da mudança entrar no ar.
          Veja também os <Link href="/termos">Termos de Uso</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
