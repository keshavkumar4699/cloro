import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getReputation } from "@/lib/reputation";
import { formatDate } from "@/lib/format";
import { MemberBadges } from "@/components/member-card";
import { ListingCard } from "@/components/listing-card";

export const metadata = { title: "Member" };

export default async function ProfilePage({ params }: PageProps<"/u/[id]">) {
  const { id } = await params;
  const rep = await getReputation(id);
  if (!rep) notFound();
  const [reviews, listings] = await Promise.all([
    db.review.findMany({ where: { revieweeId: id }, include: { reviewer: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.listing.findMany({
      where: { sellerId: id, status: "LIVE", endsAt: { gt: new Date() } },
      select: {
        id: true, title: true, brand: true, size: true, sizeSystem: true, currentPrice: true, bidCount: true, endsAt: true, status: true, city: true,
        images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <p className="eyebrow">Member since {formatDate(rep.user.createdAt)}</p>
      <h1 className="text-5xl mt-2">{rep.user.name ?? "Member"}</h1>
      <p className="mt-2 text-muted">
        {rep.user.city ? `${rep.user.city} · ` : ""}
        {rep.ratingAvg ? `★ ${rep.ratingAvg} from ${rep.ratingCount} rating${rep.ratingCount === 1 ? "" : "s"}` : "No ratings yet"} · {rep.dealsCompleted} deals done
      </p>
      <div className="mt-4"><MemberBadges rep={rep} /></div>

      {listings.length > 0 && (
        <section className="mt-14">
          <h2 className="text-3xl">Live lots</h2>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-6">{listings.map((l) => <ListingCard key={l.id} l={l} />)}</div>
        </section>
      )}

      <section className="mt-14">
        <h2 className="text-3xl">Ratings</h2>
        <ul className="mt-4 space-y-4">
          {reviews.length === 0 && <li className="text-muted">No ratings yet.</li>}
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-line pb-4">
              <p>{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span> <span className="text-sm text-muted">— {r.reviewer.name ?? "Member"}, {formatDate(r.createdAt)}</span></p>
              {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
