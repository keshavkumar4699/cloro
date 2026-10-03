import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";
import { db } from "@/lib/db";
import { settleDue } from "@/lib/auction";
import { CATEGORIES } from "@/lib/catalog";
import { CATEGORY_SEO, seoForSlug } from "@/lib/category-seo";
import { breadcrumbLd, faqLd } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { ListingGrid, cardSelect } from "@/components/listing-card";
import { Reveal } from "@/components/reveal";
import { getCurrentUser } from "@/lib/session";
import { watchedSet } from "@/lib/watch";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const seo = seoForSlug((await params).slug);
  if (!seo) return {};
  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: `/c/${seo.slug}` },
    openGraph: { title: seo.title, description: seo.description, url: `/c/${seo.slug}` },
  };
}

export default async function CategoryPage({ params }: PageProps<"/c/[slug]">) {
  const seo = seoForSlug((await params).slug);
  if (!seo) notFound();
  const category = CATEGORIES.find((c) => c.id === seo.categoryId)!;
  await settleDue();
  const items = await db.listing.findMany({
    where: { category: seo.categoryId, status: "LIVE", endsAt: { gt: new Date() } },
    select: cardSelect,
    orderBy: { endsAt: "asc" },
    take: 12,
  });

  const user = await getCurrentUser();
  const watched = await watchedSet(user?.id, items.map((i) => i.id));

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-12">
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: category.label, path: `/c/${seo.slug}` }]), faqLd(seo.faqs)]} />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blush via-paper to-gold-soft/60 px-6 py-10 md:px-12 md:py-14">
        <div className="absolute -right-10 -top-10 text-[10rem] opacity-20 select-none float-slow" aria-hidden>{category.emoji}</div>
        <p className="eyebrow">{category.label}</p>
        <h1 className="mt-2 text-4xl md:text-6xl max-w-2xl">{seo.h1}</h1>
        <p className="mt-4 max-w-2xl text-ink-soft text-lg leading-relaxed">{seo.intro}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={`/browse?category=${seo.categoryId}`} className="btn btn-primary">Bid on {category.label.toLowerCase()} <ArrowRight className="w-4 h-4" aria-hidden /></Link>
          <Link href="/listings/new" className="btn btn-ghost">Sell yours</Link>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="section-title">Live {category.label.toLowerCase()} auctions</h2>
        {items.length ? (
          <div className="mt-6"><ListingGrid items={items} watched={watched} /></div>
        ) : (
          <p className="mt-4 text-muted">
            No live auctions here right now — <Link href="/listings/new" className="link">be the first to list</Link> and get the bidding started.
          </p>
        )}
      </section>

      <div className="mt-16 grid md:grid-cols-2 gap-8">
        <Reveal>
          <section className="card p-6 md:p-8 h-full">
            <h2 className="text-2xl">How to sell {category.label.toLowerCase()} for the right price</h2>
            <ul className="mt-5 space-y-3">
              {seo.tips.map((t) => (
                <li key={t} className="flex gap-3"><Check className="w-5 h-5 text-brand shrink-0 mt-0.5" aria-hidden /> {t}</li>
              ))}
              <li className="flex gap-3"><Check className="w-5 h-5 text-brand shrink-0 mt-0.5" aria-hidden /> Start the bidding a little low — auctions with early bids climb higher.</li>
            </ul>
          </section>
        </Reveal>
        <Reveal delay={100}>
          <section className="card p-6 md:p-8 h-full">
            <h2 className="text-2xl">Questions</h2>
            <div className="mt-4 space-y-3">
              {seo.faqs.map(([q, a]) => (
                <details key={q} className="border-b border-line pb-3">
                  <summary className="cursor-pointer font-semibold">{q}</summary>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </section>
        </Reveal>
      </div>

      <nav className="mt-14" aria-label="Other categories">
        <h2 className="text-xl">Explore more</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORY_SEO.filter((c) => c.slug !== seo.slug).map((c) => {
            const cat = CATEGORIES.find((x) => x.id === c.categoryId)!;
            return (
              <Link key={c.slug} href={`/c/${c.slug}`} className="chip"><span aria-hidden>{cat.emoji}</span> {cat.label}</Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
