import Link from "next/link";
import { requireMember, bandOf } from "@/lib/session";
import { LISTING_FEE, PASS_DAYS } from "@/lib/payments";
import { formatDate } from "@/lib/format";
import { PayPass } from "@/components/pay-pass";

export const metadata = { title: "Membership" };

export default async function MembershipPage() {
  const user = await requireMember();
  const band = bandOf(user);
  const active = user.listingPassUntil && user.listingPassUntil > new Date();

  return (
    <div className="mx-auto max-w-xl px-4 md:px-6 py-10 md:py-16 fade-in">
      <p className="eyebrow">Membership</p>
      <h1 className="text-4xl md:text-5xl mt-3">Listing on Cloro</h1>

      {band !== "ADULT_24_30" ? (
        <>
          <p className="mt-6 text-muted">Listing is <strong className="text-ink">free</strong> for members under 24. Enjoy!</p>
          <Link href="/listings/new" className="btn btn-primary mt-10">List an item</Link>
        </>
      ) : (
        <>
          <p className="mt-6 text-muted leading-relaxed">
            Cloro is built for Gen Z, so members aged 24–30 pay a small fee to list. Browsing, bidding and buying stay free.
          </p>
          <div className="card p-8 mt-10">
            <p className="serif text-4xl">₹{LISTING_FEE}<span className="text-base text-muted"> / {PASS_DAYS} days</span></p>
            <ul className="mt-4 text-sm space-y-1 text-muted">
              <li>Unlimited listings for {PASS_DAYS} days</li>
              <li>Your first listing is always free{user.freeListingUsed ? " (already used)" : " — you haven't used it yet"}</li>
            </ul>
            <p className="mt-6 text-sm">
              {active ? <>Your pass is active until <strong>{formatDate(user.listingPassUntil!)}</strong>.</> : "No active pass."}
            </p>
            <div className="mt-6">
              <PayPass label={active ? "Extend by 30 days" : "Buy listing pass"} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
