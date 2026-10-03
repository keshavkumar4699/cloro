"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

/** Shows the success message queued by a server action (see lib/flash.ts). */
export function Toaster({ flash }: { flash: { m: string; t: number } | null }) {
  const [dismissed, setDismissed] = useState<number | null>(null);
  const visible = flash && dismissed !== flash.t ? flash : null;

  useEffect(() => {
    if (!flash) return;
    document.cookie = "cloro_flash=; path=/; max-age=0";
    const t = setTimeout(() => setDismissed(flash.t), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-20 md:bottom-6 z-50 flex justify-center px-4 pointer-events-none" role="status" aria-live="polite">
      <div key={visible.t} className="toast-in pointer-events-auto flex items-start gap-3 rounded-2xl bg-ink text-white px-4 py-3 shadow-lift max-w-md">
        <CheckCircle2 className="w-5 h-5 text-gold-soft shrink-0 mt-0.5" aria-hidden />
        <p className="text-sm leading-relaxed">{visible.m}</p>
        <button onClick={() => setDismissed(visible.t)} className="text-white/60 hover:text-white" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
