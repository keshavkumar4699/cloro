"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="text-6xl" aria-hidden>🌧️</p>
      <h1 className="text-4xl mt-5">Something went wrong</h1>
      <p className="mt-3 text-ink-soft">Sorry about that. Please try again — if it keeps happening, let our support team know.</p>
      <div className="mt-8 flex gap-3 justify-center">
        <button onClick={reset} className="btn btn-primary">Try again</button>
        <Link href="/support/new" className="btn btn-ghost">Contact support</Link>
      </div>
    </div>
  );
}
