"use client";

import { useRef, useState } from "react";

export function Gallery({ images, title }: { images: { id: string; url: string }[]; title: string }) {
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  const go = (i: number) => {
    setActive(i);
    const el = track.current;
    if (el) el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
  };

  if (!images.length) return <div className="aspect-[4/5] rounded-3xl bg-ivory" />;

  return (
    <div>
      <div
        ref={track}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-3xl bg-ivory aspect-[4/5]"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== active) setActive(i);
        }}
      >
        {images.map((img, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={img.id} src={img.url} alt={`${title} — photo ${i + 1} of ${images.length}`} className="w-full h-full shrink-0 snap-center object-cover" />
        ))}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => go(i)}
              className={`w-16 h-20 shrink-0 rounded-xl overflow-hidden ring-2 transition ${i === active ? "ring-brand" : "ring-transparent opacity-70 hover:opacity-100"}`}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
