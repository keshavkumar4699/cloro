"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ActionError, getCurrentUser, isStaff, requireTrader } from "@/lib/session";
import { ok } from "@/lib/flash";
import { toActionState, type ActionState } from "@/lib/action-state";
import { saveImage } from "@/lib/storage";
import { CATEGORIES, CONDITIONS, DURATIONS_DAYS, SIZE_SYSTEMS } from "@/lib/catalog";
import { listingFeeRequired, ageBand, ageOn } from "@/lib/rules";
import { placeBid } from "@/lib/auction";
import { notify, audit } from "@/lib/notify";
import { detectOffPlatform } from "@/lib/contact-filter";
import { rateLimit } from "@/lib/rate-limit";

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 6;

const rupees = (label: string) =>
  z.coerce.number({ message: `${label} must be a number.` }).int(`${label} must be whole rupees.`).min(0).max(10_000_000);

const listingSchema = z.object({
  title: z.string().trim().min(4, "Give your item a title.").max(90),
  description: z.string().trim().min(20, "Describe the item in at least 20 characters.").max(4000),
  category: z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]], { message: "Pick a category." }),
  brand: z.string().trim().max(60).optional(),
  condition: z.enum(CONDITIONS.map((c) => c.id) as [string, ...string[]], { message: "Pick the condition." }),
  size: z.string().trim().min(1, "Size is required.").max(30),
  sizeSystem: z.enum(SIZE_SYSTEMS as unknown as [string, ...string[]], { message: "Pick a size system." }),
  startPrice: rupees("Starting price").pipe(z.number().min(1, "Starting price must be at least ₹1.")),
  reservePrice: z.union([z.literal(""), rupees("Reserve price")]).optional(),
  durationDays: z.coerce.number().refine((d) => (DURATIONS_DAYS as readonly number[]).includes(d), "Pick a duration."),
  shippingEstimate: rupees("Shipping estimate"),
  city: z.string().trim().min(2, "Enter your city.").max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit pincode."),
});

export async function createListing(_: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const user = await requireTrader();
    if (listingFeeRequired(user)) {
      return { error: "Your monthly listing pass has run out. Renew it on the Membership page to list more items." };
    }
    await rateLimit("listing", user.id);
    const parsed = listingSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const data = parsed.data;

    const reserve = data.reservePrice === "" || data.reservePrice === undefined ? null : Number(data.reservePrice);
    if (reserve !== null && reserve < data.startPrice) return { error: "The reserve price can't be lower than the starting price." };

    const flags = detectOffPlatform(`${data.title} ${data.description}`);
    if (flags.length) return { error: `Please remove the ${flags.join(", ")} from your listing. All contact happens on Cloro.` };

    const measurements: Record<string, number> = {};
    const category = CATEGORIES.find((c) => c.id === data.category)!;
    for (const m of category.measurements) {
      const v = Number(formData.get(`m_${m}`));
      if (v > 0) measurements[m] = v;
    }
    if (category.measurements.length && Object.keys(measurements).length === 0) {
      return { error: "Add at least one measurement so buyers know the exact fit." };
    }

    const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length < MIN_PHOTOS) return { error: `Add at least ${MIN_PHOTOS} photos.` };
    if (files.length > MAX_PHOTOS) return { error: `You can add up to ${MAX_PHOTOS} photos.` };
    const urls: string[] = [];
    for (const f of files) urls.push(await saveImage(f, `listings/${user.id}`));

    const now = Date.now();
    const endsAt = new Date(now + data.durationDays * 86400000);
    const band = user.dob ? ageBand(ageOn(user.dob)) : null;

    const listing = await db.$transaction(async (tx) => {
      const l = await tx.listing.create({
        data: {
          sellerId: user.id,
          title: data.title,
          description: data.description,
          category: data.category,
          brand: data.brand || null,
          condition: data.condition,
          size: data.size,
          sizeSystem: data.sizeSystem,
          measurements,
          startPrice: data.startPrice,
          reservePrice: reserve,
          currentPrice: data.startPrice,
          reserveMet: reserve === null,
          endsAt,
          originalEndsAt: endsAt,
          shippingEstimate: data.shippingEstimate,
          city: data.city,
          pincode: data.pincode,
          meetupPossible: formData.get("meetupPossible") === "on",
          hasBill: formData.get("hasBill") === "on",
          hasBox: formData.get("hasBox") === "on",
          hasTags: formData.get("hasTags") === "on",
          images: { create: urls.map((url, position) => ({ url, position })) },
        },
      });
      if (band === "ADULT_24_30" && !user.freeListingUsed) {
        await tx.user.update({ where: { id: user.id }, data: { freeListingUsed: true } });
      }
      return l;
    });
    id = listing.id;
    await ok("Your item is live! Share it with friends to get the bidding going.");
  } catch (e) {
    return toActionState(e);
  }
  redirect(`/listings/${id}`);
}

export async function bidAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireTrader();
    const listingId = String(formData.get("listingId"));
    const amount = Number(formData.get("amount"));
    if (formData.get("promise") !== "on") return { error: "Please confirm that you'll buy the item if you win." };
    const res = await placeBid(listingId, user, amount);
    if (!res.ok) return { error: res.error };
    revalidatePath(`/listings/${listingId}`);
    return await ok(`Bid of ₹${amount.toLocaleString("en-IN")} placed. You're the highest bidder.`);
  } catch (e) {
    return toActionState(e);
  }
}

