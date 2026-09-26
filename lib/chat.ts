import { db } from "@/lib/db";
import { topBidderIds } from "@/lib/auction";

export const CHAT_TOP_N = 3;

export async function isBlockedBetween(a: string, b: string) {
  const n = await db.block.count({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
  });
  return n > 0;
}

/**
 * Chat is between a listing's seller and its current top 3 bidders.
 * Someone who drops out of the top 3 keeps read-only access to their history.
 */
export async function conversationAccess(conversationId: string, userId: string) {
  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { listing: { select: { id: true, title: true, sellerId: true, status: true } } },
  });
  if (!convo) return null;
  const sellerId = convo.listing.sellerId;
  const isParticipant = userId === sellerId || userId === convo.bidderId;
  if (!isParticipant) return { convo, canRead: false, canSend: false, reason: "Not your conversation." };

  const top = await topBidderIds(convo.listingId, CHAT_TOP_N);
  const otherId = userId === sellerId ? convo.bidderId : sellerId;
  let reason: string | null = null;
  if (!top.includes(convo.bidderId)) reason = "This bidder is no longer in the top 3, so the chat is read-only.";
  else if (convo.listing.status === "CANCELLED") reason = "This listing was cancelled.";
  else if (await isBlockedBetween(userId, otherId)) reason = "Messaging is blocked between you.";
  return { convo, canRead: true, canSend: reason === null, reason, otherId, sellerId };
}
