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
      updatedAt="27 de agosto de 2026"
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
          em duas etapas. Primeiro, só o necessário para uma empresa decidir se
          consegue atender: o código do pedido, o problema, a categoria, o
          bairro e a urgência — sem o seu nome e sem o seu WhatsApp. Seu nome e
          seu WhatsApp só são
          liberados para uma empresa depois que ela confirma, na própria
          plataforma, que tem interesse em atender aquele pedido específico.
          Uma empresa que não demonstrou esse interesse nunca chega a ver esses
          dois dados.
        </p>
        <p>
          Não vendemos os seus dados e não os usamos para publicidade de
          terceiros.
        </p>
      </section>

      <section>
        <h2>Como você acompanha o seu pedido</h2>
        <p>
          Não é preciso criar conta nem senha. Depois de enviar uma solicitação,
          a tela de confirmação mostra um link de acompanhamento — o mesmo link
          continua funcionando por bastante tempo (cerca de dois anos), em
          qualquer aparelho onde você o abrir, sem pedir para entrar de novo.
        </p>
        <p>
          Esse link é uma credencial: quem o tiver em mãos consegue ver o
          histórico de solicitações associado ao seu WhatsApp. Trate-o como
          trataria uma senha — evite encaminhá-lo. Hoje não temos uma forma de
          revogar apenas o seu link individualmente; se ele for parar em mãos
          erradas, avise no WhatsApp {site.whatsappDisplay} para decidirmos
          juntos o que fazer.
        </p>
        <p>
          As empresas parceiras, por sua vez, entram com um código próprio e o
          WhatsApp cadastrado na análise da equipe — uma sessão distinta,
          restrita ao perfil e às oportunidades daquela empresa.
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
          Em 27 de agosto de 2026, esta página passou a descrever o link de
          acompanhamento do morador e a sessão do parceiro, junto da correção
          de quando o nome e o WhatsApp do morador são liberados para uma
          empresa parceira — ver &ldquo;Com quem compartilhamos&rdquo; e
          &ldquo;Como você acompanha o seu pedido&rdquo; acima.
        </p>
        <p>
          Antes, em 26 de agosto de 2026, o {site.name} havia passado a guardar
          as solicitações e os cadastros na própria plataforma — até então, o
          conteúdo dos formulários existia apenas na conversa do WhatsApp.
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
