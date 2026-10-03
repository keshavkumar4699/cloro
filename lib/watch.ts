import { db } from "@/lib/db";
import { notify } from "@/lib/notify";

/** Which of these items the member has saved. */
export async function watchedSet(userId: string | undefined, listingIds: string[]): Promise<Set<string>> {
  if (!userId || !listingIds.length) return new Set();
  const rows = await db.watch.findMany({ where: { userId, listingId: { in: listingIds } }, select: { listingId: true } });
  return new Set(rows.map((r) => r.listingId));
}

/** One "ending soon" alert per saved item, about an hour before the auction closes. Run from the cron. */
export async function remindWatchers(now = new Date()) {
  const soon = new Date(now.getTime() + 60 * 60 * 1000);
  const due = await db.watch.findMany({
    where: { remindedAt: null, listing: { status: "LIVE", endsAt: { gt: now, lte: soon } } },
    include: { listing: { select: { id: true, title: true, sellerId: true } } },
    take: 500,
  });
  for (const w of due) {
    await db.watch.update({ where: { userId_listingId: { userId: w.userId, listingId: w.listingId } }, data: { remindedAt: now } });
    if (w.userId === w.listing.sellerId) continue;
    await notify(w.userId, `⏰ “${w.listing.title}” — an item you saved — ends within the hour. Last chance to bid!`, `/listings/${w.listingId}`);
  }
  return due.length;
}
