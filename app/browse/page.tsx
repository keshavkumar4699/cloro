import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { db } from "@/lib/db";
import { settleDue } from "@/lib/auction";
import { CATEGORIES, CONDITIONS, categoryLabel } from "@/lib/catalog";
import { ListingGrid, cardSelect } from "@/components/listing-card";
import { getCurrentUser } from "@/lib/session";
import { watchedSet } from "@/lib/watch";

export async function generateMetadata({ searchParams }: PageProps<"/browse">): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = Object.values(sp).some((v) => typeof v === "string" && v !== "");
  return {
    title: "Explore live auctions — bid on pre-loved fashion, sneakers & gadgets",
    description: "Browse live online auctions across India. Bid on pre-loved clothes, sneakers, bags, watches and gadgets from verified sellers, with real sizes and measurements.",
    alternates: { canonical: "/browse" },
    // Filtered and searched views are near-duplicates; keep them out of the index but let crawlers follow the items.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}
export const dynamic = "force-dynamic";

const PAGE = 24;
const SORTS = [
  ["ending", "Ending soon"],
  ["new", "Newest"],
  ["price_asc", "Price ↑"],
  ["price_desc", "Price ↓"],
] as const;

export default async function BrowsePage({ searchParams }: PageProps<"/browse">) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim().slice(0, 100) : "");
  const num = (k: string) => {
    const n = Number(str(k));
    return str(k) && Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
  };

  await settleDue();

  const where: Prisma.ListingWhereInput = { status: "LIVE", endsAt: { gt: new Date() } };
  const q = str("q");
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  const category = CATEGORIES.some((c) => c.id === str("category")) ? str("category") : "";
  if (category) where.category = category;
  if (CONDITIONS.some((c) => c.id === str("condition"))) where.condition = str("condition");
  if (str("size")) where.size = { contains: str("size"), mode: "insensitive" };
  if (str("city")) where.city = { contains: str("city"), mode: "insensitive" };
  if (str("meetup") === "1") where.meetupPossible = true;
  if (str("curated") === "1") where.curated = true;
  let min = num("min");
  let max = num("max");
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
  if (min !== undefined || max !== undefined) where.currentPrice = { gte: min, lte: max };

  const sort = SORTS.some(([s]) => s === str("sort")) ? str("sort") : "ending";
  const orderBy: Prisma.ListingOrderByWithRelationInput =
    sort === "new" ? { createdAt: "desc" } : sort === "price_asc" ? { currentPrice: "asc" } : sort === "price_desc" ? { currentPrice: "desc" } : { endsAt: "asc" };
  const page = Math.max(1, Math.min(num("page") ?? 1, 500));

  const [items, total] = await Promise.all([
    db.listing.findMany({ where, orderBy, skip: (page - 1) * PAGE, take: PAGE, select: cardSelect }),
    db.listing.count({ where }),
  ]);

  const user = await getCurrentUser();
  const watched = await watchedSet(user?.id, items.map((i) => i.id));

  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "page") p.set(k, v);
    for (const [k, v] of Object.entries(over)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return `/browse${s ? `?${s}` : ""}`;
  };
  const activeFilters = ["condition", "size", "city", "min", "max", "meetup", "curated"].filter((k) => str(k)).length;
  const heading = q ? `Results for “${q}”` : category ? categoryLabel(category) : str("curated") === "1" ? "Cloro Curated" : "Explore";

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-12">
      <h1 className="text-4xl md:text-5xl">{heading}</h1>

      <form action="/browse" className="mt-6 flex gap-2">
        {category && <input type="hidden" name="category" value={category} />}
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Search brand, item, style…" className="input !rounded-full !pl-12" aria-label="Search" />
        </div>
        <button className="btn btn-primary">Search</button>
      </form>

      <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        <Link href={href({ category: undefined })} className={`chip ${!category ? "chip-active" : ""}`}>All</Link>
        {CATEGORIES.map((c) => (
          <Link key={c.id} href={href({ category: c.id })} className={`chip ${category === c.id ? "chip-active" : ""}`}>
            <span aria-hidden>{c.emoji}</span> {c.label}
          </Link>
        ))}
      </div>

      <details className="mt-4 card !shadow-none" open={activeFilters > 0}>
        <summary className="list-none cursor-pointer px-5 py-3.5 flex items-center gap-2 font-semibold text-sm">
          <SlidersHorizontal className="w-4 h-4" aria-hidden /> Filters{activeFilters ? ` (${activeFilters})` : ""}
          {activeFilters > 0 && (
            <Link href={href({ condition: undefined, size: undefined, city: undefined, min: undefined, max: undefined, meetup: undefined, curated: undefined })} className="ml-auto text-brand font-medium">
              Clear
            </Link>
          )}
        </summary>
        <form action="/browse" className="px-5 pb-5 grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          {q && <input type="hidden" name="q" value={q} />}
          {category && <input type="hidden" name="category" value={category} />}
          <input type="hidden" name="sort" value={sort} />
          <div>
            <label className="label" htmlFor="size">Size</label>
            <input id="size" name="size" defaultValue={str("size")} placeholder="M, 9, 32…" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="condition">Condition</label>
            <select id="condition" name="condition" defaultValue={str("condition")} className="input">
              <option value="">Any</option>
              {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="min">Min ₹</label>
            <input id="min" name="min" type="number" min={0} inputMode="numeric" defaultValue={str("min")} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="max">Max ₹</label>
            <input id="max" name="max" type="number" min={0} inputMode="numeric" defaultValue={str("max")} className="input" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="label" htmlFor="city">City</label>
            <input id="city" name="city" defaultValue={str("city")} placeholder="e.g. Pune" className="input" />
          </div>
          <div className="col-span-2 md:col-span-1 flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="meetup" value="1" defaultChecked={str("meetup") === "1"} className="accent-brand w-4 h-4" /> Meetup possible</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="curated" value="1" defaultChecked={str("curated") === "1"} className="accent-brand w-4 h-4" /> Curated only</label>
          </div>
          <button className="btn btn-primary col-span-2 md:col-span-6 md:justify-self-end">Show results</button>
        </form>
      </details>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{total.toLocaleString("en-IN")} item{total === 1 ? "" : "s"}</p>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {SORTS.map(([s, label]) => (
            <Link key={s} href={href({ sort: s })} className={`chip !py-1.5 !text-sm ${sort === s ? "chip-active" : ""}`}>{label}</Link>
          ))}
        </div>
      </div>

      {items.length ? (
        <div className="mt-6">
          <ListingGrid items={items} watched={watched} />
        </div>
      ) : (
        <div className="mt-16 text-center">
          <p className="text-5xl" aria-hidden>🔍</p>
          <p className="serif text-2xl mt-4">Nothing here yet</p>
          <p className="text-muted mt-2">Try a different search, or clear some filters.</p>
          <Link href="/browse" className="btn btn-ghost mt-6">Clear everything</Link>
        </div>
      )}

      {(page > 1 || total > page * PAGE) && (
        <nav className="mt-12 flex items-center justify-center gap-3" aria-label="Pages">
          {page > 1 && <Link href={href({ page: String(page - 1) })} className="btn btn-ghost"><ChevronLeft className="w-4 h-4" /> Previous</Link>}
          <span className="text-sm text-muted">Page {page} of {Math.max(1, Math.ceil(total / PAGE))}</span>
          {total > page * PAGE && <Link href={href({ page: String(page + 1) })} className="btn btn-ghost">Next <ChevronRight className="w-4 h-4" /></Link>}
        </nav>
      )}
    </div>
  );
}
