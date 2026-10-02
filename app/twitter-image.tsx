import { ImageResponse } from "next/og";

export const alt = "Cloro — online auctions for pre-loved fashion, sneakers and more";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #f7e9df 0%, #fbf7f1 45%, #f4e7cd 100%)",
          color: "#1b1814",
        }}
      >
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700 }}>
          cloro<span style={{ color: "#b8873b" }}>.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05, maxWidth: 950 }}>Sell your old stuff for what it&apos;s really worth.</div>
          <div style={{ display: "flex", fontSize: 32, marginTop: 24, color: "#3a342d" }}>Online auctions · Verified members · Honest sizes</div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {["Sneakers", "Streetwear", "Bags", "Watches", "Gadgets"].map((t) => (
            <div key={t} style={{ display: "flex", background: "#0e4a3b", color: "#fbf7f1", borderRadius: 999, padding: "12px 28px", fontSize: 28 }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
