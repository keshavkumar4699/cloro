import Link from "next/link";
import { db } from "@/lib/db";
import { requireMember, bandOf } from "@/lib/session";
import { settleDue } from "@/lib/auction";
import { formatDate, formatINR } from "@/lib/format";
import { listingFeeRequired, rankBidders, tradeBlock, TRADE_BLOCK_MESSAGES } from "@/lib/rules";
import { ActionForm } from "@/components/action-form";
import { appealStrike } from "@/app/actions/support";

export const metadata = { title: "My Cloro" };

const DEAL_LABEL: Record<string, string> = {
  OFFERED: "Awaiting response",
  ACCEPTED: "In progress",
  COMPLETED: "Done",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export default async function DashboardPage() {
  const user = await requireMember();
  await settleDue();
  const band = bandOf(user);
  const block = tradeBlock(user);

  const [deals, listings, myBids, strikes] = await Promise.all([
    db.deal.findMany({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      include: { listing: { select: { title: true } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    db.listing.findMany({ where: { sellerId: user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.bid.findMany({ where: { bidderId: user.id }, distinct: ["listingId"], select: { listingId: true }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.strike.findMany({ where: { userId: user.id, status: { in: ["CONFIRMED", "OVERTURNED"] } }, orderBy: { createdAt: "desc" } }),
  ]);
  const bidListings = await db.listing.findMany({
    where: { id: { in: myBids.map((b) => b.listingId) } },
    include: { bids: { select: { bidderId: true, amount: true, createdAt: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-14 space-y-16">
      <div>
        <p className="eyebrow">Your account</p>
        <h1 className="text-5xl mt-2">My Cloro</h1>
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="eyebrow">Identity</p>
            {user.aadhaarVerifiedAt ? (
              <p className="mt-2">Aadhaar verified ✓</p>
            ) : (
              <Link href="/verify" className="link mt-2 block">Verify with Aadhaar to trade</Link>
            )}
            {band === "MINOR" && user.aadhaarVerifiedAt && (
              user.guardianApprovedAt ? <p className="text-sm text-muted mt-1">Guardian approved ✓</p> : <Link href="/guardian" className="link text-sm">Get guardian approval</Link>
            )}
          </div>
          <div className="card p-5">
            <p className="eyebrow">Trading</p>
            <p className="mt-2">{block ? TRADE_BLOCK_MESSAGES[block] : "You can list, bid and chat."}</p>
            {user.status === "FROZEN" && user.frozenUntil && <p className="text-sm text-muted">Until {formatDate(user.frozenUntil)}</p>}
          </div>
          <div className="card p-5">
            <p className="eyebrow">Listing</p>
            {band === "ADULT_24_30" ? (
              <>
                <p className="mt-2">{listingFeeRequired(user) ? "Pass needed to list" : user.listingPassUntil && user.listingPassUntil > new Date() ? `Pass until ${formatDate(user.listingPassUntil)}` : "First listing free"}</p>
                <Link href="/membership" className="link text-sm">Membership</Link>
              </>
            ) : (
              <p className="mt-2">Free for you</p>
            )}
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-3xl">Deals</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {deals.length === 0 && <li className="py-6 text-muted">No deals yet.</li>}
          {deals.map((d) => (
            <li key={d.id}>
              <Link href={`/deals/${d.id}`} className="flex justify-between py-3 hover:bg-ivory px-2">
                <span>{d.buyerId === user.id ? "Buying" : "Selling"} · {d.listing.title}</span>
                <span className="text-sm text-muted">{formatINR(d.amount)} · {DEAL_LABEL[d.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="flex justify-between items-end">
          <h2 className="text-3xl">My lots</h2>
          <Link href="/listings/new" className="btn btn-primary">List an item</Link>
        </div>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {listings.length === 0 && <li className="py-6 text-muted">You haven&apos;t listed anything yet.</li>}
          {listings.map((l) => (
            <li key={l.id}>
              <Link href={`/listings/${l.id}`} className="flex justify-between py-3 hover:bg-ivory px-2">
                <span>{l.title}</span>
                <span className="text-sm text-muted">{formatINR(l.currentPrice)} · {l.bidCount} bids · {l.status.toLowerCase()}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-3xl">My bids</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {bidListings.length === 0 && <li className="py-6 text-muted">No bids yet.</li>}
          {bidListings.map((l) => {
            const ranked = rankBidders(l.bids);
            const pos = ranked.findIndex((b) => b.bidderId === user.id) + 1;
            return (
              <li key={l.id}>
                <Link href={`/listings/${l.id}`} className="flex justify-between py-3 hover:bg-ivory px-2">
                  <span>{l.title}</span>
                  <span className={`text-sm ${pos === 1 ? "text-gold" : "text-muted"}`}>
                    {pos === 1 ? "Highest bidder" : `#${pos}`} · {formatINR(ranked[pos - 1].amount)} · {l.status.toLowerCase()}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {strikes.length > 0 && (
        <section>
          <h2 className="text-3xl">Strikes</h2>
          <p className="text-sm text-muted mt-2">Strikes are given only after support reviews evidence and hears both sides. You can appeal each strike once.</p>
          <ul className="mt-4 space-y-4">
            {strikes.map((s) => (
              <li key={s.id} className="card p-5">
                <p className="text-sm text-muted">{formatDate(s.createdAt)} · {s.status === "OVERTURNED" ? "Overturned on appeal" : s.fraud ? "Fraud" : `Expires ${s.expiresAt ? formatDate(s.expiresAt) : ""}`}</p>
                <p className="mt-1">{s.reason}</p>
                {s.status === "CONFIRMED" && !s.appealedAt && (
                  <ActionForm action={appealStrike} submit="Appeal" variant="ghost" className="mt-3 space-y-2">
                    <input type="hidden" name="strikeId" value={s.id} />
                    <textarea name="appeal" className="input" rows={3} placeholder="Explain your side and any evidence you have." required />
                  </ActionForm>
                )}
                {s.appealedAt && s.status === "CONFIRMED" && <p className="text-sm text-muted mt-2">Appeal under review.</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
