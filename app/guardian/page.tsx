import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember, bandOf } from "@/lib/session";
import { createGuardianRequest } from "@/app/actions/account";
import { CopyLink } from "@/components/copy-link";

export const metadata = { title: "Guardian approval" };

export default async function GuardianPage() {
  const user = await requireMember();
  if (bandOf(user) !== "MINOR") redirect("/dashboard");
  if (!user.aadhaarVerifiedAt) redirect("/verify");

  if (user.guardianApprovedAt) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-5xl">Your guardian approved your account</h1>
        <p className="mt-4 text-muted">You can now bid (up to ₹5,000) and sell. Always bring a parent or friend to meetups.</p>
        <Link href="/browse" className="btn btn-primary mt-10">Start exploring</Link>
      </div>
    );
  }

  const req = await db.guardianRequest.findFirst({ where: { minorId: user.id, status: "PENDING" } });
  const h = await headers();
  const origin = process.env.AUTH_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  return (
    <div className="mx-auto max-w-xl px-6 py-20 fade-in">
      <p className="eyebrow">Members under 18</p>
      <h1 className="text-5xl mt-3">Ask a parent or guardian</h1>
      <p className="mt-4 text-muted leading-relaxed">
        Because you&apos;re under 18, a parent or guardian needs to approve your account before you can buy or sell. Send them the link
        below — they open it on their own phone and sign in with their own Google account.
      </p>
      <div className="mt-10">
        {req ? (
          <CopyLink url={`${origin}/guardian/${req.token}`} />
        ) : (
          <form action={async () => { "use server"; await createGuardianRequest(); }}>
            <button className="btn btn-gold">Create approval link</button>
          </form>
        )}
      </div>
      <p className="notice mt-10">
        Until then you can browse everything. Members under 18 can bid up to ₹5,000, and we strongly recommend bringing a parent or
        friend to any meetup.
      </p>
    </div>
  );
}
