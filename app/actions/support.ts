"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Ticket, TicketStatus, User } from "@prisma/client";
import { db } from "@/lib/db";
import { ActionError, getCurrentUser, isStaff } from "@/lib/session";
import { toActionState, type ActionState } from "@/lib/action-state";
import { saveImage } from "@/lib/storage";
import { TICKET_CATEGORIES } from "@/lib/catalog";
import { ageBand, ageOn, FREEZE_DAYS, STRIKE_EXPIRY_DAYS, strikePenalty } from "@/lib/rules";
import { audit, notify } from "@/lib/notify";

async function signedIn() {
  const user = await getCurrentUser();
  if (!user) throw new ActionError("Please sign in first.");
  return user;
}

async function staff(minRole: "MODERATOR" | "ADMIN" = "MODERATOR") {
  const user = await signedIn();
  if (!isStaff(user) || (minRole === "ADMIN" && user.role !== "ADMIN")) throw new ActionError("Not allowed.");
  return user;
}

const isMinor = (u: Pick<User, "dob"> | null | undefined) => !!u?.dob && ageBand(ageOn(u.dob)) === "MINOR";

async function saveAttachments(formData: FormData, userId: string) {
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 4) throw new ActionError("Attach up to 4 images.");
  const urls: string[] = [];
  for (const f of files) urls.push(await saveImage(f, `tickets/${userId}`));
  return urls;
}

export async function createTicket(_: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const user = await signedIn();
    const category = String(formData.get("category"));
    if (!TICKET_CATEGORIES.some((c) => c.id === category)) return { error: "Choose what the problem is about." };
    const subject = String(formData.get("subject") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    if (subject.length < 4 || subject.length > 120) return { error: "Add a short subject (4–120 characters)." };
    if (body.length < 10) return { error: "Describe what happened in a bit more detail." };

    // Optional context: a deal, a listing, a chat, or a user being reported.
    let againstId: string | null = null;
    let dealId: string | null = null;
    let listingId: string | null = null;
    let conversationId: string | null = null;

    const dealIdIn = String(formData.get("dealId") ?? "");
    if (dealIdIn) {
      const deal = await db.deal.findUnique({ where: { id: dealIdIn } });
      if (!deal || (deal.buyerId !== user.id && deal.sellerId !== user.id)) return { error: "That deal isn't yours." };
      dealId = deal.id;
      listingId = deal.listingId;
      againstId = deal.buyerId === user.id ? deal.sellerId : deal.buyerId;
      const convo = await db.conversation.findUnique({ where: { listingId_bidderId: { listingId: deal.listingId, bidderId: deal.buyerId } } });
      conversationId = convo?.id ?? null;
    }
    const convoIn = String(formData.get("conversationId") ?? "");
    if (convoIn && !conversationId) {
      const convo = await db.conversation.findUnique({ where: { id: convoIn }, include: { listing: true } });
      if (!convo || (convo.bidderId !== user.id && convo.listing.sellerId !== user.id)) return { error: "That chat isn't yours." };
      conversationId = convo.id;
      listingId = convo.listingId;
      againstId = convo.bidderId === user.id ? convo.listing.sellerId : convo.bidderId;
    }
    const listingIn = String(formData.get("listingId") ?? "");
    if (listingIn && !listingId) {
      const listing = await db.listing.findUnique({ where: { id: listingIn } });
      if (!listing) return { error: "Listing not found." };
      listingId = listing.id;
      if (listing.sellerId !== user.id) againstId = listing.sellerId;
    }
    const againstIn = String(formData.get("againstId") ?? "");
    if (againstIn && !againstId && againstIn !== user.id) againstId = againstIn;

    const against = againstId ? await db.user.findUnique({ where: { id: againstId } }) : null;
    const serious = ["HARASSMENT", "SCAM", "COUNTERFEIT"].includes(category);
    const priority = category === "HARASSMENT" && (isMinor(user) || isMinor(against)) ? "URGENT" : serious ? "HIGH" : "NORMAL";

    const attachments = await saveAttachments(formData, user.id);
    const ticket = await db.ticket.create({
      data: {
        userId: user.id,
        category,
        subject,
        priority,
        againstId,
        dealId,
        listingId,
        conversationId,
        messages: { create: { authorId: user.id, body, attachments } },
      },
    });
    id = ticket.id;

    if (priority === "URGENT" && againstId) {
      // Harassment involving a minor: freeze the reported account while it is reviewed.
      await db.user.update({ where: { id: againstId }, data: { status: "FROZEN", frozenUntil: null } });
      await notify(againstId, "Your account is paused while our team reviews a report. You'll be able to respond.", "/support");
    }
    const admins = await db.user.findMany({ where: { role: priority === "URGENT" ? "ADMIN" : { in: ["ADMIN", "MODERATOR"] } }, select: { id: true } });
    for (const a of admins) await notify(a.id, `New ${priority.toLowerCase()} ticket: ${subject}`, `/admin/tickets/${ticket.id}`);
  } catch (e) {
    return toActionState(e);
  }
  redirect(`/support/${id}`);
}

