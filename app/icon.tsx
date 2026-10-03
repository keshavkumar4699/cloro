import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0e4a3b", borderRadius: 112 }}>
        <div style={{ display: "flex", fontSize: 330, color: "#fbf7f1", fontWeight: 700, lineHeight: 1, marginTop: -30 }}>
          c<span style={{ color: "#e2b866" }}>.</span>
        </div>
      </div>
    ),
    size,
  );
}
