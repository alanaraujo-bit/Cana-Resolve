import type { Metadata } from "next";
import { PartnersAnalytics } from "@/components/partners/page-analytics";
import { PartnersBenefits } from "@/components/partners/benefits";
import { PartnersContrast } from "@/components/partners/contrast";
import { PartnersFaq } from "@/components/partners/faq";
import { PartnersFounder } from "@/components/partners/founder";
import { PartnersHero } from "@/components/partners/hero";
import { PartnersHow } from "@/components/partners/how";
import { PartnersSignup } from "@/components/partners/signup";
import { PartnersWho } from "@/components/partners/who";
import { StickyCta } from "@/components/partners/sticky-cta";
import { founder, partnerFaq, partnerSeo } from "@/lib/partners";
import { site } from "@/lib/site";

const url = `${site.url}/parceiros`;

export const metadata: Metadata = {
  title: { absolute: partnerSeo.title },
  description: partnerSeo.description,
  alternates: { canonical: "/parceiros" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url,
    siteName: site.name,
    title: partnerSeo.title,
    description: partnerSeo.description,
  },
  twitter: {
    card: "summary_large_image",
    title: partnerSeo.title,
    description: partnerSeo.description,
  },
  keywords: [
    "ser parceiro Canaã Resolve",
    "receber clientes em Canaã dos Carajás",
    "divulgar serviços em Canaã dos Carajás",
    "parceiro fundador Canaã Resolve",
    "oportunidades para prestadores de serviço em Canaã dos Carajás",
  ],
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${url}#pagina`,
      url,
      name: partnerSeo.title,
      description: partnerSeo.description,
      inLanguage: "pt-BR",
      isPartOf: { "@id": `${site.url}#site` },
      about: { "@id": `${site.url}#organizacao` },
    },
    {
      "@type": "Service",
      "@id": `${url}#programa`,
      name: "Parceiro Fundador Canaã Resolve",
      serviceType: "Rede de parceiros para prestadores de serviço",
      provider: { "@id": `${site.url}#organizacao` },
      areaServed: {
        "@type": "City",
        name: site.city,
        address: {
          "@type": "PostalAddress",
          addressLocality: site.city,
          addressRegion: site.state,
          addressCountry: "BR",
        },
      },
      audience: {
        "@type": "BusinessAudience",
        name: "Profissionais autônomos e empresas de serviços",
      },
      offers: {
        "@type": "Offer",
        price: founder.priceValue,
        priceCurrency: "BRL",
        category: "Programa de lançamento",
        description: `Participação no programa Parceiro Fundador por ${founder.period}.`,
        availability: "https://schema.org/LimitedAvailability",
        url,
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${url}#duvidas`,
      mainEntity: partnerFaq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
};

const secoesObservadas = [
  "a-diferenca",
  "como-funciona-parceiro",
  "beneficios",
  "parceiro-fundador",
  "quem-participa",
  "duvidas-parceiro",
  "cadastro",
];

export default function ParceirosPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PartnersAnalytics sections={secoesObservadas} />
      <PartnersHero />
      <PartnersContrast />
      <PartnersHow />
      <PartnersBenefits />
      <PartnersFounder />
      <PartnersWho />
      <PartnersFaq />
      <PartnersSignup />
      <StickyCta />
    </>
  );
}
