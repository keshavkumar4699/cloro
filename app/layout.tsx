import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";
import { Header } from "@/components/header";
import { MobileNav } from "@/components/mobile-nav";
import { Toaster } from "@/components/toaster";
import { getCurrentUser } from "@/lib/session";
import { FLASH_COOKIE, parseFlash } from "@/lib/flash";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz", "SOFT"] });
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: { default: "Cloro — pre-loved fashion auctions for Gen Z", template: "%s · Cloro" },
  description: "Bid on pre-loved fashion, sneakers and more from verified members across India. Honest sizes, fair auctions, real support.",
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
        <main id="main" className="flex-1 pb-24 md:pb-0">{children}</main>
        <footer className="hidden md:block border-t border-line bg-ivory/50 mt-24">
          <div className="mx-auto max-w-6xl px-6 py-14 grid gap-10 md:grid-cols-4 text-sm text-muted">
            <div className="md:col-span-2">
              <p className="serif text-3xl text-ink">cloro<span className="text-gold">.</span></p>
              <p className="mt-3 max-w-sm leading-relaxed">
                A community of good people trading pieces they love. Be honest, be kind, and never cause harm to anyone.
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="font-semibold text-ink">Help</p>
              <Link href="/help" className="hover:text-ink">How Cloro works</Link>
              <Link href="/help#safety" className="hover:text-ink">Safety guide</Link>
              <Link href="/help#guidelines" className="hover:text-ink">Community guidelines</Link>
              <Link href="/support" className="hover:text-ink">Contact support</Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="font-semibold text-ink">Stay safe</p>
              <p className="leading-relaxed">Never scan a QR code to <em>receive</em> money. Never share an OTP. Keep chats on Cloro.</p>
              <p className="mt-2">© {new Date().getFullYear()} Cloro · Made in India</p>
            </div>
          </div>
        </footer>
        <MobileNav signedIn={!!user} />
        <Toaster flash={flash} />
      </body>
    </html>
  );
}
