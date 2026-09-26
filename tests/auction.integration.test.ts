// Runs against the database in DATABASE_URL. Creates and cleans up its own rows.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { offerToNext, placeBid, settleListing } from "@/lib/auction";

const tag = `test-${Date.now()}`;
const now = new Date();
const verified = { onboardedAt: now, aadhaarVerifiedAt: now, dob: new Date(Date.UTC(2003, 0, 1)) };
let seller: User;
let bidders: User[];

async function makeListing(over: { reservePrice?: number; endsAt?: Date } = {}) {
  const endsAt = over.endsAt ?? new Date(Date.now() + 3600_000);
  return db.listing.create({
    data: {
      sellerId: seller.id, title: `${tag} lot`, description: "A test item for the integration suite.", category: "fashion",
      condition: "GOOD", size: "M", sizeSystem: "IN", startPrice: 500, currentPrice: 500, reservePrice: over.reservePrice ?? null,
      reserveMet: over.reservePrice == null, endsAt, originalEndsAt: endsAt, shippingEstimate: 80, city: "Pune", pincode: "411001",
    },
  });
}

beforeAll(async () => {
  seller = await db.user.create({ data: { email: `${tag}-seller@x.test`, name: "Seller", ...verified } });
  bidders = await Promise.all(
    [1, 2, 3, 4].map((i) => db.user.create({ data: { email: `${tag}-b${i}@x.test`, name: `Bidder ${i}`, ...verified } })),
  );
});

afterAll(async () => {
  const ids = [seller, ...bidders].map((u) => u.id);
  const listings = await db.listing.findMany({ where: { sellerId: seller.id }, select: { id: true } });
  await db.deal.deleteMany({ where: { listingId: { in: listings.map((l) => l.id) } } });
  await db.listing.deleteMany({ where: { sellerId: seller.id } });
  await db.notification.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});

describe("auction engine (database)", () => {
  it("accepts exactly one of many simultaneous bids at the same price", async () => {
    const l = await makeListing();
    const results = await Promise.all(bidders.map((b) => placeBid(l.id, b, 500)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const fresh = await db.listing.findUniqueOrThrow({ where: { id: l.id } });
    expect(fresh.bidCount).toBe(1);
    expect(fresh.currentPrice).toBe(500);
  });

  it("extends the clock for a bid in the final two minutes", async () => {
    const l = await makeListing({ endsAt: new Date(Date.now() + 30_000) });
    const res = await placeBid(l.id, bidders[0], 500);
    expect(res.ok && res.endsAt.getTime() - Date.now()).toBeGreaterThan(100_000);
  });

  it("closes an auction, offers it to the winner, then falls back to the runner-up", async () => {
    const l = await makeListing();
    await placeBid(l.id, bidders[0], 500);
    await placeBid(l.id, bidders[1], 600);
    await db.listing.update({ where: { id: l.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    await settleListing(l.id);

    const first = await db.deal.findFirstOrThrow({ where: { listingId: l.id } });
    expect(first).toMatchObject({ buyerId: bidders[1].id, amount: 600, rank: 1, status: "OFFERED" });

    expect((await offerToNext(l.id, seller.id)).ok).toBe(false); // offer still open
    await db.deal.update({ where: { id: first.id }, data: { status: "DECLINED" } });
    const next = await offerToNext(l.id, seller.id);
    expect(next.ok).toBe(true);
    const second = await db.deal.findUniqueOrThrow({ where: { id: next.dealId! } });
    expect(second).toMatchObject({ buyerId: bidders[0].id, amount: 500, rank: 2 });
  });

  it("holds the item when the reserve isn't met", async () => {
    const l = await makeListing({ reservePrice: 1000 });
    await placeBid(l.id, bidders[2], 500);
    await db.listing.update({ where: { id: l.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    await settleListing(l.id);
    const fresh = await db.listing.findUniqueOrThrow({ where: { id: l.id } });
    expect(fresh).toMatchObject({ status: "ENDED", reserveMet: false });
    expect(await db.deal.count({ where: { listingId: l.id } })).toBe(0);
  });

  it("skips a banned top bidder and offers the item to the next eligible one", async () => {
    const l = await makeListing();
    await placeBid(l.id, bidders[2], 500);
    await placeBid(l.id, bidders[3], 600);
    await db.user.update({ where: { id: bidders[3].id }, data: { status: "BANNED" } });
    await db.listing.update({ where: { id: l.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    await settleListing(l.id);
    const deal = await db.deal.findFirstOrThrow({ where: { listingId: l.id } });
    expect(deal).toMatchObject({ buyerId: bidders[2].id, amount: 500, rank: 2 });
    await db.user.update({ where: { id: bidders[3].id }, data: { status: "ACTIVE" } });
  });

  it("marks lots with no bids as unsold", async () => {
    const l = await makeListing({ endsAt: new Date(Date.now() - 1000) });
    await settleListing(l.id);
    expect((await db.listing.findUniqueOrThrow({ where: { id: l.id } })).status).toBe("UNSOLD");
  });
});
