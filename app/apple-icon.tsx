import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0e4a3b" }}>
        <div style={{ display: "flex", fontSize: 120, color: "#fbf7f1", fontWeight: 700, lineHeight: 1, marginTop: -12 }}>
          c<span style={{ color: "#e2b866" }}>.</span>
        </div>
      </div>
    ),
    size,
  );
}
