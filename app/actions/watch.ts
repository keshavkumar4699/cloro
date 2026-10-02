"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const MAX_WATCHES = 200;

/** Save or unsave an item. Returns the new state, or null when the visitor must sign in first. */
export async function toggleWatch(listingId: string): Promise<{ watching: boolean } | { error: string } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (typeof listingId !== "string" || listingId.length > 40) return { error: "Item not found." };
  const key = { userId_listingId: { userId: user.id, listingId } };
  const existing = await db.watch.findUnique({ where: key });
  if (existing) {
    await db.watch.delete({ where: key });
    return { watching: false };
  }
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { id: true } });
  if (!listing) return { error: "Item not found." };
  if ((await db.watch.count({ where: { userId: user.id } })) >= MAX_WATCHES) return { error: "You've saved a lot! Unsave a few first." };
  await db.watch.create({ data: { userId: user.id, listingId } });
  return { watching: true };
}
