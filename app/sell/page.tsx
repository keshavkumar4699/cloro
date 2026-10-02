import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Camera, Gavel, HandCoins, MessageCircle, ShieldCheck, TrendingUp } from "lucide-react";
import { CATEGORIES } from "@/lib/catalog";
import { CATEGORY_SEO } from "@/lib/category-seo";
import { faqLd } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/reveal";

const TITLE = "Sell Your Old Stuff Online for the Right Price — Free Auctions | Cloro";
const DESCRIPTION =
  "Sell old clothes, sneakers, bags, watches and gadgets online in India. Buyers bid, so you get the real market price — often more than a fixed price. Free for under-24s.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/sell" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/sell" },
};

const FAQS: [string, string][] = [
  [
    "Why sell by auction instead of a fixed price?",
    "With a fixed price you have to guess — too high and nobody buys, too low and you lose money. In an auction, interested buyers bid against each other, so the item sells for what it's actually worth to them. Popular items often go above what you'd have asked.",
  ],
  ["How much does it cost to sell?", "Listing is free for members under 24. Members aged 24–30 get their first listing free, then a small monthly listing pass. Cloro takes no commission on sales."],
  ["What if bids don't reach the price I want?", "Set a hidden reserve price. If bidding ends below it, you don't have to sell — or you can still choose to sell to the top bidder."],
  ["How do I get paid?", "The buyer pays you directly by UPI or cash — at a safe meetup, or after a video call for shipped items. Never accept a QR code that asks you to 'receive' money."],
  ["Who can sell on Cloro?", "Anyone aged 13 to 30 who verifies once with Aadhaar. Members under 18 need a parent or guardian to approve their account."],
];

const STEPS = [
  [Camera, "Snap & describe", "Take 2–6 photos, add the size and real measurements. Takes about two minutes."],
  [Gavel, "Buyers bid", "Set a starting bid and how long the auction runs. Verified members bid against each other."],
  [MessageCircle, "Chat with the top 3", "Answer questions publicly and chat with your top bidders to set up a video call or meetup."],
  [HandCoins, "Get paid & rate", "Hand it over safely, get paid by UPI or cash, and rate each other."],
] as const;

export default function SellPage() {
  return (
    <div>
      <JsonLd data={faqLd(FAQS)} />
      <section className="relative overflow-hidden bg-gradient-to-b from-blush via-paper to-paper">
        <div className="blob blob-gold absolute -top-24 -right-16 w-96 h-96" aria-hidden />
        <div className="blob blob-brand absolute top-40 -left-24 w-80 h-80" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-4 md:px-6 pt-12 pb-16 md:pt-20 md:pb-24 text-center">
          <p className="badge badge-brand !py-1 !px-3 mx-auto"><TrendingUp className="w-3.5 h-3.5" aria-hidden /> Let buyers decide the price</p>
          <h1 className="mt-5 text-[2.6rem] leading-[1.05] md:text-7xl">
            Sell your old stuff for <span className="text-shimmer">what it&apos;s really worth</span>
          </h1>
          <p className="mt-6 text-lg text-ink-soft max-w-2xl mx-auto leading-relaxed">
            Stop guessing prices and dealing with lowball offers. On Cloro, verified buyers bid against each other — so your clothes, sneakers
            and gadgets sell at the right price, often higher than you&apos;d ask.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/listings/new" className="btn btn-primary !px-7 btn-glow">Start selling — it&apos;s free <ArrowRight className="w-4 h-4" aria-hidden /></Link>
            <Link href="/browse" className="btn btn-ghost">See what&apos;s selling</Link>
          </div>
          <p className="mt-4 text-sm text-muted">Free for under-24s · No commission · Aadhaar-verified buyers</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 md:px-6 mt-4">
        <h2 className="section-title text-center">How selling works</h2>
        <ol className="mt-8 grid md:grid-cols-4 gap-4">
          {STEPS.map(([Icon, t, d], i) => (
            <Reveal key={t} delay={i * 80} as="li" className="card p-6 h-full hover-lift">
                <span className="w-11 h-11 rounded-2xl bg-brand-soft text-brand flex items-center justify-center"><Icon className="w-5 h-5" aria-hidden /></span>
                <p className="mt-4 text-xs font-bold text-gold-dark">STEP {i + 1}</p>
                <p className="font-semibold text-lg">{t}</p>
                <p className="text-sm text-muted mt-1 leading-relaxed">{d}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-4 md:px-6 mt-20">
        <Reveal>
          <div className="rounded-3xl bg-ink text-white p-8 md:p-12 grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-3xl md:text-4xl">Fixed price vs auction</h2>
              <p className="mt-3 text-white/70">Why an auction usually gets you a fairer price for used items.</p>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Fixed price", "You guess the price", "Buyers haggle you down", "Spam calls & no-shows"],
                ["Cloro auction", "Buyers set the price", "Bids only go up", "Verified buyers, in-app chat"],
              ].map(([head, ...rows], col) => (
                <div key={head} className={`rounded-2xl p-4 ${col ? "bg-white/10 ring-1 ring-gold/50" : "bg-white/5"}`}>
                  <dt className={`font-bold ${col ? "text-gold-soft" : "text-white/60"}`}>{head}</dt>
                  {rows.map((r) => <dd key={r} className={`mt-2 ${col ? "" : "text-white/60"}`}>{col ? "✓ " : "✗ "}{r}</dd>)}
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-4 md:px-6 mt-20">
        <h2 className="section-title">What can I sell?</h2>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {CATEGORY_SEO.map((c, i) => {
            const cat = CATEGORIES.find((x) => x.id === c.categoryId)!;
            return (
              <Reveal key={c.slug} delay={i * 50}>
                <Link href={`/c/${c.slug}`} className="card !shadow-none p-5 flex items-center gap-3 hover-lift">
                  <span className="text-3xl" aria-hidden>{cat.emoji}</span>
                  <span className="font-semibold">Sell {cat.label.toLowerCase()}</span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 md:px-6 mt-20">
        <h2 className="section-title">Selling questions</h2>
        <div className="mt-6 space-y-3">
          {FAQS.map(([q, a]) => (
            <details key={q} className="card !shadow-none px-5 py-4">
              <summary className="cursor-pointer font-semibold">{q}</summary>
              <p className="mt-2 text-muted leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 rounded-3xl bg-brand-soft p-6 md:p-8 flex flex-col md:flex-row gap-5 items-center">
          <ShieldCheck className="w-10 h-10 text-brand shrink-0" aria-hidden />
          <p className="flex-1 text-brand-dark">
            Every buyer is <strong>Aadhaar-verified</strong>, chats stay on Cloro, and our support team steps in if anything goes wrong.
          </p>
          <Link href="/listings/new" className="btn btn-primary"><BadgeCheck className="w-4 h-4" aria-hidden /> List an item</Link>
        </div>
      </section>
    </div>
  );
}
