import { describe, expect, it } from "vitest";
import {
  ageBand,
  ageOn,
  bidIncrement,
  extendedEnd,
  listingFeeRequired,
  minNextBid,
  rankBidders,
  strikePenalty,
  tradeBlock,
  validateBid,
  type TradeSubject,
} from "@/lib/rules";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("age", () => {
  it("counts birthdays on the Indian calendar date", () => {
    const dob = utc(2002, 9, 27);
    // 26 Sep 2026, 20:00 UTC is already 27 Sep in India
    expect(ageOn(dob, new Date(Date.UTC(2026, 8, 26, 20, 0)))).toBe(24);
    expect(ageOn(dob, new Date(Date.UTC(2026, 8, 26, 12, 0)))).toBe(23);
  });

  it("maps ages to bands at every boundary", () => {
    expect(ageBand(12)).toBe("UNDER_MIN");
    expect(ageBand(13)).toBe("MINOR");
    expect(ageBand(17)).toBe("MINOR");
    expect(ageBand(18)).toBe("CORE");
    expect(ageBand(23)).toBe("CORE");
    expect(ageBand(24)).toBe("ADULT_24_30");
    expect(ageBand(30)).toBe("ADULT_24_30");
    expect(ageBand(31)).toBe("OVER_MAX");
  });
});

describe("trade eligibility", () => {
  const now = utc(2026, 9, 26);
  const base: TradeSubject = {
    dob: utc(2004, 1, 1),
    aadhaarVerifiedAt: now,
    guardianApprovedAt: null,
    onboardedAt: now,
    status: "ACTIVE",
    frozenUntil: null,
  };

  it("allows a verified adult", () => expect(tradeBlock(base, now)).toBeNull());
  it("requires Aadhaar", () => expect(tradeBlock({ ...base, aadhaarVerifiedAt: null }, now)).toBe("NOT_VERIFIED"));
  it("requires guardian approval for minors", () => {
    const minor = { ...base, dob: utc(2011, 1, 1) };
    expect(tradeBlock(minor, now)).toBe("NEEDS_GUARDIAN");
    expect(tradeBlock({ ...minor, guardianApprovedAt: now }, now)).toBeNull();
  });
  it("blocks over-30s", () => expect(tradeBlock({ ...base, dob: utc(1990, 1, 1) }, now)).toBe("NOT_ELIGIBLE"));
  it("respects freezes until they expire", () => {
    expect(tradeBlock({ ...base, status: "FROZEN", frozenUntil: utc(2026, 10, 1) }, now)).toBe("FROZEN");
    expect(tradeBlock({ ...base, status: "FROZEN", frozenUntil: null }, now)).toBe("FROZEN");
    expect(tradeBlock({ ...base, status: "FROZEN", frozenUntil: utc(2026, 9, 1) }, now)).toBeNull();
  });
  it("blocks banned members", () => expect(tradeBlock({ ...base, status: "BANNED" }, now)).toBe("BANNED"));
});

describe("bidding", () => {
  const now = utc(2026, 9, 26);
  const listing = { status: "LIVE", endsAt: utc(2026, 9, 27), sellerId: "s", bidCount: 0, startPrice: 500, currentPrice: 500 };
  const bid = (amount: number, over: Partial<Parameters<typeof validateBid>[0]> = {}) =>
    validateBid({ listing, bidderId: "b", topBidderId: null, amount, bidderIsMinor: false, now, ...over });

  it("accepts the starting price as the first bid", () => expect(bid(500)).toBeNull());
  it("rejects below the start", () => expect(bid(499)).toBe("TOO_LOW"));
  it("requires the increment after the first bid", () => {
    const l = { ...listing, bidCount: 1, currentPrice: 500 };
    expect(minNextBid(l)).toBe(525);
    expect(bid(524, { listing: l })).toBe("TOO_LOW");
    expect(bid(525, { listing: l })).toBeNull();
  });
  it("stops sellers bidding on their own lot", () => expect(bid(500, { bidderId: "s" })).toBe("OWN_LISTING"));
  it("stops the top bidder outbidding themselves", () => expect(bid(600, { topBidderId: "b" })).toBe("ALREADY_TOP"));
  it("caps minors", () => {
    const l = { ...listing, startPrice: 4000, currentPrice: 4000 };
    expect(bid(5000, { listing: l, bidderIsMinor: true })).toBeNull();
    expect(bid(5001, { listing: l, bidderIsMinor: true })).toBe("MINOR_CAP");
  });
  it("rejects ended auctions", () => expect(bid(500, { now: utc(2026, 9, 28) })).toBe("ENDED"));
  it("uses tiered increments", () => {
    expect(bidIncrement(100)).toBe(10);
    expect(bidIncrement(1500)).toBe(25);
    expect(bidIncrement(5000)).toBe(100);
    expect(bidIncrement(20000)).toBe(250);
    expect(bidIncrement(80000)).toBe(500);
  });

  it("extends the auction for late bids only", () => {
    const end = new Date(now.getTime() + 60_000);
    expect(extendedEnd(end, now).getTime()).toBe(now.getTime() + 120_000);
    const later = new Date(now.getTime() + 10 * 60_000);
    expect(extendedEnd(later, now)).toBe(later);
  });

  it("ranks distinct bidders by best bid, earliest wins ties", () => {
    const t = (s: number) => new Date(now.getTime() + s * 1000);
    const ranked = rankBidders([
      { bidderId: "a", amount: 500, createdAt: t(1) },
      { bidderId: "b", amount: 600, createdAt: t(2) },
      { bidderId: "a", amount: 700, createdAt: t(3) },
      { bidderId: "c", amount: 700, createdAt: t(4) },
    ]);
    expect(ranked.map((r) => r.bidderId)).toEqual(["a", "c", "b"]);
    expect(ranked[0].amount).toBe(700);
  });
});

describe("listing fee for 24–30", () => {
  const now = utc(2026, 9, 26);
  const adult = { dob: utc(2000, 1, 1), freeListingUsed: false, listingPassUntil: null };
  it("gives the first listing free", () => expect(listingFeeRequired(adult, now)).toBe(false));
  it("requires a pass afterwards", () => expect(listingFeeRequired({ ...adult, freeListingUsed: true }, now)).toBe(true));
  it("accepts an active pass", () =>
    expect(listingFeeRequired({ ...adult, freeListingUsed: true, listingPassUntil: utc(2026, 10, 10) }, now)).toBe(false));
  it("is always free under 24", () =>
    expect(listingFeeRequired({ dob: utc(2005, 1, 1), freeListingUsed: true, listingPassUntil: null }, now)).toBe(false));
});

describe("strike penalties", () => {
  it("escalates warning → freeze → ban", () => {
    expect(strikePenalty(1, false)).toBe("WARNING");
    expect(strikePenalty(2, false)).toBe("FREEZE");
    expect(strikePenalty(3, false)).toBe("BAN");
  });
  it("bans immediately for fraud", () => expect(strikePenalty(1, true)).toBe("BAN"));
});