function canParticipate(ticket: Ticket, user: User) {
  return ticket.userId === user.id || (ticket.againstId === user.id && !!ticket.againstInvitedAt) || isStaff(user);
}

export async function replyTicket(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await signedIn();
    const ticket = await db.ticket.findUnique({ where: { id: String(formData.get("ticketId")) } });
    if (!ticket || !canParticipate(ticket, user)) return { error: "Ticket not found." };
    if (ticket.status === "CLOSED") return { error: "This ticket is closed. Open a new one if you still need help." };
    const body = String(formData.get("body") ?? "").trim();
    if (!body) return { error: "Write a message." };
    const internal = isStaff(user) && formData.get("internal") === "on";
    const attachments = await saveAttachments(formData, user.id);
    await db.ticketMessage.create({ data: { ticketId: ticket.id, authorId: user.id, body, internal, attachments } });

    if (!internal) {
      if (isStaff(user)) {
        await db.ticket.update({ where: { id: ticket.id }, data: { status: "AWAITING_USER", assignedToId: ticket.assignedToId ?? user.id } });
        await notify(ticket.userId, `Support replied: ${ticket.subject}`, `/support/${ticket.id}`);
        if (ticket.againstId && ticket.againstInvitedAt) await notify(ticket.againstId, `Support replied: ${ticket.subject}`, `/support/${ticket.id}`);
      } else {
        await db.ticket.update({ where: { id: ticket.id }, data: { status: ticket.status === "RESOLVED" ? "OPEN" : "IN_PROGRESS" } });
        if (ticket.assignedToId) await notify(ticket.assignedToId, `New reply on ticket: ${ticket.subject}`, `/admin/tickets/${ticket.id}`);
      }
    }
    revalidatePath(`/support/${ticket.id}`);
    revalidatePath(`/admin/tickets/${ticket.id}`);
    return { ok: internal ? "Internal note added." : "Reply sent." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function updateTicket(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await staff();
    const ticket = await db.ticket.findUnique({ where: { id: String(formData.get("ticketId")) } });
    if (!ticket) return { error: "Ticket not found." };
    const op = String(formData.get("op"));
    const link = `/support/${ticket.id}`;

    if (op === "assign") {
      await db.ticket.update({ where: { id: ticket.id }, data: { assignedToId: user.id, status: "IN_PROGRESS" } });
    } else if (op === "invite") {
      if (!ticket.againstId) return { error: "There's no other party on this ticket." };
      await db.ticket.update({ where: { id: ticket.id }, data: { againstInvitedAt: new Date() } });
      await notify(ticket.againstId, `A member reported a problem involving you (“${ticket.subject}”). Please share your side.`, link);
    } else if (op === "status") {
      const status = String(formData.get("status")) as TicketStatus;
      if (!["OPEN", "IN_PROGRESS", "AWAITING_USER", "RESOLVED", "CLOSED"].includes(status)) return { error: "Bad status." };
      const resolution = String(formData.get("resolution") ?? "").trim() || ticket.resolution;
      if ((status === "RESOLVED" || status === "CLOSED") && !resolution) return { error: "Write a short resolution note first." };
      await db.ticket.update({ where: { id: ticket.id }, data: { status, resolution } });
      if (status === "RESOLVED" || status === "CLOSED") {
        await notify(ticket.userId, `Your ticket was resolved: ${resolution}`, link);
        if (ticket.againstId && ticket.againstInvitedAt) await notify(ticket.againstId, `The ticket involving you was resolved: ${resolution}`, link);
        // Lift a precautionary freeze if no strike was confirmed.
        if (ticket.priority === "URGENT" && ticket.againstId) {
          const confirmed = await db.strike.count({ where: { ticketId: ticket.id, status: "CONFIRMED" } });
          const against = await db.user.findUnique({ where: { id: ticket.againstId } });
          if (!confirmed && against?.status === "FROZEN" && !against.frozenUntil) {
            await db.user.update({ where: { id: against.id }, data: { status: "ACTIVE" } });
          }
        }
      }
    } else {
      return { error: "Unknown action." };
    }
    await audit(user.id, `ticket:${op}`, ticket.id);
    revalidatePath(`/admin/tickets/${ticket.id}`);
    return { ok: "Updated." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function proposeStrike(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await staff();
    const ticketId = String(formData.get("ticketId") ?? "") || null;
    const userId = String(formData.get("userId"));
    const reason = String(formData.get("reason") ?? "").trim();
    if (reason.length < 10) return { error: "Describe the proven misconduct and the evidence." };
    if (formData.get("proven") !== "on") return { error: "Strikes are only for misconduct proven by evidence, after hearing both sides." };
    const fraud = formData.get("fraud") === "on";
    const strike = await db.strike.create({ data: { userId, ticketId, reason, fraud, proposedById: user.id } });
    await audit(user.id, "strike:propose", userId, reason);
    if (user.role === "ADMIN") return applyStrike(strike.id, user);
    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    for (const a of admins) await notify(a.id, "A strike is waiting for your confirmation.", "/admin/strikes");
    revalidatePath("/admin/strikes");
    return { ok: "Strike proposed. An admin will confirm it." };
  } catch (e) {
    return toActionState(e);
  }
}

async function applyStrike(strikeId: string, admin: User): Promise<ActionState> {
  const now = new Date();
  const strike = await db.strike.update({
    where: { id: strikeId },
    data: {
      status: "CONFIRMED",
      confirmedById: admin.id,
      confirmedAt: now,
      expiresAt: new Date(now.getTime() + STRIKE_EXPIRY_DAYS * 86400000),
    },
  });
  const active = await db.strike.count({
    where: {
      userId: strike.userId,
      status: "CONFIRMED",
      OR: [{ fraud: true }, { expiresAt: { gt: now } }],
    },
  });
  const penalty = strikePenalty(active, strike.fraud);
  if (penalty === "BAN") {
    await db.user.update({ where: { id: strike.userId }, data: { status: "BANNED" } });
  } else if (penalty === "FREEZE") {
    await db.user.update({ where: { id: strike.userId }, data: { status: "FROZEN", frozenUntil: new Date(now.getTime() + FREEZE_DAYS * 86400000) } });
  } else {
    // A warning lifts any precautionary freeze.
    await db.user.updateMany({ where: { id: strike.userId, status: "FROZEN", frozenUntil: null }, data: { status: "ACTIVE" } });
  }
  const message = {
    WARNING: "You received a strike (warning) after a proven complaint. You can appeal from your dashboard.",
    FREEZE: `You received a second strike. Trading is frozen for ${FREEZE_DAYS} days. You can appeal from your dashboard.`,
    BAN: "Your account has been banned after proven misconduct.",
  }[penalty];
  await notify(strike.userId, message, "/dashboard");
  await audit(admin.id, `strike:confirm:${penalty}`, strike.userId, strike.reason);
  revalidatePath("/admin/strikes");
  return { ok: `Strike confirmed — ${penalty.toLowerCase()} applied.` };
}

export async function decideStrike(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await staff("ADMIN");
    const strike = await db.strike.findUnique({ where: { id: String(formData.get("strikeId")) } });
    if (!strike) return { error: "Strike not found." };
    const op = String(formData.get("op"));
    if (op === "confirm" && strike.status === "PROPOSED") return applyStrike(strike.id, admin);
    if (op === "reject" && strike.status === "PROPOSED") {
      await db.strike.update({ where: { id: strike.id }, data: { status: "REJECTED" } });
      await audit(admin.id, "strike:reject", strike.userId);
    } else if (op === "overturn" && strike.status === "CONFIRMED") {
      await db.strike.update({ where: { id: strike.id }, data: { status: "OVERTURNED" } });
      await db.user.update({ where: { id: strike.userId }, data: { status: "ACTIVE", frozenUntil: null } });
      await notify(strike.userId, "Your appeal was accepted and the strike was removed.", "/dashboard");
      await audit(admin.id, "strike:overturn", strike.userId);
    } else {
      return { error: "That action isn't available for this strike." };
    }
    revalidatePath("/admin/strikes");
    return { ok: "Done." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function appealStrike(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await signedIn();
    const strike = await db.strike.findUnique({ where: { id: String(formData.get("strikeId")) } });
    if (!strike || strike.userId !== user.id || strike.status !== "CONFIRMED") return { error: "Strike not found." };
    if (strike.appealedAt) return { error: "You've already appealed this strike." };
    const text = String(formData.get("appeal") ?? "").trim();
    if (text.length < 20) return { error: "Explain your side in a little more detail." };
    await db.strike.update({ where: { id: strike.id }, data: { appealText: text, appealedAt: new Date() } });
    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    for (const a of admins) await notify(a.id, "A member appealed a strike.", "/admin/strikes");
    revalidatePath("/dashboard");
    return { ok: "Appeal sent. We'll review it and let you know." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function moderateUser(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await staff("ADMIN");
    const userId = String(formData.get("userId"));
    const op = String(formData.get("op"));
    if (userId === admin.id) return { error: "You can't change your own account here." };
    if (op === "ban") await db.user.update({ where: { id: userId }, data: { status: "BANNED" } });
    else if (op === "reinstate") await db.user.update({ where: { id: userId }, data: { status: "ACTIVE", frozenUntil: null } });
    else if (op === "role") {
      const role = String(formData.get("role"));
      if (!["USER", "MODERATOR", "ADMIN"].includes(role)) return { error: "Bad role." };
      await db.user.update({ where: { id: userId }, data: { role: role as User["role"] } });
    } else return { error: "Unknown action." };
    await audit(admin.id, `user:${op}`, userId, String(formData.get("role") ?? ""));
    revalidatePath("/admin/users");
    return { ok: "Updated." };
  } catch (e) {
    return toActionState(e);
  }
}
