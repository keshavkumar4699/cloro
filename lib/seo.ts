import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, absoluteUrl } from "@/lib/site";

/** Search phrases people use when they want to sell or buy pre-loved things at a fair price. */
export const SEO_KEYWORDS = [
  "online auction India",
  "auction website India",
  "bid online",
  "sell old stuff online",
  "sell used items online India",
  "sell old clothes online",
  "sell second hand sneakers",
  "sell used phone accessories",
  "pre-loved fashion",
  "thrift store online India",
  "resale marketplace",
  "second hand marketplace India",
  "get the right price for used items",
  "sell at the best price",
  "marketplace for students",
  "Gen Z marketplace",
];

export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl("/icon"),
  description: SITE_DESCRIPTION,
};

export const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "en-IN",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/browse?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

export function faqLd(faqs: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}