export async function cancelListing(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireTrader();
    const id = String(formData.get("listingId"));
    const listing = await db.listing.findUnique({ where: { id } });
    if (!listing || listing.sellerId !== user.id) return { error: "Not your listing." };
    if (listing.status !== "LIVE") return { error: "Only live auctions can be cancelled." };
    if (listing.bidCount > 0) {
      return { error: "This auction already has bids. Contact support if you really need to cancel — it may count as a strike." };
    }
    await db.listing.update({ where: { id }, data: { status: "CANCELLED" } });
    revalidatePath(`/listings/${id}`);
    return await ok("Listing cancelled.");
  } catch (e) {
    return toActionState(e);
  }
}

export async function relistListing(_: ActionState, formData: FormData): Promise<ActionState> {
  let newId: string;
  try {
    const user = await requireTrader();
    if (listingFeeRequired(user)) return { error: "Your monthly listing pass has run out. Renew it on the Membership page." };
    const id = String(formData.get("listingId"));
    const days = Number(formData.get("durationDays") ?? 3);
    if (!(DURATIONS_DAYS as readonly number[]).includes(days)) return { error: "Pick a duration." };
    const old = await db.listing.findUnique({ where: { id }, include: { images: true } });
    if (!old || old.sellerId !== user.id) return { error: "Not your listing." };
    if (!["UNSOLD", "CANCELLED", "ENDED"].includes(old.status)) return { error: "This item can't be relisted." };
    if (old.status === "ENDED" && (await db.deal.findFirst({ where: { listingId: id, status: { in: ["OFFERED", "ACCEPTED", "COMPLETED"] } } }))) {
      return { error: "There's an active deal for this item." };
    }
    const endsAt = new Date(Date.now() + days * 86400000);
    const fresh = await db.$transaction(async (tx) => {
      if (old.status === "ENDED") await tx.listing.update({ where: { id }, data: { status: "UNSOLD" } });
      return tx.listing.create({
        data: {
          sellerId: user.id,
          title: old.title,
          description: old.description,
          category: old.category,
          brand: old.brand,
          condition: old.condition,
          size: old.size,
          sizeSystem: old.sizeSystem,
          measurements: old.measurements ?? {},
          startPrice: old.startPrice,
          reservePrice: old.reservePrice,
          currentPrice: old.startPrice,
          reserveMet: old.reservePrice === null,
          endsAt,
          originalEndsAt: endsAt,
          shippingEstimate: old.shippingEstimate,
          city: old.city,
          pincode: old.pincode,
          meetupPossible: old.meetupPossible,
          hasBill: old.hasBill,
          hasBox: old.hasBox,
          hasTags: old.hasTags,
          images: { create: old.images.map((i) => ({ url: i.url, position: i.position })) },
        },
      });
    });
    newId = fresh.id;
    await ok("Relisted — good luck this time!");
  } catch (e) {
    return toActionState(e);
  }
  redirect(`/listings/${newId}`);
}

export async function askQuestion(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireTrader();
    const listingId = String(formData.get("listingId"));
    const body = String(formData.get("body") ?? "").trim();
    if (body.length < 3 || body.length > 500) return { error: "Questions must be 3–500 characters." };
    const flags = detectOffPlatform(body);
    if (flags.length) return { error: `Public questions can't include a ${flags.join(", ")}.` };
    const listing = await db.listing.findUnique({ where: { id: listingId } });
    if (!listing) return { error: "Listing not found." };
    if (listing.sellerId === user.id) return { error: "You can't ask on your own listing." };
    if (listing.status !== "LIVE") return { error: "Questions close when the auction ends." };
    await rateLimit("question", user.id);
    await db.question.create({ data: { listingId, askerId: user.id, body } });
    await notify(listing.sellerId, `New question on “${listing.title}”.`, `/listings/${listingId}#qa`);
    revalidatePath(`/listings/${listingId}`);
    return await ok("Question posted. The seller's answer will be public.");
  } catch (e) {
    return toActionState(e);
  }
}

export async function answerQuestion(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireTrader();
    const q = await db.question.findUnique({ where: { id: String(formData.get("questionId")) }, include: { listing: true } });
    if (!q || q.listing.sellerId !== user.id) return { error: "Not your listing." };
    const answer = String(formData.get("answer") ?? "").trim();
    if (!answer || answer.length > 1000) return { error: "Answers must be 1–1000 characters." };
    const flags = detectOffPlatform(answer);
    if (flags.length) return { error: `Public answers can't include a ${flags.join(", ")}.` };
    await db.question.update({ where: { id: q.id }, data: { answer, answeredAt: new Date() } });
    await notify(q.askerId, `The seller answered your question on “${q.listing.title}”.`, `/listings/${q.listingId}#qa`);
    revalidatePath(`/listings/${q.listingId}`);
    return await ok("Answer posted.");
  } catch (e) {
    return toActionState(e);
  }
}

export async function hideQuestion(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ActionError("Please sign in.");
    const q = await db.question.findUnique({ where: { id: String(formData.get("questionId")) }, include: { listing: true } });
    if (!q || (q.listing.sellerId !== user.id && !isStaff(user))) return { error: "Not allowed." };
    await db.question.update({ where: { id: q.id }, data: { hidden: true } });
    revalidatePath(`/listings/${q.listingId}`);
    return await ok("Question hidden.");
  } catch (e) {
    return toActionState(e);
  }
}

export async function toggleCurated(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!isStaff(user)) return { error: "Not allowed." };
    const id = String(formData.get("listingId"));
    const l = await db.listing.findUnique({ where: { id } });
    if (!l) return { error: "Not found." };
    await db.listing.update({ where: { id }, data: { curated: !l.curated } });
    await audit(user!.id, l.curated ? "uncurate" : "curate", id);
    revalidatePath("/");
    revalidatePath(`/listings/${id}`);
    return await ok(l.curated ? "Removed from Curated." : "Added to Curated.");
  } catch (e) {
    return toActionState(e);
  }
}
