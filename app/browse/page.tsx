import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { settleDue } from "@/lib/auction";
import { CATEGORIES, CONDITIONS } from "@/lib/catalog";
import { ListingCard } from "@/components/listing-card";

export const metadata = { title: "Browse lots" };
export const dynamic = "force-dynamic";

const PAGE = 24;

export default async function BrowsePage({ searchParams }: PageProps<"/browse">) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const num = (k: string) => {
    const n = Number(str(k));
    return str(k) && Number.isFinite(n) ? n : undefined;
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
  if (str("category")) where.category = str("category");
  if (str("condition")) where.condition = str("condition");
  if (str("size")) where.size = { equals: str("size"), mode: "insensitive" };
  if (str("city")) where.city = { contains: str("city"), mode: "insensitive" };
  if (str("meetup") === "1") where.meetupPossible = true;
  if (str("curated") === "1") where.curated = true;
  const min = num("min");
  const max = num("max");
  if (min !== undefined || max !== undefined) where.currentPrice = { gte: min, lte: max };

  const sort = str("sort") || "ending";
  const orderBy: Prisma.ListingOrderByWithRelationInput =
    sort === "new" ? { createdAt: "desc" } : sort === "price_asc" ? { currentPrice: "asc" } : sort === "price_desc" ? { currentPrice: "desc" } : { endsAt: "asc" };
  const page = Math.max(1, num("page") ?? 1);

  const [items, total] = await Promise.all([
    db.listing.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: {
        id: true, title: true, brand: true, size: true, sizeSystem: true, currentPrice: true, bidCount: true,
        endsAt: true, status: true, city: true,
        images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
      },
    }),
    db.listing.count({ where }),
  ]);

  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) p.set(k, v);
    for (const [k, v] of Object.entries(over)) p.set(k, v);
    return `?${p}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <p className="eyebrow">The collection</p>
      <h1 className="text-5xl mt-2">Browse lots</h1>

      <form className="mt-10 grid grid-cols-2 md:grid-cols-6 gap-3 items-end" method="get">
        <div className="col-span-2">
          <label className="label" htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Brand, item, style…" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="category">Category</label>
          <select id="category" name="category" defaultValue={str("category")} className="input">
            <option value="">All</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
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
          <label className="label" htmlFor="sort">Sort</label>
          <select id="sort" name="sort" defaultValue={sort} className="input">
            <option value="ending">Ending soon</option>
            <option value="new">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="min">Min ₹</label>
          <input id="min" name="min" inputMode="numeric" defaultValue={str("min")} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="max">Max ₹</label>
          <input id="max" name="max" inputMode="numeric" defaultValue={str("max")} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="city">City</label>
          <input id="city" name="city" defaultValue={str("city")} placeholder="Near me" className="input" />
        </div>
        <label className="flex items-center gap-2 text-sm pb-3">
          <input type="checkbox" name="meetup" value="1" defaultChecked={str("meetup") === "1"} /> Meetup possible
        </label>
        <button className="btn btn-primary col-span-2 md:col-span-2">Apply</button>
      </form>

      <p className="mt-10 text-sm text-muted">{total} lot{total === 1 ? "" : "s"}</p>
      {items.length ? (
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
          {items.map((l) => <ListingCard key={l.id} l={l} />)}
        </div>
      ) : (
        <p className="mt-16 text-center serif text-3xl text-muted">Nothing matches yet — try widening your search.</p>
      )}

      {total > page * PAGE && (
        <div className="mt-14 text-center">
          <a href={qs({ page: String(page + 1) })} className="btn btn-ghost">More lots</a>
        </div>
      )}
    </div>
  );
}
