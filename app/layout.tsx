import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";
import { Header } from "@/components/header";
import { MobileNav } from "@/components/mobile-nav";
import { Toaster } from "@/components/toaster";
import { getCurrentUser } from "@/lib/session";
import { FLASH_COOKIE, parseFlash } from "@/lib/flash";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { SEO_KEYWORDS } from "@/lib/seo";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz", "SOFT"] });
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Online Auctions to Buy & Sell Pre-loved Fashion, Sneakers & More`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SEO_KEYWORDS,
  category: "shopping",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    url: "/",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: `${SITE_NAME} — ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  formatDetection: { telephone: false },
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export const viewport: Viewport = { themeColor: "#fbf7f1" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, jar] = await Promise.all([getCurrentUser(), cookies()]);
  const flash = parseFlash(jar.get(FLASH_COOKIE)?.value);

  return (
    <html lang="en-IN" className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-screen flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 btn btn-primary">Skip to content</a>
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <footer className="border-t border-line bg-ivory/50 mt-24 pb-24 md:pb-0">
          <div className="mx-auto max-w-6xl px-4 md:px-6 py-12 md:py-14 grid gap-10 grid-cols-2 md:grid-cols-5 text-sm text-muted">
            <div className="col-span-2">
              <p className="serif text-3xl text-ink">cloro<span className="text-gold">.</span></p>
              <p className="mt-3 max-w-sm leading-relaxed">
                India&apos;s online auction marketplace for Gen Z. Sell your old stuff at the right price, and bid on pre-loved finds from verified
                people. Be honest, be kind, and never cause harm to anyone.
              </p>
              <p className="mt-4 text-xs leading-relaxed">Never scan a QR code to <em>receive</em> money. Never share an OTP. Keep chats on Cloro.</p>
            </div>
            <nav className="flex flex-col gap-2.5" aria-label="Shop">
              <p className="font-semibold text-ink">Shop &amp; sell</p>
              <Link href="/browse" className="hover:text-ink">Live auctions</Link>
              <Link href="/sell" className="hover:text-ink">Sell your stuff</Link>
              <Link href="/c/sneakers" className="hover:text-ink">Sneakers</Link>
              <Link href="/c/clothes" className="hover:text-ink">Clothes</Link>
              <Link href="/c/streetwear" className="hover:text-ink">Streetwear</Link>
              <Link href="/c/watches" className="hover:text-ink">Watches</Link>
              <Link href="/c/gadgets" className="hover:text-ink">Gadgets</Link>
            </nav>
            <nav className="flex flex-col gap-2.5" aria-label="Help">
              <p className="font-semibold text-ink">Help</p>
              <Link href="/help" className="hover:text-ink">How it works</Link>
              <Link href="/help#safety" className="hover:text-ink">Safety guide</Link>
              <Link href="/help#guidelines" className="hover:text-ink">Community rules</Link>
              <Link href="/support" className="hover:text-ink">Support</Link>
              <Link href="/contact" className="hover:text-ink">Contact us</Link>
            </nav>
            <nav className="flex flex-col gap-2.5" aria-label="Company">
              <p className="font-semibold text-ink">Cloro</p>
              <Link href="/about" className="hover:text-ink">About</Link>
              <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
              <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
              <Link href="/legal/refunds" className="hover:text-ink">Refunds</Link>
            </nav>
          </div>
          <p className="mx-auto max-w-6xl px-4 md:px-6 pb-8 text-xs text-muted">© {new Date().getFullYear()} Cloro · Made in India</p>
        </footer>
        <MobileNav signedIn={!!user} />
        <Toaster flash={flash} />
      </body>
    </html>
  );
}
