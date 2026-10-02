import { LEGAL_UPDATED } from "@/lib/site";

/** Simple readable layout for legal and info pages. */
export function ProsePage({ title, intro, children, updated = true }: { title: string; intro?: string; children: React.ReactNode; updated?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 py-8 md:py-14">
      <h1 className="text-4xl md:text-5xl">{title}</h1>
      {updated && <p className="mt-2 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>}
      {intro && <p className="mt-5 text-lg text-ink-soft leading-relaxed">{intro}</p>}
      <div className="prose-cloro mt-8">{children}</div>
    </div>
  );
}
