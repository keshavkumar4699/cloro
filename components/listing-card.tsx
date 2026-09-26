import Link from "next/link";
import { formatINR } from "@/lib/format";
import { Countdown } from "@/components/countdown";

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
  images: { url: string }[];
};

export function ListingCard({ l }: { l: CardListing }) {
  return (
    <Link href={`/listings/${l.id}`} className="group block fade-in">
      <div className="aspect-[4/5] bg-ivory overflow-hidden">
        {l.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={l.images[0].url}
            alt={l.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center serif text-muted">No photo</div>
        )}
      </div>
      <div className="pt-4 space-y-1">
        {l.brand && <p className="eyebrow">{l.brand}</p>}
        <h3 className="text-xl leading-snug line-clamp-1">{l.title}</h3>
        <p className="text-xs text-muted">
          Size {l.size} · {l.sizeSystem} · {l.city}
        </p>
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-base">
            {formatINR(l.currentPrice)}
            <span className="text-xs text-muted ml-2">{l.bidCount ? `${l.bidCount} bid${l.bidCount > 1 ? "s" : ""}` : "Starting bid"}</span>
          </span>
          <span className="text-xs text-muted">
            {l.status === "LIVE" ? <Countdown endsAt={l.endsAt.toISOString()} /> : l.status === "SOLD" ? "Sold" : "Ended"}
          </span>
        </div>
      </div>
    </Link>
  );
}
