import Link from "next/link";
import { ArrowRight, BadgeCheck, Gavel, Package, Plus, Store } from "lucide-react";
import { db } from "@/lib/db";
import { requireMember, bandOf } from "@/lib/session";
import { settleDue } from "@/lib/auction";
import { formatDate, formatINR } from "@/lib/format";
import { listingFeeRequired, rankBidders, tradeBlock, TRADE_BLOCK_MESSAGES } from "@/lib/rules";
import { ActionForm } from "@/components/action-form";
import { Avatar } from "@/components/avatar";
import { appealStrike } from "@/app/actions/support";

export const metadata = { title: "My Cloro" };

const DEAL_LABEL: Record<string, [string, string]> = {
  OFFERED: ["Waiting for reply", "badge-gold"],
  ACCEPTED: ["In progress", "badge-brand"],
  COMPLETED: ["Done", ""],
  DECLINED: ["Declined", ""],
  EXPIRED: ["Expired", ""],
  CANCELLED: ["Cancelled", ""],
};

const LISTING_LABEL: Record<string, string> = { LIVE: "Live", ENDED: "Ended", SOLD: "Sold", UNSOLD: "Unsold", CANCELLED: "Withdrawn" };

function Section({ title, icon: Icon, action, children }: { title: string; icon: typeof Gavel; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl flex items-center gap-2"><Icon className="w-5 h-5 text-gold" aria-hidden /> {title}</h2>
        {action}
      </div>
      <div className="mt-4 card !shadow-none divide-y divide-line overflow-hidden">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-6 text-sm text-muted text-center">{children}</div>;
}

export default async function DashboardPage() {
  const user = await requireMember({ allowAgedOut: true, next: "/dashboard" });
  await settleDue();
  const band = bandOf(user);
  const block = tradeBlock(user);

  const [deals, listings, myBids, strikes] = await Promise.all([
    db.deal.findMany({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      include: { listing: { select: { title: true, images: { take: 1, orderBy: { position: "asc" } } } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    db.listing.findMany({ where: { sellerId: user.id }, orderBy: { createdAt: "desc" }, take: 30, include: { images: { take: 1, orderBy: { position: "asc" } } } }),
    db.bid.findMany({ where: { bidderId: user.id }, distinct: ["listingId"], select: { listingId: true }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.strike.findMany({ where: { userId: user.id, status: { in: ["CONFIRMED", "OVERTURNED"] } }, orderBy: { createdAt: "desc" } }),
  ]);
  const bidListings = await db.listing.findMany({
    where: { id: { in: myBids.map((b) => b.listingId) } },
    include: { bids: { select: { bidderId: true, amount: true, createdAt: true } }, images: { take: 1, orderBy: { position: "asc" } } },
  });
  const needsAction = deals.filter((d) => (d.status === "OFFERED" && d.buyerId === user.id) || (d.status === "ACCEPTED" && !(d.buyerId === user.id ? d.buyerDoneAt : d.sellerDoneAt)));

  const nextStep =
    block === "NOT_VERIFIED" ? { text: "Verify once with Aadhaar to start bidding and selling.", href: "/verify", cta: "Verify now" }
    : block === "NEEDS_GUARDIAN" ? { text: "Ask a parent or guardian to approve your account.", href: "/guardian", cta: "Send link" }
    : band === "ADULT_24_30" && listingFeeRequired(user) ? { text: "Get a listing pass to sell more items.", href: "/membership", cta: "Get pass" }
    : null;

  const thumb = (url?: string) =>
    url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
    ) : (
      <span className="w-12 h-12 rounded-xl bg-ivory shrink-0" />
    );

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-6 py-8 md:py-12 space-y-10">
      <div className="flex items-center gap-4">
        <Avatar name={user.name} image={user.image} size={64} />
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl truncate">Hi {user.name?.split(" ")[0] ?? "there"}</h1>
          <div className="mt-1 flex flex-wrap gap-2 text-sm">
            {user.aadhaarVerifiedAt ? <span className="badge badge-brand"><BadgeCheck className="w-3.5 h-3.5" aria-hidden /> Verified</span> : <span className="badge">Not verified yet</span>}
            {band === "ADULT_24_30" && (
              <span className="badge">{user.listingPassUntil && user.listingPassUntil > new Date() ? `Pass until ${formatDate(user.listingPassUntil)}` : user.freeListingUsed ? "No listing pass" : "1 free listing"}</span>
            )}
            <Link href={`/u/${user.id}`} className="text-brand font-medium">View profile</Link>
          </div>
        </div>
      </div>

      {nextStep && (
        <div className="rounded-2xl bg-brand text-white p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="flex-1">{nextStep.text}</p>
          <Link href={nextStep.href} className="btn btn-gold">{nextStep.cta} <ArrowRight className="w-4 h-4" aria-hidden /></Link>
        </div>
      )}
      {block && !nextStep && <p className="notice">{TRADE_BLOCK_MESSAGES[block]}{user.status === "FROZEN" && user.frozenUntil ? ` Until ${formatDate(user.frozenUntil)}.` : ""}</p>}

      {needsAction.length > 0 && (
        <div className="notice">
          <p className="font-semibold">You have {needsAction.length} deal{needsAction.length > 1 ? "s" : ""} waiting for you</p>
          <ul className="mt-2 space-y-1">
            {needsAction.map((d) => (
              <li key={d.id}><Link href={`/deals/${d.id}`} className="link">{d.listing.title}</Link></li>
            ))}
          </ul>
        </div>
      )}

      <Section title="Deals" icon={Package}>
        {deals.length === 0 && <Empty>No deals yet. When you win an auction or sell an item, it shows up here.</Empty>}
        {deals.map((d) => {
          const [label, cls] = DEAL_LABEL[d.status];
          return (
            <Link key={d.id} href={`/deals/${d.id}`} className="flex items-center gap-3 p-3 hover:bg-paper">
              {thumb(d.listing.images[0]?.url)}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{d.listing.title}</p>
                <p className="text-xs text-muted">{d.buyerId === user.id ? "Buying" : "Selling"} · {formatINR(d.amount)}</p>
              </div>
              <span className={`badge ${cls}`}>{label}</span>
            </Link>
          );
        })}
      </Section>

      <Section title="Your bids" icon={Gavel}>
        {bidListings.length === 0 && <Empty>You haven&apos;t bid on anything yet. <Link href="/browse" className="link">Find something you love</Link>.</Empty>}
        {bidListings.map((l) => {
          const ranked = rankBidders(l.bids);
          const pos = ranked.findIndex((b) => b.bidderId === user.id) + 1;
          const winning = pos === 1;
          return (
            <Link key={l.id} href={`/listings/${l.id}`} className="flex items-center gap-3 p-3 hover:bg-paper">
              {thumb(l.images[0]?.url)}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{l.title}</p>
                <p className="text-xs text-muted">Your bid {formatINR(ranked[pos - 1].amount)} · top bid {formatINR(l.currentPrice)}</p>
              </div>
              {l.status === "LIVE" ? (
                <span className={`badge ${winning ? "badge-brand" : "badge-gold"}`}>{winning ? "Winning" : "Outbid"}</span>
              ) : (
                <span className="badge">{winning ? "Top bid" : LISTING_LABEL[l.status]}</span>
              )}
            </Link>
          );
        })}
      </Section>

      <Section
        title="Your items"
        icon={Store}
        action={<Link href="/listings/new" className="btn btn-primary btn-sm"><Plus className="w-4 h-4" aria-hidden /> Sell</Link>}
      >
        {listings.length === 0 && <Empty>Nothing listed yet. Got something great sitting in your wardrobe?</Empty>}
        {listings.map((l) => (
          <Link key={l.id} href={`/listings/${l.id}`} className="flex items-center gap-3 p-3 hover:bg-paper">
            {thumb(l.images[0]?.url)}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{l.title}</p>
              <p className="text-xs text-muted">{formatINR(l.currentPrice)} · {l.bidCount} bid{l.bidCount === 1 ? "" : "s"}</p>
            </div>
            <span className={`badge ${l.status === "LIVE" ? "badge-brand" : ""}`}>{LISTING_LABEL[l.status]}</span>
          </Link>
        ))}
      </Section>

      {strikes.length > 0 && (
        <section>
          <h2 className="text-2xl">Strikes</h2>
          <p className="text-sm text-muted mt-1">Strikes are only given after our team reviews evidence and hears both sides. You can appeal each one once.</p>
          <ul className="mt-4 space-y-3">
            {strikes.map((s) => (
              <li key={s.id} className="card !shadow-none p-5">
                <p className="text-xs text-muted">{formatDate(s.createdAt)} · {s.status === "OVERTURNED" ? "Removed on appeal" : s.fraud ? "Fraud" : s.expiresAt ? `Expires ${formatDate(s.expiresAt)}` : ""}</p>
                <p className="mt-1">{s.reason}</p>
                {s.status === "CONFIRMED" && !s.appealedAt && (
                  <ActionForm action={appealStrike} submit="Send appeal" variant="ghost" size="sm" className="mt-3 space-y-2">
                    <input type="hidden" name="strikeId" value={s.id} />
                    <textarea name="appeal" className="input" rows={3} placeholder="Explain your side and any evidence you have." required minLength={20} />
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
