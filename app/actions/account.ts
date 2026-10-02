"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ActionError, getCurrentUser } from "@/lib/session";
import { ok } from "@/lib/flash";
import { toActionState, type ActionState } from "@/lib/action-state";
import { identityFingerprint, loadUidaiPublicKey, namesMatch, parseSecureQr } from "@/lib/aadhaar";
import { ageBand, ageOn, isEligibleBand } from "@/lib/rules";
import { notify, audit } from "@/lib/notify";
import { signOut } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";

async function signedIn() {
  const user = await getCurrentUser();
  if (!user) throw new ActionError("Please sign in first.");
  return user;
}

const GUARDIAN_LINK_DAYS = 7;
const linkExpired = (createdAt: Date) => Date.now() - createdAt.getTime() > GUARDIAN_LINK_DAYS * 86400000;

const onboardingSchema = z.object({
  dob: z.string().optional(),
  city: z.string().trim().min(2, "Enter your city.").max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit pincode."),
  pledge: z.literal("on", { message: "Please accept the community pledge." }),
});

export async function completeOnboarding(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await signedIn();
    const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    let dob = user.dob;
    if (!dob) {
      const d = parsed.data.dob ? new Date(parsed.data.dob + "T00:00:00Z") : null;
      if (!d || Number.isNaN(d.getTime())) return { error: "Enter your date of birth." };
      const age = ageOn(d);
      if (d > new Date() || age > 120) return { error: "That date of birth doesn't look right. Please check it." };
      dob = d;
    }
    await db.user.update({
      where: { id: user.id },
      data: {
        dob,
        dobSource: user.dobSource ?? "SELF",
        city: parsed.data.city,
        pincode: parsed.data.pincode,
        onboardedAt: new Date(),
      },
    });
    if (!isEligibleBand(ageBand(ageOn(dob)))) redirect("/not-eligible");
    await ok(`Welcome to Cloro${user.name ? `, ${user.name.split(" ")[0]}` : ""}! Have a look around.`);
  } catch (e) {
    return toActionState(e);
  }
  redirect("/");
}

export async function verifyAadhaar(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await signedIn();
    if (user.aadhaarVerifiedAt) return await ok("You're already verified.");
    const qr = String(formData.get("qr") ?? "");
    if (!qr) return { error: "Scan or upload your Aadhaar card first." };
    if (qr.length > 20000) return { error: "This doesn't look like an Aadhaar Secure QR code." };
    await rateLimit("aadhaar", user.id);
    await audit(user.id, "aadhaar:attempt");

    const key = loadUidaiPublicKey(process.env.UIDAI_PUBLIC_KEY_PEM);
    if (!key && process.env.AADHAAR_ALLOW_UNSIGNED !== "true") {
      return { error: "Verification is temporarily unavailable. Please try again later." };
    }
    const id = parseSecureQr(qr, key);

    if (!user.name) {
      return { error: "Your Google account has no name set. Add your name in your Google account, sign out and back in, then try again." };
    }
    if (!namesMatch(id.name, user.name)) {
      return { error: "The name on this Aadhaar doesn't match your Google account name. Please use your own card." };
    }
    const hash = identityFingerprint(id, process.env.AADHAAR_HASH_SECRET ?? process.env.AUTH_SECRET!);
    const owner = await db.user.findUnique({ where: { aadhaarHash: hash }, select: { id: true } });
    if (owner && owner.id !== user.id) {
      return { error: "This Aadhaar is already linked to another Cloro account. Each person can have one account." };
    }

    const band = ageBand(ageOn(id.dob));
    await db.user.update({
      where: { id: user.id },
      data: {
        aadhaarVerifiedAt: new Date(),
        aadhaarName: id.name,
        aadhaarLast4: id.last4,
        aadhaarHash: hash,
        dob: id.dob, // Aadhaar is the source of truth for age
        dobSource: "AADHAAR",
      },
    });
    if (!isEligibleBand(band)) redirect("/not-eligible");
    if (band === "MINOR") {
      await ok("Verified! One more step: ask a parent or guardian to approve.");
      redirect("/guardian");
    }
    revalidatePath("/", "layout");
    return await ok("You're verified! You can now bid, sell and chat.");
  } catch (e) {
    return toActionState(e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createGuardianRequest(_prev?: ActionState): Promise<ActionState> {
  try {
    const user = await signedIn();
    const existing = await db.guardianRequest.findFirst({ where: { minorId: user.id, status: "PENDING" } });
    if (existing && linkExpired(existing.createdAt)) {
      await db.guardianRequest.update({ where: { id: existing.id }, data: { status: "EXPIRED" } });
    }
    if (!existing || linkExpired(existing.createdAt)) {
      await db.guardianRequest.create({ data: { minorId: user.id, token: randomBytes(24).toString("base64url") } });
    }
    revalidatePath("/guardian");
    return await ok("Link created.");
  } catch (e) {
    return toActionState(e);
  }
}

export async function decideGuardianRequest(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const guardian = await signedIn();
    const token = String(formData.get("token"));
    const decision = formData.get("decision") === "approve" ? "APPROVED" : "DECLINED";
    const relationship = String(formData.get("relationship") ?? "").trim();
    const req = await db.guardianRequest.findUnique({ where: { token } });
    if (!req || req.status !== "PENDING") return { error: "This link is no longer valid." };
    if (linkExpired(req.createdAt)) return { error: "This link has expired. Ask them to create a new one from their Cloro account." };
    if (req.minorId === guardian.id) return { error: "The approval must come from your parent or guardian's own Google account." };
    if (guardian.dob && ageOn(guardian.dob) < 18) return { error: "A guardian must be an adult." };
    if (decision === "APPROVED" && !relationship) return { error: "Tell us how you're related." };
    if (formData.get("agree") !== "on" && decision === "APPROVED") return { error: "Please confirm the statement." };

    await db.$transaction([
      db.guardianRequest.update({
        where: { id: req.id },
        data: { status: decision, guardianId: guardian.id, relationship, decidedAt: new Date() },
      }),
      ...(decision === "APPROVED"
        ? [db.user.update({ where: { id: req.minorId }, data: { guardianApprovedAt: new Date(), guardianEmail: guardian.email } })]
        : []),
    ]);
    await notify(
      req.minorId,
      decision === "APPROVED" ? "Your guardian approved your account. You can start trading!" : "Your guardian declined the request.",
      "/dashboard",
    );
    return await ok(decision === "APPROVED" ? "Thank you — the account is approved." : "Request declined.");
  } catch (e) {
    return toActionState(e);
  }
}

export async function markNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  revalidatePath("/", "layout");
}

