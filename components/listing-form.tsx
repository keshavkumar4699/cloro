"use client";

import { useActionState, useState, startTransition } from "react";
import { createListing } from "@/app/actions/listings";
import { CATEGORIES, CONDITIONS, DURATIONS_DAYS, MEASUREMENT_LABELS, SIZE_SYSTEMS } from "@/lib/catalog";
import { compressImage } from "@/lib/compress-image";
import { FormError } from "@/components/action-form";

const MAX_PHOTOS = 6;

export function ListingForm({ city, pincode, feeNote }: { city: string; pincode: string; feeNote?: string }) {
  const [state, action, pending] = useActionState(createListing, undefined);
  const [category, setCategory] = useState<string>("");
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const measurements = CATEGORIES.find((c) => c.id === category)?.measurements ?? [];

  async function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setPhotoError(null);
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) setPhotoError(`You can add up to ${MAX_PHOTOS} photos.`);
    const added: { file: File; url: string }[] = [];
    for (const f of files.slice(0, room)) {
      try {
        const small = await compressImage(f);
        added.push({ file: small, url: URL.createObjectURL(small) });
      } catch {
        setPhotoError("One photo couldn't be read. Try JPEG or PNG.");
      }
    }
    setPhotos((p) => [...p, ...added]);
  }

  function remove(i: number) {
    setPhotos((p) => p.filter((_, j) => j !== i));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("photoPicker");
    if (photos.length < 2) {
      setPhotoError("Add at least 2 photos — the front and a close-up work well.");
      document.getElementById("photos")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    for (const p of photos) fd.append("photos", p.file);
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {feeNote && <p className="notice">{feeNote}</p>}

      <section className="card p-5 md:p-7 space-y-5">
        <h2 className="text-2xl flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-gold-soft text-gold-dark font-sans text-sm font-bold flex items-center justify-center">1</span>The piece</h2>
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" className="input" maxLength={90} placeholder="e.g. Vintage Levi's 501 denim jacket" required />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" name="category" className="input" required value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="" disabled>Choose…</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="brand">Brand (optional)</label>
            <input id="brand" name="brand" className="input" maxLength={60} />
          </div>
          <div>
            <label className="label" htmlFor="condition">Condition</label>
            <select id="condition" name="condition" className="input" required defaultValue="">
              <option value="" disabled>Choose…</option>
              {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={5} className="input" required minLength={20}
            placeholder="Describe it exactly as it is — flaws included. Honest sellers get better ratings." />
        </div>
      </section>

      <section className="card p-5 md:p-7 space-y-5">
        <h2 className="text-2xl flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-gold-soft text-gold-dark font-sans text-sm font-bold flex items-center justify-center">2</span>Size &amp; fit <span className="text-base text-muted">(required)</span></h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="size">Size on the label</label>
            <input id="size" name="size" className="input" placeholder="M, 42, UK 9, 30×32…" required />
          </div>
          <div>
            <label className="label" htmlFor="sizeSystem">Size system</label>
            <select id="sizeSystem" name="sizeSystem" className="input" required defaultValue="">
              <option value="" disabled>Choose…</option>
              {SIZE_SYSTEMS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {measurements.length > 0 && (
          <div>
            <p className="label">Actual measurements (at least one)</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {measurements.map((m) => (
                <div key={m}>
                  <label className="text-xs text-muted" htmlFor={`m_${m}`}>{MEASUREMENT_LABELS[m]}</label>
                  <input id={`m_${m}`} name={`m_${m}`} type="number" step="0.1" min="0" className="input" />
                </div>
              ))}
            </div>
            <p className="hint">Brands size differently. Real measurements prevent “wrong size” disputes.</p>
          </div>
        )}
      </section>

      <section id="photos" className="card p-5 md:p-7 space-y-4">
        <h2 className="text-2xl flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-gold-soft text-gold-dark font-sans text-sm font-bold flex items-center justify-center">3</span>Photos</h2>
        <p className="text-sm text-muted">2–6 photos. Natural light and a plain background look best — your first photo is the cover.</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {photos.map((p, i) => (
            <div key={p.url} className="relative aspect-square bg-ivory rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute bottom-1 left-1 badge badge-gold">Cover</span>}
              <button type="button" onClick={() => remove(i)} className="absolute top-1.5 right-1.5 bg-white/90 text-ink rounded-full w-7 h-7 text-sm shadow-soft" aria-label="Remove photo">×</button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="aspect-square rounded-xl border-2 border-dashed border-line flex flex-col items-center justify-center text-muted cursor-pointer hover:border-brand hover:text-brand">
              <span className="text-2xl leading-none">+</span><span className="text-xs mt-1">Add photo</span>
              <input name="photoPicker" type="file" accept="image/*" multiple className="sr-only" onChange={addPhotos} />
            </label>
          )}
        </div>
        {photoError && <p className="text-sm text-red-700">{photoError}</p>}
        <fieldset className="flex flex-wrap gap-6 text-sm">
          <legend className="label">Optional trust badges — tick what you can show on request</legend>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand w-4 h-4" name="hasBill" /> Original bill</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand w-4 h-4" name="hasBox" /> Original box</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand w-4 h-4" name="hasTags" /> Tags attached</label>
        </fieldset>
      </section>

      <section className="card p-5 md:p-7 space-y-5">
        <h2 className="text-2xl flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-gold-soft text-gold-dark font-sans text-sm font-bold flex items-center justify-center">4</span>Auction</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="startPrice">Starting bid (₹)</label>
            <input id="startPrice" name="startPrice" type="number" min="1" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="reservePrice">Reserve (₹, optional)</label>
            <input id="reservePrice" name="reservePrice" type="number" min="1" className="input" />
            <p className="hint">Hidden minimum. Bidders only see whether it&apos;s met.</p>
          </div>
          <div>
            <label className="label" htmlFor="durationDays">Duration</label>
            <select id="durationDays" name="durationDays" className="input" defaultValue="3">
              {DURATIONS_DAYS.map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="card p-5 md:p-7 space-y-5">
        <h2 className="text-2xl flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-gold-soft text-gold-dark font-sans text-sm font-bold flex items-center justify-center">5</span>Handover</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="city">City</label>
            <input id="city" name="city" className="input" defaultValue={city} required />
          </div>
          <div>
            <label className="label" htmlFor="pincode">Pincode</label>
            <input id="pincode" name="pincode" className="input" inputMode="numeric" maxLength={6} defaultValue={pincode} required />
          </div>
          <div>
            <label className="label" htmlFor="shippingEstimate">Estimated shipping (₹)</label>
            <input id="shippingEstimate" name="shippingEstimate" type="number" min="0" className="input" required />
            <p className="hint">The buyer always pays shipping.</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-brand w-4 h-4" name="meetupPossible" defaultChecked /> Happy to meet in person (public place, daytime)
        </label>
      </section>

      <div className="sticky bottom-20 md:bottom-4 z-10 card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-sm text-muted flex-1">
          {state?.error ? <FormError message={state.error} /> : "Check the size and photos once more — honest listings sell faster."}
        </div>
        <button className="btn btn-primary" disabled={pending}>{pending ? "Publishing…" : "Publish item"}</button>
      </div>
    </form>
  );
}
