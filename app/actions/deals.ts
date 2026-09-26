"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ActionError, requireTrader, getCurrentUser } from "@/lib/session";
import { toActionState, type ActionState } from "@/lib/action-state";
import { offerToNext } from "@/lib/auction";
import { notify } from "@/lib/notify";

async function loadDeal(dealId: string) {
  const deal = await db.deal.findUnique({ where: { id: dealId }, include: { listing: { select: { title: true } } } });
  if (!deal) throw new ActionError("Deal not found.");
  return deal;
}

const dealLink = (id: string) => `/deals/${id}`;

export async function acceptDeal(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireTrader();
    const deal = await loadDeal(String(formData.get("dealId")));
    if (deal.buyerId !== user.id) return { error: "Only the buyer can accept." };
    const method = formData.get("method");
    if (method !== "MEETUP" && method !== "SHIP") return { error: "Choose meet in person or video call + shipping." };
    const { count } = await db.deal.updateMany({
      where: { id: deal.id, status: "OFFERED", respondBy: { gt: new Date() } },
      data: { status: "ACCEPTED", method },
    });
    if (!count) return { error: "This offer is no longer open." };
    await notify(deal.sellerId, `The buyer accepted “${deal.listing.title}” (${method === "MEETUP" ? "meet in person" : "video call + shipping"}).`, dealLink(deal.id));
    revalidatePath(dealLink(deal.id));
    return { ok: "Accepted. Arrange the details with the seller in chat." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function declineDeal(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireTrader();
    const deal = await loadDeal(String(formData.get("dealId")));
    if (deal.buyerId !== user.id) return { error: "Only the buyer can decline." };
    const { count } = await db.deal.updateMany({ where: { id: deal.id, status: "OFFERED" }, data: { status: "DECLINED" } });
    if (!count) return { error: "This offer is no longer open." };
    await notify(deal.sellerId, `The buyer declined “${deal.listing.title}”. You can offer it to the next bidder.`, dealLink(deal.id));
    revalidatePath(dealLink(deal.id));
    return { ok: "Declined. Thanks for letting the seller know quickly." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function addTracking(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireTrader();
    const deal = await loadDeal(String(formData.get("dealId")));
    if (deal.sellerId !== user.id) return { error: "Only the seller can add shipping details." };
    if (deal.status !== "ACCEPTED" || deal.method !== "SHIP") return { error: "This deal isn't being shipped." };
    const tracking = String(formData.get("tracking") ?? "").trim();
    if (tracking.length < 4 || tracking.length > 200) return { error: "Enter the courier name and tracking number." };
    await db.deal.update({ where: { id: deal.id }, data: { trackingInfo: tracking } });
    await notify(deal.buyerId, `“${deal.listing.title}” has shipped: ${tracking}`, dealLink(deal.id));
    revalidatePath(dealLink(deal.id));
    return { ok: "Shipping details shared with the buyer." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function markDealDone(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireTrader();
    const deal = await loadDeal(String(formData.get("dealId")));
    if (deal.status !== "ACCEPTED") return { error: "This deal isn't in progress." };
    const isBuyer = deal.buyerId === user.id;
    if (!isBuyer && deal.sellerId !== user.id) return { error: "Not your deal." };

    const now = new Date();
    const updated = await db.deal.update({
      where: { id: deal.id },
      data: isBuyer ? { buyerDoneAt: deal.buyerDoneAt ?? now } : { sellerDoneAt: deal.sellerDoneAt ?? now },
    });
    if (updated.buyerDoneAt && updated.sellerDoneAt) {
      await db.$transaction([
        db.deal.update({ where: { id: deal.id }, data: { status: "COMPLETED" } }),
        db.listing.update({ where: { id: deal.listingId }, data: { status: "SOLD" } }),
      ]);
      for (const uid of [deal.buyerId, deal.sellerId]) {
        await notify(uid, `Deal done for “${deal.listing.title}”. Thanks for keeping Cloro safe 💚 — leave a rating.`, dealLink(deal.id));
      }
    } else {
      await notify(isBuyer ? deal.sellerId : deal.buyerId, `The other side marked “${deal.listing.title}” as done. Confirm when it's done for you too.`, dealLink(deal.id));
    }
    revalidatePath(dealLink(deal.id));
    return { ok: "Marked as done." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function cancelDeal(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireTrader();
    const deal = await loadDeal(String(formData.get("dealId")));
    if (deal.buyerId !== user.id && deal.sellerId !== user.id) return { error: "Not your deal." };
    const reason = String(formData.get("reason") ?? "").trim();
    if (reason.length < 5) return { error: "Tell us briefly why the deal is being cancelled." };
    const { count } = await db.deal.updateMany({
      where: { id: deal.id, status: { in: ["OFFERED", "ACCEPTED"] } },
      data: { status: "CANCELLED", cancelReason: `${deal.buyerId === user.id ? "Buyer" : "Seller"}: ${reason}` },
    });
    if (!count) return { error: "This deal can't be cancelled now." };
    const other = deal.buyerId === user.id ? deal.sellerId : deal.buyerId;
    await notify(other, `The deal for “${deal.listing.title}” was cancelled: ${reason}. If something went wrong, you can open a support ticket.`, dealLink(deal.id));
    revalidatePath(dealLink(deal.id));
    return { ok: "Deal cancelled." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function offerNextAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let dealId: string | undefined;
  try {
    const user = await requireTrader();
    const listingId = String(formData.get("listingId"));
    const res = await offerToNext(listingId, user.id);
    if (!res.ok) return { error: res.error };
    dealId = res.dealId;
  } catch (e) {
    return toActionState(e);
  }
  redirect(`/deals/${dealId}`);
}

export async function leaveReview(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ActionError("Please sign in.");
    const deal = await loadDeal(String(formData.get("dealId")));
    if (deal.status !== "COMPLETED") return { error: "You can rate once the deal is done." };
    if (deal.buyerId !== user.id && deal.sellerId !== user.id) return { error: "Not your deal." };
    const rating = Number(formData.get("rating"));
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose 1 to 5 stars." };
    const comment = String(formData.get("comment") ?? "").trim().slice(0, 500) || null;
    const revieweeId = deal.buyerId === user.id ? deal.sellerId : deal.buyerId;
    const exists = await db.review.findUnique({ where: { dealId_reviewerId: { dealId: deal.id, reviewerId: user.id } } });
    if (exists) return { error: "You've already rated this deal." };
    await db.review.create({ data: { dealId: deal.id, reviewerId: user.id, revieweeId, rating, comment } });
    await notify(revieweeId, `You received a ${rating}★ rating for “${deal.listing.title}”.`, `/u/${revieweeId}`);
    revalidatePath(dealLink(deal.id));
    return { ok: "Thanks for your rating!" };
  } catch (e) {
    return toActionState(e);
  }
}
