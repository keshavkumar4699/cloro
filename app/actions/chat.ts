"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireTrader } from "@/lib/session";
import { toActionState, type ActionState } from "@/lib/action-state";
import { topBidderIds } from "@/lib/auction";
import { CHAT_TOP_N, conversationAccess, isBlockedBetween } from "@/lib/chat";
import { detectOffPlatform } from "@/lib/contact-filter";
import { notify } from "@/lib/notify";

export async function openConversation(_: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const user = await requireTrader();
    const listingId = String(formData.get("listingId"));
    const listing = await db.listing.findUnique({ where: { id: listingId } });
    if (!listing) return { error: "Listing not found." };
    const bidderId = user.id === listing.sellerId ? String(formData.get("bidderId")) : user.id;

    const top = await topBidderIds(listingId, CHAT_TOP_N);
    if (!top.includes(bidderId)) return { error: "Chat is open between the seller and the top 3 bidders only." };
    if (await isBlockedBetween(listing.sellerId, bidderId)) return { error: "Messaging is blocked between you." };

    const convo = await db.conversation.upsert({
      where: { listingId_bidderId: { listingId, bidderId } },
      update: {},
      create: { listingId, bidderId },
    });
    id = convo.id;
  } catch (e) {
    return toActionState(e);
  }
  redirect(`/messages/${id}`);
}

export async function sendMessage(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireTrader();
    const conversationId = String(formData.get("conversationId"));
    const body = String(formData.get("body") ?? "").trim();
    if (!body) return undefined;
    if (body.length > 2000) return { error: "Messages can be up to 2000 characters." };

    const access = await conversationAccess(conversationId, user.id);
    if (!access?.canSend) return { error: access?.reason ?? "You can't send messages here." };

    const flagged = detectOffPlatform(body).length > 0;
    await db.message.create({ data: { conversationId, senderId: user.id, body, flagged } });

    // Notify at most once per unread burst to avoid a notification per message.
    const link = `/messages/${conversationId}`;
    const pending = await db.notification.count({ where: { userId: access.otherId!, link, read: false } });
    if (!pending) await notify(access.otherId!, `New message about “${access.convo.listing.title}”.`, link);

    return flagged
      ? { ok: "Sent — but remember: keep deals on Cloro and never share OTPs or scan QR codes to receive money." }
      : {};
  } catch (e) {
    return toActionState(e);
  }
}
