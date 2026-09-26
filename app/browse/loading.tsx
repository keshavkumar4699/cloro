export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-10" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-56 rounded-xl bg-ivory animate-pulse" />
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <div className="aspect-[4/5] rounded-2xl bg-ivory animate-pulse" />
            <div className="mt-3 h-4 w-2/3 rounded bg-ivory animate-pulse" />
            <div className="mt-2 h-3 w-1/2 rounded bg-ivory animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
