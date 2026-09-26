"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { bidAction } from "@/app/actions/listings";
import { Countdown } from "@/components/countdown";
import { formatINR } from "@/lib/format";

type LiveState = {
  status: string;
  currentPrice: number;
  bidCount: number;
  endsAt: string;
  minNext: number;
  reserveMet: boolean;
  hasReserve: boolean;
};

export function BidPanel({
  listingId,
  initial,
  shippingEstimate,
  canBid,
  blockedReason,
  isTop,
  minorCap,
}: {
  listingId: string;
  initial: LiveState;
  shippingEstimate: number;
  canBid: boolean;
  blockedReason?: React.ReactNode;
  isTop: boolean;
  minorCap?: number;
}) {
  const router = useRouter();
  const [polled, setPolled] = useState<LiveState | null>(null);
  // Server-rendered props refresh after our own bid; polling picks up everyone else's.
  const live = polled && polled.bidCount >= initial.bidCount ? polled : initial;
  const [state, action, pending] = useActionState(bidAction, undefined);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/listings/${listingId}`, { cache: "no-store" });
      if (!res.ok) return;
      const next = (await res.json()) as LiveState;
      setPolled(next);
      if (next.status !== initial.status || next.bidCount !== initial.bidCount) router.refresh();
    } catch {
      /* offline — try again next tick */
    }
  }, [listingId, router, initial.status, initial.bidCount]);

  useEffect(() => {
    if (live.status !== "LIVE") return;
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [live.status, refresh]);

  const isLive = live.status === "LIVE";

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="eyebrow">{live.bidCount ? "Current bid" : "Starting bid"}</p>
          <p className="serif text-5xl mt-1">{formatINR(live.currentPrice)}</p>
          <p className="text-xs text-muted mt-1">+ shipping ~{formatINR(shippingEstimate)} paid by buyer (if shipped)</p>
        </div>
        <div className="text-right">
          <p className="eyebrow">{isLive ? "Ends in" : "Status"}</p>
          <p className="text-lg mt-1">{isLive ? <Countdown endsAt={live.endsAt} onEnd={refresh} /> : live.status === "SOLD" ? "Sold" : "Ended"}</p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap text-xs">
        <span className="badge">{live.bidCount} bid{live.bidCount === 1 ? "" : "s"}</span>
        {live.hasReserve && <span className={`badge ${live.reserveMet ? "badge-gold" : ""}`}>{live.reserveMet ? "Reserve met ✓" : "Reserve not met"}</span>}
        {isTop && isLive && <span className="badge badge-gold">You&apos;re the highest bidder</span>}
      </div>

      {isLive && canBid && (
        <form action={action} className="space-y-3">
          <input type="hidden" name="listingId" value={listingId} />
          <label className="label" htmlFor="amount">Your bid (min {formatINR(live.minNext)})</label>
          <div className="flex gap-2">
            <input key={live.minNext} id="amount" name="amount" type="number" min={live.minNext} max={minorCap} step="1"
              defaultValue={live.minNext} className="input" required />
            <button className="btn btn-primary whitespace-nowrap" disabled={pending}>{pending ? "…" : "Place bid"}</button>
          </div>
          <label className="flex items-start gap-2 text-xs text-muted">
            <input type="checkbox" name="promise" required className="mt-0.5" />
            A bid is a promise. If I win, I&apos;ll complete the purchase.
          </label>
          {minorCap && <p className="text-xs text-muted">Members under 18 can bid up to {formatINR(minorCap)}.</p>}
          {state?.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
          {state?.ok && <p className="text-sm text-emerald-800" role="status">{state.ok}</p>}
        </form>
      )}
      {isLive && !canBid && blockedReason && <div className="text-sm">{blockedReason}</div>}
      {isLive && <p className="text-xs text-muted">Bids in the last 2 minutes extend the auction by 2 minutes — no sniping.</p>}
    </div>
  );
}
