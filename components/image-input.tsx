"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { compressImage } from "@/lib/compress-image";

/**
 * Photo picker for normal server-action forms. Picked photos are compressed in the browser
 * (smaller uploads, no GPS data) and placed into one hidden file field that the form submits.
 */
export function ImageInput({ name, max = 4, label = "Add photo" }: { name: string; max?: number; label?: string }) {
  const fieldRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<{ url: string; file: File }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sync = (next: { url: string; file: File }[]) => {
    const dt = new DataTransfer();
    next.forEach((i) => dt.items.add(i.file));
    if (fieldRef.current) fieldRef.current.files = dt.files;
    setItems(next);
  };

  // React resets the form after a successful server action; clear the previews with it.
  useEffect(() => {
    const form = fieldRef.current?.form;
    if (!form) return;
    const clear = () => setItems([]);
    form.addEventListener("reset", clear);
    return () => form.removeEventListener("reset", clear);
  }, []);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError(null);
    setBusy(true);
    const next = [...items];
    for (const f of picked) {
      if (next.length >= max) {
        setError(`You can attach up to ${max} photos.`);
        break;
      }
      try {
        const small = await compressImage(f);
        next.push({ url: URL.createObjectURL(small), file: small });
      } catch {
        setError("One photo couldn't be read. Try a JPEG or PNG.");
      }
    }
    sync(next);
    setBusy(false);
  }

  return (
    <div>
      <input ref={fieldRef} name={name} type="file" multiple className="hidden" tabIndex={-1} aria-hidden />
      <div className="flex flex-wrap gap-2">
        {items.map((p, i) => (
          <div key={p.url} className="relative w-20 h-20 rounded-xl overflow-hidden bg-ivory">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => sync(items.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 bg-white/90 rounded-full w-6 h-6 flex items-center justify-center"
              aria-label="Remove photo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {items.length < max && (
          <label className="w-20 h-20 rounded-xl border-2 border-dashed border-line flex flex-col items-center justify-center gap-1 text-muted text-[0.7rem] cursor-pointer hover:border-brand hover:text-brand transition-colors">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> : <ImagePlus className="w-5 h-5" aria-hidden />}
            {label}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={onPick} disabled={busy} />
          </label>
        )}
      </div>
      {error && <p className="hint !text-red-700">{error}</p>}
    </div>
  );
}
