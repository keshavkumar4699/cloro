import Link from "next/link";
import { notFound } from "next/navigation";
import { Flag, MapPin, Star } from "lucide-react";
import { db } from "@/lib/db";
import { getReputation } from "@/lib/reputation";
import { getCurrentUser } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { MemberBadges } from "@/components/member-card";
import { ListingGrid, cardSelect } from "@/components/listing-card";
import { Avatar } from "@/components/avatar";

export async function generateMetadata({ params }: PageProps<"/u/[id]">) {
  const { id } = await params;
  const u = await db.user.findUnique({ where: { id }, select: { name: true } });
  return { title: u?.name ?? "Member" };
}

export default async function ProfilePage({ params }: PageProps<"/u/[id]">) {
  const { id } = await params;
  const [rep, viewer] = await Promise.all([getReputation(id), getCurrentUser()]);
  if (!rep) notFound();
  const [reviews, listings] = await Promise.all([
    db.review.findMany({ where: { revieweeId: id }, include: { reviewer: { select: { name: true, image: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.listing.findMany({ where: { sellerId: id, status: "LIVE", endsAt: { gt: new Date() } }, select: cardSelect, orderBy: { endsAt: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-6 py-8 md:py-12">
      <div className="card p-6 md:p-8 flex flex-col sm:flex-row gap-6 sm:items-center">
        <Avatar name={rep.user.name} image={rep.user.image} size={88} />
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl">{rep.user.name ?? "Member"}</h1>
          <p className="mt-1 text-sm text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
            {rep.user.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" aria-hidden /> {rep.user.city}</span>}
            <span>Member since {formatDate(rep.user.createdAt)}</span>
          </p>
          <div className="mt-3"><MemberBadges rep={rep} /></div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl bg-paper px-5 py-3">
            <dt className="text-xs text-muted">Rating</dt>
            <dd className="text-xl font-bold flex items-center justify-center gap-1">
              {rep.ratingAvg ? <><Star className="w-4 h-4 fill-gold text-gold" aria-hidden />{rep.ratingAvg}</> : "—"}
            </dd>
          </div>
          <div className="rounded-2xl bg-paper px-5 py-3">
            <dt className="text-xs text-muted">Deals</dt>
            <dd className="text-xl font-bold">{rep.dealsCompleted}</dd>
          </div>
        </dl>
      </div>

      {listings.length > 0 && (
        <section className="mt-12">
          <h2 className="section-title">Live now</h2>
          <div className="mt-5"><ListingGrid items={listings} /></div>
        </section>
      )}

      <section className="mt-12 max-w-3xl">
        <h2 className="section-title">What people say</h2>
        <ul className="mt-5 space-y-3">
          {reviews.length === 0 && <li className="text-muted text-sm">No ratings yet.</li>}
          {reviews.map((r) => (
            <li key={r.id} className="card !shadow-none p-4 flex gap-3">
              <Avatar name={r.reviewer.name} image={r.reviewer.image} size={36} />
              <div>
                <p className="text-sm">
                  <span className="text-gold" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></span>
                  <span className="text-muted"> · {r.reviewer.name ?? "Member"}, {formatDate(r.createdAt)}</span>
                </p>
                {r.comment && <p className="mt-1 text-[0.95rem]">{r.comment}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {viewer && viewer.id !== id && (
        <Link href={`/support/new?againstId=${id}`} className="mt-10 inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink">
          <Flag className="w-3.5 h-3.5" aria-hidden /> Report this member
        </Link>
      )}
    </div>
  );
}
