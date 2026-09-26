import Link from "next/link";
import { requireMember, bandOf } from "@/lib/session";
import { AadhaarScanner } from "@/components/aadhaar-scanner";

export const metadata = { title: "Verify with Aadhaar" };

export default async function VerifyPage() {
  const user = await requireMember();

  if (user.aadhaarVerifiedAt) {
    const needsGuardian = bandOf(user) === "MINOR" && !user.guardianApprovedAt;
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="eyebrow">Verified member</p>
        <h1 className="text-5xl mt-3">You&apos;re verified</h1>
        <p className="mt-4 text-muted">Aadhaar ending {user.aadhaarLast4} · {user.aadhaarName}</p>
        {needsGuardian ? (
          <Link href="/guardian" className="btn btn-gold mt-10">Next: guardian approval</Link>
        ) : (
          <Link href="/browse" className="btn btn-primary mt-10">Start exploring</Link>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-20 fade-in">
      <p className="eyebrow">One-time verification</p>
      <h1 className="text-5xl mt-3">Verify with Aadhaar</h1>
      <p className="mt-4 text-muted leading-relaxed">
        To list, bid, ask questions or chat, every member verifies once. This keeps Cloro free of fake accounts and scammers — one
        person, one account.
      </p>

      <ol className="mt-8 space-y-3 text-sm">
        <li><span className="serif text-xl text-gold mr-2">1</span>Take a clear photo of the QR code on your Aadhaar card (or e-Aadhaar).</li>
        <li><span className="serif text-xl text-gold mr-2">2</span>We check UIDAI&apos;s digital signature inside the QR code, so edited cards are rejected.</li>
        <li><span className="serif text-xl text-gold mr-2">3</span>Your name must match your Google account, and your age comes from Aadhaar.</li>
      </ol>

      <div className="mt-10">
        <AadhaarScanner />
      </div>

      <details className="mt-10 text-sm text-muted">
        <summary className="cursor-pointer">What we keep, and what we never keep</summary>
        <div className="mt-3 space-y-2">
          <p><strong>Kept:</strong> that you&apos;re verified, your name, date of birth, the last 4 digits of your Aadhaar, and a one-way fingerprint used only to stop duplicate accounts.</p>
          <p><strong>Never kept:</strong> your full Aadhaar number, address, or any photo of your card. The card photo never leaves your device.</p>
          <p><strong>Old cards:</strong> cards printed before about 2019 have a QR code that can&apos;t be verified. Download your free e-Aadhaar from the UIDAI website and use its QR code instead.</p>
        </div>
      </details>
    </div>
  );
}
