// Pure business rules. No database access here so everything is unit-testable.

export const MIN_AGE = 13;
export const CORE_MAX_AGE = 23; // under 24 is the core audience
export const MAX_AGE = 30;
export const MINOR_BID_CAP = 5000;
export const ANTI_SNIPE_WINDOW_MS = 2 * 60 * 1000;
export const DEAL_RESPONSE_MS = 48 * 60 * 60 * 1000;
export const STRIKES_TO_BAN = 3;
export const FREEZE_DAYS = 30;
export const STRIKE_EXPIRY_DAYS = 365;
export const MAX_FALLBACK_RANK = 3;

export type AgeBand = "UNDER_MIN" | "MINOR" | "CORE" | "ADULT_24_30" | "OVER_MAX";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Age in whole years, measured on the Indian calendar date. */
export function ageOn(dob: Date, now: Date = new Date()): number {
  const n = new Date(now.getTime() + IST_OFFSET_MS);
  const y = n.getUTCFullYear();
  const m = n.getUTCMonth();
  const d = n.getUTCDate();
  let age = y - dob.getUTCFullYear();
  if (m < dob.getUTCMonth() || (m === dob.getUTCMonth() && d < dob.getUTCDate())) age--;
  return age;
}

export function ageBand(age: number): AgeBand {
  if (age < MIN_AGE) return "UNDER_MIN";
  if (age < 18) return "MINOR";
  if (age <= CORE_MAX_AGE) return "CORE";
  if (age <= MAX_AGE) return "ADULT_24_30";
  return "OVER_MAX";
}

export function isEligibleBand(band: AgeBand): boolean {
  return band !== "UNDER_MIN" && band !== "OVER_MAX";
}

export interface TradeSubject {
  dob: Date | null;
  aadhaarVerifiedAt: Date | null;
  guardianApprovedAt: Date | null;
  onboardedAt: Date | null;
  status: "ACTIVE" | "FROZEN" | "BANNED";
  frozenUntil: Date | null;
}

export type TradeBlock =
  | "NOT_ONBOARDED"
  | "NOT_VERIFIED"
  | "NOT_ELIGIBLE"
  | "NEEDS_GUARDIAN"
  | "FROZEN"
  | "BANNED";

/** Why a user may not list, bid, ask or chat — or null if they can. */
export function tradeBlock(u: TradeSubject, now: Date = new Date()): TradeBlock | null {
  if (u.status === "BANNED") return "BANNED";
  if (u.status === "FROZEN" && (!u.frozenUntil || u.frozenUntil > now)) return "FROZEN";
  if (!u.onboardedAt) return "NOT_ONBOARDED";
  if (!u.aadhaarVerifiedAt || !u.dob) return "NOT_VERIFIED";
  const band = ageBand(ageOn(u.dob, now));
  if (!isEligibleBand(band)) return "NOT_ELIGIBLE";
  if (band === "MINOR" && !u.guardianApprovedAt) return "NEEDS_GUARDIAN";
  return null;
}

export const TRADE_BLOCK_MESSAGES: Record<TradeBlock, string> = {
  NOT_ONBOARDED: "Finish setting up your account first.",
  NOT_VERIFIED: "Verify with your Aadhaar card to start trading.",
  NOT_ELIGIBLE: "Cloro is open to members aged 13 to 30.",
  NEEDS_GUARDIAN: "A parent or guardian needs to approve your account before you can trade.",
  FROZEN: "Your account is temporarily frozen from trading.",
  BANNED: "This account has been banned.",
};

/** Minimum raise between bids, tiered by the current price. */
export function bidIncrement(price: number): number {
  if (price < 500) return 10;
  if (price < 2000) return 25;
  if (price < 10000) return 100;
  if (price < 50000) return 250;
  return 500;
}

export function minNextBid(l: { bidCount: number; startPrice: number; currentPrice: number }): number {
  return l.bidCount === 0 ? l.startPrice : l.currentPrice + bidIncrement(l.currentPrice);
}

/** Anti-sniping: a bid in the last two minutes pushes the end to two minutes from now. */
export function extendedEnd(endsAt: Date, now: Date): Date {
  if (endsAt.getTime() - now.getTime() < ANTI_SNIPE_WINDOW_MS) {
    return new Date(now.getTime() + ANTI_SNIPE_WINDOW_MS);
  }
  return endsAt;
}

export type BidError =
  | "NOT_LIVE"
  | "ENDED"
  | "OWN_LISTING"
  | "TOO_LOW"
  | "MINOR_CAP"
  | "ALREADY_TOP";

export function validateBid(args: {
  listing: { status: string; endsAt: Date; sellerId: string; bidCount: number; startPrice: number; currentPrice: number };
  bidderId: string;
  topBidderId: string | null;
  amount: number;
  bidderIsMinor: boolean;
  now: Date;
}): BidError | null {
  const { listing, bidderId, amount, now } = args;
  if (listing.status !== "LIVE") return "NOT_LIVE";
  if (listing.endsAt <= now) return "ENDED";
  if (listing.sellerId === bidderId) return "OWN_LISTING";
  if (args.topBidderId === bidderId) return "ALREADY_TOP";
  if (!Number.isInteger(amount) || amount < minNextBid(listing)) return "TOO_LOW";
  if (args.bidderIsMinor && amount > MINOR_BID_CAP) return "MINOR_CAP";
  return null;
}

export const BID_ERROR_MESSAGES: Record<BidError, string> = {
  NOT_LIVE: "This auction is not live.",
  ENDED: "This auction has ended.",
  OWN_LISTING: "You can't bid on your own item.",
  TOO_LOW: "Your bid is below the minimum next bid.",
  MINOR_CAP: `Members under 18 can bid up to ₹${MINOR_BID_CAP.toLocaleString("en-IN")}.`,
  ALREADY_TOP: "You're already the highest bidder.",
};

/** Distinct bidders ranked by their best bid; ties go to whoever bid first. */
export function rankBidders<B extends { bidderId: string; amount: number; createdAt: Date }>(bids: B[]): B[] {
  const best = new Map<string, B>();
  for (const b of bids) {
    const cur = best.get(b.bidderId);
    if (!cur || b.amount > cur.amount || (b.amount === cur.amount && b.createdAt < cur.createdAt)) {
      best.set(b.bidderId, b);
    }
  }
  return [...best.values()].sort(
    (a, b) => b.amount - a.amount || a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

/** Whether a 24–30 member may create a new listing without paying now. */
export function listingFeeRequired(
  u: { dob: Date | null; freeListingUsed: boolean; listingPassUntil: Date | null },
  now: Date = new Date(),
): boolean {
  if (!u.dob || ageBand(ageOn(u.dob, now)) !== "ADULT_24_30") return false;
  if (!u.freeListingUsed) return false;
  return !u.listingPassUntil || u.listingPassUntil <= now;
}

/** Penalty after confirming a strike, given the count of active confirmed strikes (including the new one). */
export function strikePenalty(activeStrikes: number, fraud: boolean): "WARNING" | "FREEZE" | "BAN" {
  if (fraud || activeStrikes >= STRIKES_TO_BAN) return "BAN";
  if (activeStrikes === 2) return "FREEZE";
  return "WARNING";
}
