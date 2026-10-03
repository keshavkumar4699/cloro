import Link from "next/link";
import { Clock, Flame, Sparkles } from "lucide-react";
import { formatINR } from "@/lib/format";
import { Countdown } from "@/components/countdown";
import { WatchButton } from "@/components/watch-button";

export type CardListing = {
  id: string;
  title: string;
  brand: string | null;
  size: string;
  sizeSystem: string;
  currentPrice: number;
  bidCount: number;
  endsAt: Date;
  status: string;
  city: string;
  curated?: boolean;
  images: { url: string }[];
};

export const cardSelect = {
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
  curated: true,
  images: { select: { url: true }, orderBy: { position: "asc" as const }, take: 1 },
};

const HOT_BIDS = 5;

export function ListingCard({ l, watched = false, priority = false }: { l: CardListing; watched?: boolean; priority?: boolean }) {
  const live = l.status === "LIVE" && l.endsAt > new Date();
  const hot = live && l.bidCount >= HOT_BIDS;
  return (
    <div className="group relative fade-in">
      <Link href={`/listings/${l.id}`} className="block rounded-2xl focus-visible:outline-offset-4">
        <div className="relative aspect-[4/5] rounded-2xl bg-ivory overflow-hidden transition-shadow duration-300 group-hover:shadow-lift">
          {l.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={l.images[0].url}
              alt={l.title}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center serif text-muted">No photo</div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
          <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5">
            {hot && <span className="badge !bg-[#ffe9e4] !text-[#c2410c]"><Flame className="w-3 h-3" aria-hidden /> Hot</span>}
            {l.curated && <span className="badge badge-gold !bg-white/90 backdrop-blur"><Sparkles className="w-3 h-3" aria-hidden /> Curated</span>}
          </div>
          <span className={`absolute bottom-2.5 left-2.5 badge !bg-white/90 backdrop-blur ${live ? "" : "!text-muted"}`}>
            {live ? (
              <>
                <Clock className="w-3 h-3" aria-hidden /> <Countdown endsAt={l.endsAt.toISOString()} />
              </>
            ) : l.status === "SOLD" ? "Sold" : "Ended"}
          </span>
        </div>
        <div className="pt-3 px-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[1.05rem] font-bold">{formatINR(l.currentPrice)}</p>
            <p className="text-xs text-muted whitespace-nowrap">{l.bidCount ? `${l.bidCount} bid${l.bidCount > 1 ? "s" : ""}` : "No bids yet"}</p>
          </div>
          <h3 className="font-sans text-sm font-medium text-ink-soft leading-snug line-clamp-1 mt-0.5 tracking-normal">{l.title}</h3>
          <p className="text-xs text-muted mt-0.5 line-clamp-1">
            {l.brand ? `${l.brand} · ` : ""}Size {l.size} · {l.city}
          </p>
        </div>
      </Link>
      <div className="absolute top-2.5 right-2.5">
        <WatchButton listingId={l.id} initial={watched} />
      </div>
    </div>
  );
}

export function ListingGrid({ items, watched }: { items: CardListing[]; watched?: Set<string> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-8">
      {items.map((l, i) => <ListingCard key={l.id} l={l} watched={watched?.has(l.id)} priority={i < 4} />)}
    </div>
  );
}