export async function toggleBlock(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await signedIn();
    const targetId = String(formData.get("userId"));
    if (targetId === user.id) return { error: "You can't block yourself." };
    if (!(await db.user.findUnique({ where: { id: targetId }, select: { id: true } }))) return { error: "Member not found." };
    const key = { blockerId_blockedId: { blockerId: user.id, blockedId: targetId } };
    const existing = await db.block.findUnique({ where: key });
    if (existing) await db.block.delete({ where: key });
    else await db.block.create({ data: { blockerId: user.id, blockedId: targetId } });
    await audit(user.id, existing ? "unblock" : "block", targetId);
    revalidatePath("/", "layout");
    return await ok(existing ? "Unblocked." : "Blocked. They can no longer message you.");
  } catch (e) {
    return toActionState(e);
  }
}

/**
 * Right to erasure (DPDP Act): removes the member's personal data and signs them out.
 * Blocked while they have open deals or live auctions with bids, so nobody is left mid-trade.
 * The Aadhaar fingerprint is kept only if they have confirmed strikes, so a ban can't be dodged by deleting.
 */
export async function deleteMyAccount(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await signedIn();
    if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") return { error: "Type DELETE to confirm." };
    if (user.role === "ADMIN" && (await db.user.count({ where: { role: "ADMIN", deletedAt: null } })) <= 1) {
      return { error: "You're the only admin. Make someone else an admin first." };
    }
    const openDeals = await db.deal.count({ where: { status: { in: ["OFFERED", "ACCEPTED"] }, OR: [{ buyerId: user.id }, { sellerId: user.id }] } });
    if (openDeals) return { error: "Finish or cancel your open deals first, then you can delete your account." };
    const liveWithBids = await db.listing.count({ where: { sellerId: user.id, status: "LIVE", bidCount: { gt: 0 } } });
    if (liveWithBids) return { error: "You have live auctions with bids. You can delete your account once they end." };
    const strikes = await db.strike.count({ where: { userId: user.id, status: "CONFIRMED" } });

    await db.$transaction([
      db.listing.updateMany({ where: { sellerId: user.id, status: "LIVE" }, data: { status: "CANCELLED" } }),
      db.watch.deleteMany({ where: { userId: user.id } }),
      db.notification.deleteMany({ where: { userId: user.id } }),
      db.block.deleteMany({ where: { blockerId: user.id } }),
      db.guardianRequest.deleteMany({ where: { minorId: user.id, status: "PENDING" } }),
      db.account.deleteMany({ where: { userId: user.id } }),
      db.session.deleteMany({ where: { userId: user.id } }),
      db.user.update({
        where: { id: user.id },
        data: {
          deletedAt: new Date(),
          name: "Deleted member",
          email: null,
          emailVerified: null,
          image: null,
          dob: null,
          city: null,
          pincode: null,
          aadhaarName: null,
          aadhaarLast4: null,
          aadhaarHash: strikes ? user.aadhaarHash : null,
          guardianEmail: null,
          role: "USER",
        },
      }),
    ]);
    await audit(user.id, "account:delete");
  } catch (e) {
    return toActionState(e);
  }
  await signOut({ redirectTo: "/?deleted=1" });
  return undefined;
}
