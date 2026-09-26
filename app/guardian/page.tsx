import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireMember, bandOf } from "@/lib/session";
import { createGuardianRequest } from "@/app/actions/account";
import { ActionForm } from "@/components/action-form";
import { CopyLink } from "@/components/copy-link";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Guardian approval" };

const LINK_DAYS = 7;

export default async function GuardianPage() {
  const user = await requireMember({ next: "/guardian" });
  if (bandOf(user) !== "MINOR") redirect("/dashboard");
  if (!user.aadhaarVerifiedAt) redirect("/verify");

  if (user.guardianApprovedAt) {
    return (
      <div className="mx-auto max-w-md px-4 md:px-6 py-16 text-center fade-in">
        <p className="text-5xl" aria-hidden>🎉</p>
        <h1 className="text-4xl mt-4">You&apos;re all set!</h1>
        <p className="mt-3 text-ink-soft">Your guardian approved your account. You can bid up to ₹5,000 and sell. Always bring a parent or friend to meetups.</p>
        <Link href="/browse" className="btn btn-primary mt-8">Start exploring</Link>
      </div>
    );
  }

  const req = await db.guardianRequest.findFirst({ where: { minorId: user.id, status: "PENDING" }, orderBy: { createdAt: "desc" } });
  const expiresAt = req ? new Date(req.createdAt.getTime() + LINK_DAYS * 86400000) : null;
  const valid = req && expiresAt! > new Date();
  const h = await headers();
  const origin = process.env.AUTH_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  return (
    <div className="mx-auto max-w-xl px-4 md:px-6 py-10 md:py-14 fade-in">
      <span className="w-12 h-12 rounded-2xl bg-gold-soft text-gold-dark flex items-center justify-center"><Users className="w-6 h-6" aria-hidden /></span>
      <h1 className="text-4xl md:text-5xl mt-4">Ask a parent or guardian</h1>
      <p className="mt-3 text-ink-soft leading-relaxed">
        Since you&apos;re under 18, a parent or guardian approves your account before you can buy or sell. Send them this link —
        they open it on their phone and sign in with <strong>their own</strong> Google account.
      </p>
      <div className="mt-8">
        {valid ? (
          <>
            <CopyLink url={`${origin}/guardian/${req.token}`} />
            <p className="hint">This link works until {formatDate(expiresAt!)}.</p>
          </>
        ) : (
          <ActionForm action={createGuardianRequest} submit={req ? "Create a new link" : "Create approval link"} variant="gold">
            {req && <p className="text-sm text-muted mb-3">Your previous link expired.</p>}
          </ActionForm>
        )}
      </div>
      <p className="notice notice-brand mt-8">
        Until then you can browse everything. Members under 18 can bid up to ₹5,000, and should always bring a parent or friend to a meetup.
      </p>
    </div>
  );
}
