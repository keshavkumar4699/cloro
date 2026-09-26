import type { Prisma, User } from "@prisma/client";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { formatINR } from "@/lib/format";
import {
  ageBand,
  ageOn,
  BID_ERROR_MESSAGES,
  DEAL_RESPONSE_MS,
  extendedEnd,
  MAX_FALLBACK_RANK,
  rankBidders,
  validateBid,
} from "@/lib/rules";

type Tx = Prisma.TransactionClient;

const lockListing = (tx: Tx, id: string) => tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${id} FOR UPDATE`;

export async function rankedBidders(listingId: string, client: Tx | typeof db = db) {
  const bids = await client.bid.findMany({
    where: { listingId },
    select: { bidderId: true, amount: true, createdAt: true },
  });
  return rankBidders(bids);
}

export async function topBidderIds(listingId: string, n = 3): Promise<string[]> {
  return (await rankedBidders(listingId)).slice(0, n).map((b) => b.bidderId);
}

export type BidResult = { ok: true; amount: number; endsAt: Date } | { ok: false; error: string };

export async function placeBid(listingId: string, bidder: User, amount: number): Promise<BidResult> {
  const now = new Date();
  const isMinor = !!bidder.dob && ageBand(ageOn(bidder.dob, now)) === "MINOR";

  return db.$transaction(async (tx) => {
    await lockListing(tx, listingId);
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing) return { ok: false as const, error: "Listing not found." };

    const ranked = await rankedBidders(listingId, tx);
    const previousTop = ranked[0]?.bidderId ?? null;
    const err = validateBid({ listing, bidderId: bidder.id, topBidderId: previousTop, amount, bidderIsMinor: isMinor, now });
    if (err) return { ok: false as const, error: BID_ERROR_MESSAGES[err] };

    const endsAt = extendedEnd(listing.endsAt, now);
    await tx.bid.create({ data: { listingId, bidderId: bidder.id, amount } });
    await tx.listing.update({
      where: { id: listingId },
      data: {
        currentPrice: amount,
        bidCount: { increment: 1 },
        endsAt,
        reserveMet: listing.reservePrice == null || amount >= listing.reservePrice,
      },
    });

    const link = `/listings/${listingId}`;
    if (previousTop && previousTop !== bidder.id) {
      await notify(previousTop, `You've been outbid on “${listing.title}” — now ${formatINR(amount)}.`, link, tx);
    }
    await notify(listing.sellerId, `New bid of ${formatINR(amount)} on “${listing.title}”.`, link, tx);
    return { ok: true as const, amount, endsAt };
  });
}

/** Closes one auction whose timer has run out. Safe to call repeatedly. */
export async function settleListing(listingId: string, now = new Date()) {
  await db.$transaction(async (tx) => {
    await lockListing(tx, listingId);
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.status !== "LIVE" || listing.endsAt > now) return;

    const ranked = await rankedBidders(listingId, tx);
    const link = `/listings/${listingId}`;

    if (ranked.length === 0) {
      await tx.listing.update({ where: { id: listingId }, data: { status: "UNSOLD" } });
      await notify(listing.sellerId, `“${listing.title}” ended with no bids. You can relist it.`, link, tx);
      return;
    }

    const top = ranked[0];
    const reserveMet = listing.reservePrice == null || top.amount >= listing.reservePrice;
    await tx.listing.update({ where: { id: listingId }, data: { status: "ENDED", reserveMet } });

    if (!reserveMet) {
      await notify(listing.sellerId, `“${listing.title}” ended below your reserve. You can still offer it to the top bidder at ${formatINR(top.amount)}.`, link, tx);
      await notify(top.bidderId, `“${listing.title}” ended below the seller's reserve. The seller may still offer it to you.`, link, tx);
      return;
    }

    await createOffer(tx, listing, top.bidderId, top.amount, 1, now);
  });
}

async function createOffer(
  tx: Tx,
  listing: { id: string; title: string; sellerId: string },
  buyerId: string,
  amount: number,
  rank: number,
  now: Date,
) {
  const deal = await tx.deal.create({
    data: {
      listingId: listing.id,
      buyerId,
      sellerId: listing.sellerId,
      amount,
      rank,
      respondBy: new Date(now.getTime() + DEAL_RESPONSE_MS),
    },
  });
  const link = `/deals/${deal.id}`;
  const lead = rank === 1 ? "You won" : "The item is now offered to you:";
  await notify(buyerId, `${lead} “${listing.title}” at ${formatINR(amount)}. Respond within 48 hours.`, link, tx);
  await notify(listing.sellerId, `“${listing.title}” is offered to bidder #${rank} at ${formatINR(amount)}.`, link, tx);
  return deal;
}

const ACTIVE_DEAL: Prisma.DealWhereInput = { status: { in: ["OFFERED", "ACCEPTED", "COMPLETED"] } };

/** Seller offers the item to the next-ranked bidder after a decline, expiry, cancellation or unmet reserve. */
export async function offerToNext(listingId: string, sellerId: string): Promise<{ ok: boolean; error?: string; dealId?: string }> {
  const now = new Date();
  return db.$transaction(async (tx) => {
    await lockListing(tx, listingId);
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.sellerId !== sellerId) return { ok: false, error: "Not your listing." };
    if (listing.status !== "ENDED") return { ok: false, error: "This auction isn't waiting for a buyer." };
    if (await tx.deal.findFirst({ where: { listingId, ...ACTIVE_DEAL } })) {
      return { ok: false, error: "There's already an active deal for this item." };
    }

    const ranked = await rankedBidders(listingId, tx);
    const last = await tx.deal.findFirst({ where: { listingId }, orderBy: { rank: "desc" } });
    const nextRank = last ? last.rank + 1 : 1;
    const next = ranked[nextRank - 1];
    if (!next || nextRank > MAX_FALLBACK_RANK) {
      await tx.listing.update({ where: { id: listingId }, data: { status: "UNSOLD" } });
      return { ok: false, error: "No more bidders to offer this to. The item is marked unsold — you can relist it." };
    }
    const deal = await createOffer(tx, listing, next.bidderId, next.amount, nextRank, now);
    return { ok: true, dealId: deal.id };
  });
}

/** Closes ended auctions and expires unanswered offers. Called lazily on page loads and by the cron route. */
export async function settleDue(now = new Date()) {
  const due = await db.listing.findMany({
    where: { status: "LIVE", endsAt: { lte: now } },
    select: { id: true },
    take: 50,
  });
  for (const l of due) await settleListing(l.id, now);

  const expired = await db.deal.findMany({
    where: { status: "OFFERED", respondBy: { lte: now } },
    include: { listing: { select: { title: true } } },
    take: 50,
  });
  for (const d of expired) {
    const { count } = await db.deal.updateMany({ where: { id: d.id, status: "OFFERED" }, data: { status: "EXPIRED" } });
    if (!count) continue;
    await notify(d.sellerId, `The offer for “${d.listing.title}” expired without a reply. You can offer it to the next bidder.`, `/deals/${d.id}`);
    await notify(d.buyerId, `Your offer for “${d.listing.title}” expired.`, `/deals/${d.id}`);
  }
}
