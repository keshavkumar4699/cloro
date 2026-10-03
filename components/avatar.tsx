const PALETTE = ["#0e4a3b", "#b8873b", "#7a4b3a", "#3f5a7a", "#6b4f7a", "#4a6b3f"];

export function Avatar({ name, image, size = 40 }: { name: string | null | undefined; image?: string | null; size?: number }) {
  const initials = (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const color = PALETTE[[...(name ?? "")].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" width={size} height={size} referrerPolicy="no-referrer" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-semibold select-none"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
