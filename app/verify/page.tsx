import Link from "next/link";
import { BadgeCheck, Lock, ShieldCheck } from "lucide-react";
import { requireMember, bandOf } from "@/lib/session";
import { AadhaarScanner } from "@/components/aadhaar-scanner";

export const metadata = { title: "Verify with Aadhaar" };

export default async function VerifyPage() {
  const user = await requireMember({ next: "/verify" });

  if (user.aadhaarVerifiedAt) {
    const needsGuardian = bandOf(user) === "MINOR" && !user.guardianApprovedAt;
    return (
      <div className="mx-auto max-w-md px-4 md:px-6 py-16 text-center fade-in">
        <span className="mx-auto w-16 h-16 rounded-full bg-brand-soft text-brand flex items-center justify-center"><BadgeCheck className="w-8 h-8" aria-hidden /></span>
        <h1 className="text-4xl mt-5">You&apos;re verified!</h1>
        <p className="mt-3 text-ink-soft">Aadhaar ending ····{user.aadhaarLast4} · {user.aadhaarName}</p>
        {needsGuardian ? (
          <Link href="/guardian" className="btn btn-gold mt-8">Next: ask a parent to approve</Link>
        ) : (
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/browse" className="btn btn-primary">Start bidding</Link>
            <Link href="/listings/new" className="btn btn-ghost">List an item</Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 md:px-6 py-10 md:py-14 fade-in">
      <span className="w-12 h-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center"><ShieldCheck className="w-6 h-6" aria-hidden /></span>
      <h1 className="text-4xl md:text-5xl mt-4">One quick check</h1>
      <p className="mt-3 text-ink-soft leading-relaxed">
        Before you buy or sell, we verify you once with your Aadhaar card. It keeps Cloro free of fake accounts and scammers — one
        real person, one account.
      </p>

      <ol className="mt-8 grid gap-3">
        {[
          "Take a clear photo of the QR code on your Aadhaar card (or e-Aadhaar).",
          "We check UIDAI's digital signature, so edited cards don't pass.",
          "Your name must match your Google account. Your age comes from Aadhaar.",
        ].map((t, i) => (
          <li key={t} className="flex gap-3 items-start text-sm">
            <span className="w-7 h-7 shrink-0 rounded-full bg-gold-soft text-gold-dark font-bold flex items-center justify-center">{i + 1}</span>
            <span className="pt-1">{t}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        <AadhaarScanner />
      </div>

      <div className="mt-8 notice notice-brand flex gap-3">
        <Lock className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">Your privacy</p>
          <p className="mt-1">The card photo never leaves your phone — only the QR data is checked. We keep your name, date of birth and the last 4 digits. We never store your full Aadhaar number, address or card image.</p>
        </div>
      </div>
      <details className="mt-4 text-sm text-muted">
        <summary className="cursor-pointer font-medium">My card is old / the QR won&apos;t scan</summary>
        <p className="mt-2 leading-relaxed">
          Cards printed before about 2019 have an older QR code that can&apos;t be verified. Download your free e-Aadhaar PDF from the
          UIDAI website and take a screenshot of its QR code. Still stuck? <Link href="/support/new?category=ACCOUNT" className="link">Ask support</Link>.
        </p>
      </details>
    </div>
  );
}
