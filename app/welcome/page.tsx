import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { getCurrentUser, bandOf } from "@/lib/session";
import { isEligibleBand } from "@/lib/rules";
import { ActionForm } from "@/components/action-form";
import { completeOnboarding } from "@/app/actions/account";

export const metadata = { title: "Welcome" };

const PLEDGE = [
  ["✨", "I'll describe my items honestly — true size, condition and flaws."],
  ["🤝", "I'll treat every member with respect, especially younger members."],
  ["🔨", "I'll only bid when I really mean to buy."],
  ["💚", "I won't scam, harass or cause harm to anybody."],
];

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (user.status === "BANNED") redirect("/banned");
  const band = bandOf(user);
  if (band && !isEligibleBand(band)) redirect("/not-eligible");
  if (user.onboardedAt && user.dob) redirect("/");

  return (
    <div className="mx-auto max-w-xl px-4 md:px-6 py-10 md:py-16 fade-in">
      <p className="text-4xl" aria-hidden>👋</p>
      <h1 className="text-4xl md:text-5xl mt-3">Hi{user.name ? ` ${user.name.split(" ")[0]}` : ""}, welcome in!</h1>
      <p className="mt-3 text-ink-soft">Just a couple of things and you&apos;re set.</p>

      {band === "ADULT_24_30" && (
        <p className="notice mt-6">
          Cloro is built for Gen Z, and you&apos;re very welcome here — just be mindful of our younger members. Browsing and bidding are
          free; your first listing is free, then listing is a small monthly fee.
        </p>
      )}
      {band === "MINOR" && (
        <p className="notice notice-brand mt-6">
          Since you&apos;re under 18, a parent or guardian will approve your account before you buy or sell. You can browse right away!
        </p>
      )}

      <ActionForm action={completeOnboarding} submit="Let's go" full className="mt-8 space-y-6">
        {!user.dob && (
          <div>
            <label className="label" htmlFor="dob">Date of birth</label>
            <input id="dob" name="dob" type="date" className="input" required max={new Date().toISOString().slice(0, 10)} />
            <p className="hint">Your Google account didn&apos;t share a birthday. When you verify later, your Aadhaar decides your age.</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="city">City</label>
            <input id="city" name="city" className="input" defaultValue={user.city ?? ""} placeholder="e.g. Pune" required autoComplete="address-level2" />
          </div>
          <div>
            <label className="label" htmlFor="pincode">Pincode</label>
            <input id="pincode" name="pincode" inputMode="numeric" pattern="\d{6}" maxLength={6} className="input" defaultValue={user.pincode ?? ""} required autoComplete="postal-code" />
          </div>
        </div>
        <p className="hint -mt-3">Helps you find items nearby for easy meetups.</p>

        <fieldset className="card p-5 md:p-6">
          <legend className="sr-only">Community pledge</legend>
          <p className="flex items-center gap-2 font-semibold"><Heart className="w-4 h-4 text-gold" aria-hidden /> Our community promise</p>
          <ul className="mt-4 space-y-3 text-sm">
            {PLEDGE.map(([e, p]) => (
              <li key={p} className="flex gap-3"><span aria-hidden>{e}</span>{p}</li>
            ))}
          </ul>
          <label className="mt-5 flex items-center gap-3 rounded-xl bg-paper px-4 py-3 text-sm font-medium cursor-pointer">
            <input type="checkbox" name="pledge" required className="accent-brand w-5 h-5" /> I&apos;m in. Cloro is a community of good people.
          </label>
        </fieldset>
      </ActionForm>
    </div>
  );
}
