import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Camera, Gavel, HandCoins, HeartHandshake, Ruler, Search, ShieldCheck, Timer } from "lucide-react";
import { db } from "@/lib/db";
import { settleDue } from "@/lib/auction";
import { CATEGORIES } from "@/lib/catalog";
import { CATEGORY_SEO, slugForCategory } from "@/lib/category-seo";
import { formatINR } from "@/lib/format";
import { organizationLd, websiteLd } from "@/lib/seo";
import { getCurrentUser } from "@/lib/session";
import { watchedSet } from "@/lib/watch";
import { JsonLd } from "@/components/json-ld";
import { ListingCard, cardSelect, type CardListing } from "@/components/listing-card";
import { Reveal } from "@/components/reveal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: "/" } };

function Row({ title, eyebrow, href, items, watched }: { title: string; eyebrow: string; href: string; items: CardListing[]; watched: Set<string> }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 md:px-6 mt-16">
      <Reveal>
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="section-title mt-1">{title}</h2>
          </div>
          <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:gap-2 transition-all">
            See all <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      </Reveal>
      <div className="-mx-4 px-4 md:mx-0 md:px-0 flex md:grid md:grid-cols-4 gap-4 md:gap-6 overflow-x-auto no-scrollbar snap-x">
        {items.map((l) => (
          <div key={l.id} className="w-[44vw] sm:w-[30vw] md:w-auto shrink-0 snap-start">
            <ListingCard l={l} watched={watched.has(l.id)} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ago(d: Date) {
  const m = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000));
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
}

const RIBBON = ["Sneakers", "Y2K", "Streetwear", "Vintage denim", "Watches", "Thrifted", "Bags", "Headphones", "Hoodies", "Pre-loved", "Sunglasses", "Oversized tees"];

export default async function Home() {
  await settleDue();
  const live = { status: "LIVE" as const, endsAt: { gt: new Date() } };
  const [user, curated, endingSoon, fresh, finds, trending, recentBids, liveCount, memberCount] = await Promise.all([
    getCurrentUser(),
    db.listing.findMany({ where: { ...live, curated: true }, select: cardSelect, orderBy: { endsAt: "asc" }, take: 4 }),
    db.listing.findMany({ where: live, select: cardSelect, orderBy: { endsAt: "asc" }, take: 4 }),
    db.listing.findMany({ where: live, select: cardSelect, orderBy: { createdAt: "desc" }, take: 8 }),
    db.listing.findMany({ where: { ...live, currentPrice: { lt: 1000 } }, select: cardSelect, orderBy: { endsAt: "asc" }, take: 4 }),
    db.listing.findMany({ where: { ...live, bidCount: { gt: 0 } }, select: cardSelect, orderBy: [{ bidCount: "desc" }, { endsAt: "asc" }], take: 4 }),
    db.bid.findMany({
      where: { listing: live },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, amount: true, createdAt: true, listing: { select: { id: true, title: true } } },
    }),
    db.listing.count({ where: live }),
    db.user.count({ where: { aadhaarVerifiedAt: { not: null }, deletedAt: null } }),
  ]);
  const all = [...curated, ...endingSoon, ...fresh, ...finds, ...trending];
  const watched = await watchedSet(user?.id, [...new Set(all.map((l) => l.id))]);
  const showcase = (curated.length ? curated : fresh).slice(0, 3);
  const firstName = user?.name?.split(" ")[0];

  return (
    <div>
      <JsonLd data={[websiteLd, organizationLd]} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blush via-paper to-paper">
        <div className="blob blob-gold absolute -top-24 -right-24 w-[28rem] h-[28rem]" aria-hidden />
        <div className="blob blob-brand absolute top-48 -left-28 w-96 h-96" aria-hidden />
        <div className="blob blob-pink absolute -bottom-32 right-1/3 w-80 h-80" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 md:px-6 pt-10 pb-14 md:pt-20 md:pb-24 grid md:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <div className="fade-in min-w-0">
            <p className="inline-flex items-center gap-2 badge badge-brand !py-1 !px-3">
              <span className="live-dot" aria-hidden /> {liveCount > 0 ? `${liveCount} live auction${liveCount === 1 ? "" : "s"} right now` : "Every trader is verified"}
            </p>
            <h1 className="mt-5 text-[2.6rem] leading-[1.03] md:text-[4.2rem] md:leading-[1]">
              {firstName ? (
                <>Hey {firstName}, <span className="text-shimmer">bid</span> on your next favourite piece.</>
              ) : (
                <>Sell your old stuff at the <span className="text-shimmer">right price</span>. Bid on pre-loved finds.</>
              )}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-ink-soft leading-relaxed">
              India&apos;s online auction marketplace for Gen Z. Fashion, sneakers, bags and gadgets from verified people — honest sizes,
              fair auctions, zero spam calls.
            </p>
            <form action="/browse" className="mt-7 flex gap-2 max-w-lg" role="search">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
                <input name="q" placeholder="Try “Nike Dunk” or “denim jacket”" className="input !rounded-full !pl-12 !min-h-13 shadow-soft" aria-label="Search Cloro" />
              </div>
              <button className="btn btn-primary !min-h-13 !px-6">Search</button>
            </form>
            <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
              {CATEGORIES.filter((c) => c.id !== "other").map((c) => (
                <Link key={c.id} href={`/c/${slugForCategory(c.id)}`} className="chip group/chip">
                  <span aria-hidden className="inline-block transition-transform group-hover/chip:scale-125 group-hover/chip:-rotate-12">{c.emoji}</span> {c.label}
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
                  style={{ animationDelay: `${i * -2}s` }}
                  className={`float-slow absolute rounded-3xl overflow-hidden shadow-lift bg-ivory ring-4 ring-white ${
                    ["left-0 top-8 w-60 h-80", "left-44 top-0 w-64 h-[22rem] z-10", "right-0 top-36 w-52 h-72"][i]
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.images[0]?.url} alt="" className="w-full h-full object-cover" />
                </Link>
              ))}
              <div className="absolute left-6 bottom-2 z-20 card px-4 py-3 flex items-center gap-3 fade-in" style={{ animationDelay: "0.4s" }}>
                <span className="w-9 h-9 rounded-full bg-brand-soft text-brand flex items-center justify-center"><Gavel className="w-4 h-4" /></span>
                <div>
                  <p className="text-xs text-muted flex items-center gap-1.5"><span className="live-dot" /> Live now</p>
                  <p className="font-bold">{formatINR(showcase[0].currentPrice)} · {showcase[0].title.slice(0, 22)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Ribbon */}
      <div className="border-y border-line bg-ink text-white overflow-hidden py-3" aria-hidden>
        <div className="marquee gap-8 text-sm font-semibold tracking-wide">
          {[...RIBBON, ...RIBBON].map((t, i) => (
            <span key={i} className="flex items-center gap-8 whitespace-nowrap">
              {t} <span className="text-gold">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* Live bids ticker */}
      {recentBids.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 md:px-6 mt-8" aria-label="Latest bids">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            <span className="badge !bg-[#fdecec] !text-[#b42318] shrink-0"><span className="live-dot" aria-hidden /> Live bids</span>
            {recentBids.map((b) => (
              <Link key={b.id} href={`/listings/${b.listing.id}`} className="chip !py-1.5 !text-sm shrink-0 hover-lift">
                <strong>{formatINR(b.amount)}</strong> on {b.listing.title.slice(0, 28)} <span className="text-muted">· {ago(b.createdAt)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Trust */}
      <section className="mx-auto max-w-6xl px-4 md:px-6 mt-8">
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            [ShieldCheck, "Verified members", "Aadhaar-checked. One person, one account."],
            [Ruler, "True sizing", "Real measurements on every listing."],
            [Timer, "Fair auctions", "Late bids add time — no sniping."],
            [HeartHandshake, "Real support", "Humans who help when things go wrong."],
          ].map(([Icon, t, d], i) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <Reveal key={t as string} delay={i * 70} as="li" className="card !shadow-none p-3 md:p-5 flex flex-col md:flex-row gap-2 md:gap-3 items-start h-full hover-lift">
                  <span className="w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-xl bg-brand-soft text-brand flex items-center justify-center"><I className="w-5 h-5" aria-hidden /></span>
                  <div>
                    <p className="font-semibold text-sm md:text-base">{t as string}</p>
                    <p className="text-xs md:text-sm text-muted mt-0.5 leading-snug">{d as string}</p>
                  </div>
              </Reveal>
            );
          })}
        </ul>
      </section>

      <Row title="Trending 🔥" eyebrow="Most bids right now" href="/browse?sort=ending" items={trending} watched={watched} />
      <Row title="Ending soon" eyebrow="Last chance to bid" href="/browse?sort=ending" items={endingSoon} watched={watched} />
      <Row title="Cloro Curated" eyebrow="Handpicked by our team" href="/browse?curated=1" items={curated} watched={watched} />

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 md:px-6 mt-20">
        <Reveal>
          <h2 className="section-title">Shop by vibe</h2>
        </Reveal>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {CATEGORY_SEO.map((c, i) => {
            const cat = CATEGORIES.find((x) => x.id === c.categoryId)!;
            return (
              <Reveal key={c.slug} delay={i * 50}>
                <Link
                  href={`/c/${c.slug}`}
                  className="group/cat card !shadow-none p-5 flex items-center gap-3 hover-lift bg-gradient-to-br from-white to-ivory/60"
                >
                  <span className="text-3xl transition-transform duration-300 group-hover/cat:scale-125 group-hover/cat:rotate-6" aria-hidden>{cat.emoji}</span>
                  <span className="font-semibold">{cat.label}</span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 md:px-6 mt-20">
        <Reveal>
          <div className="rounded-3xl bg-ivory px-6 py-10 md:px-12 md:py-14">
            <p className="eyebrow">How it works</p>
            <h2 className="section-title mt-1">Simple, fair and safe</h2>
            <ol className="mt-8 grid md:grid-cols-3 gap-8">
              {[
                [Camera, "List or find it", "Snap a few photos and add the size — or browse pieces with honest measurements. Ask anything in public Q&A."],
                [Gavel, "Bid & win", "Highest bid when the timer ends wins. Chat with the seller to set up a meetup or a video call."],
                [HandCoins, "Swap & rate", "Meet somewhere safe or get it shipped, pay the seller directly, then rate each other."],
              ].map(([Icon, t, d], i) => {
                const I = Icon as typeof Camera;
                return (
                  <li key={t as string} className="flex gap-4">
                    <span className="relative w-12 h-12 shrink-0 rounded-2xl bg-white border border-line flex items-center justify-center text-brand">
                      <I className="w-5 h-5" aria-hidden />
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gold text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    </span>
                    <div>
                      <p className="font-semibold text-lg">{t as string}</p>
                      <p className="text-sm text-muted mt-1 leading-relaxed">{d as string}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </Reveal>
      </section>

      <Row title="Fresh drops" eyebrow="Just listed" href="/browse?sort=new" items={fresh.slice(0, 4)} watched={watched} />
      <Row title="Under ₹1,000" eyebrow="Small treasures" href="/browse?max=999" items={finds} watched={watched} />

      {liveCount === 0 && (
        <section className="mx-auto max-w-2xl px-6 mt-20 text-center">
          <p className="text-5xl float-slow inline-block" aria-hidden>🛍️</p>
          <h2 className="section-title mt-4">The first pieces are on their way</h2>
          <p className="mt-3 text-muted">Be one of the first to list — it&apos;s free for members under 24.</p>
          <Link href="/listings/new" className="btn btn-primary mt-8">List an item</Link>
        </section>
      )}

      {/* Sell CTA */}
      <section className="mx-auto max-w-6xl px-4 md:px-6 mt-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-brand text-white px-6 py-12 md:px-14 md:py-16 grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
            <div className="blob blob-gold absolute -right-16 -bottom-24 w-80 h-80 !opacity-40" aria-hidden />
            <div className="relative">
              <h2 className="text-3xl md:text-5xl leading-tight">Loved it once? Let someone love it again.</h2>
              <p className="mt-4 text-white/75 max-w-md">List in two minutes and let buyers bid it up to the right price. Free for members under 24 — and every buyer is verified.</p>
            </div>
            <div className="relative flex flex-col sm:flex-row md:flex-col gap-3 md:items-end">
              <Link href="/sell" className="btn btn-gold btn-glow">Start selling <ArrowRight className="w-4 h-4" aria-hidden /></Link>
              <p className="text-sm text-white/70 flex items-center gap-1.5"><BadgeCheck className="w-4 h-4" aria-hidden /> {memberCount.toLocaleString("en-IN")} verified members</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Search-friendly copy */}
      <section className="mx-auto max-w-4xl px-4 md:px-6 mt-20 text-sm text-muted leading-relaxed">
        <h2 className="font-sans text-base font-bold text-ink tracking-normal">Sell old stuff online in India — the fair way</h2>
        <p className="mt-3">
          Cloro is an online auction website where you can sell your used clothes, second-hand sneakers, bags, watches and gadgets for the right
          price. Instead of guessing a fixed price or haggling with strangers, you set a starting bid and verified buyers bid against each other —
          so your item sells for what it&apos;s really worth, often more than a fixed price would get. Buyers find pre-loved fashion and thrift
          finds with real measurements, from members across India.
        </p>
        <p className="mt-3">
          Popular right now: <Link href="/c/sneakers" className="link">sell sneakers online</Link>, <Link href="/c/clothes" className="link">sell old clothes</Link>,{" "}
          <Link href="/c/streetwear" className="link">streetwear auctions</Link>, <Link href="/c/watches" className="link">pre-owned watches</Link>,{" "}
          <Link href="/c/gadgets" className="link">sell used gadgets</Link> and <Link href="/c/bags" className="link">pre-loved bags</Link>.
        </p>
      </section>
    </div>
  );
}
