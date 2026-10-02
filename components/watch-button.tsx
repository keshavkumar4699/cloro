"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleWatch } from "@/app/actions/watch";

export function WatchButton({ listingId, initial, size = "sm" }: { listingId: string; initial: boolean; size?: "sm" | "lg" }) {
  const router = useRouter();
  const [watching, setWatching] = useState(initial);
  const [pop, setPop] = useState(0);
  const [, start] = useTransition();

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !watching;
    setWatching(next); // optimistic
    if (next) setPop((p) => p + 1);
    start(async () => {
      const res = await toggleWatch(listingId);
      if (res === null) {
        setWatching(false);
        router.push(`/signin?next=/listings/${listingId}`);
      } else if ("error" in res) {
        setWatching(!next);
      } else {
        setWatching(res.watching);
      }
    });
  };

  const big = size === "lg";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={watching}
      aria-label={watching ? "Remove from saved" : "Save this item"}
      className={`inline-flex items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-soft transition-colors hover:bg-white ${big ? "w-11 h-11" : "w-9 h-9"}`}
    >
      <Heart key={pop} className={`${big ? "w-5 h-5" : "w-4 h-4"} ${watching ? "fill-[#e5484d] text-[#e5484d] heart-pop" : "text-ink-soft"}`} aria-hidden />
    </button>
  );
}
