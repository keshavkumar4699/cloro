import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { topBidderIds } from "@/lib/auction";

/** When a member is banned: withdraw their live lots and stop their open deals, telling everyone affected. */
export async function withdrawBannedMember(userId: string) {
  const listings = await db.listing.findMany({ where: { sellerId: userId, status: "LIVE" }, select: { id: true, title: true } });
  for (const l of listings) {
    await db.listing.update({ where: { id: l.id }, data: { status: "CANCELLED" } });
    for (const bidderId of await topBidderIds(l.id, 50)) {
      await notify(bidderId, `“${l.title}” was withdrawn because the seller's account was closed. Your bid no longer applies.`, `/listings/${l.id}`);
    }
  }

  const deals = await db.deal.findMany({
    where: { status: { in: ["OFFERED", "ACCEPTED"] }, OR: [{ buyerId: userId }, { sellerId: userId }] },
    include: { listing: { select: { title: true } } },
  });
  for (const d of deals) {
    await db.deal.update({ where: { id: d.id }, data: { status: "CANCELLED", cancelReason: "The other member's account was closed." } });
    const other = d.buyerId === userId ? d.sellerId : d.buyerId;
    const extra = d.buyerId === userId ? " You can offer it to the next bidder." : " If you already paid, open a support ticket and we'll help.";
    await notify(other, `The deal for “${d.listing.title}” was cancelled because the other member's account was closed.${extra}`, `/deals/${d.id}`);
  }
}

/** Staff take down one item (e.g. counterfeit or prohibited) without banning the seller. */
export async function removeListingByStaff(listingId: string, reason: string) {
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { id: true, title: true, sellerId: true, status: true } });
  if (!listing) return { ok: false as const, error: "Item not found." };
  if (listing.status === "SOLD") return { ok: false as const, error: "This item was already sold, so it can't be removed." };
  if (listing.status === "CANCELLED") return { ok: false as const, error: "This item is already off Cloro." };

  await db.listing.update({ where: { id: listingId }, data: { status: "CANCELLED", removedReason: reason } });
  const deals = await db.deal.findMany({ where: { listingId, status: { in: ["OFFERED", "ACCEPTED"] } } });
  for (const d of deals) {
    await db.deal.update({ where: { id: d.id }, data: { status: "CANCELLED", cancelReason: "The item was removed by the Cloro team." } });
  }
  const link = `/listings/${listingId}`;
  await notify(listing.sellerId, `Your item “${listing.title}” was removed by the Cloro team: ${reason}. Contact support if you think this is a mistake.`, link);
  for (const bidderId of await topBidderIds(listingId, 50)) {
    await notify(bidderId, `“${listing.title}” was removed by the Cloro team, so your bid no longer applies.`, link);
  }
  return { ok: true as const };
}
