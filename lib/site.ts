/** Public site settings shared by metadata, sitemap, emails-in-pages and absolute links. */
export const SITE_NAME = "Cloro";
export const SITE_URL = (process.env.SITE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? "support@example.com";
export const SITE_TAGLINE = "Online auctions for pre-loved fashion, sneakers & more";
export const SITE_DESCRIPTION =
  "Cloro is India's verified auction marketplace for Gen Z. Sell your old clothes, sneakers, bags, watches and gadgets at the right price — buyers bid, so you get what it's really worth. Honest sizes, verified members, real support.";

export const absoluteUrl = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Shown on the contact and legal pages (Razorpay and Google ask for these). Set them in your environment. */
export const BUSINESS_NAME = process.env.BUSINESS_NAME ?? "Cloro";
export const CONTACT_ADDRESS = process.env.CONTACT_ADDRESS ?? "";
export const GRIEVANCE_OFFICER = process.env.GRIEVANCE_OFFICER ?? "";
export const LEGAL_UPDATED = "2 October 2026";
