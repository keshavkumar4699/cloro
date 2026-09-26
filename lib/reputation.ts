import { db } from "@/lib/db";
import { ageBand, ageOn } from "@/lib/rules";

export async function getReputation(userId: string) {
  const [user, ratings, deals, strikes] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, image: true, dob: true, aadhaarVerifiedAt: true, createdAt: true, status: true, city: true },
    }),
    db.review.aggregate({ where: { revieweeId: userId }, _avg: { rating: true }, _count: true }),
    db.deal.count({ where: { status: "COMPLETED", OR: [{ buyerId: userId }, { sellerId: userId }] } }),
    db.strike.count({ where: { userId, status: "CONFIRMED", OR: [{ fraud: true }, { expiresAt: { gt: new Date() } }] } }),
  ]);
  if (!user) return null;
  const band = user.dob ? ageBand(ageOn(user.dob)) : null;
  const avg = ratings._avg.rating;
  return {
    user,
    ratingAvg: avg ? Math.round(avg * 10) / 10 : null,
    ratingCount: ratings._count,
    dealsCompleted: deals,
    provenStrikes: strikes,
    verified: !!user.aadhaarVerifiedAt,
    isMinor: band === "MINOR",
    is24Plus: band === "ADULT_24_30",
    trusted: deals >= 5 && (avg ?? 0) >= 4.5 && strikes === 0,
  };
}

export type Reputation = NonNullable<Awaited<ReturnType<typeof getReputation>>>;
