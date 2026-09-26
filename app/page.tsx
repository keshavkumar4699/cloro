import Link from "next/link";
import { db } from "@/lib/db";
import { settleDue } from "@/lib/auction";
import { CATEGORIES, FEATURED_CATEGORIES } from "@/lib/catalog";
import { ListingCard } from "@/components/listing-card";

export const dynamic = "force-dynamic";

const cardSelect = {
  id: true,
  title: true,
  brand: true,
  size: true,
  sizeSystem: true,
  currentPrice: true,
  bidCount: true,
  endsAt: true,
  status: true,
  city: true,
  images: { select: { url: true }, orderBy: { position: "asc" as const }, take: 1 },
};

function Row({ title, eyebrow, href, items }: { title: string; eyebrow: string; href: string; items: Parameters<typeof ListingCard>[0]["l"][] }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-6 mt-20">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="text-4xl mt-2">{title}</h2>
        </div>
        <Link href={href} className="text-xs tracking-[0.18em] uppercase link">View all</Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
        {items.map((l) => <ListingCard key={l.id} l={l} />)}
      </div>
    </section>
  );
}

export default async function Home() {
  await settleDue();
  const live = { status: "LIVE" as const, endsAt: { gt: new Date() } };
  const [curated, endingSoon, fresh, finds] = await Promise.all([
    db.listing.findMany({ where: { ...live, curated: true }, select: cardSelect, orderBy: { endsAt: "asc" }, take: 4 }),
    db.listing.findMany({ where: live, select: cardSelect, orderBy: { endsAt: "asc" }, take: 4 }),
    db.listing.findMany({ where: live, select: cardSelect, orderBy: { createdAt: "desc" }, take: 8 }),
    db.listing.findMany({ where: { ...live, currentPrice: { lt: 1000 } }, select: cardSelect, orderBy: { endsAt: "asc" }, take: 4 }),
  ]);

  return (
    <div>
      <section className="bg-ink text-ivory">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div className="fade-in">
            <p className="eyebrow !text-gold-soft">The members&apos; auction house</p>
            <h1 className="text-5xl md:text-7xl leading-[1.05] mt-6">
              Pre-loved pieces,
              <br />
              <em className="text-gold-soft">honestly</em> auctioned.
            </h1>
            <p className="mt-8 max-w-md text-ivory/70 leading-relaxed">
              Cloro is built for Gen Z. Every trader is Aadhaar-verified, every listing states its true size, and every deal is
              between real people you can rate.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/browse" className="btn btn-gold">Explore lots</Link>
              <Link href="/listings/new" className="btn border-ivory/50 text-ivory hover:bg-ivory hover:text-ink">List an item</Link>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-px bg-ivory/10 text-sm">
            {[
              ["Verified members", "Aadhaar-verified traders only. One person, one account."],
              ["True sizing", "Size and real measurements on every listing."],
              ["Fair auctions", "Late bids extend the clock. No sniping."],
              ["Real support", "Human help when a deal goes wrong."],
            ].map(([t, d]) => (
              <li key={t} className="bg-ink p-6">
                <p className="serif text-2xl text-gold-soft">{t}</p>
                <p className="mt-2 text-ivory/60 leading-relaxed">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Row title="Cloro Curated" eyebrow="Handpicked" href="/browse?curated=1" items={curated} />
      <Row title="Ending soon" eyebrow="Last chance" href="/browse?sort=ending" items={endingSoon} />

      <section className="mx-auto max-w-6xl px-6 mt-20">
        <p className="eyebrow">Collections</p>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-px bg-line border border-line">
          {FEATURED_CATEGORIES.map((id) => (
            <Link key={id} href={`/browse?category=${id}`} className="bg-paper hover:bg-ivory p-8 text-center serif text-2xl transition-colors">
              {CATEGORIES.find((c) => c.id === id)!.label}
            </Link>
          ))}
        </div>
      </section>

      <Row title="New arrivals" eyebrow="Just listed" href="/browse?sort=new" items={fresh} />
      <Row title="Under ₹1,000 finds" eyebrow="Small treasures" href="/browse?max=999" items={finds} />

      {!endingSoon.length && (
        <section className="mx-auto max-w-2xl px-6 mt-24 text-center">
          <h2 className="text-4xl">The first lots are on their way</h2>
          <p className="mt-4 text-muted">Be one of the first to list — members under 24 list for free.</p>
          <Link href="/listings/new" className="btn btn-primary mt-8">List an item</Link>
        </section>
      )}
    </div>
  );
}
