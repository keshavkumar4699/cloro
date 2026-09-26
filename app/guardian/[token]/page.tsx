import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ageOn } from "@/lib/rules";
import { ActionForm } from "@/components/action-form";
import { decideGuardianRequest } from "@/app/actions/account";

export const metadata = { title: "Approve a Cloro account" };

export default async function GuardianApprovePage({ params }: PageProps<"/guardian/[token]">) {
  const { token } = await params;
  const req = await db.guardianRequest.findUnique({ where: { token }, include: { minor: true } });
  if (!req) notFound();
  const user = await getCurrentUser();
  const minorAge = req.minor.dob ? ageOn(req.minor.dob) : null;

  return (
    <div className="mx-auto max-w-xl px-6 py-20 fade-in">
      <p className="eyebrow">Guardian approval</p>
      <h1 className="text-5xl mt-3">{req.minor.aadhaarName ?? req.minor.name} wants to join Cloro</h1>

      <div className="mt-8 space-y-3 text-muted leading-relaxed">
        <p>
          Cloro is a verified community where young people ({minorAge ? `your child is ${minorAge}` : "ages 13–30"}) auction pre-loved
          items to each other. Every trader is Aadhaar-verified.
        </p>
        <p>If you approve, they will be able to:</p>
        <ul className="list-disc pl-6">
          <li>bid on items up to <strong>₹5,000</strong> and list their own items;</li>
          <li>chat about items with sellers or top bidders (all chats can be reviewed by our team if reported);</li>
          <li>arrange meetups or shipping. We ask all members under 18 to bring a parent or friend to meetups in public places.</li>
        </ul>
        <p>You can contact our support team at any time about your child&apos;s account.</p>
      </div>

      {req.status !== "PENDING" ? (
        <p className="notice mt-10">This request has already been {req.status.toLowerCase()}.</p>
      ) : !user ? (
        <Link href={`/signin?next=/guardian/${token}`} className="btn btn-primary mt-10">Sign in with your Google account to respond</Link>
      ) : user.id === req.minorId ? (
        <p className="notice mt-10">This link is for your parent or guardian. Send it to them — they need to open it with their own Google account.</p>
      ) : (
        <div className="mt-10 space-y-6">
          <ActionForm action={decideGuardianRequest} submit="Approve account" variant="gold" className="card p-6 space-y-4">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="decision" value="approve" />
            <div>
              <label className="label" htmlFor="relationship">Your relationship</label>
              <select id="relationship" name="relationship" className="input" required defaultValue="">
                <option value="" disabled>Choose…</option>
                <option>Mother</option>
                <option>Father</option>
                <option>Legal guardian</option>
              </select>
            </div>
            <label className="flex gap-3 text-sm">
              <input type="checkbox" name="agree" required />
              I am this person&apos;s parent or legal guardian, I am over 18, and I consent to them using Cloro and to Cloro processing
              their data as described.
            </label>
          </ActionForm>
          <ActionForm action={decideGuardianRequest} submit="Decline" variant="danger">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="decision" value="decline" />
          </ActionForm>
          {user.dob && ageOn(user.dob) < 18 && <p className="text-sm text-red-700">Guardians must be adults.</p>}
        </div>
      )}
    </div>
  );
}
