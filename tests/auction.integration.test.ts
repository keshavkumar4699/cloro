// Runs against the database in DATABASE_URL. Creates and cleans up its own rows.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { offerToNext, placeBid, runMaintenance, settleListing } from "@/lib/auction";
import { remindWatchers } from "@/lib/watch";
import { completePassPayment } from "@/lib/payments";
import { removeListingByStaff } from "@/lib/moderation";
import { tradeBlock } from "@/lib/rules";

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
  await db.watch.deleteMany({ where: { userId: { in: ids } } });
  await db.payment.deleteMany({ where: { userId: { in: ids } } });
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

  it("lets staff remove one item: bidders are told and no more bids are accepted", async () => {
    const l = await makeListing();
    await placeBid(l.id, bidders[0], 500);
    const res = await removeListingByStaff(l.id, "Counterfeit — logo stitching doesn't match");
    expect(res.ok).toBe(true);
    const fresh = await db.listing.findUniqueOrThrow({ where: { id: l.id } });
    expect(fresh).toMatchObject({ status: "CANCELLED", removedReason: "Counterfeit — logo stitching doesn't match" });
    const told = await db.notification.count({ where: { userId: bidders[0].id, text: { contains: "removed by the Cloro team" } } });
    expect(told).toBeGreaterThan(0);
    const again = await placeBid(l.id, bidders[1], 600);
    expect(again.ok).toBe(false);
    expect((await removeListingByStaff(l.id, "again")).ok).toBe(false); // already removed
  });

  it("treats a reset verification as read-only", async () => {
    const u = await db.user.update({ where: { id: bidders[1].id }, data: { aadhaarVerifiedAt: null } });
    expect(tradeBlock(u)).toBe("NOT_VERIFIED");
    await db.user.update({ where: { id: bidders[1].id }, data: { aadhaarVerifiedAt: new Date() } });
  });

  it("auto-completes a deal one side confirmed a week ago and the other ignored", async () => {
    const l = await makeListing();
    const deal = await db.deal.create({
      data: { listingId: l.id, buyerId: bidders[0].id, sellerId: seller.id, amount: 500, rank: 1, status: "ACCEPTED", respondBy: new Date(), buyerDoneAt: new Date(Date.now() - 8 * 86400000) },
    });
    await runMaintenance();
    expect((await db.deal.findUniqueOrThrow({ where: { id: deal.id } })).status).toBe("COMPLETED");
    expect((await db.listing.findUniqueOrThrow({ where: { id: l.id } })).status).toBe("SOLD");
  });

  it("sends one 'ending soon' reminder per saved item", async () => {
    const l = await makeListing({ endsAt: new Date(Date.now() + 30 * 60_000) });
    await db.watch.create({ data: { userId: bidders[1].id, listingId: l.id } });
    expect(await remindWatchers()).toBeGreaterThanOrEqual(1);
    const count = () => db.notification.count({ where: { userId: bidders[1].id, link: `/listings/${l.id}`, text: { contains: "ends within the hour" } } });
    expect(await count()).toBe(1);
    await remindWatchers();
    expect(await count()).toBe(1); // not repeated
  });

  it("extends a listing pass only once when the checkout callback and webhook arrive together", async () => {
    const orderId = `test_order_${tag}`;
    await db.payment.create({ data: { userId: bidders[2].id, amount: 299, provider: "razorpay", providerOrderId: orderId } });
    await Promise.all([completePassPayment(orderId, "pay_1", bidders[2].id), completePassPayment(orderId, "pay_1", bidders[2].id)]);
    const u = await db.user.findUniqueOrThrow({ where: { id: bidders[2].id } });
    const days = (u.listingPassUntil!.getTime() - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(31);
  });

  it("marks lots with no bids as unsold", async () => {
    const l = await makeListing({ endsAt: new Date(Date.now() - 1000) });
    await settleListing(l.id);
    expect((await db.listing.findUniqueOrThrow({ where: { id: l.id } })).status).toBe("UNSOLD");
  });
});
