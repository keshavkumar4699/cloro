import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import Link from "next/link";
import { Header } from "@/components/header";
import "./globals.css";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-cormorant" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Cloro — the members' auction house for Gen Z", template: "%s · Cloro" },
  description: "Verified members. Honest listings. Live auctions for pre-loved fashion, sneakers and more.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line mt-24">
          <div className="mx-auto max-w-6xl px-6 py-12 grid gap-8 md:grid-cols-3 text-sm text-muted">
            <div>
              <p className="serif text-2xl text-ink tracking-[0.3em]">CLORO</p>
              <p className="mt-3 max-w-xs">A community of good people. Be honest, be kind, and never cause harm to anyone.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/help" className="link">Help centre &amp; FAQ</Link>
              <Link href="/help#safety" className="link">Safety guide</Link>
              <Link href="/help#guidelines" className="link">Community guidelines</Link>
              <Link href="/support" className="link">Contact support</Link>
            </div>
            <div>
              <p>Never scan a QR code to <em>receive</em> money. Never share an OTP. Keep chats on Cloro.</p>
              <p className="mt-3">© {new Date().getFullYear()} Cloro</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
