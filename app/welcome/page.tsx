import { redirect } from "next/navigation";
import { getCurrentUser, bandOf } from "@/lib/session";
import { isEligibleBand } from "@/lib/rules";
import { ActionForm } from "@/components/action-form";
import { completeOnboarding } from "@/app/actions/account";

export const metadata = { title: "Welcome" };

const PLEDGE = [
  "I'll describe my items honestly, including their true size and condition.",
  "I'll treat every member with respect — especially younger members.",
  "I'll only bid when I truly intend to buy.",
  "I won't scam, harass or cause harm to anybody.",
];

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (user.status === "BANNED") redirect("/banned");
  if (user.onboardedAt && user.dob) {
    const band = bandOf(user);
    redirect(band && !isEligibleBand(band) ? "/not-eligible" : "/");
  }
  const band = bandOf(user);
  if (band && !isEligibleBand(band)) redirect("/not-eligible");

  return (
    <div className="mx-auto max-w-xl px-6 py-20 fade-in">
      <p className="eyebrow">Step 1 of 1</p>
      <h1 className="text-5xl mt-3">Hello{user.name ? `, ${user.name.split(" ")[0]}` : ""}.</h1>
      <p className="mt-4 text-muted">A few details and you&apos;re in.</p>

      {band === "ADULT_24_30" && (
        <p className="notice mt-8">
          Cloro is built for Gen Z. You&apos;re welcome here — just be mindful of our younger members. Browsing and bidding are free;
          your first listing is free, then listing is a small monthly fee.
        </p>
      )}
      {band === "MINOR" && (
        <p className="notice mt-8">
          Because you&apos;re under 18, a parent or guardian will need to approve your account before you can buy or sell. Browsing is
          open right away.
        </p>
      )}

      <ActionForm action={completeOnboarding} submit="Enter Cloro" className="mt-10 space-y-6">
        {!user.dob && (
          <div>
            <label className="label" htmlFor="dob">Date of birth</label>
            <input id="dob" name="dob" type="date" className="input" required />
            <p className="text-xs text-muted mt-1">
              Your Google account didn&apos;t share a birthday. This is used for browsing only — your Aadhaar decides your age when you
              verify, and it can&apos;t be changed later.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="city">City</label>
            <input id="city" name="city" className="input" defaultValue={user.city ?? ""} required />
          </div>
          <div>
            <label className="label" htmlFor="pincode">Pincode</label>
            <input id="pincode" name="pincode" inputMode="numeric" maxLength={6} className="input" defaultValue={user.pincode ?? ""} required />
          </div>
        </div>
        <fieldset className="card p-6">
          <legend className="eyebrow px-2">The Cloro pledge</legend>
          <ul className="space-y-2 text-sm list-disc pl-5">
            {PLEDGE.map((p) => <li key={p}>{p}</li>)}
          </ul>
          <label className="flex items-center gap-3 mt-5 text-sm">
            <input type="checkbox" name="pledge" required /> I take the pledge. Cloro is a community of good people.
          </label>
        </fieldset>
      </ActionForm>
    </div>
  );
}
