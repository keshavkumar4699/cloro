import { db } from "@/lib/db";
import { ActionError } from "@/lib/session";

const LIMITS = {
  message: { max: 30, windowMs: 60_000, text: "You're sending messages too quickly. Take a breath and try again in a minute." },
  question: { max: 10, windowMs: 3_600_000, text: "You've asked a lot of questions this hour. Please try again later." },
  ticket: { max: 5, windowMs: 86_400_000, text: "You've opened several tickets today. Reply on an existing ticket and we'll help there." },
  listing: { max: 20, windowMs: 86_400_000, text: "You've listed a lot today. Please try again tomorrow." },
} as const;

/** Simple database-backed rate limits; no extra infrastructure to pay for. */
export async function rateLimit(kind: keyof typeof LIMITS, userId: string) {
  const { max, windowMs, text } = LIMITS[kind];
  const since = new Date(Date.now() - windowMs);
  const count =
    kind === "message" ? await db.message.count({ where: { senderId: userId, createdAt: { gte: since } } })
    : kind === "question" ? await db.question.count({ where: { askerId: userId, createdAt: { gte: since } } })
    : kind === "ticket" ? await db.ticket.count({ where: { userId, createdAt: { gte: since } } })
    : await db.listing.count({ where: { sellerId: userId, createdAt: { gte: since } } });
  if (count >= max) throw new ActionError(text);
}
