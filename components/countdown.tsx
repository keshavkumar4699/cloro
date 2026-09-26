"use client";

import { useEffect, useState } from "react";
import { timeLeft } from "@/lib/format";

export function Countdown({ endsAt, onEnd }: { endsAt: string; onEnd?: () => void }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  const end = new Date(endsAt);
  const ended = !!now && end <= now;
  useEffect(() => {
    if (ended) onEnd?.();
  }, [ended, onEnd]);
  if (!now) return <span suppressHydrationWarning>&nbsp;</span>;
  const urgent = end.getTime() - now.getTime() < 60 * 60 * 1000;
  return <span className={urgent && !ended ? "text-gold font-medium" : undefined}>{timeLeft(end, now)}</span>;
}
