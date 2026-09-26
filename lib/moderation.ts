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
