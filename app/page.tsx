import Link from "next/link";
import { ArrowRight, BadgeCheck, Gavel, HeartHandshake, Ruler, Search, ShieldCheck, Timer } from "lucide-react";
import { db } from "@/lib/db";
import { settleDue } from "@/lib/auction";
import { CATEGORIES } from "@/lib/catalog";
import { formatINR } from "@/lib/format";
import { ListingCard, cardSelect, type CardListing } from "@/components/listing-card";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function Row({ title, eyebrow, href, items }: { title: string; eyebrow: string; href: string; items: CardListing[] }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 md:px-6 mt-16">
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="section-title mt-1">{title}</h2>
        </div>
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:gap-2 transition-all">
          See all <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
      </div>
      <div className="-mx-4 px-4 md:mx-0 md:px-0 flex md:grid md:grid-cols-4 gap-4 md:gap-6 overflow-x-auto no-scrollbar snap-x">
        {items.map((l) => (
          <div key={l.id} className="w-[44vw] sm:w-[30vw] md:w-auto shrink-0 snap-start">
            <ListingCard l={l} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function Home() {
  await settleDue();
  const live = { status: "LIVE" as const, endsAt: { gt: new Date() } };
  const [user, curated, endingSoon, fresh, finds, liveCount, memberCount] = await Promise.all([
    getCurrentUser(),
    db.listing.findMany({ where: { ...live, curated: true }, select: cardSelect, orderBy: { endsAt: "asc" }, take: 4 }),
    db.listing.findMany({ where: live, select: cardSelect, orderBy: { endsAt: "asc" }, take: 4 }),
    db.listing.findMany({ where: live, select: cardSelect, orderBy: { createdAt: "desc" }, take: 8 }),
    db.listing.findMany({ where: { ...live, currentPrice: { lt: 1000 } }, select: cardSelect, orderBy: { endsAt: "asc" }, take: 4 }),
    db.listing.count({ where: live }),
    db.user.count({ where: { aadhaarVerifiedAt: { not: null } } }),
  ]);
  const showcase = (curated.length ? curated : fresh).slice(0, 3);
  const firstName = user?.name?.split(" ")[0];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blush via-paper to-paper">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gold-soft/60 blur-3xl" aria-hidden />
        <div className="absolute top-40 -left-24 w-80 h-80 rounded-full bg-brand-soft/70 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 md:px-6 pt-10 pb-14 md:pt-20 md:pb-24 grid md:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <div className="fade-in min-w-0">
            <p className="inline-flex items-center gap-2 badge badge-brand !py-1 !px-3">
              <BadgeCheck className="w-3.5 h-3.5" aria-hidden /> Every trader is verified
            </p>
            <h1 className="mt-5 text-[2.6rem] leading-[1.05] md:text-6xl md:leading-[1.02]">
              {firstName ? <>Hey {firstName}, find your next <em className="text-gold not-italic serif italic">favourite piece</em>.</> : <>Pre-loved pieces, <em className="text-gold">fairly</em> won.</>}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-ink-soft leading-relaxed">
              Bid on fashion, sneakers and more from real people across India. Honest sizes, fair auctions, and a team that has your back.
            </p>
            <form action="/browse" className="mt-7 flex gap-2 max-w-lg">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
                <input name="q" placeholder="Try “Nike Dunk” or “denim jacket”" className="input !rounded-full !pl-12 !min-h-13 shadow-soft" aria-label="Search Cloro" />
              </div>
              <button className="btn btn-primary !min-h-13 !px-6">Search</button>
            </form>
            <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
              {CATEGORIES.filter((c) => c.id !== "other").map((c) => (
                <Link key={c.id} href={`/browse?category=${c.id}`} className="chip">
                  <span aria-hidden>{c.emoji}</span> {c.label}
                </Link>
              ))}
            </div>
          </div>

          {showcase.length > 0 && (
            <div className="relative hidden md:block h-[30rem]" aria-hidden>
              {showcase.map((l, i) => (
                <Link
                  key={l.id}
                  href={`/listings/${l.id}`}
                  tabIndex={-1}
                  className={`absolute rounded-3xl overflow-hidden shadow-lift bg-ivory transition-transform hover:-translate-y-1 ${
                    ["left-0 top-8 w-60 h-80 -rotate-3", "left-44 top-0 w-64 h-[22rem] rotate-2 z-10", "right-0 top-36 w-52 h-72 -rotate-1"][i]
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.images[0]?.url} alt="" className="w-full h-full object-cover" />
                </Link>
              ))}
              <div className="absolute left-10 bottom-4 z-20 card px-4 py-3 flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-brand-soft text-brand flex items-center justify-center"><Gavel className="w-4 h-4" /></span>
                <div>
                  <p className="text-xs text-muted">Live now</p>
                  <p className="font-bold">{formatINR(showcase[0].currentPrice)} · {showcase[0].title.slice(0, 22)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-6xl px-4 md:px-6">
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            [ShieldCheck, "Verified members", "Aadhaar-checked. One person, one account."],
            [Ruler, "True sizing", "Real measurements on every listing."],
            [Timer, "Fair auctions", "Late bids add time — no sniping."],
            [HeartHandshake, "Real support", "Humans who help when things go wrong."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <li key={t as string} className="card !shadow-none p-3 md:p-5 flex flex-col md:flex-row gap-2 md:gap-3 items-start">
                <span className="w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-xl bg-brand-soft text-brand flex items-center justify-center"><I className="w-5 h-5" aria-hidden /></span>
                <div>
                  <p className="font-semibold text-sm md:text-base">{t as string}</p>
                  <p className="text-xs md:text-sm text-muted mt-0.5 leading-snug">{d as string}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <Row title="Ending soon" eyebrow="Last chance to bid" href="/browse?sort=ending" items={endingSoon} />
      <Row title="Cloro Curated" eyebrow="Handpicked by our team" href="/browse?curated=1" items={curated} />

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 md:px-6 mt-20">
        <div className="rounded-3xl bg-ivory px-6 py-10 md:px-12 md:py-14">
          <p className="eyebrow">How it works</p>
          <h2 className="section-title mt-1">Simple, fair and safe</h2>
          <ol className="mt-8 grid md:grid-cols-3 gap-8">
            {[
              ["Find it & bid", "Browse pieces with honest sizes and real photos. Ask the seller anything in public Q&A."],
              ["Win it", "Highest bid when the timer ends wins. Chat with the seller to arrange a meetup or a video call."],
              ["Get it & rate", "Meet in a safe public place or get it shipped. Both of you confirm and leave a rating."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="serif text-2xl w-11 h-11 shrink-0 rounded-full bg-white border border-line flex items-center justify-center text-gold">{i + 1}</span>
                <div>
                  <p className="font-semibold text-lg">{t}</p>
                  <p className="text-sm text-muted mt-1 leading-relaxed">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Row title="Fresh drops" eyebrow="Just listed" href="/browse?sort=new" items={fresh.slice(0, 4)} />
      <Row title="Under ₹1,000" eyebrow="Small treasures" href="/browse?max=999" items={finds} />

      {liveCount === 0 && (
        <section className="mx-auto max-w-2xl px-6 mt-20 text-center">
          <p className="text-5xl" aria-hidden>🛍️</p>
          <h2 className="section-title mt-4">The first pieces are on their way</h2>
          <p className="mt-3 text-muted">Be one of the first to list — it&apos;s free for members under 24.</p>
          <Link href="/listings/new" className="btn btn-primary mt-8">List an item</Link>
        </section>
      )}

      {/* Sell CTA */}
      <section className="mx-auto max-w-6xl px-4 md:px-6 mt-20">
        <div className="relative overflow-hidden rounded-3xl bg-brand text-white px-6 py-12 md:px-14 md:py-16 grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
          <div className="absolute -right-16 -bottom-24 w-80 h-80 rounded-full bg-gold/30 blur-3xl" aria-hidden />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl leading-tight">Loved it once? Let someone love it again.</h2>
            <p className="mt-4 text-white/75 max-w-md">List in two minutes. Free for members under 24 — and every buyer is verified, so no time-wasters.</p>
          </div>
          <div className="relative flex flex-col sm:flex-row md:flex-col gap-3 md:items-end">
            <Link href="/listings/new" className="btn btn-gold">Start selling</Link>
            <p className="text-sm text-white/70">{memberCount.toLocaleString("en-IN")} verified members and counting</p>
          </div>
        </div>
      </section>
    </div>
  );
}
