import { Hero } from "@/components/sections/hero";
import { Services } from "@/components/sections/services";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Trust } from "@/components/sections/trust";
import { Launch } from "@/components/sections/launch";
import { RequestCta } from "@/components/sections/request-cta";
import { ForPros } from "@/components/sections/for-pros";
import { Faq, faq } from "@/components/sections/faq";
import { site } from "@/lib/site";
import { ConsumerAnalytics } from "@/components/consumer-analytics";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site.url}#organizacao`,
      name: site.name,
      url: site.url,
      description: site.description,
      parentOrganization: { "@type": "Organization", name: site.company },
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
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "atendimento",
        telephone: `+${site.whatsapp}`,
        areaServed: "BR",
        availableLanguage: "Portuguese",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}#site`,
      url: site.url,
      name: site.name,
      inLanguage: "pt-BR",
      publisher: { "@id": `${site.url}#organizacao` },
    },
    {
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ConsumerAnalytics page="home" />
      <Hero />
      <Services />
      <HowItWorks />
      <Trust />
      <Launch />
      <RequestCta />
      <ForPros />
      <Faq />
    </>
  );
}
