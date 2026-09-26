import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ageBand, ageOn, isEligibleBand, tradeBlock, TRADE_BLOCK_MESSAGES, type AgeBand } from "@/lib/rules";

export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return db.user.findUnique({ where: { id } });
}

export function bandOf(user: Pick<User, "dob">): AgeBand | null {
  return user.dob ? ageBand(ageOn(user.dob)) : null;
}

/** Signed-in, onboarded and within the age limits. Read-only access is enough. */
export async function requireMember(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (user.status === "BANNED") redirect("/banned");
  if (!user.dob || !user.onboardedAt) redirect("/welcome");
  const band = bandOf(user);
  if (band && !isEligibleBand(band)) redirect("/not-eligible");
  return user;
}

/** Page guard for pages that need full trading rights; sends the user to fix what is missing. */
export async function requireTraderPage(): Promise<User> {
  const user = await requireMember();
  const block = tradeBlock(user);
  if (block === "NOT_VERIFIED") redirect("/verify");
  if (block === "NEEDS_GUARDIAN") redirect("/guardian");
  if (block) redirect("/dashboard");
  return user;
}

export class ActionError extends Error {}

/** Action guard: throws a user-facing error instead of redirecting. */
export async function requireTrader(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new ActionError("Please sign in first.");
  const block = tradeBlock(user);
  if (block) throw new ActionError(TRADE_BLOCK_MESSAGES[block]);
  return user;
}

export async function requireStaff(minRole: "MODERATOR" | "ADMIN" = "MODERATOR"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  const ok = minRole === "ADMIN" ? user.role === "ADMIN" : user.role === "ADMIN" || user.role === "MODERATOR";
  if (!ok) redirect("/");
  return user;
}

export function isStaff(user: Pick<User, "role"> | null): boolean {
  return !!user && (user.role === "ADMIN" || user.role === "MODERATOR");
}
