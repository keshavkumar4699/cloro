import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="text-6xl" aria-hidden>🧭</p>
      <h1 className="text-4xl mt-5">We couldn&apos;t find that</h1>
      <p className="mt-3 text-ink-soft">It may have been removed, or the link is a little off.</p>
      <div className="mt-8 flex gap-3 justify-center">
        <Link href="/browse" className="btn btn-primary">Explore items</Link>
        <Link href="/" className="btn btn-ghost">Home</Link>
      </div>
    </div>
  );
}
