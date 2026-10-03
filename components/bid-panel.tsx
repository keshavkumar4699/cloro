"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { confetti } from "@/lib/confetti";
import { useRouter } from "next/navigation";
import { Clock, Gavel, Loader2 } from "lucide-react";
import { bidAction } from "@/app/actions/listings";
import { Countdown } from "@/components/countdown";
import { FormError } from "@/components/action-form";
import { formatINR } from "@/lib/format";
import { bidIncrement } from "@/lib/rules";

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
  const bidButton = useRef<HTMLButtonElement>(null);
  const [firstPrice] = useState(initial.currentPrice);
  // Server-rendered props refresh after our own bid; polling picks up everyone else's.
  const live = polled && polled.bidCount >= initial.bidCount ? polled : initial;
  const [amount, setAmount] = useState<string>("");
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof bidAction>[0], fd: FormData) => {
    const result = await bidAction(prev, fd);
    if (!result?.error) {
      setAmount("");
      const r = bidButton.current?.getBoundingClientRect();
      confetti(r ? { x: r.left + r.width / 2, y: r.top } : undefined);
    }
    return result;
  }, undefined);

  const refresh = useCallback(async () => {
    if (document.hidden) return; // don't poll from background tabs
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
    const onVisible = () => !document.hidden && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [live.status, refresh]);

  const isLive = live.status === "LIVE";
  const step = bidIncrement(live.currentPrice);
  const quick = [live.minNext, live.minNext + step, live.minNext + step * 3].filter((v) => !minorCap || v <= minorCap);
  // Show the minimum until the member types; never rewrite what they're typing.
  const value = amount === "" ? String(live.minNext) : amount;
  const tooLow = amount !== "" && Number(amount) < live.minNext;
  const overCap = !!minorCap && live.minNext > minorCap;

  return (
    <div className="card p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{live.bidCount ? "Current bid" : "Starting bid"}</p>
          <p key={live.currentPrice} className={`serif text-4xl md:text-5xl mt-1 inline-block origin-left ${live.currentPrice !== firstPrice ? "price-bump" : ""}`} aria-live="polite">
            {formatINR(live.currentPrice)}
          </p>
          <p className="text-xs text-muted mt-1.5">+ ~{formatINR(shippingEstimate)} shipping if shipped · paid by buyer</p>
        </div>
        <div className={`badge !py-1.5 !px-3 ${isLive ? "badge-brand" : ""}`}>
          <Clock className="w-3.5 h-3.5" aria-hidden />
          {isLive ? <Countdown endsAt={live.endsAt} onEnd={refresh} /> : live.status === "SOLD" ? "Sold" : "Ended"}
        </div>
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        <span className="badge">{live.bidCount} bid{live.bidCount === 1 ? "" : "s"}</span>
        {live.hasReserve && <span className={`badge ${live.reserveMet ? "badge-brand" : "badge-gold"}`}>{live.reserveMet ? "Reserve met ✓" : "Reserve not met yet"}</span>}
        {isTop && isLive && <span className="badge badge-gold">🎉 You&apos;re winning</span>}
      </div>

      {isLive && canBid && !overCap && (
        <form action={action} className="mt-5 space-y-3">
          <input type="hidden" name="listingId" value={listingId} />
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Quick bids">
            {quick.map((v) => (
              <button key={v} type="button" onClick={() => setAmount(String(v))} className={`chip !py-1.5 ${Number(value) === v ? "chip-active" : ""}`}>
                {formatINR(v)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">₹</span>
              <input
                name="amount"
                type="number"
                inputMode="numeric"
                min={live.minNext}
                max={minorCap}
                step="1"
                value={value}
                onChange={(e) => setAmount(e.target.value)}
                className="input !pl-8 !rounded-full"
                aria-label={`Your bid, at least ${formatINR(live.minNext)}`}
                required
              />
            </div>
            <button ref={bidButton} className="btn btn-primary" disabled={pending}>
              {pending ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Placing bid" /> : <><Gavel className="w-4 h-4" aria-hidden /> Bid</>}
            </button>
          </div>
          {tooLow && <p className="text-xs text-gold-dark">The minimum bid right now is {formatINR(live.minNext)}.</p>}
          <label className="flex items-start gap-2 text-sm text-ink-soft">
            <input type="checkbox" name="promise" required className="mt-0.5 accent-brand w-4 h-4" />
            I&apos;ll buy it if I win — a bid is a promise.
          </label>
          <FormError message={state?.error} />
        </form>
      )}
      {isLive && canBid && overCap && (
        <p className="notice mt-5">Bidding has gone past {formatINR(minorCap!)}, the limit for members under 18.</p>
      )}
      {isLive && !canBid && blockedReason && <div className="notice notice-brand mt-5">{blockedReason}</div>}
      {isLive && <p className="text-xs text-muted mt-4">Bids in the last 2 minutes add 2 more minutes, so everyone gets a fair chance.</p>}
    </div>
  );
}
